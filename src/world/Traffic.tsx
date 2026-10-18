import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { PlayerHandle } from '../hooks/usePlayerController';
import { clearTrafficSnapshot, initTraffic, setTrafficSnapshot, stepTraffic, type Car as MovingCar } from '../lib/traffic';
import { DANFO_SIZE, movingObstacles } from '../lib/world';
import { residentPositionsIn } from '../lib/people';
import { BuiltInVehicle } from './Props';
import { useDistrict, useLayout } from './DistrictContext';

/** Road traffic yields to the player and active residents; moving vehicles remain solid to the player. */
export function Traffic({ player }: { player: PlayerHandle }) {
  const { traffic } = useLayout();
  const district = useDistrict();
  const cars = useRef<MovingCar[]>(initTraffic(traffic));
  const groups = useRef<(Group | null)[]>([]);
  const looks = useMemo(
    () => initTraffic(traffic).map((c, i) => {
      const lane = traffic[c.lane];
      return { color: lane.colors[i % lane.colors.length], stripes: lane.stripes, kind: lane.kind, heading: lane.dir > 0 ? 0 : Math.PI, x: lane.x, z: c.z };
    }),
    [traffic],
  );

  useEffect(() => () => {
    movingObstacles.length = 0;
    clearTrafficSnapshot();
  }, []);

  useFrame((_, dt) => {
    cars.current = stepTraffic(
      cars.current,
      traffic,
      [{ x: player.position.x, z: player.position.z }, ...residentPositionsIn(district.id)],
      Math.min(dt, 0.1),
    );
    setTrafficSnapshot(cars.current, traffic);
    movingObstacles.length = 0;
    cars.current.forEach((car, i) => {
      groups.current[i]?.position.set(looks[i].x, 0, car.z);
      movingObstacles.push({ position: [looks[i].x, 0, car.z], size: DANFO_SIZE });
    });
  });

  return (
    <>
      {looks.map((l, i) => (
        <group key={i} ref={(g) => { groups.current[i] = g; }} position={[l.x, 0, l.z]}>
          <BuiltInVehicle vehicle={{ position: [0, 0, 0], heading: l.heading, color: l.color, stripes: l.stripes, kind: l.kind }} />
        </group>
      ))}
    </>
  );
}
