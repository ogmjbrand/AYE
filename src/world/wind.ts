import { ShaderChunk, Vector2, type Material } from 'three';

/**
 * The wind, shared by everything it moves. WindDriver (world/WindDriver.tsx) updates these from
 * the weather every frame; materials made swayable with `windSway` read them in their vertex
 * shader, so every palm frond and tree crown bends downwind on the GPU, with gusts, at no CPU cost
 * per tree. Strong wind bends visibly further and faster than a breeze.
 */
export const wind = {
  /** Unit direction the wind blows TOWARDS on the ground (x east, y = world z north). */
  dir: { value: new Vector2(0.5, 0.8) },
  /** Strength 0 (still) … about 1.4 (a gale): wind speed / 15 m/s. */
  strength: { value: 0.2 },
  /** Seconds, for the sway and gusts. */
  time: { value: 0 },
};

/** Wind (m/s, and the bearing it blows from) as the shared uniforms' strength and direction. */
export function setWindFrom(speed: number, fromDegrees: number) {
  const to = ((fromDegrees + 180) * Math.PI) / 180;
  wind.dir.value.set(Math.sin(to), Math.cos(to));
  wind.strength.value = Math.max(0, Math.min(1.4, speed / 15));
}

/**
 * Make an instanced material sway in the wind: vertices bend downwind by up to `bend` metres at
 * `height` metres above the ground (growing with the square of the height, so trunks stay rooted
 * and the crown moves), with each instance's own phase so a row of palms doesn't move as one.
 */
export function windSway(material: Material, height: number, bend: number) {
  const project = ShaderChunk.project_vertex.replace(
    'mvPosition = modelViewMatrix * mvPosition;',
    `{
      float ayeH = clamp(mvPosition.y / ${height.toFixed(2)}, 0.0, 1.6);
      #ifdef USE_INSTANCING
        float ayePhase = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.23;
      #else
        float ayePhase = 0.0;
      #endif
      float ayeSway = 0.65 + 0.35 * sin(ayeWindTime * (1.1 + ayeWind) + ayePhase);
      float ayeGust = sin(ayeWindTime * (3.1 + 2.0 * ayeWind) + ayePhase * 1.7) * 0.18;
      vec2 ayeBend = ayeWindDir * ayeWind * ${bend.toFixed(2)} * ayeH * ayeH * (ayeSway + ayeGust);
      mvPosition.xz += ayeBend;
      mvPosition.y -= dot(ayeBend, ayeBend) * 0.15;
    }
    mvPosition = modelViewMatrix * mvPosition;`,
  );
  const previous = material.onBeforeCompile;
  material.onBeforeCompile = (shader, renderer) => {
    previous?.call(material, shader, renderer);
    shader.uniforms.ayeWindDir = wind.dir;
    shader.uniforms.ayeWind = wind.strength;
    shader.uniforms.ayeWindTime = wind.time;
    shader.vertexShader = `uniform vec2 ayeWindDir;\nuniform float ayeWind;\nuniform float ayeWindTime;\n${shader.vertexShader.replace('#include <project_vertex>', project)}`;
  };
  const key = material.customProgramCacheKey?.bind(material);
  material.customProgramCacheKey = () => `${key ? key() : ''}|wind${height}|${bend}`;
  material.needsUpdate = true;
  return material;
}
