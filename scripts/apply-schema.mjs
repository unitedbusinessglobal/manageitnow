// Apply db/schema.sql and db/seed.sql to DATABASE_URL.  Usage: npm run db:schema
import { readFile } from 'node:fs/promises';
import { Pool } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
for (const file of ['db/schema.sql', 'db/seed.sql']) {
  const sql = await readFile(new URL(`../${file}`, import.meta.url), 'utf8');
  await pool.query(sql);
  console.log(`applied ${file}`);
}
await pool.end();
