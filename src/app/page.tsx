/**
 * Placeholder root page.
 *
 * The previous UI was deleted for a rebuild. This exists only so the project
 * still builds and `npm run dev` still serves something — replace it with the
 * real homepage.
 *
 * The logic layer in src/lib is untouched and ready to import:
 *   materials.ts  crypto.ts  pricing.ts  matching.ts  epr.ts
 *   db.ts  i18n.ts  speech.ts  classifier.ts  export.ts
 *
 * Previous UI is recoverable: `git show e8b781f:src/app/page.tsx`
 */
export default function Home() {
  return (
    <main style={{ padding: '4rem 1.5rem', maxWidth: '42rem', margin: '0 auto' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
        Kabadiwala Connect
      </h1>
      <p style={{ marginTop: '0.75rem', color: 'rgb(var(--muted))' }}>
        UI removed for rebuild. The logic layer in <code>src/lib</code> is intact.
      </p>
      <p style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: 'rgb(var(--muted))' }}>
        Previous UI is in git at commit <code>e8b781f</code>.
      </p>
    </main>
  );
}
