import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { jwt } from '@elysiajs/jwt';
// [BACKY_IMPORTS_START]
import { get_health } from './routes/get_health';
// [BACKY_IMPORTS_END]

const app = new Elysia()
  .use(cors())
  .use(
    jwt({
      name: 'jwt',
      secret: process.env.JWT_SECRET || 'backy-secret-key-123'
    })
  )
  .get('/', () => ({ message: 'Welcome to Backy API' }))
  // [BACKY_ROUTES_START]
  .use(get_health)
  // [BACKY_ROUTES_END]
  .listen(process.env.PORT || 4000);

console.log(`🚀 Server running at http://${app.server?.hostname}:${app.server?.port}`);
export type App = typeof app;
