import { Suspense, useEffect, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { ACESFilmicToneMapping, type OrthographicCamera } from 'three';
import { MhFigure } from './MhFigure';
import { FEMININE_SHAPE_PRESETS, presetFor, type BodyShape } from '../../lib/bodyShape';
import type { MhHair } from '../../lib/mhBody';

/** Each figure's skin and hair on the chart, so the line-up shows real variety (you choose your own skin and hair later). */
const LOOK: Record<string, { tone: number; hair: MhHair }> = {
  slim: { tone: 0.9, hair: 'crop' },
  average: { tone: 0.55, hair: 'puff' },
  athletic: { tone: 1, hair: 'bun' },
  curvy: { tone: 0.6, hair: 'puff' },
  hourglass: { tone: 0.35, hair: 'bun' },
  full: { tone: 0.75, hair: 'afro' },
  'plus-curvy': { tone: 0.85, hair: 'afro' },
};

const GAP = 0.7;

/** Zooms the orthographic camera so the whole line-up fits the panel, whatever its size. */
function fit(cam: OrthographicCamera, width: number, height: number, span: number) {
  cam.zoom = Math.min(width / (span + 0.95), height / 1.95);
  cam.updateProjectionMatrix();
}
function FitWidth({ span }: { span: number }) {
  const { camera, size } = useThree();
  useEffect(() => fit(camera as OrthographicCamera, size.width, size.height, span), [camera, size, span]);
  return null;
}

/**
 * Women's body types as a line-up of 3D figures in a black two-piece (like a
 * body-type chart). Click a figure, or its label, to choose that body.
 */
export function BodyTypeChart({ shape, onPick }: { shape: BodyShape; onPick: (s: BodyShape) => void }) {
  const chosen = presetFor(shape, 'feminine')?.id;
  const [hover, setHover] = useState<string | null>(null);
  const list = FEMININE_SHAPE_PRESETS;
  const mid = ((list.length - 1) * GAP) / 2;
  return (
    <div>
      <div className="relative h-56 overflow-hidden rounded-xl border border-cc-line bg-gradient-to-b from-[#e9e6e1] to-[#cfcac2] sm:h-64">
        <Canvas
          orthographic
          dpr={[1, 1.5]}
          camera={{ position: [0, 0.9, 6], zoom: 105, near: 0.1, far: 20 }}
          gl={{ antialias: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
          onCreated={({ camera }) => camera.lookAt(0, 0.86, 0)}
          aria-hidden
        >
          <FitWidth span={(list.length - 1) * GAP} />
          <hemisphereLight args={['#fff6ec', '#8a8078', 1.0]} />
          <directionalLight position={[1.5, 3, 4]} intensity={2.4} />
          <directionalLight position={[-2, 2, 2]} intensity={0.8} />
          <Suspense fallback={null}>
            {list.map((p, i) => (
              <group key={p.id} position={[i * GAP - mid, 0, 0]}
                onClick={(e) => { e.stopPropagation(); onPick(p.shape); }}
                onPointerOver={(e) => { e.stopPropagation(); setHover(p.id); }}
                onPointerOut={() => setHover((h) => (h === p.id ? null : h))}
              >
                <MhFigure shape={p.shape} skinTone={LOOK[p.id]?.tone ?? 0.7} hair={LOOK[p.id]?.hair ?? 'afro'} />
                {(chosen === p.id || hover === p.id) && (
                  <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
                    <ringGeometry args={[0.2, 0.235, 40]} />
                    <meshBasicMaterial color={chosen === p.id ? '#c9a45c' : '#8a8378'} />
                  </mesh>
                )}
              </group>
            ))}
          </Suspense>
        </Canvas>
      </div>
      <div className="mt-2 grid gap-1" style={{ gridTemplateColumns: `repeat(${list.length}, minmax(0, 1fr))` }} role="radiogroup" aria-label="Body type">
        {list.map((p) => (
          <button key={p.id} type="button" role="radio" aria-checked={chosen === p.id} onClick={() => onPick(p.shape)}
            className={`truncate rounded-md border px-1 py-1 text-[10px] leading-tight transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-cc-gold ${chosen === p.id ? 'border-cc-gold bg-cc-gold/10 text-cc-ink' : 'border-cc-line text-cc-muted hover:text-cc-ink'}`}>
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
