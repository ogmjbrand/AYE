import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh, MeshStandardMaterial } from 'three';
import { buildingFaceBehind, templateFor, type ActiveEvent, type Point } from '../lib/liveEvents';
import { carFootprint, groundHeightAt, parkedObstacles, type Obstacle } from '../lib/world';
import { lookById } from '../lib/looks';
import { Car } from './Props';
import { WorldNPC } from './WorldNPC';
import { nameTag } from './nameTag';
import { Cordon, EmergencyVehicle, Fire, HoseAndWater } from './Emergency';
import { useLayout } from './DistrictContext';

/** Minutes after an emergency starts before the computer-controlled services arrive. */
const POLICE_AFTER = 8;
const PARAMEDICS_AFTER = 14;
/** The fire service arrives, and starts spraying a few minutes later. */
const FIRE_SERVICE_AFTER = 9;
const SPRAY_AFTER = 12;

const RING_COLOUR = { emergency: '#ff6a55', minor: '#f2c14e', opportunity: '#6fd3a4' } as const;

/** A slowly pulsing ring on the ground where you can help. Emissive only: no light, so no shader recompiles. */
function SceneRing({ at, colour }: { at: Point; colour: string }) {
  const ring = useRef<Mesh>(null);
  useFrame(({ clock }) => {
    const m = ring.current?.material as MeshStandardMaterial | undefined;
    if (m) m.opacity = 0.45 + 0.25 * Math.sin(clock.elapsedTime * 3);
  });
  return (
    <mesh ref={ring} position={[at.x, groundHeightAt(at.x, at.z) + 0.03, at.z]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[3.2, 3.6, 48]} />
      <meshStandardMaterial color={colour} emissive={colour} emissiveIntensity={0.9} transparent opacity={0.6} depthWrite={false} />
    </mesh>
  );
}

/** A person at the event, with a tag saying who they are and that they're computer-controlled. */
/** No restyling: the person keeps the clothes their look comes with (a police or paramedic uniform). */
const OWN_CLOTHES = {};

function Person({ name, who, lookId, at, facing = 0, sitting = false, path, walkSpeed, uniformed = false }: {
  name: string;
  who: string;
  lookId: string;
  at: Point;
  facing?: number;
  sitting?: boolean;
  path?: readonly (readonly [number, number, number])[];
  walkSpeed?: number;
  /** Keep the look's own uniform. */
  uniformed?: boolean;
}) {
  const tag = useMemo(() => nameTag(name, `${who} · computer-controlled`), [name, who]);
  const y = groundHeightAt(at.x, at.z);
  const height = lookById(lookId).height;
  const seat = sitting ? { id: `${name}-seat`, x: at.x, z: at.z, facing, height: y + 0.28 } : undefined;
  return (
    <group>
      <WorldNPC npcId={`event-${name}`} role={who} lookId={lookId} position={[at.x, y, at.z]} facing={facing} seat={seat} path={path} pathKey={path ? `${name}-${path.length}` : undefined} walkSpeed={walkSpeed} styles={uniformed ? OWN_CLOTHES : undefined} />
      {!path && (
        <sprite position={[at.x, y + (sitting ? height * 0.6 : height) + 0.35, at.z]} scale={[0.9, 0.28, 1]}>
          <spriteMaterial map={tag} depthWrite={false} transparent />
        </sprite>
      )}
    </group>
  );
}

function Cone({ at }: { at: Point }) {
  return (
    <mesh position={[at.x, groundHeightAt(at.x, at.z) + 0.3, at.z]} castShadow>
      <coneGeometry args={[0.18, 0.6, 12]} />
      <meshStandardMaterial color="#ff7a1a" roughness={0.6} />
    </mesh>
  );
}

/** Crashed or broken-down cars are solid while they're there. */
function useSolid(boxes: readonly Obstacle[]) {
  useEffect(() => {
    parkedObstacles.push(...boxes);
    return () => {
      for (const b of boxes) {
        const i = parkedObstacles.indexOf(b);
        if (i >= 0) parkedObstacles.splice(i, 1);
      }
    };
  }, [boxes]);
}

function Accident({ e, minute }: { e: ActiveEvent; minute: number }) {
  const { x, z } = e.scene;
  const cars = useMemo(() => [
    { position: [x - 1.4, 0, z - 0.4] as const, heading: Math.PI / 2 + 0.35, color: '#b8c4cc', kind: 'car' as const },
    { position: [x + 1.5, 0, z + 0.6] as const, heading: -Math.PI / 2 + 2.6, color: '#7a1f24', kind: 'car' as const },
  ], [x, z]);
  const boxes = useMemo(() => cars.map((c) => carFootprint(c.position[0], c.position[2], c.heading, 4.2)), [cars]);
  useSolid(boxes);
  const since = minute - e.startedAt;
  const treated = e.done.includes('first-aid');
  return (
    <group>
      {cars.map((c, i) => <Car key={i} vehicle={c} />)}
      {[-1, 1].map((s) => <Cone key={s} at={{ x: x + s * 4.5, z: z + 2.2 * s }} />)}
      <Person name="Kunle" who={treated ? 'Driver, being treated' : 'Injured driver'} lookId="male-adult-04" at={{ x: x, z: z + 2.4 }} facing={Math.PI} sitting />
      <Person name="Amaka" who="Passenger" lookId="female-adult-06" at={{ x: x + 2.6, z: z + 2.6 }} facing={-Math.PI / 2} />
      {since >= POLICE_AFTER && <Person name="Officer Bello" who="Police" lookId="police-male-01" at={{ x: x - 4, z: z + 1.8 }} facing={Math.PI / 2} uniformed />}
      {since >= POLICE_AFTER && <EmergencyVehicle kind="police" position={[x - 7.5, 0, z - 0.6]} heading={Math.PI / 2} />}
      {since >= PARAMEDICS_AFTER && <Person name="Ifeoma" who="Paramedic" lookId="medical-female-02" at={{ x: x + 0.9, z: z + 3.3 }} facing={Math.PI} uniformed />}
      {since >= PARAMEDICS_AFTER && <EmergencyVehicle kind="ambulance" position={[x + 7.5, 0, z + 0.8]} heading={-Math.PI / 2} />}
    </group>
  );
}

function Collapse({ e, minute }: { e: ActiveEvent; minute: number }) {
  const { x, z } = e.scene;
  const since = minute - e.startedAt;
  return (
    <group>
      <Person name="Mrs Adeyemi" who={e.done.includes('recovery') || e.done.includes('treat') ? 'Recovering' : 'Collapsed'} lookId="female-adult-10" at={{ x, z }} facing={Math.PI / 2} sitting />
      {since >= PARAMEDICS_AFTER && <Person name="Chidi" who="Paramedic" lookId="medical-male-02" at={{ x: x + 1.2, z: z + 1 }} facing={-Math.PI / 2} uniformed />}
      {since >= PARAMEDICS_AFTER && <CollapseAmbulance at={e.scene} />}
    </group>
  );
}

function MissingPerson({ e }: { e: ActiveEvent }) {
  const { scene, target } = e;
  const found = e.done.includes('find');
  const home = e.done.includes('home');
  // Once found he walks back with you; once home he stands with his daughter
  const path = useMemo(() => (found && !home && target ? [[target.x, groundHeightAt(target.x, target.z), target.z], [scene.x + 1, groundHeightAt(scene.x + 1, scene.z), scene.z]] as const : undefined), [found, home, target, scene]);
  return (
    <group>
      <Person name="Funmi" who="His daughter" lookId="female-adult-03" at={scene} facing={0} />
      {target && !home && <Person name="Baba Femi" who={found ? 'Walking home' : 'Missing'} lookId="male-adult-18" at={found ? { x: scene.x + 1, z: scene.z } : target} path={path} walkSpeed={0.9} />}
      {home && <Person name="Baba Femi" who="Home safe" lookId="male-adult-18" at={{ x: scene.x + 1, z: scene.z }} facing={-Math.PI / 2} />}
    </group>
  );
}

function Breakdown({ e }: { e: ActiveEvent }) {
  const { x, z } = e.scene;
  const car = useMemo(() => ({ position: [x, 0, z] as const, heading: Math.PI / 2, color: '#2f5d8a', kind: 'car' as const }), [x, z]);
  const boxes = useMemo(() => [carFootprint(x, z, car.heading, 4.2)], [x, z, car.heading]);
  useSolid(boxes);
  const hazard = useRef<MeshStandardMaterial>(null);
  useFrame(({ clock }) => { if (hazard.current) hazard.current.emissiveIntensity = Math.sin(clock.elapsedTime * 6) > 0 ? 3 : 0; });
  const fixed = e.done.includes('repair');
  return (
    <group>
      <Car vehicle={car} />
      {!fixed && [-0.75, 0.75].map((dz) => (
        <mesh key={dz} position={[x - 2.15, 0.7, z + dz]}>
          <boxGeometry args={[0.05, 0.1, 0.22]} />
          <meshStandardMaterial ref={dz < 0 ? hazard : undefined} color="#ffae2b" emissive="#ffae2b" emissiveIntensity={2} toneMapped={false} />
        </mesh>
      ))}
      <Person name="Tunde" who={fixed ? 'Driver, back on the road' : 'Stranded driver'} lookId="male-adult-12" at={{ x, z: z + 2.2 }} facing={Math.PI} />
    </group>
  );
}

function LunchRush({ e }: { e: ActiveEvent }) {
  const { x, z } = e.scene;
  // A coach party waiting outside the door
  const queue = [['Sade', 'female-adult-04'], ['Musa', 'male-adult-10'], ['Grace', 'female-adult-11'], ['Emeka', 'male-adult-15']] as const;
  return (
    <group>
      {queue.map(([name, look], i) => (
        <Person key={name} name={name} who="Coach party" lookId={look} at={{ x: x + (i % 2 ? 1 : -1) * 0.7, z: z + 1.5 + Math.floor(i / 2) * 1.1 }} facing={Math.PI} />
      ))}
    </group>
  );
}

/** An ambulance pulled up at the kerb beside someone on the pavement. */
function CollapseAmbulance({ at }: { at: Point }) {
  const { roadHalfWidth: R } = useLayout();
  const side = Math.sign(at.x) || 1;
  return <EmergencyVehicle kind="ambulance" position={[side * (R - 1.6), 0, at.z + 3]} heading={Math.PI} />;
}

/**
 * A shopfront on fire. Smoke and flames from the door and the window above;
 * neighbours in the doorway until someone moves them; after a few minutes the
 * fire engine arrives, the crew run out a hose and the jet knocks the fire
 * down. Whatever the player did shows: the crowd moved back, the extinguisher
 * shrinking the fire early, the rescued resident sitting safe.
 */
function BuildingFire({ e, minute }: { e: ActiveEvent; minute: number }) {
  const layout = useLayout();
  const { roadHalfWidth: R, pavementWidth: P } = layout;
  const { x, z } = e.scene;
  const face = buildingFaceBehind(layout, x, z);
  const side = face?.side ?? (Math.sign(x) || 1);
  const since = minute - e.startedAt;
  const span = Math.max(1, e.endsAt - e.startedAt - SPRAY_AFTER);
  const sprayed = Math.max(0, since - SPRAY_AFTER) / span;
  const strength = Math.max(0, (e.done.includes('extinguish') ? 0.6 : 1) - sprayed * 1.15);
  const wall: readonly [number, number, number] = [(face ? face.faceX : side * (R + P)) - side * 0.08, 0, z];
  const facing = side > 0 ? -Math.PI / 2 : Math.PI / 2;
  const engine: readonly [number, number, number] = [side * (R - 1.9), 0, z - 7];
  const nozzle: readonly [number, number, number] = [side * (R + 0.6), 1.1, z - 1.2];
  const evacuated = e.done.includes('evacuate');
  const crowdX = evacuated ? -side * (R + P / 2) : side * (R + P * 0.35);
  const crowd = [['Kemi', 'female-adult-03'], ['Uche', 'male-adult-10'], ['Bola', 'female-adult-06'], ['Ade', 'male-adult-04']] as const;
  return (
    <group>
      <Fire at={wall} facing={facing} strength={strength} />
      {crowd.map(([name, look], i) => (
        <Person key={name} name={name} who={evacuated ? 'Neighbour, safe' : 'Neighbour'} lookId={look} at={{ x: crowdX + (i % 2) * 0.8 * -side, z: z + 2.5 + i * 0.9 }} facing={evacuated ? -facing : facing} />
      ))}
      {e.done.includes('rescue') && <Person name="Mama Ngozi" who="Rescued resident" lookId="female-adult-10" at={{ x: -side * (R + P / 2), z: z - 2 }} facing={facing} sitting />}
      {e.done.includes('cordon') && <Cordon points={[[side * (R + 0.2), z - 4], [side * (R + 0.2), z + 4], [side * (R + P - 0.4), z + 4], [side * (R + P - 0.4), z - 4]]} />}
      {since >= FIRE_SERVICE_AFTER && (
        <>
          <EmergencyVehicle kind="fire" position={engine} heading={0} />
          <HoseAndWater from={[engine[0] + side * -1.3, 0.8, engine[2] + 0.4]} nozzle={nozzle} target={[wall[0], 2.2, wall[2]]} spraying={since >= SPRAY_AFTER && strength > 0} />
          <Person name="Officer Eze" who="Firefighter" lookId="construction-male-03" at={{ x: nozzle[0] - side * 0.3, z: nozzle[2] - 0.5 }} facing={facing + Math.PI} uniformed />
          <Person name="Officer Musa" who="Firefighter" lookId="construction-male-03" at={{ x: nozzle[0] - side * 0.9, z: nozzle[2] - 1.6 }} facing={facing + Math.PI} uniformed />
          <EmergencyVehicle kind="police" position={[side * (R - 1.6), 0, z + 9]} heading={Math.PI} />
        </>
      )}
      {since >= PARAMEDICS_AFTER && <EmergencyVehicle kind="ambulance" position={[-side * (R - 1.7), 0, z - 4]} heading={0} />}
    </group>
  );
}

/**
 * The event happening in this district, drawn where it happens. Everyone in
 * it is computer-controlled and says so.
 */
export function LiveEventScene({ event, minute }: { event: ActiveEvent; minute: number }) {
  const t = templateFor(event.kind);
  return (
    <group>
      <SceneRing at={event.scene} colour={RING_COLOUR[t.severity]} />
      {event.kind === 'road-accident' && <Accident e={event} minute={minute} />}
      {event.kind === 'collapse' && <Collapse e={event} minute={minute} />}
      {event.kind === 'missing-person' && <MissingPerson e={event} />}
      {event.kind === 'breakdown' && <Breakdown e={event} />}
      {event.kind === 'lunch-rush' && <LunchRush e={event} />}
      {event.kind === 'building-fire' && <BuildingFire e={event} minute={minute} />}
    </group>
  );
}
