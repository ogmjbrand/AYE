// Downloads the MakeHuman base mesh (CC0, from the MPFB repository) into assets-src/makehuman/base/.
// Usage: node scripts/makehuman/fetch-base.mjs
import { mkdirSync, writeFileSync } from 'node:fs';

const URL = 'https://raw.githubusercontent.com/makehumancommunity/mpfb2/master/src/mpfb/data/3dobjs/base.obj';
const dir = new globalThis.URL('../../assets-src/makehuman/base/', import.meta.url);
mkdirSync(dir, { recursive: true });
const res = await fetch(URL);
if (!res.ok) throw new Error(`Download failed: ${res.status}`);
const text = await res.text();
if (!text.includes('g body')) throw new Error('That does not look like the MakeHuman base mesh');
writeFileSync(new globalThis.URL('base.obj', dir), text);
console.log(`Saved base.obj (${(text.length / 1e6).toFixed(1)} MB) to assets-src/makehuman/base/`);
