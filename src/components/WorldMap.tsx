import { useState } from 'react';
import { WORLD_LAND_PATH } from '../lib/worldLand';

export interface MapCity {
  id: string;
  name: string;
  lat: number;
  lon: number;
  /** Can be booked right now (there's a way there and it's affordable). */
  bookable: boolean;
}

/** Zoom presets: a viewBox in the 360 x 180 frame (x = lon + 180, y = 90 - lat). */
const VIEWS = {
  World: [0, 0, 360, 180],
  Africa: [150, 48, 92, 84],
  Europe: [158, 18, 64, 40],
  Asia: [210, 22, 140, 92],
  Americas: [10, 14, 160, 150],
  Oceania: [280, 80, 80, 60],
} as const;
type View = keyof typeof VIEWS;

interface WorldMapProps {
  here: MapCity;
  cities: readonly MapCity[];
  selected: string | null;
  onSelect: (id: string) => void;
}

/** Every city on a flat world map; click one to see how to get there. */
export function WorldMap({ here, cities, selected, onSelect }: WorldMapProps) {
  const [view, setView] = useState<View>('World');
  const [x, y, w, h] = VIEWS[view];
  // Dots stay the same size on screen whatever the zoom (the 2:1 frame shows at least twice the height in width)
  const r = (Math.max(w, h * 2) / 360) * 2.4;
  const at = (c: MapCity) => [c.lon + 180, 90 - c.lat] as const;
  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1" role="group" aria-label="Zoom to a region">
        {(Object.keys(VIEWS) as View[]).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            onClick={() => setView(v)}
            className={`rounded-md border px-2 py-1 text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-accent ${view === v ? 'border-ui-accent bg-ui-accent/20 text-ui-ink' : 'border-ui-line text-ui-muted hover:text-ui-ink'}`}
          >
            {v}
          </button>
        ))}
      </div>
      <svg viewBox={`${x} ${y} ${w} ${h}`} preserveAspectRatio="xMidYMid meet" className="block aspect-[2/1] w-full rounded-lg border border-ui-line bg-ui-panel" role="img" aria-label={`World map, ${view.toLowerCase()} view, with ${cities.length} cities`}>
        <path d={WORLD_LAND_PATH} className="fill-ui-line" />
        {cities.map((c) => {
          const [cx, cy] = at(c);
          const isSelected = c.id === selected;
          return (
            <circle
              key={c.id}
              cx={cx}
              cy={cy}
              r={isSelected ? r * 1.6 : r}
              className={`cursor-pointer ${isSelected ? 'fill-ui-accent-strong' : c.bookable ? 'fill-ui-ink' : 'fill-ui-muted'}`}
              onClick={() => onSelect(c.id)}
            >
              <title>{c.name}</title>
            </circle>
          );
        })}
        {/* Where you are now: a ring */}
        <circle cx={at(here)[0]} cy={at(here)[1]} r={r * 1.8} className="fill-none stroke-ui-accent" strokeWidth={r * 0.7}>
          <title>{`${here.name} (you are here)`}</title>
        </circle>
      </svg>
      <p className="m-0 mt-1 text-xs text-ui-muted">Ringed: where you are. Pale dots: no way there you can afford yet. Map: Natural Earth.</p>
    </div>
  );
}
