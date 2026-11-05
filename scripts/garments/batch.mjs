// Drape one GarmentCode garment on several Rocketbox bodies, one skinned GLB per body, and
// write a review sheet. Nothing lands in public/ until you copy the reviewed files there and
// list them in src/lib/garmentRegistry.ts (keep generated assets apart until they are checked).
//
//   node scripts/garments/batch.mjs scripts/garments/jobs/<garment>.json <out dir>
//
// The job file:
//   { "id": "pencil-dress-tangerine", "boxmesh": ".../pencil_dress_boxmesh.obj",
//     "lens": ".../pencil_dress_orig_lens.pickle", "gcBody": ".../mean_female.obj",
//     "color": "#e8701e", "fit": 0.86, "frames": 120, "python": ".../bin/python",
//     "looks": ["female-adult-08", "female-adult-03"] }
// Paths may use ${NAME} for environment variables (GARMENTCODE, GC_OUT, BPY_PYTHON).
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [jobPath, outDir] = process.argv.slice(2);
if (!jobPath || !outDir) {
  console.error('usage: node scripts/garments/batch.mjs <job.json> <out dir>');
  process.exit(1);
}
const expand = (v) => (typeof v === 'string' ? v.replace(/\$\{(\w+)\}/g, (_, k) => process.env[k] ?? '') : v);
const job = Object.fromEntries(Object.entries(JSON.parse(readFileSync(jobPath, 'utf8'))).map(([k, v]) => [k, expand(v)]));
const root = join(import.meta.dirname, '..', '..');
const work = join(outDir, 'work');
mkdirSync(work, { recursive: true });

const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 1 << 26 });
  return { ok: r.status === 0, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
};

const sheet = [];
for (const look of job.looks) {
  const src = join(root, 'public/assets/models/characters/rocketbox', `${look}.glb`);
  if (!existsSync(src)) { sheet.push({ look, status: 'no such person' }); continue; }
  const plain = join(work, `${look}.plain.glb`);
  const raw = join(work, `${look}.raw.glb`);
  const preview = join(outDir, `${look}.png`);
  const final = join(outDir, `${look}.glb`);
  console.log(`\n== ${job.id} on ${look}`);
  let r = run(process.execPath, [join(root, 'scripts/garments/decompress-glb.mjs'), src, plain]);
  if (!r.ok) { sheet.push({ look, status: 'decompress failed', log: r.out.slice(-400) }); continue; }
  r = run(job.python, [join(root, 'scripts/garments/drape-in-blender.py'), '--body', plain, '--garment', job.boxmesh, '--lens', job.lens,
    '--gc-body', job.gcBody, '--color', job.color, '--out', raw, '--frames', String(job.frames ?? 120), '--fit', String(job.fit ?? 1), '--preview', preview]);
  const fit = r.out.match(/^fit: .*$/m)?.[0] ?? '';
  const seams = r.out.match(/^seams: \d+ edges still.*$/m)?.[0] ?? '';
  // Blender as a Python module can crash on exit after writing everything: the written file and
  // its "wrote" line are what count
  if (!existsSync(raw) || !/^wrote /m.test(r.out)) { sheet.push({ look, status: 'drape failed', log: r.out.slice(-600) }); continue; }
  r = run(process.execPath, [join(root, 'scripts/optimize-glb.mjs'), raw, final]);
  if (!r.ok) { sheet.push({ look, status: 'optimise failed', log: r.out.slice(-400) }); continue; }
  const inside = Number(fit.match(/fit: (\d+) of/)?.[1] ?? NaN);
  // The count of cloth points inside the body misses the person's own clothes showing through
  // the garment: every preview must still be looked at
  sheet.push({ look, status: inside === 0 ? 'look at the preview' : `check: ${inside} vertices inside the body`, fit, seams, glb: final, preview });
  console.log(fit);
}
writeFileSync(join(outDir, 'review.json'), JSON.stringify({ id: job.id, sheet }, null, 2));
console.log(`\nreview sheet: ${join(outDir, 'review.json')}`);
for (const s of sheet) console.log(`${s.look.padEnd(20)} ${s.status}`);
