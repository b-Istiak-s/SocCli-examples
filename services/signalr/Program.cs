using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.SignalR;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

var jwtSecret = Environment.GetEnvironmentVariable("JWT_SECRET") ?? "soccli-dev-secret";
var insecureTesting = (Environment.GetEnvironmentVariable("ALLOW_INSECURE_TESTING") ?? "true").Equals("true", StringComparison.OrdinalIgnoreCase);

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = "soccli-auth",
            ValidateAudience = false,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ValidateLifetime = true
        };

        options.Events = new JwtBearerEvents
        {
            OnMessageReceived = context =>
            {
                var accessToken = context.Request.Query["access_token"];
                var path = context.HttpContext.Request.Path;
                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hub/chat"))
                {
                    context.Token = accessToken;
                }

                return Task.CompletedTask;
            }
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("SignalRScope", policy =>
        policy.RequireAssertion(ctx => insecureTesting || ctx.User.HasClaim(claim => claim.Type == "scopes" && claim.Value == "signalr")));
});
builder.Services.AddSignalR();

var app = builder.Build();
app.UseAuthentication();
app.UseAuthorization();

if (insecureTesting)
{
    app.MapHub<ChatHub>("/hub/chat");
}
else
{
    app.MapHub<ChatHub>("/hub/chat").RequireAuthorization("SignalRScope");
}
app.MapGet("/health", () => Results.Ok(new { ok = true }));

var hubContext = app.Services.GetRequiredService<IHubContext<ChatHub>>();
_ = Task.Run(async () =>
{
    while (true)
    {
        await hubContext.Clients.All.SendAsync("ticker", new { channel = "ticker", value = Random.Shared.NextDouble() * 100, ts = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() });
        await Task.Delay(3000);
    }
});

app.Run("http://0.0.0.0:36717");

class ChatHub : Hub
{
    public async Task SendMessage(string message, string room = "general")
    {
        var user = Context.User?.FindFirst(ClaimTypes.Email)?.Value ?? "unknown";
        await Clients.Group(room).SendAsync("message", new { from = user, message, room, ts = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() });
    }

    public Task JoinRoom(string room) => Groups.AddToGroupAsync(Context.ConnectionId, room);
}
