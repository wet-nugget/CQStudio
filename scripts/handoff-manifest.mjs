import { existsSync, readdirSync, writeFileSync } from 'node:fs';

const directories = ['.github', 'docs', 'public', 'runner', 'scripts', 'setup', 'src', 'supabase', 'tests'];
const roots = ['.env.example', '.gitignore', '.npmrc', '.nvmrc', '.node-version', 'START-HERE.md', 'GITHUB-PUSH.md', 'HANDOFF.md', 'README.md', 'index.html', 'package.json', 'package-lock.json', 'playwright.config.ts', 'tsconfig.json', 'vercel.json', 'vite.config.ts'];
const skipped = new Set(['node_modules', 'dist', '.git', '.aws', '.agents', '.codex', '.vercel', '.supabase', '.cq-deployment', '.temp', '.branches', 'private', 'test-results', 'coverage', 'playwright-report', 'backups']);
function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.isSymbolicLink() || skipped.has(entry.name)) return [];
    const path = `${directory}/${entry.name}`;
    if (entry.isDirectory()) return walk(path);
    if (entry.name.startsWith('.env') || /\.(?:log|dump|key|pem|p12|pfx|zip)$/.test(entry.name)) return [];
    return [path];
  });
}
for (const path of [...roots, ...directories]) {
  if (!existsSync(path)) throw new Error(`Cannot prepare an incomplete handoff: missing ${path}`);
}
const files = [...new Set([...roots, ...directories.flatMap(walk), 'setup/required-files.json'])].sort();
writeFileSync('setup/required-files.json', JSON.stringify({ description: 'Source files required in the GitHub handoff; generated/local/private files are excluded.', files }, null, 2) + '\n');
console.log(`Recorded ${files.length} handoff source files. No account access or Git staging performed.`);
