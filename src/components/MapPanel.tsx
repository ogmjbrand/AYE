import { useEffect, useState } from 'react';
import type { PlayerHandle } from '../hooks/usePlayerController';
import type { District, PlaceKind } from '../lib/geography';
import { WORLD_BOUND } from '../lib/world';
import { compass } from '../lib/locations';
import { MapPin, X } from 'lucide-react';
import { DirectoryIcon } from './DirectoryIcon';

const KIND_COLOR: Record<PlaceKind, string> = {
  food: '#f0a35e',
  shop: '#c39be0',
  workplace: '#8ab4d8',
  home: '#7cc4b0',
  public: '#a4a7ad',
  nightlife: '#d4a3b9',
  park: '#b4a77a',
};
const KIND_LABEL: Record<PlaceKind, string> = { food: 'Food', shop: 'Shops', workplace: 'Work', home: 'Homes', public: 'Public', nightlife: 'Nightlife', park: 'Parks' };
const KIND_ICON = { food: 'food', shop: 'shopping', workplace: 'workplaces', home: 'stays', public: 'travel', nightlife: 'nightlife', park: 'recreation' } as const;

/**
 * Smartphone map of the district: buildings, roads, every place, your home and
 * where you are, plus a list of places by distance.
 */
export function MapPanel({ district, controller, homePlaceId, onClose }: {
  district: District;
  controller: PlayerHandle;
  homePlaceId: string | null;
  onClose: () => void;
}) {
  const [, setFrame] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setFrame((n) => n + 1), 250);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' || e.key.toLowerCase() === 'm') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { clearInterval(id); window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const { x, z } = controller.position;
  const places = district.places
    .map((p) => ({ ...p, dist: Math.hypot(p.position[0] - x, p.position[2] - z) }))
    .sort((a, b) => a.dist - b.dist);
  const B = WORLD_BOUND;
  const { roadHalfWidth: ROAD_HALF_WIDTH, crossStreet: CROSS_STREET, buildings } = district.layout;
  // Map x is mirrored so east (-x) is on the right, matching the compass
  const mx = (v: number) => -v;
  const my = (v: number) => -v;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="map-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-ui-line bg-ui-panel text-ui-ink shadow-2xl sm:max-w-3xl sm:flex-row sm:rounded-2xl"
      >
        <div className="relative shrink-0 p-4 sm:w-[26rem]">
          <div className="mb-2 flex items-center justify-between">
            <h2 id="map-title" className="m-0 flex items-center gap-2 font-display text-xl font-bold">
              <MapPin size={20} aria-hidden="true" className="text-ui-accent-strong" />{district.name}, {district.city.name}
            </h2>
            <button type="button" onClick={onClose} aria-label="Close map" title="Close map" className="rounded p-2 text-ui-muted hover:text-ui-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent"><X size={16} /></button>
          </div>
          <svg viewBox={`${-B} ${-B} ${2 * B} ${2 * B}`} className="aspect-square w-full rounded-xl bg-[#1d2126]" role="img" aria-label={`Map of ${district.name}. You are the white arrow.`}>
            <rect x={-ROAD_HALF_WIDTH} y={-B} width={ROAD_HALF_WIDTH * 2} height={2 * B} fill="#3a3f46" />
            <rect x={-B} y={my(CROSS_STREET.maxZ)} width={2 * B} height={CROSS_STREET.maxZ - CROSS_STREET.minZ} fill="#3a3f46" />
            {buildings.map((b, i) => (
              <rect key={i} x={mx(b.position[0]) - b.size[0] / 2} y={my(b.position[2]) - b.size[2] / 2} width={b.size[0]} height={b.size[2]} rx={0.6} fill="#4d545d" />
            ))}
            {places.map((p) => (
              <circle key={p.id} cx={mx(p.position[0])} cy={my(p.position[2])} r={p.id === homePlaceId ? 1.8 : 1.3}
                fill={KIND_COLOR[p.kind]} stroke={p.id === homePlaceId ? '#fff' : 'none'} strokeWidth={0.5} />
            ))}
            <g transform={`translate(${mx(x)} ${my(z)}) rotate(${(-controller.direction * 180) / Math.PI})`}>
              <path d="M0 -2.6 L1.8 2 L0 1 L-1.8 2 Z" fill="#fff" stroke="#000" strokeWidth={0.3} />
            </g>
            <text x={B - 3} y={-B + 5} fill="#a4a7ad" fontSize={4} textAnchor="end">N ↑</text>
          </svg>
          <ul className="m-0 mt-2 flex list-none flex-wrap gap-x-3 gap-y-1 p-0 text-xs text-ui-muted">
            {(Object.keys(KIND_LABEL) as PlaceKind[]).filter((k) => places.some((p) => p.kind === k)).map((k) => (
              <li key={k} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: KIND_COLOR[k] }} /><DirectoryIcon category={KIND_ICON[k]} size={13} />{KIND_LABEL[k]}</li>
            ))}
          </ul>
        </div>
        <ol className="m-0 min-h-0 flex-1 list-none overflow-y-auto border-t border-ui-line p-4 sm:border-l sm:border-t-0">
          {places.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-3 py-1.5 text-sm">
              <span className="flex min-w-0 items-center gap-2">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-ui-line/70 bg-ui-panel"><DirectoryIcon category={KIND_ICON[p.kind]} size={14} /></span>
                <span className="truncate">{p.name}{p.id === homePlaceId && <span className="text-ui-muted"> · your home</span>}</span>
              </span>
              <span className="shrink-0 tabular-nums text-ui-muted">{Math.round(p.dist)} m {compass(p.position[0] - x, p.position[2] - z)}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
