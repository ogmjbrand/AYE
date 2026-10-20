import type { PlayerHandle } from '../hooks/usePlayerController';
import { WorldNPC } from './WorldNPC';
import { NPC_UNIFORMS } from './npcUniforms';

export function FashionHouseScene({ player }: { player: PlayerHandle }) {
  return (
    <>
      <WorldNPC
        lookId="female-adult-08"
        position={[0, 0, 5.45]}
        facing={Math.PI}
        player={player}
        greetPlayer
        styles={NPC_UNIFORMS.fashion}
      />
      <mesh position={[0, 2.76, 0.7]}>
        <boxGeometry args={[5.8, 0.035, 0.035]} />
        <meshStandardMaterial color="#c9a35e" metalness={0.7} roughness={0.28} emissive="#c9a35e" emissiveIntensity={0.16} />
      </mesh>
      {[-5.7, 0, 5.7].map((x) => (
        <group key={x} position={[x, 2.65, -0.1]}>
          <mesh position={[0, -0.16, 0]}>
            <cylinderGeometry args={[0.018, 0.018, 0.32, 8]} />
            <meshStandardMaterial color="#b99658" metalness={0.65} roughness={0.32} />
          </mesh>
          <mesh position={[0, -0.35, 0]}>
            <cylinderGeometry args={[0.12, 0.3, 0.17, 20, 1, true]} />
            <meshStandardMaterial color="#29231f" roughness={0.52} />
          </mesh>
          <pointLight position={[0, -0.45, 0]} intensity={1.15} distance={5} decay={2} color="#ffd49a" />
        </group>
      ))}
      <ambientLight intensity={0.2} color="#f5dfc4" />
      <pointLight position={[0, 2.25, 5.2]} intensity={0.7} distance={4} color="#ffcd84" />
    </>
  );
}
