import { describe, it, expect } from 'vitest';
import { normalizeDeliveryEvent, normEnv } from '../lib/connectors.js';
import { riskFlags } from '../lib/ai.js';

const h = (event) => new Headers({ 'x-github-event': event });

describe('connectors', () => {
  it('maps a GitHub deployment to a deploy event', () => {
    const evt = normalizeDeliveryEvent('github', h('deployment_status'), {
      repository: { full_name: 'unitedbusinessglobal/manageitnow' },
      deployment: { environment: 'Production', sha: 'abc' },
      deployment_status: { state: 'success' },
    });
    expect(evt).toMatchObject({ kind: 'deploy', environment: 'prod', status: 'success' });
  });

  it('maps a TestItNow run with failures', () => {
    const evt = normalizeDeliveryEvent('testitnow', new Headers(), { type: 'test_run.completed', run: { suite: 'API', passed: 40, failed: 2 } });
    expect(evt).toMatchObject({ kind: 'test_run', status: 'failed' });
  });

  it('normalises environment names', () => {
    expect(normEnv('manageitnow-qa')).toBe('qa');
    expect(normEnv('staging')).toBe('uat');
  });
});

describe('riskFlags', () => {
  it('flags overdue, blocked and failing tests', () => {
    const flags = riskFlags({
      today: new Date('2026-11-05T00:00:00Z'),
      items: [
        { id: '1', title: 'Login page', status: 'in_progress', due_date: '2026-11-01' },
        { id: '2', title: 'GST invoice', status: 'blocked' },
      ],
      events: [{ kind: 'test_run', status: 'failed', occurred_at: '2026-11-04T10:00:00Z' }],
    });
    expect(flags.map((f) => f.kind).sort()).toEqual(['blocked', 'overdue', 'tests_failing']);
  });
});
