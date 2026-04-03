# Service Architecture (Independent Behavior)

This doc explains how each service in this repo works independently.

## Auth (`services/auth`)
- Runs on `36711`.
- Owns shared identity (`SHARED_USER_EMAIL`, `SHARED_USER_NAME`).
- Issues JWT with all protocol scopes via `POST /token` and `POST /token-all`.
- `GET /users` returns the single shared user; `GET /health` is readiness check.

## Raw WS (`services/raw`)
- Runs on `ws://localhost:36712/ws`.
- Verifies Bearer JWT and requires `raw` scope.
- Channels/data: `raw.telemetry` (continuous every 3s), `raw.echo` (echo for client-sent lines).

## Socket.IO (`services/socketio`)
- Runs on `ws://localhost:36713/socket.io/`.
- Verifies handshake auth token and requires `socketio` scope.
- Channels/events: `message` (client->server->broadcast), `room:message` (room scoped), `ticker` (continuous every 3s).

## GraphQL (`services/graphql`)
- Runs on `http://localhost:36714/graphql` with WebSocket subscriptions.
- Requires auth header bearer token and `graphql` scope.
- Streams `Subscription.messageAdded` continuously; clients send subscription operations to server.

## JSON-RPC (`services/jsonrpc`)
- Runs on `ws://localhost:36715/rpc`.
- Uses `rpc-websockets` auth callback and requires `jsonrpc` scope.
- Methods:
  - `user.get({id})`
  - `math.sum([a,b,c])`
  - `message.publish({channel,payload})`
- Server emits `updates` event continuously every 3s.

## STOMP (`services/stomp`)
- Runs on `ws://localhost:36716/ws`.
- Validates JWT and requires `stomp` scope during CONNECT.
- Destination `/topic/updates` receives periodic ticks every 5s; clients can SEND via interactive mode.

## SignalR (`services/signalr`)
- Runs on `http://localhost:36717/hub/chat`.
- ASP.NET Core JWT auth with scope policy `SignalRScope`.
- Hub methods:
  - `SendMessage(message, room = "general")`
  - `JoinRoom(room)`
- Server emits `ticker` event continuously every 3s.

## MQTT (`emqx` in compose)
- WS listener on `36718`, TCP listener on `36719`.
- Username/password auth (`admin` / `public` in example config).
- Independent broker service; not JWT-coupled to auth service.

## WAMP (`crossbar`)
- Router endpoint on `ws://localhost:36720/ws`, realm `realm1`.
- Anonymous role allowed for `com.example.*` call/register/publish/subscribe.
- Independent router service; not JWT-coupled to auth service.

## Laravel Reverb (`services/laravel-reverb`)
- API on `36721`, Reverb WS on `36722`.
- Bootstraps Laravel app, installs Reverb + Sanctum.
- Provides `POST /api/token` to mint Sanctum token for broadcasting auth.

## Why services are independent
- Each protocol service can be started/tested on its own endpoint.
- JWT-coupled services: auth/raw/socketio/graphql/jsonrpc/stomp/signalr.
- Non-JWT infra services: mqtt/wamp/reverb (own auth/protocol patterns).


## Channel / topic map
- raw: `raw.telemetry`, `raw.echo`
- socketio: `message`, `room:message`, `ticker`
- graphql: `messageAdded`
- jsonrpc: methods + `updates` event
- stomp: `/topic/updates`
- signalr: `message`, `ticker`
- mqtt: arbitrary topics (example: `sensors/temperature`)
- wamp: arbitrary topics/procedures under `com.example.*`
- pusher/reverb: application channels (example: `private-users.1`)
