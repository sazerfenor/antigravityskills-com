import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/config/db/schema.sqlite.ts',
  out: './migrations/turso',
  dialect: 'turso',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    authToken: process.env.DATABASE_AUTH_TOKEN!,
  },
});
