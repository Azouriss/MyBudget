import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: ['./src/db/schema.ts', './src/db/planningSchema.ts'],
  out: './src/db/migrations',
  dialect: 'sqlite',
  driver: 'expo',
});
