import { useMemo } from 'react';
import { BufferAttribute, BufferGeometry, Color, Vector3 } from 'three';
import { Instances, type Placement } from './Instances';
import { seeded, type Building, type BuildingStyle } from '../lib/world';
import { useLayout } from './DistrictContext';
import { BAY_WIDTH, FACADE_TILE, FLOOR_HEIGHT, signTexture } from './textures';
import { materials } from './materials';
import { facadeOffset, floorBandsOf, windowsOf } from './facadeDetail';

/** Collects quads into one BufferGeometry with tile-unit UVs and vertex colours. */
class QuadBuilder {
  pos: number[] = [];
  nrm: number[] = [];
  uv: number[] = [];
  col: number[] = [];
  idx: number[] = [];

  /** Quad from origin o, spanning vectors a (u direction) and b (v direction). */
  quad(o: Vector3, a: Vector3, b: Vector3, uv0: [number, number], uvScale: [number, number], color: Color, bottomColor: Color = color) {
    const n = new Vector3().crossVectors(a, b).normalize();
    const base = this.pos.length / 3;
    const corners = [o, o.clone().add(a), o.clone().add(a).add(b), o.clone().add(b)];
    const uvs = [[0, 0], [1, 0], [1, 1], [0, 1]];
    corners.forEach((p, i) => {
      this.pos.push(p.x, p.y, p.z);
      this.nrm.push(n.x, n.y, n.z);
      this.uv.push(uv0[0] + uvs[i][0] * uvScale[0], uv0[1] + uvs[i][1] * uvScale[1]);
      const c = i < 2 ? bottomColor : color;
      this.col.push(c.r, c.g, c.b);
    });
    this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }

  /** Axis-aligned box sides (and optionally top). */
  box(
    min: Vector3,
    max: Vector3,
    tileW: number,
    tileH: number,
    color: Color,
    uOffset = 0,
    top = false,
    grime = 0,
    westOpening?: { center: number; width: number; height: number },
  ) {
    const w = max.x - min.x, h = max.y - min.y, d = max.z - min.z;
    // Street grime: the bottom few metres darken towards the pavement (splash-back, dust, hands)
    const band = grime > 0 ? Math.min(3, h) : 0;
    const dirty = color.clone().multiplyScalar(1 - grime);
    const side = (o: Vector3, a: Vector3, len: number) => {
      if (band > 0) {
        this.quad(o, a, new Vector3(0, band, 0), [uOffset, min.y / tileH], [len / tileW, band / tileH], color, dirty);
        this.quad(o.clone().setY(min.y + band), a, new Vector3(0, h - band, 0), [uOffset, (min.y + band) / tileH], [len / tileW, (h - band) / tileH], color);
      } else {
        this.quad(o, a, new Vector3(0, h, 0), [uOffset, min.y / tileH], [len / tileW, h / tileH], color);
      }
    };
    side(new Vector3(min.x, min.y, max.z), new Vector3(w, 0, 0), w); // +Z
    side(new Vector3(max.x, min.y, max.z), new Vector3(0, 0, -d), d); // +X
    side(new Vector3(max.x, min.y, min.z), new Vector3(-w, 0, 0), w); // -Z
    if (!westOpening) {
      side(new Vector3(min.x, min.y, min.z), new Vector3(0, 0, d), d); // -X
    } else {
      const start = Math.max(min.z, westOpening.center - westOpening.width / 2);
      const end = Math.min(max.z, westOpening.center + westOpening.width / 2);
      const openingHeight = Math.min(max.y - min.y, westOpening.height);
      const leftWidth = start - min.z;
      const rightWidth = max.z - end;
      if (leftWidth > 0) side(new Vector3(min.x, min.y, min.z), new Vector3(0, 0, leftWidth), leftWidth);
      if (rightWidth > 0) side(new Vector3(min.x, min.y, end), new Vector3(0, 0, rightWidth), rightWidth);
      if (end > start && openingHeight < max.y - min.y) {
        this.quad(
          new Vector3(min.x, min.y + openingHeight, start),
          new Vector3(0, 0, end - start),
          new Vector3(0, max.y - min.y - openingHeight, 0),
          [uOffset + leftWidth / tileW, (min.y + openingHeight) / tileH],
          [(end - start) / tileW, (max.y - min.y - openingHeight) / tileH],
          color,
        );
      }
    }
    if (top) {
      this.quad(new Vector3(min.x, max.y, max.z), new Vector3(w, 0, 0), new Vector3(0, 0, -d), [0, 0], [w / tileW, d / tileW], color);
    }
  }

  geometry() {
    const g = new BufferGeometry();
    g.setAttribute('position', new BufferAttribute(new Float32Array(this.pos), 3));
    g.setAttribute('normal', new BufferAttribute(new Float32Array(this.nrm), 3));
    g.setAttribute('uv', new BufferAttribute(new Float32Array(this.uv), 2));
    g.setAttribute('color', new BufferAttribute(new Float32Array(this.col), 3));
    g.setIndex(this.idx);
    g.computeBoundingSphere();
    return g;
  }
}

const STYLES: BuildingStyle[] = ['tower', 'office', 'residential', 'shop'];
const PARAPET = 1.1;

function tint(b: Building) {
  const c = new Color(b.color);
  // Glass needs a light tint or its reflections go muddy
  return b.style === 'tower' ? c.lerp(new Color('#ffffff'), 0.45) : c;
}

function bounds(b: Building) {
  const [x, , z] = b.position;
  const [w, h, d] = b.size;
  return { min: new Vector3(x - w / 2, 0, z - d / 2), max: new Vector3(x + w / 2, h, z + d / 2) };
}

/** Which way the building faces the boulevard: +1 = towards +X, -1 = towards -X. */
const streetSide = (b: Building) => (b.position[0] < 0 ? 1 : -1);

/** Merged facade and roof geometry, one mesh per facade style, for any list of buildings. */
function facadeGeometries(buildings: readonly Building[]) {
  const facades = Object.fromEntries(STYLES.map((s) => [s, new QuadBuilder()])) as Record<BuildingStyle, QuadBuilder>;
  const roofs = new QuadBuilder();
  for (const b of buildings) {
    const { min, max } = bounds(b);
    const tileW = BAY_WIDTH[b.style] * FACADE_TILE.bays;
    const tileH = FLOOR_HEIGHT[b.style] * FACADE_TILE.floors;
    const color = tint(b);
    facades[b.style].box(
      min,
      max,
      tileW,
      tileH,
      color,
      facadeOffset(b),
      false,
      b.style === 'tower' ? 0.12 : 0.28,
      b.entry?.side === 'west' ? {
        center: b.position[2] + b.entry.offset,
        width: b.entry.width,
        height: b.entry.height,
      } : undefined,
    );
    // Parapet wall around the roof, in the facade's plain band, plus the roof slab
    const pMin = new Vector3(min.x, max.y, min.z);
    const pMax = new Vector3(max.x, max.y + PARAPET, max.z);
    roofs.box(pMin, pMax, 6, 6, new Color(color).multiplyScalar(0.9));
    // Concrete coping along the top of the parapet, overhanging slightly
    roofs.box(new Vector3(min.x - 0.12, max.y + PARAPET, min.z - 0.12), new Vector3(max.x + 0.12, max.y + PARAPET + 0.14, max.z + 0.12), 6, 6, new Color('#bdb6a9'), 0, true);
    roofs.quad(new Vector3(min.x, max.y + 0.05, max.z), new Vector3(max.x - min.x, 0, 0), new Vector3(0, 0, min.z - max.z), [0, 0], [(max.x - min.x) / 6, (max.z - min.z) / 6], new Color('#ffffff'));
    if (b.style === 'tower') {
      // Set-back crown on top of towers
      const inset = 1.2;
      roofs.box(
        new Vector3(min.x + inset, max.y, min.z + inset),
        new Vector3(max.x - inset, max.y + 3.5, max.z - inset),
        6, 6, new Color('#6b7780'), 0, true,
      );
    }
  }
  return {
    facades: STYLES.map((s) => [s, facades[s].geometry()] as const),
    roof: roofs.geometry(),
  };
}

function useDetails(buildings: readonly Building[]) {
  return useMemo(() => {
    const rand = seeded(19);
    const tanks: Placement[] = [];
    const acUnits: Placement[] = [];
    const slabs: Placement[] = [];
    const railings: Placement[] = [];
    const awnings: Placement[] = [];
    const awningColors = ['#c0392b', '#1f7a4d', '#e2a400', '#2a5d9f', '#7b2d6b'];

    for (const b of buildings) {
      const { min, max } = bounds(b);
      const [w, h, d] = b.size;
      const side = streetSide(b);
      const faceX = side > 0 ? max.x : min.x;

      // Rooftop water tanks (the black and blue plastic tanks on Lagos roofs)
      if (b.style !== 'tower') {
        const n = 1 + Math.floor(rand() * 3);
        for (let i = 0; i < n; i++) {
          tanks.push({
            position: new Vector3(min.x + 1.2 + rand() * (w - 2.4), h + 0.05, min.z + 1.2 + rand() * (d - 2.4)),
            scale: new Vector3(1, 0.9 + rand() * 0.6, 1),
          });
        }
      }

      // Air-conditioning units on the street face and sides
      if (b.style === 'residential' || b.style === 'office') {
        const floors = Math.floor(h / FLOOR_HEIGHT[b.style]);
        for (let i = 0; i < Math.min(10, floors * 2); i++) {
          const f = 1 + Math.floor(rand() * (floors - 1));
          const z = min.z + 1 + rand() * (d - 2);
          acUnits.push({
            position: new Vector3(faceX + side * 0.3, f * FLOOR_HEIGHT[b.style] + 0.4, z),
            scale: new Vector3(0.6, 0.55, 0.9),
          });
        }
      }

      // Balconies on residential street faces: every other bay, every floor above ground
      if (b.style === 'residential') {
        const bay = BAY_WIDTH.residential, fh = FLOOR_HEIGHT.residential;
        const floors = Math.floor(h / fh);
        for (let f = 1; f < floors; f++) {
          for (let z = min.z + bay * 0.5; z < max.z - bay * 0.5; z += bay * 2) {
            slabs.push({
              position: new Vector3(faceX + side * 0.55, f * fh, z + bay * 0.5),
              scale: new Vector3(1.1, 1, bay * 0.9),
            });
            railings.push({
              position: new Vector3(faceX + side * 1.07, f * fh + 0.5, z + bay * 0.5),
              scale: new Vector3(0.06, 1, bay * 0.9),
            });
          }
        }
      }

      // Shop awnings over the ground floor
      if (b.style === 'shop') {
        const bay = BAY_WIDTH.shop;
        for (let z = min.z + bay / 2; z < max.z; z += bay) {
          awnings.push({
            position: new Vector3(faceX + side * 0.8, 3.0, z),
            scale: new Vector3(1.6, 1, bay * 0.92),
            rotationY: side > 0 ? 0 : Math.PI,
            color: new Color(awningColors[Math.floor(rand() * awningColors.length)]),
          });
        }
      }
    }
    // Window glass, sills and lintels on every painted window; floor bands between floors
    const glass: Placement[] = [];
    const sills: Placement[] = [];
    const lintels: Placement[] = [];
    const bands: Placement[] = [];
    for (const b of buildings) {
      for (const w of windowsOf(b)) {
        const out = (d: number) => w.center.clone().addScaledVector(w.normal, d);
        glass.push({ position: out(0.012), scale: new Vector3(w.width, w.height, 1), rotationY: w.rotationY });
        sills.push({ position: out(0.07).setY(w.center.y - w.height / 2 - 0.05), scale: new Vector3(w.width + 0.2, 0.08, 0.16), rotationY: w.rotationY });
        lintels.push({ position: out(0.03).setY(w.center.y + w.height / 2 + 0.07), scale: new Vector3(w.width + 0.16, 0.12, 0.07), rotationY: w.rotationY });
      }
      for (const band of floorBandsOf(b)) {
        bands.push({ position: band.center.clone().addScaledVector(band.normal, 0.05), scale: new Vector3(band.length, 0.16, 0.1), rotationY: band.rotationY });
      }
    }
    return { tanks, acUnits, slabs, railings, awnings, glass, sills, lintels, bands };
  }, [buildings]);
}

/** Shop and landmark name boards above the ground floor, facing the boulevard. */
function Signs() {
  const { buildings } = useLayout();
  const signs = useMemo(
    () =>
      buildings.filter((b) => b.name).map((b) => {
        const { min, max } = bounds(b);
        const side = streetSide(b);
        const isShop = b.style === 'shop';
        const width = Math.min(b.size[2] * 0.7, 7);
        // Muted, realistic signboard colours (brand colours are reserved for the logo)
        const SIGN_BG = ['#24323f', '#4a3226', '#2f3b34', '#3a3340', '#463d2c'];
        const tex = signTexture(b.name!, SIGN_BG[b.name!.length % SIGN_BG.length], '#f1ede6');
        return {
          key: b.name!,
          tex,
          width,
          position: [(side > 0 ? max.x : min.x) + side * 0.06, isShop ? 4.1 : 4.6, b.position[2]] as const,
          rotationY: side > 0 ? Math.PI / 2 : -Math.PI / 2,
        };
      }),
    [buildings],
  );
  return (
    <>
      {signs.map((s) => (
        <mesh key={s.key} position={s.position} rotation={[0, s.rotationY, 0]}>
          <planeGeometry args={[s.width, s.width / 4]} />
          <meshStandardMaterial map={s.tex} emissiveMap={s.tex} emissive="#ffffff" emissiveIntensity={0.15} roughness={0.6} />
        </mesh>
      ))}
    </>
  );
}

export function Buildings() {
  const m = materials();
  const { buildings } = useLayout();
  const geo = useMemo(() => facadeGeometries(buildings), [buildings]);
  const details = useDetails(buildings);
  return (
    <group>
      {geo.facades.map(([style, g]) => (
        <mesh key={style} geometry={g} material={m.facade[style]} castShadow receiveShadow />
      ))}
      <mesh geometry={geo.roof} material={m.roof} castShadow receiveShadow />

      <Instances items={details.tanks} material={m.tank} geometry={<cylinderGeometry args={[0.7, 0.7, 1.5, 14]} />} />
      <Instances items={details.acUnits} material={m.acUnit} geometry={<boxGeometry args={[1, 1, 1]} />} />
      <Instances items={details.slabs} material={m.concrete} geometry={<boxGeometry args={[1, 0.18, 1]} />} />
      <Instances items={details.railings} material={m.darkMetal} geometry={<boxGeometry args={[1, 1, 1]} />} />
      <Instances items={details.awnings} material={m.canvas} geometry={<AwningGeometry />} />
      <Instances items={details.glass} material={m.windowGlass} geometry={<planeGeometry args={[1, 1]} />} castShadow={false} />
      <Instances items={details.sills} material={m.trim} geometry={<boxGeometry args={[1, 1, 1]} />} />
      <Instances items={details.lintels} material={m.trim} geometry={<boxGeometry args={[1, 1, 1]} />} />
      <Instances items={details.bands} material={m.trim} geometry={<boxGeometry args={[1, 1, 1]} />} />
      <Signs />
    </group>
  );
}

/**
 * The wider city beyond the playable block: plain massing with the same
 * facade textures (so windows light up at night), fading into the fog. No
 * collision, no shadows and no detail props, so it costs a handful of draw
 * calls and a few thousand triangles.
 */
export function Skyline() {
  const m = materials();
  const { skylineBuildings } = useLayout();
  const geo = useMemo(() => facadeGeometries(skylineBuildings), [skylineBuildings]);
  return (
    <group>
      {geo.facades.map(([style, g]) => (
        <mesh key={style} geometry={g} material={m.facade[style]} />
      ))}
      <mesh geometry={geo.roof} material={m.roof} />
    </group>
  );
}

/** Sloped canvas awning, attached at the wall (x = -0.5) and dropping outwards. */
function AwningGeometry() {
  const g = useMemo(() => {
    const geo = new BufferGeometry();
    // Two triangles from wall top (-0.5, 0.4) to outer lower edge (0.5, -0.2), plus a valance
    const v = new Float32Array([
      -0.5, 0.4, -0.5, 0.5, -0.2, -0.5, 0.5, -0.2, 0.5, -0.5, 0.4, 0.5,
      0.5, -0.2, -0.5, 0.5, -0.45, -0.5, 0.5, -0.45, 0.5, 0.5, -0.2, 0.5,
    ]);
    geo.setAttribute('position', new BufferAttribute(v, 3));
    geo.setIndex([0, 2, 1, 0, 3, 2, 4, 6, 5, 4, 7, 6]);
    geo.computeVertexNormals();
    return geo;
  }, []);
  return <primitive object={g} attach="geometry" />;
}
