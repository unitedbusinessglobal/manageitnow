// Connector contract: each source maps its webhook payload to one delivery event.
// { kind, environment?, status?, summary?, data? } — or null to ignore.

const ENV_ALIASES = { production: 'prod', staging: 'uat', preview: 'qa', development: 'dev' };

function normEnv(name) {
  if (!name) return null;
  const n = String(name).toLowerCase();
  for (const e of ['dev', 'qa', 'uat', 'prod']) if (n === e || n.endsWith(`-${e}`)) return e;
  return ENV_ALIASES[n] ?? n;
}

const mappers = {
  github(headers, p) {
    const type = headers.get('x-github-event');
    if (type === 'pull_request') {
      return {
        kind: 'pull_request',
        status: p.pull_request?.merged ? 'merged' : p.action,
        summary: `PR #${p.number}: ${p.pull_request?.title ?? ''}`,
        data: { url: p.pull_request?.html_url, repo: p.repository?.full_name },
      };
    }
    if (type === 'deployment_status') {
      return {
        kind: 'deploy',
        environment: normEnv(p.deployment?.environment),
        status: p.deployment_status?.state,
        summary: `${p.repository?.full_name} → ${p.deployment?.environment}: ${p.deployment_status?.state}`,
        data: { sha: p.deployment?.sha, url: p.deployment_status?.target_url },
      };
    }
    if (type === 'workflow_run' && p.action === 'completed') {
      return {
        kind: 'build',
        status: p.workflow_run?.conclusion,
        summary: `${p.workflow_run?.name}: ${p.workflow_run?.conclusion}`,
        data: { url: p.workflow_run?.html_url, branch: p.workflow_run?.head_branch },
      };
    }
    return null;
  },

  // TestItNow posts { type: 'test_run.completed', run: { id, suite, passed, failed, url, environment } }
  testitnow(_headers, p) {
    if (p?.type !== 'test_run.completed' || !p.run) return null;
    const { passed = 0, failed = 0 } = p.run;
    return {
      kind: 'test_run',
      environment: normEnv(p.run.environment),
      status: failed > 0 ? 'failed' : 'passed',
      summary: `${p.run.suite ?? 'Test run'}: ${passed} passed, ${failed} failed`,
      data: p.run,
    };
  },
};

export function normalizeDeliveryEvent(provider, headers, payload) {
  const map = mappers[provider];
  return map ? map(headers, payload) : null;
}

export { normEnv };
