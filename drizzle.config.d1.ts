import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/config/db/schema-d1.ts',
  out: './migrations/d1',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: '500c3690-f178-4f9a-936d-707c0ea67fc4',
    token: process.env.CLOUDFLARE_API_TOKEN!,
  },
});
