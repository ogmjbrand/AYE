import { describe, expect, it } from 'vitest';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { MOTIONS, ONE_SHOT, WANTED } from './animationLibrary';

const DIR = 'public/assets/models/characters/rocketbox';

async function clipsIn(file: string): Promise<string[]> {
  await MeshoptDecoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
  const doc = await io.read(`${DIR}/${file}`);
  return doc.getRoot().listAnimations().map((a) => a.getName());
}

describe('animation library', () => {
  it('names only gesture clips that both body types really have', async () => {
    for (const body of ['feminine', 'masculine']) {
      const clips = await clipsIn(`gestures-${body}.glb`);
      for (const m of MOTIONS.filter((x) => x.source === 'gestures')) expect(clips, `${m.clip} in gestures-${body}`).toContain(m.clip);
      for (const c of ONE_SHOT) expect(clips).toContain(c);
    }
  }, 60_000);

  it('names only look clips that every built-in person has', async () => {
    const looks = Object.keys(import.meta.glob('../../public/assets/models/characters/rocketbox/*.glb')).map((k) => k.split('/').pop()!).filter((f) => !f.startsWith('gestures-'));
    expect(looks.length).toBeGreaterThan(10);
    for (const f of looks) {
      const clips = await clipsIn(f);
      for (const m of MOTIONS.filter((x) => x.source === 'look')) expect(clips, `${m.clip} in ${f}`).toContain(m.clip);
    }
  }, 120_000);

  it('says plainly what has no captured clip yet, and what would fill it', () => {
    const missing = MOTIONS.filter((m) => m.source === 'missing');
    expect(missing.length).toBeGreaterThan(0);
    for (const m of missing) expect(m.clip).toBeUndefined();
    expect(WANTED.map((w) => w.name)).toContain('ChangeClothes');
  });
});
