# SocCli Examples: Real-World Protocol Services (Mocked Users + Real Tokens)

This repo provides runnable backend services so you can exercise all SocCli protocols with realistic auth and endpoints.

## Protocols covered

- Raw WebSocket
- Pusher / Laravel Reverb (Laravel-based)
- Socket.IO
- GraphQL subscriptions (`graphql-transport-ws`)
- JSON-RPC 2.0 over WebSocket
- STOMP over WebSocket
- SignalR over WebSocket (ASP.NET Core)
- MQTT over WebSocket
- WAMP over WebSocket

## Stack choices

- **Laravel**: Pusher/Reverb (as requested)
- **Node.js**: raw, Socket.IO, GraphQL, JSON-RPC, STOMP, auth issuer
- **ASP.NET Core**: SignalR (native ecosystem)
- **EMQX**: MQTT broker with WebSocket listener
- **Crossbar.io**: WAMP router

## Quick start

```bash
docker compose up --build -d
curl http://localhost:36711/users
GLOBAL_TOKEN=$(curl -s -X POST http://localhost:36711/token -H 'content-type: application/json' -d '{}' | jq -r .token)
echo "$GLOBAL_TOKEN"
```

All exposed ports are intentionally assigned in the **30000–40000** range to minimize conflicts with common local services (databases, default dev servers, brokers, etc.).

This stack is intentionally configured for **local testing convenience**. Several services run with `ALLOW_INSECURE_TESTING=true` in compose so protocol flows are easier to exercise with SocCli.

### Are users the same across all protocols?

Yes. In this examples repo, auth is configured for **one shared user identity** across all protocols.

- `POST /token` and `POST /token-all` both return the same user.
- Returned JWT includes all protocol scopes, so the same token can be reused for raw, socketio, graphql, jsonrpc, stomp, and signalr.
- You can override the shared identity via env vars: `SHARED_USER_EMAIL`, `SHARED_USER_NAME`.

Example:

```bash
GLOBAL_TOKEN=$(curl -s -X POST http://localhost:36711/token -H 'content-type: application/json' -d '{}' | jq -r .token)
```

#### HOW they share the same user (concrete)

1. Auth service always mints JWTs from one fixed user object (`sharedUser`).
2. JWT contains the same `sub`, `email`, and `name` claims every time.
3. All protocol services validate the same `JWT_SECRET` and trust those claims.
4. Protocol handlers read user claims from the validated token, so identity is consistent everywhere.

Quick proof (decode JWT payload):

```bash
GLOBAL_TOKEN=$(curl -s -X POST http://localhost:36711/token -H 'content-type: application/json' -d '{}' | jq -r .token)

echo "$GLOBAL_TOKEN" | awk -F. '{print $2}' | tr '_-' '/+' | base64 -d 2>/dev/null | jq '{sub,email,name,scopes}'
```

You should see the same `sub/email/name` regardless of protocol command you run with `GLOBAL_TOKEN`.

## Run JS services in parallel (without Docker)

Yes — use the **`concurrently`** package to run many Node services in parallel from one terminal.

```bash
npm install
npm run install:services
npm run dev:js
```

This starts: `auth`, `raw`, `socketio`, `graphql`, `jsonrpc`, and `stomp` together.

To also start **SignalR + Laravel Reverb + MQTT + WAMP** together, run:

```bash
npm run dev:infra
```

Or run both JS + infra in one command:

```bash
npm run dev:all
```

`dev:all` uses `concurrently` and launches:
- JS services via `npm run dev:js`
- non-Node services via `npm run dev:infra`

`dev:infra` is best-effort (it prints guidance and continues if container runtime is unavailable).
Use `npm run dev:infra:strict  # runs docker compose up --build ...` if you want infra startup failures to exit non-zero.

### Podman note

If you see errors like `... /run/user/<uid>/podman/podman.sock ... no such file or directory`, the Podman socket is not active.

```bash
systemctl --user start podman.socket
systemctl --user status podman.socket
npm run dev:infra:strict  # runs docker compose up --build ...
```

## SocCli examples against local services

Generate one shared token and use it across all protocol examples:

```bash
GLOBAL_TOKEN=$(curl -s -X POST http://localhost:36711/token -H 'content-type: application/json' -d '{}' | jq -r .token)
```

### Raw WebSocket

```bash
soccli raw connect \
  --host localhost --port 36712 --path /ws \
  -H "Authorization: Bearer $GLOBAL_TOKEN"
```

### Socket.IO

```bash
soccli socketio emit \
  --host localhost --port 36713 --path /socket.io/ \
  --event message --data '{"text":"hello"}' \
  -H "Authorization: Bearer $GLOBAL_TOKEN"
```

### GraphQL Subscriptions

```bash
soccli graphql subscribe \
  --host localhost --port 36714 --path /graphql \
  --init-payload '{"Authorization":"Bearer '$GLOBAL_TOKEN'"}' \
  --query 'subscription { messageAdded { id text from } }'
```

### JSON-RPC

```bash
soccli jsonrpc call \
  --host localhost --port 36715 --path /rpc \
  --method user.get --params '{"id":42}' \
  -H "Authorization: Bearer $GLOBAL_TOKEN"
```

### STOMP

```bash
soccli stomp subscribe \
  --host localhost --port 36716 --path /ws \
  --destination /topic/updates \
  --login ignored --passcode ignored \
  -H "Authorization: Bearer $GLOBAL_TOKEN"
```

### SignalR

```bash
soccli signalr invoke \
  --host localhost --port 36717 --path /hub/chat \
  --target SendMessage --args '["hello", "general"]' \
  -H "Authorization: Bearer $GLOBAL_TOKEN"
```

### MQTT over WebSocket

```bash
soccli mqtt subscribe \
  --host localhost --port 36718 --path /mqtt \
  --client-id soccli-client \
  --topic sensors/temperature
```

### WAMP

```bash
soccli wamp subscribe \
  --host localhost --port 36720 --path /ws \
  --realm realm1 --topic com.example.topic
```

### Laravel Reverb (Pusher protocol)

The `reverb` service bootstraps a Laravel app, installs Reverb + Sanctum, and exposes:

- HTTP API: `http://localhost:36721`
- Reverb WS: `ws://localhost:36722`
- WebSocket app path uses `REVERB_APP_ID` (pinned to `local` in `docker-compose.yml`), so use `/app/local` unless you override `REVERB_APP_ID`.
- token endpoint: `POST /api/token`

After boot:

```bash
LARAVEL_TOKEN=$(curl -s -X POST http://localhost:36721/api/token -H 'content-type: application/json' -d '{"email":"user1@example.com"}' | jq -r .token)

soccli pusher subscribe \
  --host localhost --port 36722 --path /app/local \
  --channel private-users.1 \
  --auth-endpoint http://localhost:36721/broadcasting/auth \
  --auth-header "Authorization: Bearer $LARAVEL_TOKEN"
```

## Extended docs

- Full SocCli command matrix for this stack: `docs/soccli-command-playbook.md`
- Service-by-service architecture and independent behavior: `docs/service-architecture.md`

## Notes

- Tokens are intentionally mock-issued but cryptographically valid JWTs.
- This is for integration/dev testing; rotate secrets and harden before any public deployment.
