FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY . .
RUN dotnet publish -c Release -o /app

FROM mcr.microsoft.com/dotnet/aspnet:8.0
RUN groupadd -g 10001 appuser && useradd -u 10001 -g appuser -m -s /usr/sbin/nologin appuser
WORKDIR /app
COPY --from=build /app .
RUN chown -R appuser:appuser /app
ENV ASPNETCORE_URLS=http://0.0.0.0:36717
EXPOSE 36717
USER appuser
ENTRYPOINT ["dotnet", "SocCli.SignalR.dll"]
