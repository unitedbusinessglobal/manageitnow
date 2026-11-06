// Neon PostgreSQL access. Every query on tenant data must filter by org_id.
import { neon } from '@neondatabase/serverless';

let sql;
export function db() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  sql ??= neon(process.env.DATABASE_URL);
  return sql;
}
