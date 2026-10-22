import { memo, useEffect, useMemo, useRef } from 'react';
import type { PlayerHandle } from '../hooks/usePlayerController';
import type { District } from '../lib/geography';
import { WORLD_BOUND } from '../lib/world';

/** Metres shown from the player to the edge of the circle. */
const RADIUS_M = 22;
const SIZE = 100;

const KIND_COLOR: Record<string, string> = {
  food: '#f2a16d', shop: '#c5a5ee', workplace: '#82c7ec', home: '#78d4b5',
  public: '#c7cbd1', nightlife: '#f28cab', park: '#90cb79', dealership: '#e1bd72',
};

const scale = SIZE / (RADIUS_M * 2);

/**
 * A north-up circular map of the real district (streets, buildings, park, places), centred on the
 * player. The map layer is static SVG that is moved with a CSS transform, so tracking the player
 * every frame does not re-render React.
 */
export const Minimap = memo(function Minimap({ district, controller, tracked }: {
  district: District;
  controller: PlayerHandle;
  tracked?: { position: readonly [number, number, number] } | null;
}) {
  const worldRef = useRef<SVGGElement>(null);
  const arrowRef = useRef<SVGGElement>(null);
  const trackedRef = useRef(tracked);
  trackedRef.current = tracked;
  const markerRef = useRef<SVGCircleElement>(null);
  const { roadHalfWidth, crossStreet, buildings, park } = district.layout;
  const B = WORLD_BOUND;

  useEffect(() => {
    let raf = 0;
    let last = 0;
    const update = (now: number) => {
      raf = requestAnimationFrame(update);
      if (now - last < 66) return;
      last = now;
      const { x, z } = controller.position;
      worldRef.current?.setAttribute('transform', `translate(${SIZE / 2 - x * scale} ${SIZE / 2 - z * scale})`);
      // The controller heading is measured clockwise from +Z in the world plane
      arrowRef.current?.setAttribute('transform', `rotate(${(-controller.direction * 180) / Math.PI + 180} ${SIZE / 2} ${SIZE / 2})`);
      const target = trackedRef.current;
      const marker = markerRef.current;
      if (marker) {
        if (target) {
          const dx = (target.position[0] - x) * scale;
          const dz = (target.position[2] - z) * scale;
          const len = Math.hypot(dx, dz);
          const edge = SIZE / 2 - 6;
          const k = len > edge ? edge / len : 1;
          marker.setAttribute('cx', String(SIZE / 2 + dx * k));
          marker.setAttribute('cy', String(SIZE / 2 + dz * k));
          marker.setAttribute('visibility', 'visible');
        } else {
          marker.setAttribute('visibility', 'hidden');
        }
      }
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [controller]);

  const world = useMemo(() => (
    <>
      <rect x={-B * scale} y={-B * scale} width={B * 2 * scale} height={B * 2 * scale} fill="#2a323b" />
      <rect x={-roadHalfWidth * scale} y={-B * scale} width={roadHalfWidth * 2 * scale} height={B * 2 * scale} fill="#4a515b" />
      <rect x={-B * scale} y={crossStreet.minZ * scale} width={B * 2 * scale} height={(crossStreet.maxZ - crossStreet.minZ) * scale} fill="#4a515b" />
      <line x1={0} y1={-B * scale} x2={0} y2={B * scale} stroke="#d7b96e" strokeWidth="0.6" strokeDasharray="3 3" opacity="0.7" />
      {park && (
        <rect
          x={park.area.minX * scale} y={park.area.minZ * scale}
          width={(park.area.maxX - park.area.minX) * scale} height={(park.area.maxZ - park.area.minZ) * scale}
          fill="#3f6a4c" rx="2"
        />
      )}
      {buildings.map((b, index) => (
        <rect
          key={`${b.name ?? b.style}-${index}`}
          x={(b.position[0] - b.size[0] / 2) * scale} y={(b.position[2] - b.size[2] / 2) * scale}
          width={b.size[0] * scale} height={b.size[2] * scale}
          fill="#5b6470" stroke="#8b94a1" strokeWidth="0.5"
        />
      ))}
      {district.places.map((place) => (
        <circle key={place.id} cx={place.position[0] * scale} cy={place.position[2] * scale} r="2.1" fill={KIND_COLOR[place.kind] ?? '#fff'} stroke="#101215" strokeWidth="0.6" />
      ))}
    </>
  ), [B, roadHalfWidth, crossStreet, park, buildings, district.places]);

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-full" role="img" aria-label={`Minimap of ${district.name}`}>
      <defs>
        <clipPath id="aye-minimap-clip"><circle cx={SIZE / 2} cy={SIZE / 2} r={SIZE / 2} /></clipPath>
      </defs>
      <g clipPath="url(#aye-minimap-clip)">
        <g ref={worldRef}>{world}</g>
        <circle ref={markerRef} r="3.2" fill="#3b9dff" stroke="#fff" strokeWidth="1" visibility="hidden" />
        <g ref={arrowRef}>
          <polygon points={`${SIZE / 2},${SIZE / 2 - 6} ${SIZE / 2 - 4.2},${SIZE / 2 + 4} ${SIZE / 2},${SIZE / 2 + 1.6} ${SIZE / 2 + 4.2},${SIZE / 2 + 4}`} fill="#f4c65a" stroke="#1a1408" strokeWidth="0.8" />
        </g>
      </g>
    </svg>
  );
});
