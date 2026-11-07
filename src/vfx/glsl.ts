/** GLSL shared by the fire and water shaders: hashing, value noise and fractal noise (fbm). */

export const NOISE_GLSL = /* glsl */ `
float vfxHash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vfxHash3(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vfxNoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(vfxHash(i), vfxHash(i + vec2(1.0, 0.0)), u.x), mix(vfxHash(i + vec2(0.0, 1.0)), vfxHash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float vfxNoise3(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  vec3 u = f * f * (3.0 - 2.0 * f);
  float a = mix(mix(vfxHash3(i), vfxHash3(i + vec3(1,0,0)), u.x), mix(vfxHash3(i + vec3(0,1,0)), vfxHash3(i + vec3(1,1,0)), u.x), u.y);
  float b = mix(mix(vfxHash3(i + vec3(0,0,1)), vfxHash3(i + vec3(1,0,1)), u.x), mix(vfxHash3(i + vec3(0,1,1)), vfxHash3(i + vec3(1,1,1)), u.x), u.y);
  return mix(a, b, u.z);
}
// Fractal noise with OCTAVES layers (a #define set per quality tier)
float vfxFbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < OCTAVES; i++) { v += a * vfxNoise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; }
  return v;
}
`;

/** Temperature (0 cold … 1 hottest) to the colour of burning gas: deep red, orange, yellow, near-white core. */
export const BLACKBODY_GLSL = /* glsl */ `
vec3 vfxBlackbody(float t) {
  t = clamp(t, 0.0, 1.0);
  vec3 c = mix(vec3(0.35, 0.03, 0.0), vec3(1.0, 0.28, 0.02), smoothstep(0.0, 0.35, t));
  c = mix(c, vec3(1.0, 0.62, 0.12), smoothstep(0.3, 0.65, t));
  c = mix(c, vec3(1.0, 0.93, 0.7), smoothstep(0.7, 1.0, t));
  return c;
}
`;
