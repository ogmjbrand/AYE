/**
 * Loads licensed garment GLBs and attaches static models to character bones.
 * Rigged garment retargeting is intentionally unsupported until a compatible asset is supplied.
 */
import { useEffect, useRef, type RefObject } from 'react';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { type Group, type Object3D } from 'three';
import type { GarmentModel } from '../lib/fashion';
import { assetUrl } from '../lib/assetManifest';
import { findRigBone } from '../lib/characterRig';

const loader = new GLTFLoader();
const garmentLoadingPromises = new Map<string, Promise<Object3D>>();

function loadGarmentScene(model: GarmentModel): Promise<Object3D> {
  const existing = garmentLoadingPromises.get(model.path);
  if (existing) return existing;

  const promise = loader.loadAsync(assetUrl(`clothing/${model.path}`)).then(({ scene }) => scene);
  garmentLoadingPromises.set(model.path, promise);
  void promise.catch(() => {
    if (garmentLoadingPromises.get(model.path) === promise) garmentLoadingPromises.delete(model.path);
  });
  return promise;
}

async function loadGarmentModel(model: GarmentModel): Promise<Object3D> {
  return clone(await loadGarmentScene(model));
}

/** Attach a static garment to its first matching character bone, or to the character root. */
function attachGarment(
  garmentScene: Object3D,
  garmentModel: GarmentModel,
  characterScene: Object3D,
  avatarScale: number,
): void {
  const scale = (garmentModel.fitToAvatar ? avatarScale : 1) * (garmentModel.scale ?? 1);
  garmentScene.scale.setScalar(scale);

  if (garmentModel.attachBones && garmentModel.attachBones.length > 0) {
    for (const boneName of garmentModel.attachBones) {
      const bone = findRigBone(characterScene, boneName);
      if (bone) {
        if (garmentModel.preserveWorldTransform) {
          characterScene.add(garmentScene);
          characterScene.updateWorldMatrix(true, true);
          bone.attach(garmentScene);
        } else {
          bone.add(garmentScene);
        }
        return;
      }
    }
    console.warn(`[GarmentLoader] No attach bones found for garment: ${JSON.stringify(garmentModel.attachBones)}`);
    return;
  }
  characterScene.add(garmentScene);
}

export interface GarmentLayerProps {
  groupRef: RefObject<Group | null>;
  model: GarmentModel;
  isEquipped: boolean;
  avatarScale?: number;
}

/**
 * Load and attach a garment after the parent character ref has been committed.
 */
export function GarmentLayer({ groupRef, model, isEquipped, avatarScale = 1 }: GarmentLayerProps) {
  const garmentRef = useRef<Object3D | null>(null);

  useEffect(() => {
    const group = groupRef.current;
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

        attachGarment(garmentScene, model, group, avatarScale);
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
  }, [groupRef, isEquipped, model, avatarScale]);

  return null;
}
