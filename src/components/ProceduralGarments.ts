/**
 * Procedurally generated shoe geometry for preview/placeholder purposes.
 * These are simple, lightweight models suitable for browser rendering.
 * Eventually replaced with imported 3D models.
 */

import { BoxGeometry, CylinderGeometry, SphereGeometry, MeshStandardMaterial, Group, Mesh, Color } from 'three';

export interface ShoeGeometryOptions {
  baseColor: string;
  accentColor?: string;
  soleColor?: string;
  type: 'sneaker' | 'flat' | 'heel' | 'boot' | 'sandal';
}

/**
 * Generate a simple shoe mesh for display purposes.
 * This is a placeholder; real shoes will be imported as GLB models.
 */
export function generateShoeGeometry(options: ShoeGeometryOptions): Group {
  const group = new Group();

  const baseMat = new MeshStandardMaterial({
    color: new Color(options.baseColor),
    metalness: 0.1,
    roughness: 0.5,
  });

  const soleMat = new MeshStandardMaterial({
    color: new Color(options.soleColor || '#666666'),
    metalness: 0,
    roughness: 0.8,
  });

  // Main shoe body
  const bodyGeo = new BoxGeometry(0.12, 0.06, 0.25);
  const body = new Mesh(bodyGeo, baseMat);
  body.position.z = 0;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Toe cap (rounded front)
  const toeGeo = new SphereGeometry(0.065, 16, 12);
  const toe = new Mesh(toeGeo, baseMat);
  toe.position.set(0, 0.02, 0.14);
  toe.scale.set(1, 0.7, 1.3);
  toe.castShadow = true;
  toe.receiveShadow = true;
  group.add(toe);

  // Sole
  const soleGeo = new BoxGeometry(0.125, 0.008, 0.27);
  const sole = new Mesh(soleGeo, soleMat);
  sole.position.set(0, -0.036, 0);
  sole.castShadow = true;
  sole.receiveShadow = true;
  group.add(sole);

  // Heel (size varies by type)
  if (options.type === 'heel') {
    const heelGeo = new CylinderGeometry(0.016, 0.022, 0.04, 8);
    const heel = new Mesh(heelGeo, baseMat);
    heel.position.set(0, -0.01, -0.125);
    heel.rotation.z = 0.15;
    heel.castShadow = true;
    heel.receiveShadow = true;
    group.add(heel);
  } else if (options.type === 'boot') {
    // Boot has taller sides
    const bootSideGeo = new BoxGeometry(0.14, 0.12, 0.27);
    const bootSide = new Mesh(bootSideGeo, baseMat);
    bootSide.position.y = 0.01;
    bootSide.castShadow = true;
    bootSide.receiveShadow = true;
    group.add(bootSide);
  } else if (options.type === 'sandal') {
    // Sandals are more minimal - remove the main body and just show straps
    group.remove(body);
    const strapGeo = new BoxGeometry(0.12, 0.008, 0.08);
    const strap = new Mesh(strapGeo, baseMat);
    strap.position.z = -0.08;
    strap.castShadow = true;
    strap.receiveShadow = true;
    group.add(strap);
  }

  // Accent stripe (if specified)
  if (options.accentColor && options.type !== 'sandal') {
    const accentMat = new MeshStandardMaterial({
      color: new Color(options.accentColor),
      metalness: 0.1,
      roughness: 0.5,
    });
    const accentGeo = new BoxGeometry(0.125, 0.01, 0.05);
    const accent = new Mesh(accentGeo, accentMat);
    accent.position.set(0, 0.032, 0.08);
    accent.castShadow = true;
    accent.receiveShadow = true;
    group.add(accent);
  }

  return group;
}

/**
 * Generate a simple dress/top garment mesh.
 */
export function generateClothingGeometry(type: 'dress' | 'top' | 'bottom', color: string): Group {
  const group = new Group();

  const clothMat = new MeshStandardMaterial({
    color: new Color(color),
    metalness: 0,
    roughness: 0.7,
  });

  if (type === 'dress') {
    // Dress body
    const bodyGeo = new BoxGeometry(0.18, 0.2, 0.12);
    const body = new Mesh(bodyGeo, clothMat);
    body.position.y = -0.05;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Skirt (wider cone)
    const skirtGeo = new CylinderGeometry(0.14, 0.12, 0.15, 20);
    const skirt = new Mesh(skirtGeo, clothMat);
    skirt.position.y = -0.15;
    skirt.castShadow = true;
    skirt.receiveShadow = true;
    group.add(skirt);
  } else if (type === 'top') {
    // Simple torso mesh
    const topGeo = new BoxGeometry(0.18, 0.15, 0.12);
    const top = new Mesh(topGeo, clothMat);
    top.position.y = 0.05;
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);
  } else if (type === 'bottom') {
    // Pants/skirt
    const pantsGeo = new CylinderGeometry(0.12, 0.11, 0.2, 16);
    const pants = new Mesh(pantsGeo, clothMat);
    pants.position.y = -0.1;
    pants.castShadow = true;
    pants.receiveShadow = true;
    group.add(pants);
  }

  return group;
}
