// Makes a GLB light enough for integrated graphics: meshopt geometry
// compression, WebP textures capped at 2048 px, duplicate data removed.
// Usage: npm run assets:optimize -- <input.glb> <output.glb> [maxTextureSize]
// (npm.cmd on Windows PowerShell). The input file is left untouched.
import { spawnSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const [input, output, size = '2048'] = process.argv.slice(2);
if (!input || !output) {
  console.log('Usage: npm run assets:optimize -- <input.glb> <output.glb> [maxTextureSize]');
  process.exit(1);
}
if (!existsSync(input)) {
  console.log(`Not found: ${input}`);
  process.exit(1);
}

const cli = join(import.meta.dirname, '..', 'node_modules', '@gltf-transform', 'cli', 'bin', 'cli.js');
const args = [
  cli, 'optimize', input, output,
  '--compress', 'meshopt',
  '--texture-compress', 'webp',
  '--texture-size', size,
  // Keep the artist's mesh as-is; simplification can visibly damage faces and hands
  '--simplify', 'false',
];
const r = spawnSync(process.execPath, args, { stdio: 'inherit' });
if (r.status !== 0) process.exit(r.status ?? 1);

const mb = (p) => (statSync(p).size / 1024 / 1024).toFixed(2);
console.log(`\n${input}: ${mb(input)} MB  ->  ${output}: ${mb(output)} MB`);
console.log('Next: list it in public/assets/manifest.json, then run npm run assets:check');
