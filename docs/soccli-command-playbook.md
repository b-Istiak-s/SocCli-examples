# SocCli Command Playbook (Local Example Stack)

Use this with the services in this repo.

## 0) Prerequisites

```bash
docker compose up --build -d
GLOBAL_TOKEN=$(curl -s -X POST http://localhost:36711/token -H 'content-type: application/json' -d '{}' | jq -r .token)
LARAVEL_TOKEN=$(curl -s -X POST http://localhost:36721/api/token -H 'content-type: application/json' -d '{"email":"user1@example.com"}' | jq -r .token)
```

### Streaming + client-to-server pattern in this stack

- **Continuous server stream** exists for: raw (`raw.telemetry`), socketio (`ticker`), graphql (`messageAdded`), jsonrpc (`updates`), stomp (`/topic/updates`), signalr (`ticker`).
- **Client -> server publish/invoke** examples are included per protocol (`raw` interactive text, `socketio emit`, `jsonrpc call`, `stomp connect` send text, `signalr invoke`, `mqtt publish`, `wamp publish/call`, `pusher subscribe/auth`).

## 1) Raw WebSocket

### Connect (advanced fields)
```bash
soccli raw connect \
  --host localhost --port 36712 --path /ws \
  -H "Authorization: Bearer $GLOBAL_TOKEN"
```

### Connect (URL mode)
```bash
soccli raw connect "ws://localhost:36712/ws" -H "Authorization: Bearer $GLOBAL_TOKEN"
# then type lines to send to server (echo path)
```

## 2) Socket.IO

### Connect
```bash
soccli socketio connect "ws://localhost:36713/socket.io/?EIO=4&transport=websocket" \
  -H "Authorization: Bearer $GLOBAL_TOKEN"
```

### Emit event
```bash
soccli socketio emit \
  --host localhost --port 36713 --path /socket.io/ \
  --event message --data '{"text":"hello from soccli"}' \
  -H "Authorization: Bearer $GLOBAL_TOKEN"
```

## 3) GraphQL subscriptions (`graphql-transport-ws`)

### Connect + init
```bash
soccli graphql connect \
  --host localhost --port 36714 --path /graphql \
  --init-payload '{"Authorization":"Bearer '$GLOBAL_TOKEN'"}'
```

### Subscribe
```bash
soccli graphql subscribe \
  --host localhost --port 36714 --path /graphql \
  --init-payload '{"Authorization":"Bearer '$GLOBAL_TOKEN'"}' \
  --query 'subscription { messageAdded { id text from } }'
```

## 4) JSON-RPC 2.0 over WebSocket

### Call method
```bash
soccli jsonrpc call \
  --host localhost --port 36715 --path /rpc \
  --method user.get --params '{"id":42}' \
  -H "Authorization: Bearer $GLOBAL_TOKEN"
```

### Interactive mode
```bash
soccli jsonrpc connect --host localhost --port 36715 --path /rpc -H "Authorization: Bearer $GLOBAL_TOKEN"
# server continuously emits event: updates
# then send:
# {"method":"user.get","params":{"id":5},"id":1}
# {"method":"math.sum","params":[1,2,3],"id":2}
# {"method":"message.publish","params":{"channel":"updates","payload":{"msg":"hi"}},"id":3}
```

## 5) STOMP over WebSocket

### Subscribe
```bash
soccli stomp subscribe \
  --host localhost --port 36716 --path /ws \
  --destination /topic/updates \
  --login ignored --passcode ignored \
  -H "Authorization: Bearer $GLOBAL_TOKEN"
```

### Interactive mode
```bash
soccli stomp connect \
  --host localhost --port 36716 --path /ws \
  --destination /topic/updates \
  --login ignored --passcode ignored \
  -H "Authorization: Bearer $GLOBAL_TOKEN"
# then send plain text to publish SEND frames
```

## 6) SignalR over WebSocket

### Invoke hub method
```bash
soccli signalr invoke \
  --host localhost --port 36717 --path /hub/chat \
  --target SendMessage --args '["hello", "general"]' \
  -H "Authorization: Bearer $GLOBAL_TOKEN"
```

### Connect and send interactive payloads
```bash
soccli signalr connect \
  --host localhost --port 36717 --path /hub/chat \
  -H "Authorization: Bearer $GLOBAL_TOKEN"
# server continuously pushes ticker events
```

## 7) MQTT over WebSocket

### Subscribe
```bash
soccli mqtt subscribe \
  --host localhost --port 36718 --path /mqtt \
  --client-id soccli-client \
  --topic sensors/temperature
```

### Publish (separate terminal)
```bash
soccli mqtt publish \
  --host localhost --port 36718 --path /mqtt \
  --client-id soccli-pub \
  --topic sensors/temperature --payload '{"value":24.3}'
```

## 8) WAMP over WebSocket

### Subscribe
```bash
soccli wamp subscribe \
  --host localhost --port 36720 --path /ws \
  --realm realm1 --topic com.example.topic
```

### Call
```bash
soccli wamp call \
  --host localhost --port 36720 --path /ws \
  --realm realm1 --procedure com.example.sum --args '[1,2,3]'
```

### Interactive actions
```bash
soccli wamp connect --host localhost --port 36720 --path /ws --realm realm1
# then send:
# {"action":"subscribe","topic":"com.example.topic"}
# {"action":"publish","topic":"com.example.topic","args":["hi"]}
# {"action":"call","procedure":"com.example.echo","args":["hello"]}
```

## 9) Pusher / Laravel Reverb

`REVERB_APP_ID` is pinned to `local` in `docker-compose.yml`, so the WS path is `/app/local`.
If you change `REVERB_APP_ID`, update to `/app/{REVERB_APP_ID}` in commands below.

### Subscribe private channel using broadcast auth
```bash
soccli pusher subscribe \
  --host localhost --port 36722 --path /app/local \
  --channel private-users.1 \
  --auth-endpoint http://localhost:36721/broadcasting/auth \
  --auth-header "Authorization: Bearer $LARAVEL_TOKEN"
```

### Connect only
```bash
soccli pusher connect "ws://localhost:36722/app/local?protocol=7&client=soccli&version=0.1.0"
```
