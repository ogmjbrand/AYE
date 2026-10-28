import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { generateShoeGeometry } from './ProceduralGarments';
import { type FashionItem } from '../lib/fashion';

interface GarmentPreviewPanelProps {
  item: FashionItem;
  className?: string;
}

/**
 * Map shoe IDs to their color/style for procedural geometry.
 * This is temporary until real 3D models are imported.
 */
const SHOE_TYPES: Record<string, 'sneaker' | 'flat' | 'heel' | 'boot' | 'sandal'> = {
  'shoes-clean-white': 'sneaker',
  'shoes-leather-black': 'flat',
  'shoes-leather-tan': 'flat',
  'shoes-suede-burgundy': 'flat',
  'shoes-metallic-gold': 'heel',
};

/**
 * Renders a 3D preview of a garment (currently shoes) using procedural geometry.
 * Displays a rotating shoe in a small 3D canvas.
 */
export function GarmentPreviewPanel({ item, className = '' }: GarmentPreviewPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shoeRef = useRef<THREE.Group | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const baseColor = item.style.colors[0];

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Set up scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1e24);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0.28, 0.16, 0.34);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.3);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Create shoe geometry
    const shoeStyle = {
      baseColor,
      soleColor: item.id === 'shoes-clean-white' ? '#cccccc' : '#3a3030',
      type: SHOE_TYPES[item.id] ?? 'flat',
    };
    const shoe = generateShoeGeometry(shoeStyle);
    scene.add(shoe);
    shoeRef.current = shoe;

    // Animation loop
    let previousTime = 0;
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      const now = performance.now();
      if (shoeRef.current) {
        shoeRef.current.rotation.y += Math.min((now - previousTime) / 1000, 0.05) * 0.4;
      }
      previousTime = now;
      renderer.render(scene, camera);
    };
    animate();

    const resizeObserver = new ResizeObserver(() => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    resizeObserver.observe(container);

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      resizeObserver.disconnect();
      shoe.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.geometry.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((material) => material.dispose());
      });
      container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [item.id, baseColor]);

  return <div ref={containerRef} className={className || 'h-24 w-full'} />;
}
