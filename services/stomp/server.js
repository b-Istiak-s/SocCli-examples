import express from 'express';
import http from 'http';
import jwt from 'jsonwebtoken';
import StompServer from 'stomp-broker-js';

const JWT_SECRET = process.env.JWT_SECRET || 'soccli-dev-secret';
const port = Number(process.env.PORT || 36716);
const insecureTesting = process.env.ALLOW_INSECURE_TESTING === 'true';

const app = express();
app.get('/health', (_req, res) => res.json({ ok: true }));

const server = http.createServer(app);

const stompServer = new StompServer({
  server,
  path: '/ws',
  protocol: 'ws',
  heartbeat: [2000, 2000]
});

stompServer.on('connecting', (sessionId, headers = {}) => {
  try {
    const token = headers.Authorization?.replace('Bearer ', '') || headers.authorization?.replace('Bearer ', '');
    if (!token && !insecureTesting) throw new Error('Missing token');

    const payload = token ? jwt.verify(token, JWT_SECRET) : { scopes: ['stomp'] };
    if (!insecureTesting && (!Array.isArray(payload.scopes) || !payload.scopes.includes('stomp'))) {
      throw new Error('Missing stomp scope');
    }

    console.log('stomp connected', sessionId);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown STOMP auth error';
    console.error(`stomp auth rejected for session ${sessionId}: ${message}`);
    stompServer.send('/queue/errors', {}, JSON.stringify({ type: 'auth_error', message }));
    // Do not throw to avoid uncaught EventEmitter exception.
    return false;
  }

  return true;
});

stompServer.subscribe('/topic/updates', (msg, headers) => {
  console.log('recv', headers, msg);
  return true;
});

const ticker = setInterval(() => {
  stompServer.send('/topic/updates', {}, JSON.stringify({ ts: Date.now(), text: 'tick' }));
}, 5000);

function shutdown(signal) {
  console.log(`Received ${signal}, shutting down STOMP service...`);
  clearInterval(ticker);
  server.close(() => process.exit(0));
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

server.listen(port, () => console.log(`STOMP on ${port}/ws`));
