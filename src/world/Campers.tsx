import { useDistrict } from './DistrictContext';
import { RealModel } from './RealModel';
import { CAMPER_SIZE, groundHeightAt } from '../lib/world';

/**
 * Motorhomes parked off the street (the district's `campers`): a CC-BY 4.0
 * model with its badges painted out (see public/assets/CREDITS.md). Nothing
 * shows if the model can't load; the footprint stays solid either way.
 */
export function Campers() {
  const { layout } = useDistrict();
  return (
    <>
      {(layout.campers ?? []).map((c, i) => (
        <group key={i} position={[c.x, groundHeightAt(c.x, c.z, layout), c.z]} rotation={[0, c.heading, 0]}>
          <RealModel name="motorhome" fit={[CAMPER_SIZE.width + 0.2, CAMPER_SIZE.height, CAMPER_SIZE.length]} />
        </group>
      ))}
    </>
  );
}
