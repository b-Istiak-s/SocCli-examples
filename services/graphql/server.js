import { createServer } from 'node:http';
import { createYoga, createSchema } from 'graphql-yoga';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'soccli-dev-secret';
const port = Number(process.env.PORT || 36714);
const streamLimit = Number(process.env.GRAPHQL_STREAM_LIMIT || 25);
const streamDelayMs = Number(process.env.GRAPHQL_STREAM_DELAY_MS || 1000);
const insecureTesting = process.env.ALLOW_INSECURE_TESTING === 'true';

const schema = createSchema({
  typeDefs: /* GraphQL */ `
    type Message { id: ID!, text: String!, from: String! }
    type Query { ping: String! }
    type Subscription { messageAdded: Message! }
  `,
  resolvers: {
    Query: { ping: () => 'pong' },
    Subscription: {
      messageAdded: {
        subscribe: async function* (_root, _args, ctx) {
          const from = ctx?.user?.email || ctx?.user?.sub || 'anonymous';
          for (let i = 0; i < streamLimit; i += 1) {
            await new Promise((r) => setTimeout(r, streamDelayMs));
            yield { messageAdded: { id: String(i + 1), text: `hello-${i + 1}`, from } };
          }
        }
      }
    }
  }
});

const yoga = createYoga({
  schema,
  graphqlEndpoint: '/graphql',
  context: ({ request }) => {
    const auth = request.headers.get('authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token && !insecureTesting) throw new Error('Unauthorized');
    const user = token ? jwt.verify(token, JWT_SECRET) : { sub: 'guest', email: 'guest@local', scopes: ['graphql'] };
    if (!insecureTesting && (!Array.isArray(user.scopes) || !user.scopes.includes('graphql'))) throw new Error('Missing graphql scope');
    return { user };
  }
});

const server = createServer(yoga);
server.listen(port, () => console.log(`GraphQL WS on ${port}/graphql`));
