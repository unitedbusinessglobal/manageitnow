import { t } from '../lib/i18n';

export default function Home() {
  const L = 'en';
  const features = ['featureBoards', 'featureCommand', 'featureAi', 'featureIndia'];
  return (
    <main>
      <h1>{t(L, 'app.name')}</h1>
      <p className="lead">{t(L, 'app.tagline')}</p>
      <div className="grid">
        {features.map((f) => (
          <div className="card" key={f}>{t(L, `landing.${f}`)}</div>
        ))}
      </div>
      <p style={{ marginTop: 24 }}>
        <a className="btn" href="/app">{t(L, 'landing.cta')}</a>
      </p>
    </main>
  );
}
