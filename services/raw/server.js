import { WebSocketServer } from 'ws';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'soccli-dev-secret';
const port = Number(process.env.PORT || 36712);

const wss = new WebSocketServer({ port, path: '/ws' });

wss.on('connection', (ws, req) => {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

  try {
    if (!token) throw new Error('Missing token');
    const payload = jwt.verify(token, JWT_SECRET);
    if (!Array.isArray(payload.scopes) || !payload.scopes.includes('raw')) throw new Error('Missing raw scope');
    ws.send(JSON.stringify({ type: 'welcome', protocol: 'raw', user: payload.email }));
  } catch {
    ws.close(4401, 'Unauthorized');
    return;
  }

  ws.on('message', (data) => {
    ws.send(JSON.stringify({ type: 'echo', received: data.toString(), at: new Date().toISOString() }));
  });
});

console.log(`Raw ws listening on :${port}/ws`);
