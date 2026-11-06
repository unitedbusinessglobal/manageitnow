import { db } from '../../../../lib/db';
import { currentUser, unauthorized } from '../../../../lib/auth';
import { summarizeStandups } from '../../../../lib/ai';

export const dynamic = 'force-dynamic';

// POST /api/ai/standup — { projectId, date?, locale? } → AI summary of that day's stand-ups.
export async function POST(request) {
  const user = currentUser(request);
  if (!user) return unauthorized();
  const b = await request.json();
  if (!b?.projectId) return Response.json({ error: 'projectId is required' }, { status: 400 });
  const sql = db();
  const [project] = await sql`SELECT p.name, o.ai_enabled FROM projects p JOIN organizations o ON o.id = p.org_id
                              WHERE p.id = ${b.projectId} AND p.org_id = ${user.orgId}`;
  if (!project) return Response.json({ error: 'project not found' }, { status: 404 });
  if (!project.ai_enabled) return Response.json({ error: 'AI is turned off for this workspace' }, { status: 403 });

  const standups = await sql`
    SELECT u.name, s.yesterday, s.today, s.blockers FROM standups s JOIN users u ON u.id = s.user_id
    WHERE s.project_id = ${b.projectId} AND s.for_date = COALESCE(${b.date ?? null}::date, current_date)`;
  if (!standups.length) return Response.json({ summary: null, message: 'No stand-ups yet for this date' });

  const locale = b.locale || 'en';
  const summary = await summarizeStandups({ projectName: project.name, standups, locale });
  await sql`INSERT INTO ai_outputs (org_id, project_id, kind, locale, content)
            VALUES (${user.orgId}, ${b.projectId}, 'standup_summary', ${locale}, ${summary})`;
  return Response.json({ summary });
}
