// AI features: stand-up summaries, weekly reports, risk flags.
// AI drafts; humans approve anything that goes to a client.
import Anthropic from '@anthropic-ai/sdk';

const LANGUAGE_NAMES = { en: 'English', hi: 'Hindi', ta: 'Tamil', te: 'Telugu', kn: 'Kannada', mr: 'Marathi', bn: 'Bengali' };

let client;
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY is not set');
  client ??= new Anthropic();
  return client;
}

async function complete(system, user, maxTokens = 1200) {
  const msg = await getClient().messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5',
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  });
  return msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
}

/** Summarise a project's async stand-ups into one team update. */
export function summarizeStandups({ projectName, standups, locale = 'en' }) {
  const lang = LANGUAGE_NAMES[locale] || 'English';
  const lines = standups
    .map((s) => `- ${s.name}: yesterday: ${s.yesterday || '-'}; today: ${s.today || '-'}; blockers: ${s.blockers || 'none'}`)
    .join('\n');
  return complete(
    `You write short team stand-up summaries for a project management tool. Write in ${lang}. ` +
      'Use three short sections: Progress, Today, Blockers. Name the person for each blocker. ' +
      'Do not invent anything that is not in the updates.',
    `Project: ${projectName}\nStand-up updates:\n${lines}`,
    600,
  );
}

/** Draft a client-ready weekly status report from items and delivery events. */
export function draftWeeklyReport({ projectName, items, events, locale = 'en' }) {
  const lang = LANGUAGE_NAMES[locale] || 'English';
  return complete(
    `You draft weekly project status reports for clients. Write in ${lang}. ` +
      'Sections: Summary (2 sentences), Done this week, In progress, Risks, Next week. ' +
      'Include test and deployment highlights when present. Only use the data given.',
    `Project: ${projectName}\nItems (JSON):\n${JSON.stringify(items)}\nDelivery events (JSON):\n${JSON.stringify(events)}`,
  );
}

/**
 * Rule-based risk flags (cheap, no AI call). The AI report can explain them.
 * @returns {{kind:string, itemId?:string, message:string}[]}
 */
export function riskFlags({ items, events = [], today = new Date() }) {
  const day = today.toISOString().slice(0, 10);
  const flags = [];
  for (const it of items) {
    if (it.due_date && it.due_date < day && it.status !== 'done') {
      flags.push({ kind: 'overdue', itemId: it.id, message: `"${it.title}" is past its due date` });
    }
    if (it.status === 'blocked') {
      flags.push({ kind: 'blocked', itemId: it.id, message: `"${it.title}" is blocked` });
    }
  }
  const lastTest = events.filter((e) => e.kind === 'test_run').sort((a, b) => (a.occurred_at < b.occurred_at ? 1 : -1))[0];
  if (lastTest && lastTest.status === 'failed') {
    flags.push({ kind: 'tests_failing', message: 'The latest test run failed' });
  }
  const load = {};
  for (const it of items) if (it.assignee_id && it.status !== 'done') load[it.assignee_id] = (load[it.assignee_id] || 0) + 1;
  for (const [userId, count] of Object.entries(load)) {
    if (count > 15) flags.push({ kind: 'overloaded', message: `User ${userId} has ${count} open items` });
  }
  return flags;
}
