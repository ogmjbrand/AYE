/**
 * Procedurally generates simple 3D shoe models as GLB files.
 * This is a temporary solution until real shoe models can be imported.
 * Generates in Node.js and outputs to public/assets/shoes/
 */

const fs = require('fs');
const path = require('path');
const { GLTFExporter } = require('three/examples/jsm/exporters/GLTFExporter.js');
const { BoxGeometry, CylinderGeometry, SphereGeometry, MeshStandardMaterial, Mesh, Scene, Color } = require('three');

const outputDir = path.join(__dirname, '../../public/assets/shoes');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

/**
 * Create a simple shoe mesh from basic geometries.
 */
function createShoe(type, baseColor, accentColor, soleColor) {
  const scene = new Scene();
  scene.background = null;

  const baseMat = new MeshStandardMaterial({
    color: new Color(baseColor),
    metalness: type === 'metallic' ? 0.8 : 0.1,
    roughness: type.includes('suede') ? 0.9 : 0.5,
  });

  const soleMat = new MeshStandardMaterial({
    color: new Color(soleColor || '#666666'),
    metalness: 0,
    roughness: 0.8,
  });

  // Shoe body (simplified as a box + sphere combination)
  const shoeBody = new Mesh(new BoxGeometry(0.12, 0.06, 0.25), baseMat);
  shoeBody.position.z = 0;
  shoeBody.castShadow = true;
  shoeBody.receiveShadow = true;
  scene.add(shoeBody);

  // Shoe toe cap (sphere)
  const toeCap = new Mesh(new SphereGeometry(0.06, 16, 12), baseMat);
  toeCap.position.set(0, 0.02, 0.12);
  toeCap.scale.set(1, 0.8, 1.2);
  toeCap.castShadow = true;
  toeCap.receiveShadow = true;
  scene.add(toeCap);

  // Sole (thin box under the shoe)
  const sole = new Mesh(new BoxGeometry(0.125, 0.01, 0.26), soleMat);
  sole.position.z = 0;
  sole.position.y = -0.035;
  sole.castShadow = true;
  sole.receiveShadow = true;
  scene.add(sole);

  // Heel (if not a flat shoe, add heel geometry)
  if (type === 'heel') {
    const heelGeo = new CylinderGeometry(0.015, 0.02, 0.035, 12);
    const heel = new Mesh(heelGeo, baseMat);
    heel.position.set(0, 0, -0.11);
    heel.rotation.z = 0.2;
    heel.castShadow = true;
    heel.receiveShadow = true;
    scene.add(heel);
  }

  return scene;
}

/**
 * Export scene to GLB format.
 */
async function exportGLB(scene, filename) {
  return new Promise((resolve, reject) => {
    const exporter = new GLTFExporter();
    exporter.parse(
      scene,
      (gltf) => {
        const glbBuffer = Buffer.from(JSON.stringify(gltf), 'utf-8');
        fs.writeFileSync(path.join(outputDir, filename), glbBuffer);
        console.log(`✓ Generated ${filename}`);
        resolve();
      },
      (error) => {
        console.error(`✗ Failed to export ${filename}:`, error);
        reject(error);
      },
      { binary: true }
    );
  });
}

/**
 * Generate all placeholder shoe models.
 */
async function generateAllShoes() {
  const shoes = [
    { file: 'sneaker-white.glb', type: 'sneaker', base: '#efefea', accent: '#d0d0c8', sole: '#cccccc' },
    { file: 'flat-black.glb', type: 'flat', base: '#1b1b1d', sole: '#3a3a3c' },
    { file: 'flat-tan.glb', type: 'flat', base: '#94623a', accent: '#7a5030', sole: '#5c4a35' },
    { file: 'flat-burgundy.glb', type: 'flat', base: '#5c1f2b', sole: '#3a1520' },
    { file: 'heel-gold.glb', type: 'heel', base: '#c7a24f', accent: '#e0c570', sole: '#8a7a4a' },
  ];

  console.log('Generating placeholder shoe models...');
  for (const shoe of shoes) {
    try {
      const scene = createShoe(shoe.type, shoe.base, shoe.accent, shoe.sole);
      await exportGLB(scene, shoe.file);
    } catch (error) {
      console.error(`Error generating ${shoe.file}:`, error);
    }
  }
  console.log('Done!');
}

// Run if executed directly
if (require.main === module) {
  generateAllShoes().catch(console.error);
}

module.exports = { createShoe, exportGLB, generateAllShoes };
