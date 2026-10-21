/**
 * System for loading and attaching 3D garment models to characters.
 * Handles loading, caching, skinning, and disposal of garment meshes.
 */
import { useEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { type Group, type Object3D, type SkinnedMesh } from 'three';
import type { GarmentModel } from '../lib/fashion';
import { assetUrl } from '../lib/assetManifest';

/** Cache of loaded garment models to avoid reloading the same asset. */
const garmentCache = new Map<string, Object3D>();
const garmentLoadingPromises = new Map<string, Promise<Object3D>>();

/** Load a garment GLB/GLTF file and cache it. */
async function loadGarmentModel(model: GarmentModel): Promise<Object3D> {
  if (garmentCache.has(model.path)) {
    return garmentCache.get(model.path)!.clone();
  }

  if (garmentLoadingPromises.has(model.path)) {
    return garmentLoadingPromises.get(model.path)!.then((scene: any) => scene.clone());
  }

  const promise = (async () => {
    try {
      const url = assetUrl(`clothing/${model.path}`);
      const gltf = await useGLTF.preload(url);
      const scene = (gltf as any).scene.clone(true);
      garmentCache.set(model.path, scene);
      return scene;
    } catch (error) {
      console.error(`[GarmentLoader] Failed to load garment model: ${model.path}`, error);
      throw error;
    }
  })();

  garmentLoadingPromises.set(model.path, promise);
  const result = await promise;
  garmentLoadingPromises.delete(model.path);
  return result;
}

/** 
 * Attach a garment model to a character's skeleton.
 * Handles scaling, skinning retargeting, and bone attachment.
 */
export function attachGarment(
  garmentScene: Object3D,
  garmentModel: GarmentModel,
  characterScene: Object3D,
): void {
  // Apply scale if specified
  if (garmentModel.scale && garmentModel.scale !== 1) {
    garmentScene.scale.multiplyScalar(garmentModel.scale);
  }

  // If attach bones are specified, parent the garment to those bones
  if (garmentModel.attachBones && garmentModel.attachBones.length > 0) {
    for (const boneName of garmentModel.attachBones) {
      const bone = characterScene.getObjectByName(boneName);
      if (bone) {
        bone.add(garmentScene);
        return; // Attach to first found bone
      }
    }
    // If no attach bones found, just add to the scene root
    console.warn(`[GarmentLoader] No attach bones found for garment: ${JSON.stringify(garmentModel.attachBones)}`);
    characterScene.add(garmentScene);
  } else {
    // No specific attach points, add to character scene root
    characterScene.add(garmentScene);
  }

  // Attempt to find and copy skinning information from the character skeleton
  // This is a fallback if the garment was already rigged on a compatible skeleton
  attemptSkinningSkinning(garmentScene, characterScene);
}

/**
 * Attempt to retarget skinning from the character's skeleton.
 * Works if the garment has compatible bone names.
 */
function attemptSkinningSkinning(garmentScene: Object3D, characterScene: Object3D): void {
  const characterBones = new Map<string, any>();
  characterScene.traverse((obj) => {
    if (obj.name) characterBones.set(obj.name, obj);
  });

  garmentScene.traverse((obj) => {
    const skinnedMesh = obj as SkinnedMesh;
    if (!skinnedMesh.isSkinnedMesh || !skinnedMesh.skeleton) return;

    const newBones = skinnedMesh.skeleton.bones.map((bone) => {
      const matchingBone = characterBones.get(bone.name);
      return matchingBone || bone;
    });

    skinnedMesh.skeleton.bones = newBones;
    skinnedMesh.skeleton.boneTexture = null as any; // Will be regenerated
    skinnedMesh.bind(skinnedMesh.skeleton);
  });
}

export interface GarmentLayerProps {
  group: Group | null;
  model: GarmentModel;
  isEquipped: boolean;
}

/**
 * React component to load and attach a 3D garment to a character.
 * Usage: add this component as a child of your character/avatar container.
 */
export function GarmentLayer({ group, model, isEquipped }: GarmentLayerProps) {
  const garmentRef = useRef<Object3D | null>(null);

  useEffect(() => {
    if (!group || !isEquipped || !model?.path) {
      if (garmentRef.current && garmentRef.current.parent) {
        garmentRef.current.parent.remove(garmentRef.current);
      }
      garmentRef.current = null;
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const garmentScene = await loadGarmentModel(model);
        if (cancelled) return;

        attachGarment(garmentScene, model, group);
        garmentRef.current = garmentScene;
      } catch (error) {
        console.error('[GarmentLayer] Failed to load garment:', error);
      }
    })();

    return () => {
      cancelled = true;
      if (garmentRef.current && garmentRef.current.parent) {
        garmentRef.current.parent.remove(garmentRef.current);
      }
      garmentRef.current = null;
    };
  }, [group, model?.path, isEquipped]);

  return null; // This component doesn't render anything; it modifies the scene graph
}

/** Preload a garment model for faster display. */
export async function preloadGarment(model: GarmentModel): Promise<void> {
  try {
    await loadGarmentModel(model);
  } catch (error) {
    console.error('[GarmentLoader] Preload failed:', error);
  }
}

/** Clear the garment model cache (useful for memory management). */
export function clearGarmentCache(): void {
  garmentCache.clear();
}
