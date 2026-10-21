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
const SHOE_STYLES: Record<string, { baseColor: string; soleColor?: string; type: 'sneaker' | 'flat' | 'heel' | 'boot' | 'sandal' }> = {
  'clean-white': { baseColor: '#efefea', soleColor: '#cccccc', type: 'sneaker' },
  'leather-black': { baseColor: '#1b1b1d', soleColor: '#3a3a3c', type: 'flat' },
  'leather-tan': { baseColor: '#94623a', soleColor: '#5c4a35', type: 'flat' },
  'suede-burgundy': { baseColor: '#5c1f2b', soleColor: '#3a1520', type: 'flat' },
  'metallic-gold': { baseColor: '#c7a24f', soleColor: '#8a7a4a', type: 'heel' },
};

/**
 * Renders a 3D preview of a garment (currently shoes) using procedural geometry.
 * Displays a rotating shoe in a small 3D canvas.
 */
export function GarmentPreviewPanel({ item, className = '' }: GarmentPreviewPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const shoeRef = useRef<THREE.Group | null>(null);
  const animationIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Set up scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1e24);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      45,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0.15, 0.3);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);

    // Add ground plane for shadow
    const groundGeometry = new THREE.PlaneGeometry(1, 1);
    const groundMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    ground.receiveShadow = true;
    scene.add(ground);

    // Create shoe geometry
    const shoeStyle = SHOE_STYLES[item.id] || { baseColor: '#cccccc', type: 'sneaker' as const };
    const shoe = generateShoeGeometry(shoeStyle);
    shoe.castShadow = true;
    shoe.receiveShadow = true;
    scene.add(shoe);
    shoeRef.current = shoe;

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      if (shoeRef.current) {
        shoeRef.current.rotation.y += 0.01;
      }
      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      window.removeEventListener('resize', handleResize);
      containerRef.current?.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, [item.id]);

  return <div ref={containerRef} className={`h-24 w-full ${className}`} />;
}
