/**
 * Puddles on the street: they gather in the gutters and wheel ruts as the street gets wet, ripple
 * under the drops while it rains, and shrink away as it dries. Wetness comes from the weather
 * (lib/weather.ts, which also darkens the road); places from vfx/waterModel.ts puddleSpots.
 */
import { useMemo } from 'react';
import { useLayout } from './DistrictContext';
import { Puddles } from '../vfx/WaterFx';
import { puddleSpots } from '../vfx/waterModel';

export function WetStreet({ rain, wetness }: { rain: number; wetness: number }) {
  const layout = useLayout();
  // Along the boulevard, but not across the junction with the cross street
  const spots = useMemo(() => {
    const C = layout.crossStreet;
    return puddleSpots(layout.roadHalfWidth, -58, 58, 28, 11).filter((p) => p.z + p.rz < C.minZ - 0.5 || p.z - p.rz > C.maxZ + 0.5);
  }, [layout]);
  return <Puddles spots={spots} wetness={wetness} rain={rain} />;
}
