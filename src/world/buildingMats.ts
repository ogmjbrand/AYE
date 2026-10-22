import { DoubleSide, MeshPhysicalMaterial, MeshStandardMaterial } from 'three';

/** Shared materials for the walk-in institutions (university, hospital): made once, reused by every piece. */
let shared: ReturnType<typeof makeMats> | null = null;
function makeMats() {
  const std = (color: string, roughness = 0.8, metalness = 0) => new MeshStandardMaterial({ color, roughness, metalness });
  return {
    plaster: std('#f1ece3', 0.9),
    plasterWarm: std('#e9dfcf', 0.9),
    navyWall: std('#1d2a4a', 0.8),
    stone: std('#d9c9ab', 0.85),
    stoneDark: std('#b9a27c', 0.85),
    glass: new MeshPhysicalMaterial({ color: '#a9c4d4', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.32, side: DoubleSide, depthWrite: false }),
    facadeGlass: new MeshPhysicalMaterial({ color: '#5f7f93', roughness: 0.08, metalness: 0.6, clearcoat: 1, emissive: '#2a3a44', emissiveIntensity: 0.25 }),
    frame: std('#2c2f33', 0.4, 0.7),
    gold: std('#c9a052', 0.28, 0.85),
    wood: std('#8a5f3c', 0.6),
    woodLight: std('#c39a6b', 0.6),
    white: std('#f5f4f0', 0.5),
    black: std('#151618', 0.5),
    seat: std('#2b3a5c', 0.8),
    seatGrey: std('#4a4d52', 0.8),
    hedge: std('#2f5a2a', 0.95),
    soil: std('#5a4330', 1),
    water: new MeshPhysicalMaterial({ color: '#4a8fb0', roughness: 0.05, metalness: 0.1, transmission: 0, clearcoat: 1, emissive: '#0d3b52', emissiveIntensity: 0.3 }),
    screen: new MeshStandardMaterial({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.9, toneMapped: false }),
    lightPanel: new MeshStandardMaterial({ color: '#ffffff', emissive: '#fff6e6', emissiveIntensity: 1.6, toneMapped: false }),
    red: std('#c0392b', 0.6),
    rubber: std('#1b1b1b', 0.9),
    sofa: std('#b5763a', 0.9),
    sofaBlue: std('#2a4a7a', 0.9),
  };
}
export const useMats = () => (shared ??= makeMats());
