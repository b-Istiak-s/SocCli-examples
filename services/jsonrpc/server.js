import jwt from 'jsonwebtoken';
import { Server } from 'rpc-websockets';

const JWT_SECRET = process.env.JWT_SECRET || 'soccli-dev-secret';
const port = Number(process.env.PORT || 36715);

const server = new Server({ host: '0.0.0.0', port, path: '/rpc' });

server.setAuth(({ token }) => {
  if (!token) return false;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return Array.isArray(payload.scopes) && payload.scopes.includes('jsonrpc');
  } catch {
    return false;
  }
});

server.register('user.get', ({ id }) => ({ id, name: `user-${id}` })).protected();
server.register('math.sum', ([a, b, c = 0]) => a + b + c).protected();
server.register('message.publish', ({ channel = 'updates', payload = {} }) => ({ ok: true, channel, payload, ts: Date.now() })).protected();

server.event('updates');
setInterval(() => {
  server.emit('updates', { channel: 'updates', metric: Number((Math.random() * 100).toFixed(2)), ts: Date.now() });
}, 3000);

console.log(`JSON-RPC on ${port}/rpc`);
