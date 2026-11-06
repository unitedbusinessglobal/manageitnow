import { db } from '../../../lib/db';
import { currentUser, unauthorized } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/items?projectId=… — items for one project (board/table/list views share this).
export async function GET(request) {
  const user = currentUser(request);
  if (!user) return unauthorized();
  const projectId = new URL(request.url).searchParams.get('projectId');
  if (!projectId) return Response.json({ error: 'projectId is required' }, { status: 400 });
  const sql = db();
  const items = await sql`
    SELECT * FROM items
    WHERE org_id = ${user.orgId} AND project_id = ${projectId}
    ORDER BY status, position`;
  return Response.json({ items });
}

// POST /api/items — { projectId, title, status?, priority?, assigneeId?, dueDate?, parentId? }
export async function POST(request) {
  const user = currentUser(request);
  if (!user) return unauthorized();
  const b = await request.json();
  if (!b?.projectId || !b?.title) return Response.json({ error: 'projectId and title are required' }, { status: 400 });
  const sql = db();
  const [item] = await sql`
    INSERT INTO items (org_id, project_id, parent_id, title, status, priority, assignee_id, due_date, source, created_by)
    VALUES (${user.orgId}, ${b.projectId}, ${b.parentId ?? null}, ${b.title}, ${b.status ?? 'todo'},
            ${b.priority ?? 'medium'}, ${b.assigneeId ?? null}, ${b.dueDate ?? null}, 'native', ${user.id})
    RETURNING *`;
  return Response.json({ item }, { status: 201 });
}
