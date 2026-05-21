import { Elysia, t } from 'elysia';

export const get_health = new Elysia()
  .get('/health', ({ body, query }) => {
    // [BACKY_LOGIC_START]
    return {
      status: "ok",
      uptime: process.uptime()
    };
    // [BACKY_LOGIC_END]
  }, {
    // [BACKY_SCHEMA_START]
    query: t.Object({}),
    body: t.Object({}),
    response: t.Object({
      status: t.String(),
      uptime: t.Number()
    })
    // [BACKY_SCHEMA_END]
  });
