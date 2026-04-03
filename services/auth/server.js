import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'soccli-dev-secret';
const supportedScopes = ['raw', 'socketio', 'graphql', 'jsonrpc', 'stomp', 'signalr', 'mqtt', 'wamp', 'pusher'];

// Single shared identity used across all protocols.
const sharedUser = {
  id: 1,
  email: process.env.SHARED_USER_EMAIL || 'soccli-user@example.com',
  name: process.env.SHARED_USER_NAME || 'SocCli Shared User',
  role: 'user'
};

function issueToken() {
  return jwt.sign(
    {
      sub: String(sharedUser.id),
      email: sharedUser.email,
      name: sharedUser.name,
      role: sharedUser.role,
      scopes: supportedScopes
    },
    JWT_SECRET,
    { expiresIn: '8h', issuer: 'soccli-auth' }
  );
}

app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/users', (_req, res) => res.json([sharedUser]));

// Keep /token and /token-all for compatibility; both return same shared user + all scopes.
app.post('/token', (_req, res) => {
  const token = issueToken();
  res.json({ token, user: sharedUser, scopes: supportedScopes, mode: 'shared-user-all-protocols' });
});

app.post('/token-all', (_req, res) => {
  const token = issueToken();
  res.json({ token, user: sharedUser, scopes: supportedScopes, mode: 'shared-user-all-protocols' });
});

const port = process.env.PORT || 36711;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Auth API listening on ${port}`);
});
