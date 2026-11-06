import { db } from '../../../../lib/db';
import { currentUser, isPlatformAdmin, unauthorized } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/admin/customer-pricing?orgId=… — customer-specific rates.
export async function GET(request) {
  const user = currentUser(request);
  if (!isPlatformAdmin(user)) return unauthorized();
  const orgId = new URL(request.url).searchParams.get('orgId');
  const sql = db();
  const rows = orgId
    ? await sql`SELECT cp.*, o.name AS org_name, p.code AS plan_code FROM customer_pricing cp
                JOIN organizations o ON o.id = cp.org_id JOIN plans p ON p.id = cp.plan_id
                WHERE cp.org_id = ${orgId} ORDER BY cp.valid_from DESC`
    : await sql`SELECT cp.*, o.name AS org_name, p.code AS plan_code FROM customer_pricing cp
                JOIN organizations o ON o.id = cp.org_id JOIN plans p ON p.id = cp.plan_id
                ORDER BY o.name, cp.valid_from DESC`;
  return Response.json({ customerPricing: rows });
}

// POST /api/admin/customer-pricing — { orgId, planId, price_paise? | discount_percent?, features?, notes?, valid_from?, valid_until? }
// The rate stays with the customer until an admin changes it or valid_until passes.
export async function POST(request) {
  const user = currentUser(request);
  if (!isPlatformAdmin(user)) return unauthorized();
  const b = await request.json();
  if (!b?.orgId || !b?.planId) return Response.json({ error: 'orgId and planId are required' }, { status: 400 });
  if (b.price_paise == null && b.discount_percent == null && !b.features) {
    return Response.json({ error: 'set price_paise, discount_percent or features' }, { status: 400 });
  }
  if (b.price_paise != null && b.discount_percent != null) {
    return Response.json({ error: 'use either price_paise or discount_percent, not both' }, { status: 400 });
  }
  const sql = db();
  const [row] = await sql`
    INSERT INTO customer_pricing (org_id, plan_id, price_paise, discount_percent, features, notes, valid_from, valid_until)
    VALUES (${b.orgId}, ${b.planId}, ${b.price_paise ?? null}, ${b.discount_percent ?? null},
            ${b.features ? JSON.stringify(b.features) : null}::jsonb, ${b.notes ?? null},
            COALESCE(${b.valid_from ?? null}::date, current_date), ${b.valid_until ?? null})
    RETURNING *`;
  await sql`
    INSERT INTO rate_change_audit (changed_by, target, target_id, old_value, new_value)
    VALUES (${user.id}, 'customer_pricing', ${row.id}, NULL, ${JSON.stringify(row)}::jsonb)`;
  return Response.json({ customerPricing: row }, { status: 201 });
}
