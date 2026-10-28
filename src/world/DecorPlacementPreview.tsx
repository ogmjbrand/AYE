import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group } from 'three';
import type { PlayerHandle } from '../hooks/usePlayerController';
import type { DecorItem } from '../lib/homeDecor';
import { InteriorFurniturePiece } from './HomeInterior';

export function DecorPlacementPreview({
  controller,
  item,
  rotation,
}: {
  controller: PlayerHandle;
  item: DecorItem;
  rotation: number;
}) {
  const preview = useRef<Group>(null);
  useFrame(() => {
    if (!preview.current) return;
    const { x, z } = controller.position;
    const facing = controller.direction;
    preview.current.position.set(x + Math.sin(facing) * 1.35, 0, z + Math.cos(facing) * 1.35);
  });

  return (
    <group ref={preview}>
      <InteriorFurniturePiece
        f={{
          kind: item.kind,
          at: [0, 0],
          size: item.size,
          color: item.color,
          elevation: item.kind === 'wall-art' ? 1.35 : 0,
          rotation,
        }}
      />
    </group>
  );
}
