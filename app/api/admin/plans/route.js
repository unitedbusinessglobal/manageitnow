import { db } from '../../../../lib/db';
import { currentUser, isPlatformAdmin, unauthorized } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/admin/plans — all plans, for the admin pricing screen.
export async function GET(request) {
  const user = currentUser(request);
  if (!isPlatformAdmin(user)) return unauthorized();
  const rows = await db()`SELECT * FROM plans ORDER BY price_paise`;
  return Response.json({ plans: rows });
}

// PUT /api/admin/plans — { id, price_paise?, max_users?, max_projects?, features?, billing_cycle?, is_public?, active? }
// Applies to new subscriptions and renewals; active billing periods keep their price.
export async function PUT(request) {
  const user = currentUser(request);
  if (!isPlatformAdmin(user)) return unauthorized();
  const b = await request.json();
  if (!b?.id) return Response.json({ error: 'id is required' }, { status: 400 });
  if (b.price_paise != null && (!Number.isInteger(b.price_paise) || b.price_paise < 0)) {
    return Response.json({ error: 'price_paise must be a non-negative integer' }, { status: 400 });
  }
  const sql = db();
  const [old] = await sql`SELECT * FROM plans WHERE id = ${b.id}`;
  if (!old) return Response.json({ error: 'plan not found' }, { status: 404 });

  const [plan] = await sql`
    UPDATE plans SET
      price_paise   = COALESCE(${b.price_paise ?? null}, price_paise),
      max_users     = COALESCE(${b.max_users ?? null}, max_users),
      max_projects  = COALESCE(${b.max_projects ?? null}, max_projects),
      features      = COALESCE(${b.features ? JSON.stringify(b.features) : null}::jsonb, features),
      billing_cycle = COALESCE(${b.billing_cycle ?? null}, billing_cycle),
      is_public     = COALESCE(${b.is_public ?? null}, is_public),
      active        = COALESCE(${b.active ?? null}, active),
      razorpay_plan_id = CASE WHEN ${b.price_paise ?? null}::bigint IS NOT NULL
                              AND ${b.price_paise ?? null}::bigint <> price_paise THEN NULL ELSE razorpay_plan_id END,
      updated_at    = now()
    WHERE id = ${b.id}
    RETURNING *`;

  await sql`
    INSERT INTO rate_change_audit (changed_by, target, target_id, old_value, new_value)
    VALUES (${user.id}, 'plan', ${plan.id}, ${JSON.stringify(old)}::jsonb, ${JSON.stringify(plan)}::jsonb)`;

  // A cleared razorpay_plan_id means a new Razorpay plan is created on the next checkout (Razorpay plans are immutable).
  return Response.json({ plan });
}
