import { db } from '../../../lib/db';
import { currentUser, unauthorized } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/projects — projects in the caller's org with open/overdue counts.
export async function GET(request) {
  const user = currentUser(request);
  if (!user) return unauthorized();
  const sql = db();
  const rows = await sql`
    SELECT p.id, p.name, p.health, p.due_date,
           count(i.*) FILTER (WHERE i.status <> 'done')                                  AS open_items,
           count(i.*) FILTER (WHERE i.status <> 'done' AND i.due_date < current_date)     AS overdue_items
    FROM projects p
    LEFT JOIN items i ON i.project_id = p.id
    WHERE p.org_id = ${user.orgId}
    GROUP BY p.id
    ORDER BY p.created_at DESC`;
  return Response.json({ projects: rows });
}

// POST /api/projects — { workspaceId, name, description?, dueDate? }
export async function POST(request) {
  const user = currentUser(request);
  if (!user) return unauthorized();
  const body = await request.json();
  if (!body?.name || !body?.workspaceId) {
    return Response.json({ error: 'name and workspaceId are required' }, { status: 400 });
  }
  const sql = db();
  const [project] = await sql`
    INSERT INTO projects (org_id, workspace_id, name, description, due_date, owner_id)
    VALUES (${user.orgId}, ${body.workspaceId}, ${body.name}, ${body.description ?? null}, ${body.dueDate ?? null}, ${user.id})
    RETURNING *`;
  return Response.json({ project }, { status: 201 });
}
