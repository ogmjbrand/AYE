/**
 * 3D preview canvas for displaying garments in the shopping UI.
 * Renders a rotating garment model with lighting.
 */

import { useEffect, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { type Group } from 'three';
import type { Slot } from '../lib/fashion';
import { generateShoeGeometry, generateClothingGeometry } from './ProceduralGarments';

interface GarmentPreviewProps {
  itemId: string;
  slot: Slot;
  color: string;
  accentColor?: string;
  className?: string;
}

/**
 * Inner component for the garment preview (must be inside Canvas).
 */
function GarmentPreviewInner({ itemId, slot, color, accentColor }: GarmentPreviewProps) {
  const groupRef = useRef<Group>(null);

  useEffect(() => {
    if (!groupRef.current) return;

    // Clear previous geometry
    groupRef.current.children = [];

    if (slot === 'shoes') {
      const shoeType = itemId.includes('metallic') ? 'heel' : itemId.includes('boot') ? 'boot' : itemId.includes('sandal') ? 'sandal' : 'flat';
      const shoe = generateShoeGeometry({
        baseColor: color,
        accentColor,
        type: shoeType,
      });
      groupRef.current.add(shoe);
    } else if (slot === 'top' || slot === 'bottom') {
      const clothType = slot === 'top' ? 'top' : 'bottom';
      const clothing = generateClothingGeometry(clothType, color);
      groupRef.current.add(clothing);
    } else if (slot === 'hair') {
      // Hair is shown via material color in the main character preview
      // This component focuses on garments
      return;
    }
  }, [itemId, slot, color, accentColor]);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.02;
    }
  });

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
      <pointLight position={[-5, 3, -5]} intensity={0.4} color="#fff" />
    </group>
  );
}

/**
 * Canvas component for previewing a single garment item with rotation.
 */
export function GarmentPreview({ itemId, slot, color, accentColor, className }: GarmentPreviewProps) {
  return (
    <div className={className || 'h-32 w-full'}>
      <Canvas camera={{ position: [0, 0, 0.4], fov: 50 }} shadows>
        <GarmentPreviewInner itemId={itemId} slot={slot} color={color} accentColor={accentColor} />
      </Canvas>
    </div>
  );
}
