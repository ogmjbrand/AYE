/**
 * Before you push: lists every file in the commits you're about to push that
 * GitHub would refuse (over 100 MB) or warn about (over 50 MB), and any file
 * under a folder that should never be committed ($dest, private assets, raw
 * CC5 exports).
 *
 *   npm run check:push              (commits not yet on your branch's upstream)
 *   npm run check:push -- origin/main   (commits not yet on origin/main)
 *
 * Exits with 1 if anything would be refused, so it can run as a pre-push hook.
 * It only reads: it never changes, removes or rewrites anything.
 */
import { execFileSync } from 'node:child_process';

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 28 }).trim();

const LIMIT = 100 * 1024 * 1024;
const WARN = 50 * 1024 * 1024;
// Paths that are never meant to be in Git, whatever their size
const NEVER = [/^\$dest\//, /^public\/assets\/private\/(?!README\.md$)/, /^assets-src\/cc5\/.*\.(glb|blend|log)$/, /\.env(\.|$)/];

function upstream() {
  const target = process.argv[2];
  if (target) return target;
  try { return git('rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'); } catch { return null; }
}

const base = upstream();
const range = base ? `${base}..HEAD` : 'HEAD';
const commits = git('rev-list', range).split('\n').filter(Boolean);
console.log(`Checking ${commits.length} commit(s) in ${range}`);

const seen = new Map();
for (const c of commits) {
  // Every file added or changed in this commit, with its blob
  const out = git('diff-tree', '-r', '--no-commit-id', '--root', '-m', c);
  for (const line of out.split('\n').filter(Boolean)) {
    const [meta, path] = line.split('\t');
    const blob = meta.split(' ')[3];
    if (!path || /^0+$/.test(blob)) continue;
    // Every version of every file: one that grows past the limit in a later commit is still refused
    if (!seen.has(blob)) seen.set(blob, { path, commit: c.slice(0, 8) });
  }
}

let refused = 0;
let warned = 0;
for (const [blob, { path, commit }] of seen) {
  const size = Number(git('cat-file', '-s', blob));
  const mb = (size / 1024 / 1024).toFixed(1);
  if (NEVER.some((re) => re.test(path))) { console.log(`  NEVER COMMIT  ${path} (${mb} MB, in ${commit})`); refused++; }
  else if (size > LIMIT) { console.log(`  TOO LARGE     ${path} (${mb} MB, in ${commit}): GitHub refuses files over 100 MB`); refused++; }
  else if (size > WARN) { console.log(`  large         ${path} (${mb} MB, in ${commit})`); warned++; }
}
console.log(refused ? `${refused} file(s) must come out of these commits before pushing.` : `OK: nothing over 100 MB and nothing private${warned ? ` (${warned} over 50 MB)` : ''}.`);
process.exit(refused ? 1 : 0);
