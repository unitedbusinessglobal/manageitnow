import { db } from '../../../lib/db';

export const dynamic = 'force-dynamic';

// GET /api/health — app status plus a live Neon check (connection, server time, schema present).
export async function GET() {
  const body = { ok: true, service: 'manageitnow', env: process.env.APP_ENV || 'dev' };

  if (!process.env.DATABASE_URL) {
    body.db = { configured: false };
    return Response.json(body);
  }

  const started = Date.now();
  try {
    const sql = db();
    const [row] = await sql`
      SELECT now() AS server_time,
             current_database() AS database,
             to_regclass('public.plans') IS NOT NULL AS schema_applied,
             (SELECT count(*)::int FROM pg_tables WHERE schemaname = 'public') AS tables`;
    body.db = {
      configured: true,
      connected: true,
      latencyMs: Date.now() - started,
      database: row.database,
      serverTime: row.server_time,
      schemaApplied: row.schema_applied,
      tables: row.tables,
    };
    if (row.schema_applied) {
      const [p] = await sql`SELECT count(*)::int AS plans FROM plans`;
      body.db.plans = p.plans;
    }
  } catch (e) {
    body.ok = false;
    body.db = { configured: true, connected: false, error: String(e.message || e).slice(0, 200) };
  }
  return Response.json(body, { status: body.ok ? 200 : 503 });
}
