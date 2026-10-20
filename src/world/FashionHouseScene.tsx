function Cashier() {
  return (
    <group position={[0, 0, 5.35]}>
      <mesh position={[0, 0.82, 0]} castShadow>
        <capsuleGeometry args={[0.19, 0.62, 3, 8]} />
        <meshStandardMaterial color="#211f20" roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.31, 0.02]} castShadow>
        <sphereGeometry args={[0.15, 16, 12]} />
        <meshStandardMaterial color="#754d3c" roughness={0.88} />
      </mesh>
      <mesh position={[0, 1.18, -0.05]} castShadow>
        <sphereGeometry args={[0.155, 16, 12]} />
        <meshStandardMaterial color="#211816" roughness={0.92} />
      </mesh>
    </group>
  );
}

export function FashionHouseScene() {
  return (
    <>
      <Cashier />
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
