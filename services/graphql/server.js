import { createServer } from 'node:http';
import { createYoga, createSchema } from 'graphql-yoga';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'soccli-dev-secret';
const port = Number(process.env.PORT || 36714);

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
          for (let i = 0; i < 500; i += 1) {
            await new Promise((r) => setTimeout(r, 2000));
            yield { messageAdded: { id: String(i + 1), text: `hello-${i + 1}`, from: ctx.user.email } };
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
    if (!token) throw new Error('Unauthorized');
    const user = jwt.verify(token, JWT_SECRET);
    if (!Array.isArray(user.scopes) || !user.scopes.includes('graphql')) throw new Error('Missing graphql scope');
    return { user };
  }
});

const server = createServer(yoga);
server.listen(port, () => console.log(`GraphQL WS on ${port}/graphql`));
