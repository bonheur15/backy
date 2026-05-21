import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

// [BACKY_SCHEMA_START]
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: text('created_at').default(new Date().toISOString()),
});
// [BACKY_SCHEMA_END]
