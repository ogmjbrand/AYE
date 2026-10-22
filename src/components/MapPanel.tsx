import { useEffect, useState } from 'react';
import type { PlayerHandle } from '../hooks/usePlayerController';
import type { District, PlaceKind } from '../lib/geography';
import { WORLD_BOUND } from '../lib/world';
import { compass } from '../lib/locations';
import { MapPin, X } from 'lucide-react';
import { DirectoryIcon } from './DirectoryIcon';

const KIND_COLOR: Record<PlaceKind, string> = {
  food: '#f2a16d',
  shop: '#c5a5ee',
  workplace: '#82c7ec',
  home: '#78d4b5',
  public: '#c7cbd1',
  nightlife: '#f28cab',
  park: '#90cb79',
  dealership: '#e1bd72',
};
const KIND_LABEL: Record<PlaceKind, string> = { food: 'Food', shop: 'Shops', workplace: 'Work', home: 'Homes', public: 'Public', nightlife: 'Nightlife', park: 'Parks', dealership: 'Car dealerships' };
const KIND_ICON = { food: 'food', shop: 'shopping', workplace: 'workplaces', home: 'stays', public: 'travel', nightlife: 'nightlife', park: 'recreation', dealership: 'vehicles' } as const;

const project = (x: number, z: number, lift = 0) => ({
  x: 60 + (x - z) * 0.45,
  y: 52 + (x + z) * 0.225 - lift,
});

function polygon(points: readonly (readonly [number, number])[], lift = 0) {
  return points.map(([x, z]) => {
    const p = project(x, z, lift);
    return `${p.x},${p.y}`;
  }).join(' ');
}

function footprint(x: number, z: number, width: number, depth: number) {
  return [[x - width / 2, z - depth / 2], [x + width / 2, z - depth / 2], [x + width / 2, z + depth / 2], [x - width / 2, z + depth / 2]] as const;
}

/**
 * A stylised, elevated district map built from the playable street and building
 * data. The list remains available alongside it for precise place selection.
 */
export function MapPanel({ district, controller, homePlaceId, onClose }: {
  district: District;
  controller: PlayerHandle;
  homePlaceId: string | null;
  onClose: () => void;
}) {
  const [, setFrame] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(homePlaceId);
  useEffect(() => {
    const id = setInterval(() => setFrame((n) => n + 1), 250);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' || e.key.toLowerCase() === 'm') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => { clearInterval(id); window.removeEventListener('keydown', onKey); };
  }, [onClose]);

  const { x, z } = controller.position;
  const places = district.places
    .map((place) => ({ ...place, dist: Math.hypot(place.position[0] - x, place.position[2] - z) }))
    .sort((a, b) => a.dist - b.dist);
  const selected = places.find((place) => place.id === selectedId);
  const { roadHalfWidth, pavementWidth, crossStreet, buildings, park, vehicles } = district.layout;
  const B = WORLD_BOUND;
  const road = [
    [-roadHalfWidth, -B], [roadHalfWidth, -B], [roadHalfWidth, B], [-roadHalfWidth, B],
  ] as const;
  const crossRoad = [
    [-B, crossStreet.minZ], [B, crossStreet.minZ], [B, crossStreet.maxZ], [-B, crossStreet.maxZ],
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#17202a] text-ui-ink" onClick={onClose}>
      <header className="relative z-10 flex shrink-0 items-center justify-between border-b border-white/10 bg-[#202b3a]/95 px-4 py-3 sm:px-7">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#29374b] text-[#e5c77c]">
            <MapPin size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="m-0 truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">{district.city.name}</p>
            <h2 id="map-title" className="m-0 truncate font-display text-lg font-bold sm:text-xl">{district.name}</h2>
          </div>
        </div>
        <button type="button" onClick={(event) => { event.stopPropagation(); onClose(); }} aria-label="Close map" title="Close map" className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/5 text-white/80 transition hover:border-[#e5c77c] hover:text-[#f0d797] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#e5c77c]">
          <X size={18} aria-hidden="true" />
        </button>
      </header>

      <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <section className="relative min-h-[42dvh] overflow-hidden bg-[#28384a] lg:min-h-0" aria-label="District map">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_48%_42%,rgba(151,184,188,0.16),transparent_60%)]" />
          <svg viewBox="0 0 120 100" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 h-full w-full" role="img" aria-label={`Illustrated map of ${district.name} with buildings, streets, locations and your position`}>
            <defs>
              <pattern id="map-grain-grid" width="4" height="4" patternUnits="userSpaceOnUse">
                <circle cx="0.5" cy="0.5" r="0.18" fill="#dbe2e1" opacity="0.18" />
              </pattern>
              <filter id="map-shadow" x="-30%" y="-30%" width="160%" height="180%">
                <feDropShadow dx="0" dy="1.1" stdDeviation="0.7" floodColor="#111923" floodOpacity="0.45" />
              </filter>
            </defs>
            <rect width="120" height="100" fill="#314252" />
            <rect width="120" height="100" fill="url(#map-grain-grid)" />

            {park && (
              <>
                <polygon points={polygon(footprint(
                  (park.area.minX + park.area.maxX) / 2,
                  (park.area.minZ + park.area.maxZ) / 2,
                  park.area.maxX - park.area.minX,
                  park.area.maxZ - park.area.minZ,
                ))} fill="#486c54" stroke="#77966e" strokeWidth="0.45" />
                {park.paths.map((path, index) => (
                  <polygon key={`path-${index}`} points={polygon(footprint(
                    (path.x0 + path.x1) / 2,
                    (path.z0 + path.z1) / 2,
                    path.x1 - path.x0,
                    path.z1 - path.z0,
                  ), 0.05)} fill="#a99e7c" opacity="0.9" />
                ))}
                {park.trees.map(([tx, tz], index) => {
                  const point = project(tx, tz, 1.1);
                  return <g key={`tree-${index}`} transform={`translate(${point.x} ${point.y})`}><circle r="1.05" fill="#294a3e" /><circle cy="-0.28" r="0.65" fill="#78a66d" /></g>;
                })}
              </>
            )}

            <polygon points={polygon([
              [-roadHalfWidth - pavementWidth, -B], [-roadHalfWidth, -B], [-roadHalfWidth, B], [-roadHalfWidth - pavementWidth, B],
            ])} fill="#988d79" opacity="0.82" />
            <polygon points={polygon([
              [roadHalfWidth, -B], [roadHalfWidth + pavementWidth, -B], [roadHalfWidth + pavementWidth, B], [roadHalfWidth, B],
            ])} fill="#988d79" opacity="0.82" />
            <polygon points={polygon([
              [-B, crossStreet.minZ - pavementWidth], [B, crossStreet.minZ - pavementWidth], [B, crossStreet.minZ], [-B, crossStreet.minZ],
            ])} fill="#988d79" opacity="0.82" />
            <polygon points={polygon([
              [-B, crossStreet.maxZ], [B, crossStreet.maxZ], [B, crossStreet.maxZ + pavementWidth], [-B, crossStreet.maxZ + pavementWidth],
            ])} fill="#988d79" opacity="0.82" />
            <polygon points={polygon(road)} fill="#38434d" stroke="#c4b995" strokeWidth="0.32" />
            <polygon points={polygon(crossRoad)} fill="#38434d" stroke="#c4b995" strokeWidth="0.32" />
            {[-roadHalfWidth + 0.45, roadHalfWidth - 0.45].map((lane) => (
              <polyline key={lane} points={polygon([[lane, -B], [lane, B]])} fill="none" stroke="#e0c76e" strokeWidth="0.24" strokeDasharray="1.2 1.2" opacity="0.86" />
            ))}
            {[-roadHalfWidth - pavementWidth / 2, roadHalfWidth + pavementWidth / 2].map((side) => (
              <polyline key={side} points={polygon([[side, -B], [side, B]])} fill="none" stroke="#e9dcba" strokeWidth="0.26" />
            ))}

            {buildings.map((building, index) => {
              const [bx, , bz] = building.position;
              const [width, height, depth] = building.size;
              const base = footprint(bx, bz, width, depth);
              const lift = Math.min(7, Math.max(1.3, height * 0.16));
              const roof = polygon(base, lift);
              const basePoints = base.map(([cx, cz]) => project(cx, cz));
              const roofPoints = base.map(([cx, cz]) => project(cx, cz, lift));
              const leftFace = [basePoints[0], basePoints[3], roofPoints[3], roofPoints[0]].map((p) => `${p.x},${p.y}`).join(' ');
              const frontFace = [basePoints[2], basePoints[3], roofPoints[3], roofPoints[2]].map((p) => `${p.x},${p.y}`).join(' ');
              return (
                <g key={`${building.name ?? building.style}-${index}`} filter="url(#map-shadow)">
                  <polygon points={leftFace} fill="#374459" stroke="#273344" strokeWidth="0.22" />
                  <polygon points={frontFace} fill="#47566b" stroke="#273344" strokeWidth="0.22" />
                  <polygon points={roof} fill={building.color} stroke="#d5d5c7" strokeWidth="0.28" />
                  {width > 5 && depth > 5 && (
                    <polygon points={polygon(footprint(bx, bz, width * 0.72, depth * 0.68), lift + 0.06)} fill="#ffffff" opacity="0.1" />
                  )}
                </g>
              );
            })}

            {vehicles.map((vehicle, index) => {
              const point = project(vehicle.position[0], vehicle.position[2], 0.25);
              return <rect key={`car-${index}`} x={point.x - 0.9} y={point.y - 0.4} width="1.8" height="0.8" rx="0.2" fill={vehicle.color} stroke="#17202a" strokeWidth="0.2" transform={`rotate(-28 ${point.x} ${point.y})`} />;
            })}

            {places.map((place) => {
              const point = project(place.position[0], place.position[2], 1.25);
              const color = KIND_COLOR[place.kind];
              const active = place.id === selectedId;
              return (
                <g key={place.id} transform={`translate(${point.x} ${point.y})`} className="pointer-events-none">
                  {active && <circle r="3.5" fill="none" stroke="#fff4cc" strokeWidth="0.5" opacity="0.9" />}
                  <path d="M0 -2.8 C-1.55 -2.8 -2.5 -1.75 -2.5 -0.4 C-2.5 1.2 0 3.5 0 3.5 C0 3.5 2.5 1.2 2.5 -0.4 C2.5 -1.75 1.55 -2.8 0 -2.8Z" fill={color} stroke="#243143" strokeWidth="0.45" />
                  <circle cy="-0.55" r="0.72" fill="#243143" />
                </g>
              );
            })}

            {(() => {
              const point = project(x, z, 2.2);
              return (
                <g transform={`translate(${point.x} ${point.y}) rotate(${(-controller.direction * 180) / Math.PI})`} filter="url(#map-shadow)">
                  <circle r="3.3" fill="#f5e3a0" opacity="0.2" />
                  <circle r="2.2" fill="#f2d36f" stroke="#fff8db" strokeWidth="0.55" />
                  <path d="M0 -1.5 L1.05 1 L0 0.55 L-1.05 1Z" fill="#273344" />
                </g>
              );
            })()}

            <g transform="translate(108 14)">
              <path d="M0 5 L0 0 M0 0 L-1.4 2 M0 0 L1.4 2" fill="none" stroke="#f2ead4" strokeWidth="0.45" strokeLinecap="round" />
              <text y="8" fill="#f2ead4" fontSize="2.3" textAnchor="middle">N</text>
            </g>
          </svg>

          <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5 sm:bottom-5 sm:left-5">
            {(Object.keys(KIND_LABEL) as PlaceKind[]).filter((kind) => places.some((place) => place.kind === kind)).map((kind) => (
              <span key={kind} className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-[#1d2834]/90 px-2.5 py-1.5 text-[10px] font-medium text-white/85 shadow-lg">
                <span className="size-2 rounded-sm" style={{ background: KIND_COLOR[kind] }} />
                <DirectoryIcon category={KIND_ICON[kind]} size={12} />
                {KIND_LABEL[kind]}
              </span>
            ))}
          </div>
          <div className="absolute right-4 top-4 rounded-xl border border-white/15 bg-[#1d2834]/90 px-3 py-2 text-right shadow-lg">
            <p className="m-0 text-[9px] uppercase tracking-[0.14em] text-white/55">Your position</p>
            <p className="m-0 mt-0.5 text-xs font-semibold text-[#f2d36f]">{Math.round(x)}, {Math.round(z)}</p>
          </div>
        </section>

        <aside className="flex min-h-0 flex-col border-t border-white/10 bg-[#202b3a] lg:border-l lg:border-t-0">
          <div className="border-b border-white/10 px-4 py-3 sm:px-5">
            <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50">Places nearby</p>
            {selected ? (
              <div className="mt-2 flex items-start gap-2.5">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg" style={{ background: `${KIND_COLOR[selected.kind]}25`, color: KIND_COLOR[selected.kind] }}>
                  <DirectoryIcon category={KIND_ICON[selected.kind]} size={17} />
                </span>
                <div className="min-w-0">
                  <h3 className="m-0 truncate text-sm font-semibold">{selected.name}</h3>
                  <p className="m-0 mt-0.5 text-[11px] text-white/55">{Math.round(selected.dist)} m {compass(selected.position[0] - x, selected.position[2] - z)}</p>
                </div>
              </div>
            ) : <h3 className="m-0 mt-1 text-sm font-semibold">Choose a place</h3>}
          </div>
          <ol className="m-0 min-h-0 flex-1 list-none overflow-y-auto p-2 sm:p-3">
            {places.map((place) => {
              const active = place.id === selectedId;
              return (
                <li key={place.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(place.id)}
                    aria-pressed={active}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f2d36f] ${active ? 'bg-[#35465a]' : 'hover:bg-white/5'}`}
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg" style={{ background: `${KIND_COLOR[place.kind]}25`, color: KIND_COLOR[place.kind] }}>
                      <DirectoryIcon category={KIND_ICON[place.kind]} size={16} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium">{place.name}{place.id === homePlaceId ? ' · your home' : ''}</span>
                      <span className="mt-0.5 block text-[10px] text-white/50">{KIND_LABEL[place.kind]}</span>
                    </span>
                    <span className="shrink-0 text-right font-mono text-[10px] tabular-nums text-white/55">{Math.round(place.dist)} m<br />{compass(place.position[0] - x, place.position[2] - z)}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="m-0 border-t border-white/10 px-4 py-3 text-[10px] leading-relaxed text-white/45 sm:px-5">Select a marker or place to locate it. Use City Locations to track a route.</p>
        </aside>
      </div>
    </div>
  );
}
