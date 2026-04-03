import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'soccli-dev-secret';
const port = Number(process.env.PORT || 36713);

const httpServer = createServer();
const io = new Server(httpServer, { path: '/socket.io/' });

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
    if (!token) throw new Error('Missing token');
    socket.data.user = jwt.verify(token, JWT_SECRET);
    if (!Array.isArray(socket.data.user.scopes) || !socket.data.user.scopes.includes('socketio')) throw new Error('Missing socketio scope');
    next();
  } catch {
    next(new Error('unauthorized'));
  }
});

io.on('connection', (socket) => {
  socket.emit('welcome', { user: socket.data.user.email, protocol: 'socket.io', channels: ['message', 'ticker'] });

  socket.on('message', (payload) => {
    io.emit('message', { from: socket.data.user.email, payload, ts: Date.now() });
  });

  socket.on('join', (room) => socket.join(room));
  socket.on('room:message', ({ room, payload }) => io.to(room).emit('room:message', { room, payload, by: socket.data.user.email }));
});

setInterval(() => {
  io.emit('ticker', { channel: 'ticker', value: Number((Math.random() * 100).toFixed(2)), ts: Date.now() });
}, 3000);

httpServer.listen(port, () => console.log(`Socket.IO on ${port}`));
