import { t } from '../../lib/i18n';

// Delivery command center (MVP shell). Data wiring comes from /api/projects and delivery_events.
const sample = [
  { name: 'TestItNow v2', health: 'on_track', open: 18, overdue: 1, tests: 'passed', prod: 'v2.4.1' },
  { name: 'LeadItNow MVP', health: 'at_risk', open: 32, overdue: 5, tests: 'failed', prod: '—' },
];
const tone = { on_track: 'good', at_risk: 'warn', off_track: 'bad' };

export default function CommandCenter() {
  const L = 'en';
  return (
    <main>
      <h1>{t(L, 'nav.commandCenter')}</h1>
      <p className="lead">Sample data — connect a database and integrations to see live projects.</p>
      <table>
        <thead>
          <tr><th>Project</th><th>Health</th><th>Open items</th><th>Overdue</th><th>Latest tests</th><th>PROD version</th></tr>
        </thead>
        <tbody>
          {sample.map((p) => (
            <tr key={p.name}>
              <td>{p.name}</td>
              <td><span className={`pill ${tone[p.health]}`}>{t(L, `health.${p.health}`)}</span></td>
              <td>{p.open}</td>
              <td>{p.overdue}</td>
              <td><span className={`pill ${p.tests === 'passed' ? 'good' : 'bad'}`}>{p.tests}</span></td>
              <td>{p.prod}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
