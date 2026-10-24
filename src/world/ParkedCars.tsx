import { useEffect } from 'react';
import { CarBody } from './CarBody';
import { carById, type OwnedCar } from '../lib/cars';
import { carFootprint, parkedObstacles } from '../lib/world';

/** Your cars left on the street in this district, where and how you parked them. You can't walk through them. */
export function ParkedCars({ cars }: { cars: readonly OwnedCar[] }) {
  useEffect(() => {
    parkedObstacles.length = 0;
    for (const c of cars) if (c.parked) parkedObstacles.push(carFootprint(c.parked.x, c.parked.z, c.parked.heading, carById(c.id)?.length ?? 4.4));
    return () => { parkedObstacles.length = 0; };
  }, [cars]);
  return (
    <>
      {cars.map((c) => c.parked && (
        <group key={c.id} position={[c.parked.x, 0, c.parked.z]} rotation={[0, c.parked.heading, 0]}>
          <CarBody model={c.id} color={c.color} />
        </group>
      ))}
    </>
  );
}
