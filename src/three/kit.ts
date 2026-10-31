import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export const sat = (x: number) => Math.min(1, Math.max(0, x));
export const range = (x: number, a: number, b: number) => sat((x - a) / (b - a));
export const smooth = (x: number, a: number, b: number) => {
  const t = range(x, a, b);
  return t * t * (3 - 2 * t);
};

export const AMBER = '#f59e0b';
export const CYAN = '#38d9ff';

const solidMaterial = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.62,
  metalness: 0.18,
});
const glowMaterial = new THREE.MeshBasicMaterial({ vertexColors: true });

function paint(geo: THREE.BufferGeometry, color: string, intensity: number) {
  const c = new THREE.Color(color).multiplyScalar(intensity);
  const count = geo.attributes.position.count;
  const data = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) data.set([c.r, c.g, c.b], i * 3);
  geo.setAttribute('color', new THREE.BufferAttribute(data, 3));
  return geo;
}

/**
 * Collects many primitives and merges them into one mesh per material, so a
 * whole building or truck costs two draw calls instead of thousands.
 */
export class Kit {
  private solid: THREE.BufferGeometry[] = [];
  private glowing: THREE.BufferGeometry[] = [];

  box(w: number, h: number, d: number, x: number, y: number, z: number, color: string) {
    const geo = new THREE.BoxGeometry(w, h, d);
    geo.translate(x, y, z);
    this.solid.push(paint(geo, color, 1));
    return this;
  }

  glow(
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    color: string,
    intensity = 3,
  ) {
    const geo = new THREE.BoxGeometry(w, h, d);
    geo.translate(x, y, z);
    this.glowing.push(paint(geo, color, intensity));
    return this;
  }

  /** Wheel-like cylinder lying along the z axis. */
  wheel(r: number, width: number, x: number, y: number, z: number, color: string) {
    const geo = new THREE.CylinderGeometry(r, r, width, 14);
    geo.rotateX(Math.PI / 2);
    geo.translate(x, y, z);
    this.solid.push(paint(geo, color, 1));
    return this;
  }

  build(shadows = true) {
    const group = new THREE.Group();
    if (this.solid.length) {
      const mesh = new THREE.Mesh(mergeGeometries(this.solid), solidMaterial);
      mesh.castShadow = shadows;
      mesh.receiveShadow = shadows;
      group.add(mesh);
    }
    if (this.glowing.length) group.add(new THREE.Mesh(mergeGeometries(this.glowing), glowMaterial));
    this.solid = [];
    this.glowing = [];
    return group;
  }
}

export type Cell = { x: number; y: number };

/**
 * Rasterises text and returns the filled cells, normalised so width = 1 and
 * centred on the origin. Used for the LED roof sign and the voxel "502".
 */
export function sampleText(text: string, cellPx: number, font: string, canvasW = 900, canvasH = 420) {
  const canvas = document.createElement('canvas');
  canvas.width = canvasW;
  canvas.height = canvasH;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.fillStyle = '#fff';
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvasW / 2, canvasH / 2);
  const { data } = ctx.getImageData(0, 0, canvasW, canvasH);

  const cells: Cell[] = [];
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (let y = 0; y < canvasH; y += cellPx) {
    for (let x = 0; x < canvasW; x += cellPx) {
      const px = Math.floor(x + cellPx / 2);
      const py = Math.floor(y + cellPx / 2);
      if (data[(py * canvasW + px) * 4 + 3] > 128) {
        cells.push({ x: px, y: py });
        minX = Math.min(minX, px);
        maxX = Math.max(maxX, px);
        minY = Math.min(minY, py);
        maxY = Math.max(maxY, py);
      }
    }
  }
  const width = maxX - minX || 1;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  return {
    cells: cells.map((c) => ({ x: (c.x - cx) / width, y: (cy - c.y) / width })),
    aspect: (maxY - minY) / width,
    cellSize: cellPx / width,
  };
}

/** Deterministic pseudo-random so the world looks the same on every visit. */
export function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}
