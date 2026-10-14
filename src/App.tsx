
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import "./App.css";

function City() {
  const buildings = [
    { position: [-7, 2, -5], size: [3, 4, 3], color: "#c7a17a" },
    { position: [-3, 3, -7], size: [3, 6, 3], color: "#aab5b7" },
    { position: [4, 2, -7], size: [4, 4, 3], color: "#d8c8ad" },
    { position: [8, 3, -4], size: [3, 6, 4], color: "#b9a18d" },
    { position: [-8, 2, 4], size: [3, 4, 4], color: "#c8b49b" },
    { position: [8, 2, 5], size: [3, 4, 4], color: "#d0c5b3" },
  ] as const;

  return (
    <>
      <color attach="background" args={["#a9c8dc"]} />
      <fog attach="fog" args={["#a9c8dc", 24, 65]} />

      <ambientLight intensity={1.2} />
      <directionalLight
        position={[8, 15, 8]}
        intensity={2.2}
      />

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#65765b" />
      </mesh>

      {/* Main road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[8, 100]} />
        <meshStandardMaterial color="#34383d" roughness={1} />
      </mesh>

      {/* Road markings */}
      {Array.from({ length: 18 }, (_, i) => (
        <mesh
          key={i}
          position={[0, 0.015, -45 + i * 5.3]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.12, 2.5]} />
          <meshBasicMaterial color="#f5e7bd" />
        </mesh>
      ))}

      {/* Sidewalks */}
      {[-5.2, 5.2].map((x) => (
        <mesh
          key={x}
          position={[x, 0.04, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[2.4, 100]} />
          <meshStandardMaterial color="#b6b1a4" />
        </mesh>
      ))}

      {/* Buildings */}
      {buildings.map((building, i) => (
        <group key={i} position={building.position}>
          <mesh
            position={[0, building.size[1] / 2, 0]}
            castShadow
          >
            <boxGeometry args={building.size} />
            <meshStandardMaterial
              color={building.color}
              roughness={0.85}
            />
          </mesh>

          {/* Simple windows */}
          {Array.from({
            length: Math.max(1, Math.floor(building.size[1] / 1.2)),
          }, (_, floor) => (
            <mesh
              key={floor}
              position={[
                0,
                0.8 + floor * 1.1,
                building.size[2] / 2 + 0.008,
              ]}
            >
              <boxGeometry args={[building.size[0] * 0.65, 0.45, 0.025]} />
              <meshStandardMaterial
                color="#41677b"
                roughness={0.3}
                metalness={0.15}
              />
            </mesh>
          ))}
        </group>
      ))}

      {/* Player placeholder */}
      <group position={[1.5, 0, 2]}>
        <mesh position={[0, 0.9, 0]} castShadow>
          <capsuleGeometry args={[0.28, 0.65, 4, 8]} />
          <meshStandardMaterial color="#252a33" roughness={0.8} />
        </mesh>
        <mesh position={[0, 1.65, 0]} castShadow>
          <sphereGeometry args={[0.22, 12, 10]} />
          <meshStandardMaterial color="#8b593e" roughness={0.8} />
        </mesh>
      </group>
    </>
  );
}

export default function App() {
  return (
    <main className="game">
      <Canvas
        camera={{ position: [13, 11, 17], fov: 48 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: "default" }}
      >
        <City />
        <OrbitControls
          makeDefault
          target={[0, 1, 0]}
          enableDamping
          maxPolarAngle={Math.PI / 2 - 0.04}
          minDistance={5}
          maxDistance={35}
        />
      </Canvas>

      <header className="hud">
        <div className="brand">AYE<span> WORLD</span></div>
        <div className="status">EARLY WORLD BUILD · 001</div>
      </header>

      <div className="intro">
        <span className="eyebrow">YOUR WORLD. YOUR STORY.</span>
        <h1>Life begins<br />here.</h1>
        <p>A new world is taking shape.</p>
        <div className="hint">DRAG TO EXPLORE · SCROLL TO ZOOM</div>
      </div>
    </main>
  );
}
