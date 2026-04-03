import express from 'express';
import http from 'http';
import ws from 'ws';
import jwt from 'jsonwebtoken';
import StompServer from 'stomp-broker-js';

const JWT_SECRET = process.env.JWT_SECRET || 'soccli-dev-secret';
const port = Number(process.env.PORT || 36716);

const app = express();
app.get('/health', (_req, res) => res.json({ ok: true }));

const server = http.createServer(app);
const wsServer = new ws.Server({ server, path: '/ws' });

const stompServer = new StompServer({
  server,
  path: '/ws',
  protocol: 'ws',
  heartbeat: [2000, 2000]
});

stompServer.on('connecting', (sessionId, headers) => {
  const token = headers.Authorization?.replace('Bearer ', '') || headers.authorization?.replace('Bearer ', '');
  if (!token) throw new Error('Missing token');
  const payload = jwt.verify(token, JWT_SECRET);
  if (!Array.isArray(payload.scopes) || !payload.scopes.includes('stomp')) throw new Error('Missing stomp scope');
  console.log('stomp connected', sessionId);
});

stompServer.subscribe('/topic/updates', (msg, headers) => {
  console.log('recv', headers, msg);
  return true;
});

setInterval(() => {
  stompServer.send('/topic/updates', {}, JSON.stringify({ ts: Date.now(), text: 'tick' }));
}, 5000);

server.listen(port, () => console.log(`STOMP on ${port}/ws`));
