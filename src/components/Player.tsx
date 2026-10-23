import { Suspense, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Group } from 'three';
import { getSeated, type PlayerHandle } from '../hooks/usePlayerController';
import type { Seat } from '../lib/seating';
import { groundHeightAt } from '../lib/world';
import type { Character } from './CharacterCreation';
import { Avatar } from './Avatar';
import { ErrorBoundary } from './ErrorBoundary';
import { resolveStyles, type Slot } from '../lib/fashion';
import type { OwnedCar } from '../lib/cars';
import { CarBody } from '../world/CarBody';
import { driverSeat } from '../lib/carShapes';
import { LOOKS } from '../lib/looks';

interface PlayerProps {
  controller: PlayerHandle;
  character?: Character;
  /** Items being tried on in the shop, shown instead of what's equipped (null = original). */
  tryOn?: Partial<Record<Slot, string | null>>;
  /** Talking with a resident (gestures in turns). */
  conversing?: boolean;
  /** Driving your car: the car is shown instead of you on foot. */
  car?: OwnedCar | null;
}

/** If your own look can't be loaded: the first built-in person, so you're still a real person on screen. */
function DefaultPerson({ controller, sitHeight }: { controller: PlayerHandle; sitHeight?: number }) {
  return (
    <ErrorBoundary fallback={null}>
      <Suspense fallback={null}>
        <Avatar controller={controller} lookId={LOOKS[0].id} sitHeight={sitHeight} />
      </Suspense>
    </ErrorBoundary>
  );
}

export function Player({ controller, character, tryOn, conversing = false, car = null }: PlayerProps) {
  const groupRef = useRef<Group>(null);
  const lastSeat = useRef<Seat | null>(null);
  const settle = useRef(0);

  const equipped = character?.wardrobe.equipped;
  const colours = character?.wardrobe.colours;
  const styles = useMemo(() => resolveStyles(equipped ?? {}, tryOn, colours), [equipped, tryOn, colours]);

  useFrame((_, delta) => {
    // Update controller with frame delta (capped so a background tab can't teleport the player)
    controller.applyMovement(Math.min(delta, 0.1));

    // Apply position and rotation to the visual group, standing on the pavement or road
    const g = groupRef.current;
    if (g) {
      const seat = getSeated();
      if (seat !== lastSeat.current) {
        // Sitting down or getting up moves the origin a little: glide there for a moment instead of jumping
        lastSeat.current = seat;
        settle.current = 0.8;
      }
      const { x, z } = controller.position;
      const y = groundHeightAt(x, z);
      if (settle.current > 0 && Math.hypot(g.position.x - x, g.position.z - z) < 2) {
        settle.current -= delta;
        const k = Math.min(1, delta * 8);
        g.position.set(g.position.x + (x - g.position.x) * k, y, g.position.z + (z - g.position.z) * k);
        const turn = Math.atan2(Math.sin(controller.direction - g.rotation.y), Math.cos(controller.direction - g.rotation.y));
        g.rotation.y += turn * k;
      } else {
        g.position.set(x, y, z);
        g.rotation.y = controller.direction;
      }
    }
  });

  const person = (sitHeight?: number) => (
    <Avatar controller={controller} lookId={character?.lookId} heightCm={character?.heightCm} styles={car ? { ...styles, bag: undefined } : styles} shape={character?.shape} skinTone={character?.skinTone} conversing={conversing} sitHeight={sitHeight} />
  );
  // Nothing stands in for you while you load: a real person or no one
  const seat = car ? driverSeat(car.id) : null;
  return (
    <group ref={groupRef}>
      {car && <CarBody model={car.id} color={car.color} lightsOn />}
      <ErrorBoundary fallback={<DefaultPerson controller={controller} sitHeight={seat?.height} />}>
        <Suspense fallback={null}>
          {seat ? <group position={[seat.x, 0, seat.z]}>{person(seat.height)}</group> : person()}
        </Suspense>
      </ErrorBoundary>
    </group>
  );
}
