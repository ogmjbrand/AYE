import { useEffect, useState } from 'react';
import type { PlayerHandle } from '../hooks/usePlayerController';
import type { District, PlaceKind } from '../lib/geography';
import { WORLD_BOUND } from '../lib/world';

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

/** Compass point for a direction on the map (+z is north). */
function compass(dx: number, dz: number) {
  const names = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  // East is -x in this world (the camera looks down +z with +x on the left)
  const angle = Math.atan2(-dx, dz);
  return names[(Math.round(angle / (Math.PI / 4)) + 8) % 8];
}

/**
 * Smartphone map of the district: roads, buildings, area names and every place
 * as a labelled pin. Filter by kind, zoom in on where you are, and pick a
 * place to walk there with the route finder.
 */
export function MapPanel({ district, controller, homePlaceId, onGo, onClose }: {
  district: District;
  controller: PlayerHandle;
  homePlaceId: string | null;
  /** Walk to a place; returns why not, or null when the walk started. */
  onGo?: (place: { id: string; name: string; x: number; z: number }) => string | null;
  onClose: () => void;
}) {
  const [, setFrame] = useState(0);
  const [hidden, setHidden] = useState<ReadonlySet<PlaceKind>>(new Set());
  const [zoom, setZoom] = useState<1 | 2 | 3>(1);
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  useEffect(() => {
    const id = setInterval(() => setFrame((n) => n + 1), 250);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' || e.key.toLowerCase() === 'm') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { clearInterval(id); window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const { x, z } = controller.position;
  const all = district.places
    .map((p) => ({ ...p, dist: Math.hypot(p.position[0] - x, p.position[2] - z) }))
    .sort((a, b) => a.dist - b.dist);
  const places = all.filter((p) => !hidden.has(p.kind));
  const kinds = (Object.keys(KIND_LABEL) as PlaceKind[]).filter((k) => all.some((p) => p.kind === k));
  const pick = all.find((p) => p.id === selected) ?? null;
  const B = WORLD_BOUND;
  const { roadHalfWidth: ROAD_HALF_WIDTH, crossStreet: CROSS_STREET, buildings } = district.layout;
  // Map x is mirrored so east (-x) is on the right, matching the compass
  const mx = (v: number) => -v;
  const my = (v: number) => -v;
  // Zoomed in, the view follows you (kept inside the district)
  const half = B / zoom;
  const cx = Math.max(-B + half, Math.min(B - half, mx(x)));
  const cy = Math.max(-B + half, Math.min(B - half, my(z)));
  const k = 1 / zoom;
  const toggle = (kind: PlaceKind) => setHidden((h) => { const n = new Set(h); if (n.has(kind)) n.delete(kind); else n.add(kind); return n; });
  const go = () => {
    if (!pick || !onGo) return;
    const why = onGo({ id: pick.id, name: pick.name, x: pick.position[0], z: pick.position[2] });
    if (why) setNote(why);
    else onClose();
  };
  const chip = 'flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="map-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[94vh] w-full flex-col rounded-t-2xl border border-ui-line bg-ui-panel text-ui-ink shadow-2xl sm:max-w-4xl sm:flex-row sm:rounded-2xl"
      >
        <div className="relative shrink-0 overflow-y-auto p-4 sm:w-[32rem]">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 id="map-title" className="m-0 font-display text-xl font-bold">{district.name}, {district.city.name}</h2>
            <button type="button" onClick={onClose} className="rounded px-2 py-1 text-sm text-ui-muted hover:text-ui-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent">Close</button>
          </div>
          {/* Filters */}
          <div className="mb-2 flex flex-wrap gap-1.5" role="group" aria-label="Show on the map">
            {kinds.map((kind) => {
              const on = !hidden.has(kind);
              return (
                <button key={kind} type="button" aria-pressed={on} onClick={() => toggle(kind)}
                  className={`${chip} ${on ? 'border-ui-gold/60 text-ui-ink' : 'border-ui-line text-ui-muted line-through'}`}>
                  <span className="h-2 w-2 rounded-full" style={{ background: on ? KIND_COLOR[kind] : '#555' }} aria-hidden />{KIND_LABEL[kind]}
                </button>
              );
            })}
          </div>
          <div className="relative">
            <svg viewBox={`${cx - half} ${cy - half} ${2 * half} ${2 * half}`} className="aspect-square w-full rounded-xl bg-[#1d2126]" role="img" aria-label={`Map of ${district.name}. You are the white arrow.`}>
              <rect x={-ROAD_HALF_WIDTH} y={-B} width={ROAD_HALF_WIDTH * 2} height={2 * B} fill="#3a3f46" />
              <rect x={-B} y={my(CROSS_STREET.maxZ)} width={2 * B} height={CROSS_STREET.maxZ - CROSS_STREET.minZ} fill="#3a3f46" />
              {buildings.map((b, i) => (
                <rect key={i} x={mx(b.position[0]) - b.size[0] / 2} y={my(b.position[2]) - b.size[2] / 2} width={b.size[0]} height={b.size[2]} rx={0.6} fill="#4d545d" />
              ))}
              {/* Area names */}
              {district.neighborhoods.map((n) => (
                <text key={n.id} x={mx((n.bounds.minX + n.bounds.maxX) / 2)} y={my((n.bounds.minZ + n.bounds.maxZ) / 2)} fill="#8d939b" fontSize={3.4 * k} textAnchor="middle"
                  style={{ letterSpacing: `${0.3 * k}px`, textTransform: 'uppercase' }} opacity={0.75}>{n.name}</text>
              ))}
              {places.map((p) => {
                const px = mx(p.position[0]), py = my(p.position[2]);
                const sel = p.id === selected;
                const home = p.id === homePlaceId;
                const r = (sel ? 2.4 : home ? 1.9 : 1.5) * k;
                return (
                  <g key={p.id} onClick={() => { setSelected(p.id); setNote(null); }} style={{ cursor: 'pointer' }}>
                    {/* A pin: a teardrop on its point */}
                    <path d={`M${px} ${py} l${-r} ${-r * 1.6} a${r} ${r} 0 1 1 ${2 * r} 0 z`} fill={KIND_COLOR[p.kind]} stroke={sel || home ? '#fff' : '#111'} strokeWidth={0.35 * k} />
                    <text x={px} y={py - r * 2.9} fill="#eceff2" fontSize={(sel ? 2.6 : 1.9) * k} textAnchor="middle"
                      stroke="#1d2126" strokeWidth={0.6 * k} paintOrder="stroke">{p.name}</text>
                  </g>
                );
              })}
              <g transform={`translate(${mx(x)} ${my(z)}) rotate(${(-controller.direction * 180) / Math.PI}) scale(${k})`}>
                <path d="M0 -2.6 L1.8 2 L0 1 L-1.8 2 Z" fill="#fff" stroke="#000" strokeWidth={0.3} />
              </g>
              <text x={cx + half - 3 * k} y={cy - half + 5 * k} fill="#a4a7ad" fontSize={4 * k} textAnchor="end">N ↑</text>
            </svg>
            {/* Zoom */}
            <div className="absolute bottom-2 right-2 flex flex-col overflow-hidden rounded-lg border border-ui-line bg-ui-panel/90">
              <button type="button" aria-label="Zoom in" disabled={zoom === 3} onClick={() => setZoom((v) => (v === 1 ? 2 : 3))} className="px-2.5 py-1 text-lg leading-none hover:bg-white/5 disabled:opacity-40">+</button>
              <button type="button" aria-label="Zoom out" disabled={zoom === 1} onClick={() => setZoom((v) => (v === 3 ? 2 : 1))} className="border-t border-ui-line px-2.5 py-1 text-lg leading-none hover:bg-white/5 disabled:opacity-40">−</button>
            </div>
          </div>
          {pick && (
            <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-ui-gold/40 p-3" aria-live="polite">
              <div className="min-w-0">
                <p className="m-0 truncate text-sm font-semibold">{pick.name}{pick.id === homePlaceId && <span className="text-ui-muted"> · your home</span>}</p>
                <p className="m-0 text-xs text-ui-muted">{KIND_LABEL[pick.kind]} · {Math.round(pick.dist)} m {compass(pick.position[0] - x, pick.position[2] - z)}{note ? ` · ${note}` : ''}</p>
              </div>
              {onGo && (
                <button type="button" onClick={go} className="shrink-0 rounded-full bg-ui-gold px-4 py-1.5 text-sm font-bold text-[#2a1c06] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ui-gold">Go</button>
              )}
            </div>
          )}
        </div>
        <ol className="m-0 min-h-0 flex-1 list-none overflow-y-auto border-t border-ui-line p-4 sm:border-l sm:border-t-0">
          {places.map((p) => (
            <li key={p.id}>
              <button type="button" onClick={() => { setSelected(p.id); setNote(null); }} aria-pressed={p.id === selected}
                className={`flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-gold ${p.id === selected ? 'bg-ui-gold/10' : ''}`}>
                <span className="flex min-w-0 items-center gap-2">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: KIND_COLOR[p.kind] }} aria-hidden />
                  <span className="truncate">{p.name}{p.id === homePlaceId && <span className="text-ui-muted"> · your home</span>}</span>
                </span>
                <span className="shrink-0 tabular-nums text-ui-muted">{Math.round(p.dist)} m {compass(p.position[0] - x, p.position[2] - z)}</span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
