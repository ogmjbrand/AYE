import { useState, useEffect } from 'react';
import { detectNeighborhood, type Neighborhood } from '../lib/neighborhoods';
import type { PlayerHandle } from './usePlayerController';

export function useCurrentNeighborhood(
  controller: PlayerHandle
): Neighborhood | null {
  const [neighborhood, setNeighborhood] = useState<Neighborhood | null>(() =>
    detectNeighborhood(controller.position)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const detected = detectNeighborhood(controller.position);
      setNeighborhood((prev) => {
        // Only update if neighborhood changed to avoid unnecessary re-renders
        if (prev?.id !== detected?.id) {
          return detected;
        }
        return prev;
      });
    }, 500); // Check every 500ms

    return () => clearInterval(interval);
  }, [controller]);

  return neighborhood;
}
