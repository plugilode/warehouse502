import * as THREE from 'three';
import { BAY, LEVEL, RACK_ROWS, RACK_START_Z } from './building';
import { sampleText, seeded } from './kit';

const WORD_WIDTH = 118;
const WORD_CENTER = new THREE.Vector3(0, 46, -15);
const MAP_Y = 46;

// New Mexico's real outline in lon/lat, bootheel included.
const NM_OUTLINE: [number, number][] = [
  [-109.05, 37], [-103, 37], [-103.04, 36.5], [-103.06, 32], [-106.62, 32],
  [-106.53, 31.78], [-108.21, 31.78], [-108.21, 31.33], [-109.05, 31.33],
];

function inPolygon(x: number, y: number, poly: [number, number][]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Every box sits on a rack slot first: home is a real pallet position. */
function rackSlots(perSlot: number) {
  const slots: { pos: THREE.Vector3; size: THREE.Vector3 }[] = [];
  const bays = 15;
  const levels = 5;
  RACK_ROWS.forEach((x) => {
    for (let b = 0; b < bays; b++) {
      for (const offset of [-0.68, 0.68]) {
        const z = RACK_START_Z - (b + 0.5) * BAY + offset;
        for (let l = 0; l < levels; l++) {
          const y = l * LEVEL + 0.1;
          slots.push({ pos: new THREE.Vector3(x - 0.27, y + 0.25, z - 0.1), size: new THREE.Vector3(0.5, 0.5, 1) });
          if (perSlot < 2) continue;
          slots.push({ pos: new THREE.Vector3(x + 0.27, y + 0.3, z), size: new THREE.Vector3(0.5, 0.6, 1.1) });
          if (perSlot < 3) continue;
          slots.push({ pos: new THREE.Vector3(x, y + 0.82, z), size: new THREE.Vector3(1, 0.44, 1.1) });
        }
      }
    }
  });
  return slots;
}

function wordFormation(count: number, fontFamily: string) {
  const layers = 3;
  let px = 4;
  let result = sampleText('502', px, `900 380px ${fontFamily}`);
  while (result.cells.length * layers > count) {
    px += 1;
    result = sampleText('502', px, `900 380px ${fontFamily}`);
  }
  const voxel = result.cellSize * WORD_WIDTH;
  const points: THREE.Vector3[] = [];
  for (let l = 0; l < layers; l++) {
    for (const c of result.cells) {
      points.push(
        new THREE.Vector3(
          WORD_CENTER.x + c.x * WORD_WIDTH,
          WORD_CENTER.y + c.y * WORD_WIDTH,
          WORD_CENTER.z - l * voxel,
        ),
      );
    }
  }
  return { points, voxel: voxel * 0.86 };
}

function mapFormation(count: number) {
  const scale = 12.5;
  const lonMid = -106.03;
  const latMid = 34.17;
  const cell = Math.max(1.05, Math.sqrt((5400 / count) * 2.2));
  const columns: { x: number; z: number; w: number; h: number }[] = [];
  const points: THREE.Vector3[] = [];
  for (let lon = -109.2; lon < -102.9; lon += cell / scale) {
    for (let lat = 31.2; lat < 37.1; lat += cell / scale) {
      if (!inPolygon(lon, lat, NM_OUTLINE)) continue;
      // Taller stacks to the north, a nod to the Sangre de Cristo range.
      const north = Math.min(1, Math.max(0, (lat - 32) / 4.2));
      const range = Math.exp(-((lon + 105.6) ** 2) * 0.9);
      const swell = 0.5 + 0.5 * Math.sin(lon * 1.7 + lat * 1.3);
      const relief = 0.05 + 0.95 * north * north * range + 0.05 * swell;
      columns.push({ x: (lon - lonMid) * scale, z: -(lat - latMid) * scale, w: relief, h: 1 });
      points.push(new THREE.Vector3(columns[columns.length - 1].x, MAP_Y, columns[columns.length - 1].z - 15));
    }
  }
  const rand = seeded(5);
  while (points.length < count) {
    for (const c of columns) {
      if (points.length >= count) break;
      if (rand() > c.w) continue;
      points.push(new THREE.Vector3(c.x, MAP_Y + c.h * cell, c.z - 15));
      c.h += 1;
    }
  }
  return { points, voxel: cell * 0.985 };
}

const COMMON = /* glsl */ `
  attribute vec3 aA;
  attribute vec3 aB;
  attribute vec3 aC;
  attribute vec3 aSize;
  attribute vec3 aColor;
  attribute vec4 aSeed;
  uniform float uAB, uBC, uCA, uExplode, uTime, uVoxB, uVoxC, uScanZ, uScanOn;
  varying vec3 vTint;
  varying float vHeat;
  varying float vForm;
  varying float vScan;
  varying float vHeight;

  float swEase(float t) { return t * t * (3.0 - 2.0 * t); }
  float swStagger(float m, float s) { return swEase(clamp(m * 1.7 - s * 0.7, 0.0, 1.0)); }
  mat3 swRotate(vec3 axis, float a) {
    float s = sin(a), c = cos(a), o = 1.0 - c;
    return mat3(
      o * axis.x * axis.x + c, o * axis.x * axis.y + axis.z * s, o * axis.z * axis.x - axis.y * s,
      o * axis.x * axis.y - axis.z * s, o * axis.y * axis.y + c, o * axis.y * axis.z + axis.x * s,
      o * axis.z * axis.x + axis.y * s, o * axis.y * axis.z - axis.x * s, o * axis.z * axis.z + c
    );
  }
  vec3 swLeg(vec3 from, vec3 to, float t, float s) {
    vec3 p = mix(from, to, t);
    float k = sin(3.14159 * t);
    p.y += k * (14.0 + 26.0 * s);
    float a = s * 40.0 + t * 3.5;
    p.xz += vec2(cos(a), sin(a)) * k * (5.0 + 16.0 * s);
    return p;
  }
`;

const BODY = /* glsl */ `
  float swS = aSeed.x;
  float swT1 = swStagger(uAB, swS);
  float swT2 = swStagger(uBC, swS);
  float swT3 = swStagger(uCA, swS);
  vec3 swHome = aA;
  swHome.y *= 1.0 + uExplode * 0.7;
  vec3 swPos = swLeg(swHome, aB, swT1, swS);
  if (swT2 > 0.0) swPos = swLeg(aB, aC, swT2, swS);
  if (swT3 > 0.0) swPos = swLeg(aC, swHome, swT3, swS);
  float swFly = sin(3.14159 * swT1) + sin(3.14159 * swT2) + sin(3.14159 * swT3);
  float swForm = swT1 * (1.0 - swT3);
  swPos.y += sin(uTime * 0.9 + swS * 30.0) * 0.28 * swForm;
  vec3 swSize = mix(aSize, vec3(mix(uVoxB, uVoxC, swT2)), swForm);
  mat3 swRot = swRotate(normalize(aSeed.yzw - 0.5), swFly * (3.0 + swS * 6.0));
  vec3 swNormal = swRot * normal;
  vec3 swLocal = swRot * (position * swSize) + swPos;
`;

function patchVertex(shader: { vertexShader: string; uniforms: Record<string, THREE.IUniform> }, uniforms: Record<string, THREE.IUniform>) {
  Object.assign(shader.uniforms, uniforms);
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\n${COMMON}`)
    .replace('void main() {', `void main() {\n${BODY}`)
    .replace('#include <begin_vertex>', 'vec3 transformed = swLocal;');
}

/**
 * One swarm of boxes that plays every role: stored stock on the racks, then the
 * giant "502", then the map of New Mexico, then home again. Positions are
 * resolved on the GPU, so scrubbing thousands of boxes costs almost nothing.
 */
export function createSwarm(perSlot: number, fontFamily: string, shadows: boolean) {
  const slots = rackSlots(perSlot);
  const count = slots.length;
  const rand = seeded(502);
  const shuffled = slots.map((_, i) => i);
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const word = wordFormation(count, fontFamily);
  const map = mapFormation(count);

  const aA = new Float32Array(count * 3);
  const aB = new Float32Array(count * 3);
  const aC = new Float32Array(count * 3);
  const aSize = new Float32Array(count * 3);
  const aColor = new Float32Array(count * 3);
  const aSeed = new Float32Array(count * 4);
  const tones = ['#c79a63', '#b98a57', '#d6ad78', '#a87b4c', '#e7c595', '#f59e0b'];
  const color = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const slot = slots[shuffled[i]];
    aA.set([slot.pos.x, slot.pos.y, slot.pos.z], i * 3);
    aSize.set([slot.size.x, slot.size.y, slot.size.z], i * 3);
    const wp = word.points[i % word.points.length];
    aB.set([wp.x, wp.y, wp.z], i * 3);
    const mp = map.points[i];
    aC.set([mp.x, mp.y, mp.z], i * 3);
    color.set(tones[Math.floor(rand() * tones.length)]);
    aColor.set([color.r, color.g, color.b], i * 3);
    aSeed.set([rand(), rand(), rand(), rand()], i * 4);
  }

  const base = new THREE.BoxGeometry(1, 1, 1);
  const geo = new THREE.InstancedBufferGeometry();
  geo.index = base.index;
  geo.setAttribute('position', base.attributes.position);
  geo.setAttribute('normal', base.attributes.normal);
  geo.setAttribute('uv', base.attributes.uv);
  geo.setAttribute('aA', new THREE.InstancedBufferAttribute(aA, 3));
  geo.setAttribute('aB', new THREE.InstancedBufferAttribute(aB, 3));
  geo.setAttribute('aC', new THREE.InstancedBufferAttribute(aC, 3));
  geo.setAttribute('aSize', new THREE.InstancedBufferAttribute(aSize, 3));
  geo.setAttribute('aColor', new THREE.InstancedBufferAttribute(aColor, 3));
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(aSeed, 4));
  geo.instanceCount = count;

  const uniforms: Record<string, THREE.IUniform> = {
    uAB: { value: 0 },
    uBC: { value: 0 },
    uCA: { value: 0 },
    uExplode: { value: 0 },
    uTime: { value: 0 },
    uVoxB: { value: word.voxel },
    uVoxC: { value: map.voxel },
    uScanZ: { value: 0 },
    uScanOn: { value: 0 },
    uMapOn: { value: 0 },
  };

  const material = new THREE.MeshStandardMaterial({ roughness: 0.68, metalness: 0.05 });
  material.onBeforeCompile = (shader) => {
    patchVertex(shader, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = swNormal;')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        vTint = aColor;
        vHeat = clamp(swFly, 0.0, 1.0);
        vForm = swForm;
        vHeight = clamp((aC.y - 46.0) / 11.0, 0.0, 1.0) * swT2 * (1.0 - swT3);
        vScan = (1.0 - smoothstep(0.0, 1.8, abs(swPos.z - uScanZ))) * uScanOn;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        uniform float uMapOn;
        varying vec3 vTint;
        varying float vHeat;
        varying float vForm;
        varying float vScan;
        varying float vHeight;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec3 swMapped = mix(vec3(0.98, 0.56, 0.08), mix(vec3(0.5, 0.17, 0.05), vec3(1.0, 0.8, 0.42), vHeight), step(0.001, vHeight + uMapOn));
        diffuseColor.rgb *= mix(vTint, swMapped, vForm * 0.9);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        totalEmissiveRadiance += vec3(1.0, 0.5, 0.07) * (vHeat * 1.5 + vForm * 0.3 + vHeight * vHeight * 1.1);
        totalEmissiveRadiance += vec3(0.2, 0.8, 1.2) * vScan * 2.6;`,
      );
  };

  const mesh = new THREE.Mesh(geo, material);
  mesh.frustumCulled = false;
  mesh.receiveShadow = shadows;
  if (shadows) {
    mesh.castShadow = true;
    const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
    depth.onBeforeCompile = (shader) => patchVertex(shader, uniforms);
    mesh.customDepthMaterial = depth;
  }

  return { mesh, uniforms };
}
