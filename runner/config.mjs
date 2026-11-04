export function runnerHeaders(value, production = false) {
  const app = new URL(value || 'http://127.0.0.1:4173');
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(app.hostname);
  if (!['http:', 'https:'].includes(app.protocol) || app.protocol === 'http:' && !local || app.username || app.password || app.pathname !== '/' || app.search || app.hash)
    throw new Error('APP_ORIGIN must be an exact HTTPS origin without a path or credentials.');
  if (production && (!value || app.protocol !== 'https:' || local || /your_|example|fixture|\.test$|\.local$/i.test(app.hostname)))
    throw new Error('Set APP_ORIGIN to the real HTTPS main app address in the runner project.');
  const csp = `default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none'; frame-src blob:; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors ${app.origin}`;
  const headers = [['Content-Security-Policy', csp], ['X-Content-Type-Options', 'nosniff'], ['Referrer-Policy', 'no-referrer'], ['Strict-Transport-Security', 'max-age=63072000; includeSubDomains'], ['Permissions-Policy', 'camera=(), microphone=(), geolocation=()'], ['X-Robots-Tag', 'noindex, nofollow'], ['Cache-Control', 'no-cache']].map(([key, value]) => ({ key, value }));
  return { origin: app.origin, headers: [{ source: '/(.*)', headers }] };
}
