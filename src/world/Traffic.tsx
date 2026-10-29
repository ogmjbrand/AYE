import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import { Avatar } from '../components/Avatar';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { LOOKS } from '../lib/looks';
import type { PlayerHandle } from '../hooks/usePlayerController';
import { clearTrafficSnapshot, initTraffic, setTrafficSnapshot, stepTraffic, type Car as MovingCar } from '../lib/traffic';
import { DANFO_SIZE, movingObstacles, roadBlockers } from '../lib/world';
import { residentPositionsIn } from '../lib/people';
import { BuiltInVehicle } from './Props';
import { useDistrict, useLayout } from './DistrictContext';
import { stillController } from '../hooks/usePlayerController';

const STILL = stillController();
/** Keke riders: computer-controlled drivers, a different person in each, seated at the handlebars. */
const RIDERS = LOOKS.filter((l) => l.body === 'masculine');
const RIDER_SEAT = { z: 0.55, height: 0.85 };

function Rider({ index, heading }: { index: number; heading: number }) {
  return (
    <group rotation={[0, heading, 0]} position={[0, 0, 0]}>
      <group position={[0, 0, RIDER_SEAT.z]}>
        <ErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <Avatar controller={STILL} own lookId={RIDERS[index % RIDERS.length].id} sitHeight={RIDER_SEAT.height} />
          </Suspense>
        </ErrorBoundary>
      </group>
    </group>
  );
}

/** Minibuses, cars, tricycles and jeepneys driving the boulevard. Road traffic yields to the player and active residents; moving vehicles remain solid to the player. */
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
      [{ x: player.position.x, z: player.position.z }, ...residentPositionsIn(district.id), ...roadBlockers],
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
          {/* Open-sided kekes show their driver; the others have tinted glass */}
          {l.kind === 'tricycle' && <Rider index={i} heading={l.heading} />}
        </group>
      ))}
    </>
  );
}
