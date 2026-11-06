/**
 * Passers-by on the boulevard (lib/streetLife.ts): walking the pavement between the district's
 * shops and stalls and stopping at their doors, more of them by day. On the low quality tier
 * there are half as many, to keep phones smooth.
 */
import { useMemo } from 'react';
import { VenueNpc } from './VenueNpc';
import { useDistrict, useLayout } from './DistrictContext';
import { useQuality } from './quality';
import { crowdSize, shoppersFor } from '../lib/streetLife';
import { generateNpcAppearance } from '../lib/npcFashion';
import { lookById } from '../lib/looks';
import { PAVEMENT_HEIGHT } from '../lib/world';

export function StreetLife({ hour }: { hour: number }) {
  const district = useDistrict();
  const layout = useLayout();
  const quality = useQuality();
  const count = Math.round(crowdSize(hour) * (quality.quality === 'high' ? 1 : 0.5));
  // Everyone who could be out today, so people already walking stay the same as the crowd thins
  const everyone = useMemo(() => shoppersFor(district.id, district.places, layout, 8), [district.id, district.places, layout]);
  const looks = useMemo(() => everyone.map((s) => generateNpcAppearance(s.id, s.doing, lookById(s.lookId).body === 'feminine').styles), [everyone]);
  return (
    <>
      {everyone.slice(0, count).map((s, i) => (
        <VenueNpc key={s.id} lookId={s.lookId} name={s.doing} role="Passer-by" x={s.route[0][0]} z={s.route[0][1]} facing={0}
          route={s.route} uniform={looks[i]} tagless groundY={PAVEMENT_HEIGHT} />
      ))}
    </>
  );
}
