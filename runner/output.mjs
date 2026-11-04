// Build Output API routes are consumed after the build. Tracked vercel.json
// files never need a user's local environment or prepared origin substitutions.
export function outputConfig(groups, spa = false) {
  const global = groups.find(group => group.source === '/(.*)');
  if (!global) throw new Error('Missing global security headers.');
  const headers = Object.fromEntries(global.headers.map(header => [header.key, header.value]));
  const assets = groups.find(group => group.source === '/assets/(.*)');
  const routes = [];
  if (assets) {
    routes.push({ src: '/assets/(.*)', headers: { ...headers, ...Object.fromEntries(assets.headers.map(header => [header.key, header.value])) }, continue: true });
    routes.push({ src: '/((?!assets/).*)', headers, continue: true });
  } else routes.push({ src: '/(.*)', headers, continue: true });
  routes.push({ handle: 'filesystem' });
  if (spa) routes.push({ src: '/((?!assets/|robots\\.txt$|favicon\\.svg$|health\\.json$).*)', dest: '/index.html' });
  return { version: 3, routes };
}
