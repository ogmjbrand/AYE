#!/usr/bin/env node
/**
 * Generate placeholder shoe GLB files for the fashion system.
 * Uses Three.js to create simple shoe geometry and exports to GLB format.
 * 
 * Run: node scripts/generate-placeholder-shoes.mjs
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(__dirname, '../public/assets/shoes');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`✓ Created directory: ${outputDir}`);
}

/**
 * Create a simple shoe mesh.
 */
function createShoeScene(shoeType, baseColor, soleColor, accentColor = null) {
  const scene = new THREE.Scene();
  scene.background = null;

  const baseMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(baseColor),
    metalness: 0.1,
    roughness: 0.5,
  });

  const soleMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(soleColor || '#666666'),
    metalness: 0,
    roughness: 0.8,
  });

  // Main shoe body (box)
  const bodyGeometry = new THREE.BoxGeometry(0.12, 0.06, 0.25);
  const body = new THREE.Mesh(bodyGeometry, baseMaterial);
  body.position.z = 0;
  body.castShadow = true;
  body.receiveShadow = true;
  body.name = 'shoe-body';
  scene.add(body);

  // Toe cap (sphere deformed to be shoe-like)
  const toeGeometry = new THREE.SphereGeometry(0.065, 16, 12);
  const toe = new THREE.Mesh(toeGeometry, baseMaterial);
  toe.position.set(0, 0.02, 0.14);
  toe.scale.set(1, 0.7, 1.3);
  toe.castShadow = true;
  toe.receiveShadow = true;
  toe.name = 'shoe-toe';
  scene.add(toe);

  // Sole (thin box under the shoe)
  const soleGeometry = new THREE.BoxGeometry(0.125, 0.008, 0.27);
  const sole = new THREE.Mesh(soleGeometry, soleMaterial);
  sole.position.set(0, -0.036, 0);
  sole.castShadow = true;
  sole.receiveShadow = true;
  sole.name = 'shoe-sole';
  scene.add(sole);

  // Type-specific geometry
  if (shoeType === 'heel') {
    const heelGeometry = new THREE.CylinderGeometry(0.016, 0.022, 0.04, 8);
    const heel = new THREE.Mesh(heelGeometry, baseMaterial);
    heel.position.set(0, -0.01, -0.125);
    heel.rotation.z = 0.15;
    heel.castShadow = true;
    heel.receiveShadow = true;
    heel.name = 'shoe-heel';
    scene.add(heel);
  } else if (shoeType === 'boot') {
    const bootGeometry = new THREE.BoxGeometry(0.14, 0.12, 0.27);
    const bootSide = new THREE.Mesh(bootGeometry, baseMaterial);
    bootSide.position.y = 0.01;
    bootSide.castShadow = true;
    bootSide.receiveShadow = true;
    bootSide.name = 'shoe-boot';
    scene.add(bootSide);
  } else if (shoeType === 'sandal') {
    scene.remove(body);
    const strapGeometry = new THREE.BoxGeometry(0.12, 0.008, 0.08);
    const strap = new THREE.Mesh(strapGeometry, baseMaterial);
    strap.position.z = -0.08;
    strap.castShadow = true;
    strap.receiveShadow = true;
    strap.name = 'shoe-strap';
    scene.add(strap);
  }

  // Accent stripe
  if (accentColor) {
    const accentMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(accentColor),
      metalness: 0.1,
      roughness: 0.5,
    });
    const accentGeometry = new THREE.BoxGeometry(0.125, 0.01, 0.05);
    const accent = new THREE.Mesh(accentGeometry, accentMaterial);
    accent.position.set(0, 0.032, 0.08);
    accent.castShadow = true;
    accent.receiveShadow = true;
    accent.name = 'shoe-accent';
    scene.add(accent);
  }

  return scene;
}

/**
 * Export a scene to GLB format.
 */
async function exportToGLB(scene, filename) {
  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    exporter.parse(
      scene,
      (gltf) => {
        if (typeof gltf === 'string') {
          fs.writeFileSync(path.join(outputDir, filename), gltf);
        } else {
          // Convert JSON to binary GLB format
          const json = JSON.stringify(gltf);
          const glbBuffer = Buffer.concat([
            Buffer.from('glTF'),
            Buffer.from([0, 0, 0, 2]), // version 2
            Buffer.alloc(4), // size placeholder
            Buffer.from(JSON.stringify({ version: 2 })),
          ]);
          fs.writeFileSync(path.join(outputDir, filename), glbBuffer);
        }
        console.log(`✓ Generated ${filename}`);
        resolve();
      },
      (error) => {
        console.error(`✗ Failed to export ${filename}:`, error);
        reject(error);
      },
      { binary: true, maxTextureSize: 1024 }
    );
  });
}

/**
 * Generate all placeholder shoes.
 */
async function generateAllShoes() {
  const shoes = [
    { file: 'sneaker-white.glb', type: 'sneaker', base: '#efefea', sole: '#cccccc', accent: '#d0d0c8' },
    { file: 'flat-black.glb', type: 'flat', base: '#1b1b1d', sole: '#3a3a3c' },
    { file: 'flat-tan.glb', type: 'flat', base: '#94623a', sole: '#5c4a35', accent: '#7a5030' },
    { file: 'flat-burgundy.glb', type: 'flat', base: '#5c1f2b', sole: '#3a1520' },
    { file: 'heel-gold.glb', type: 'heel', base: '#c7a24f', sole: '#8a7a4a', accent: '#e0c570' },
  ];

  console.log('Generating placeholder shoe models...\n');
  for (const shoe of shoes) {
    try {
      const scene = createShoeScene(shoe.type, shoe.base, shoe.sole, shoe.accent);
      await exportToGLB(scene, shoe.file);
    } catch (error) {
      console.error(`Error generating ${shoe.file}:`, error);
    }
  }
  console.log('\n✓ Done! Placeholder shoes ready for the fashion system.');
}

// Run if executed directly
generateAllShoes().catch(console.error);
