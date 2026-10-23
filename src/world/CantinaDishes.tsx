import { DoubleSide } from 'three';

/**
 * Cantina Ayé's food and drinks as small 3D models (built here, nothing
 * downloaded): served on the red and green plates in the reference, with the
 * origin on the table top.
 */

type V3 = [number, number, number];

function M({ color, rough = 0.7, metal = 0, opacity }: { color: string; rough?: number; metal?: number; opacity?: number }) {
  return <meshStandardMaterial color={color} roughness={rough} metalness={metal} transparent={opacity !== undefined} opacity={opacity ?? 1} />;
}

/** A glazed plate: red with a green ring, or green with a red one. */
function Plate({ green = false, r = 0.13 }: { green?: boolean; r?: number }) {
  return (
    <group>
      <mesh position={[0, 0.006, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[r, r * 0.8, 0.012, 32]} />
        <M color={green ? '#2f9a4a' : '#c8302c'} rough={0.25} />
      </mesh>
      <mesh position={[0, 0.0125, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[r * 0.62, r * 0.7, 32]} />
        <M color={green ? '#c8302c' : '#2f9a4a'} rough={0.25} />
      </mesh>
    </group>
  );
}

function Blob({ p, s, color, rot = [0, 0, 0], rough = 0.8 }: { p: V3; s: V3; color: string; rot?: V3; rough?: number }) {
  return (
    <mesh position={p} scale={s} rotation={rot} castShadow>
      <sphereGeometry args={[1, 10, 8]} />
      <M color={color} rough={rough} />
    </mesh>
  );
}

/** A rolled tortilla, lying on its side. */
function Roll({ p, len = 0.17, r = 0.032, rotY = 0.4, color = '#e8c98e' }: { p: V3; len?: number; r?: number; rotY?: number; color?: string }) {
  return (
    <group position={p} rotation={[0, rotY, Math.PI / 2]}>
      <mesh castShadow>
        <capsuleGeometry args={[r, len, 6, 14]} />
        <M color={color} rough={0.85} />
      </mesh>
      {/* Toasted stripes */}
      {[-0.04, 0, 0.04].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <torusGeometry args={[r * 1.01, 0.003, 4, 16]} />
          <M color="#a87a40" />
        </mesh>
      ))}
    </group>
  );
}

/** A tall glass with a coloured drink, ice and a straw. */
function Glass({ color, rim, straw = '#e2353a' }: { color: string; rim?: string; straw?: string }) {
  return (
    <group>
      <mesh position={[0, 0.07, 0]}>
        <cylinderGeometry args={[0.036, 0.03, 0.14, 20, 1, true]} />
        <meshPhysicalMaterial color="#ffffff" transmission={0.9} roughness={0.05} thickness={0.01} transparent opacity={0.35} side={DoubleSide} />
      </mesh>
      <mesh position={[0, 0.055, 0]}>
        <cylinderGeometry args={[0.033, 0.028, 0.1, 20]} />
        <M color={color} rough={0.15} opacity={0.88} />
      </mesh>
      {[0, 1, 2].map((k) => <mesh key={k} position={[(k - 1) * 0.012, 0.1, (k % 2) * 0.01]} rotation={[k, k, 0]}><boxGeometry args={[0.014, 0.014, 0.014]} /><M color="#e8f4f8" rough={0.1} opacity={0.7} /></mesh>)}
      <mesh position={[0.012, 0.13, 0]} rotation={[0, 0, 0.2]}><cylinderGeometry args={[0.003, 0.003, 0.12, 6]} /><M color={straw} /></mesh>
      {rim && <mesh position={[0, 0.14, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.036, 0.004, 6, 20]} /><M color={rim} rough={0.9} /></mesh>}
    </group>
  );
}

function Cup({ color }: { color: string }) {
  return (
    <group>
      <mesh position={[0, 0.006, 0]}><cylinderGeometry args={[0.06, 0.06, 0.008, 20]} /><M color="#f2efe6" rough={0.3} /></mesh>
      <mesh position={[0, 0.04, 0]}><cylinderGeometry args={[0.04, 0.032, 0.065, 20]} /><M color="#f2efe6" rough={0.3} /></mesh>
      <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[0.036, 20]} /><M color={color} rough={0.2} /></mesh>
    </group>
  );
}

/** The dish or drink with this menu id; anything unknown is an empty plate. */
export function CantinaDish({ id }: { id: string }) {
  switch (id) {
    case 'nachos':
    case 'guacamole':
      return (
        <group>
          {/* A red bowl of chips, with cheese or a green dip */}
          <mesh position={[0, 0.03, 0]} castShadow>
            <sphereGeometry args={[0.1, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
            <meshStandardMaterial color="#c8302c" roughness={0.3} side={DoubleSide} />
          </mesh>
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(a) * 0.045, 0.045 + (i % 3) * 0.008, Math.sin(a) * 0.045]} rotation={[0.6 + (i % 2) * 0.4, a, 0.3]}>
                <coneGeometry args={[0.035, 0.002, 3]} />
                <M color="#e9b64a" rough={0.8} />
              </mesh>
            );
          })}
          <Blob p={[0, 0.05, 0]} s={[0.04, 0.012, 0.04]} color={id === 'nachos' ? '#f2b62a' : '#7cae3c'} rough={0.4} />
          {id === 'nachos' && <Blob p={[0.02, 0.06, 0.01]} s={[0.012, 0.006, 0.012]} color="#d63a2f" />}
        </group>
      );
    case 'elote':
      return (
        <group>
          <Plate green />
          <group position={[0, 0.04, 0]} rotation={[0, 0.5, Math.PI / 2]}>
            <mesh castShadow><capsuleGeometry args={[0.028, 0.14, 6, 14]} /><M color="#f2c94a" rough={0.6} /></mesh>
          </group>
          <Blob p={[0.02, 0.07, 0.01]} s={[0.05, 0.006, 0.02]} rot={[0, 0.5, 0]} color="#f7f2e4" />
          <Blob p={[-0.07, 0.02, 0.05]} s={[0.018, 0.012, 0.018]} color="#8cc640" />
        </group>
      );
    case 'burrito':
    case 'chicken-burrito':
      return (
        <group>
          <Plate />
          <Roll p={[0, 0.045, 0]} />
          <Blob p={[0.07, 0.02, 0.06]} s={[0.025, 0.012, 0.025]} color="#d63a2f" />
          {id === 'chicken-burrito' && <Blob p={[-0.07, 0.02, 0.06]} s={[0.02, 0.01, 0.02]} color="#f7f2e4" />}
        </group>
      );
    case 'tacos':
      return (
        <group>
          <Plate green />
          {[-0.05, 0, 0.05].map((x, i) => (
            <group key={x} position={[x, 0.035, 0]} rotation={[0, 0.2, 0]}>
              <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
                <cylinderGeometry args={[0.045, 0.045, 0.012, 20, 1, true, 0, Math.PI]} />
                <meshStandardMaterial color="#e8c98e" roughness={0.85} side={DoubleSide} />
              </mesh>
              <Blob p={[0, 0.012, 0]} s={[0.006, 0.02, 0.035]} color={i === 1 ? '#7a3a1e' : '#8a4a26'} />
              <Blob p={[0, 0.03, 0.01]} s={[0.005, 0.006, 0.02]} color="#5aa040" />
            </group>
          ))}
          <Blob p={[0.08, 0.02, 0.07]} s={[0.018, 0.01, 0.018]} color="#a6d65a" />
        </group>
      );
    case 'quesadilla':
      return (
        <group>
          <Plate />
          {[0, 1, 2, 3].map((k) => (
            <mesh key={k} position={[0, 0.022, 0]} rotation={[0, (k * Math.PI) / 2 + 0.2, 0]} castShadow>
              <cylinderGeometry args={[0.095, 0.095, 0.018, 16, 1, false, 0, Math.PI / 2 - 0.08]} />
              <M color="#e7c27c" rough={0.85} />
            </mesh>
          ))}
          <Blob p={[0, 0.034, 0]} s={[0.07, 0.004, 0.07]} color="#f2b62a" rough={0.4} />
        </group>
      );
    case 'flatbread':
      return (
        <group>
          <mesh position={[0, 0.01, 0]} castShadow>
            <cylinderGeometry args={[0.15, 0.15, 0.012, 36]} />
            <M color="#c8302c" rough={0.3} />
          </mesh>
          <mesh position={[0, 0.022, 0]}>
            <cylinderGeometry args={[0.125, 0.125, 0.012, 36]} />
            <M color="#e2b56a" rough={0.8} />
          </mesh>
          <mesh position={[0, 0.029, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.11, 36]} />
            <M color="#d9752e" rough={0.6} />
          </mesh>
          {Array.from({ length: 24 }, (_, i) => {
            const a = i * 2.39, r = 0.02 + ((i * 37) % 9) * 0.01;
            return <Blob key={i} p={[Math.cos(a) * r, 0.032, Math.sin(a) * r]} s={[0.008, 0.003, 0.008]} color={['#f2d24a', '#3caa3c', '#d63a2f', '#f7f2e4'][i % 4]} />;
          })}
        </group>
      );
    case 'churros':
      return (
        <group>
          <Plate green />
          {[-0.03, 0, 0.03].map((z, i) => (
            <group key={z} position={[0.01, 0.025 + i * 0.004, z]} rotation={[0, 0.3 * (i - 1), Math.PI / 2]}>
              <mesh castShadow><cylinderGeometry args={[0.012, 0.012, 0.16, 8]} /><M color="#c58a3e" rough={0.9} /></mesh>
            </group>
          ))}
          <group position={[-0.07, 0.012, 0.06]}><Cup color="#4a2414" /></group>
        </group>
      );
    case 'flan':
      return (
        <group>
          <Plate />
          <mesh position={[0, 0.04, 0]} castShadow><cylinderGeometry args={[0.045, 0.055, 0.05, 28]} /><M color="#f1cf7a" rough={0.3} /></mesh>
          <mesh position={[0, 0.066, 0]}><cylinderGeometry args={[0.046, 0.046, 0.004, 28]} /><M color="#8a4a12" rough={0.15} /></mesh>
        </group>
      );
    case 'horchata': return <Glass color="#f3ead6" straw="#3caa3c" />;
    case 'agua-jamaica': return <Glass color="#9a1f3a" />;
    case 'limonada': return <Glass color="#d9eea0" straw="#3caa3c" />;
    case 'virgin-margarita': return <Glass color="#c7e07a" rim="#f7f7f2" straw="#2bb3c0" />;
    case 'cafe': return <Cup color="#3a1e10" />;
    default:
      return <Plate />;
  }
}
