import * as THREE from 'three';
import { AMBER, Kit, sampleText } from './kit';

export const HALF_W = 40;
export const FRONT_Z = 30;
export const BACK_Z = -60;
export const WALL_H = 14;
const DEPTH = FRONT_Z - BACK_Z;
const DOOR_W = 5.4;
const DOOR_H = 5.2;
const WALL_DARK = '#1c2230';
const WALL_LIGHT = '#2c3446';
const RIB = '#3a445a';

export const RACK_ROWS = [-31.8, -30.2, -23.2, -21.6, -14.6, -13, -6, -4.4, 4.4, 6, 13, 14.6, 21.6, 23.2, 30.2, 31.8];
export const RACK_START_Z = 20;
export const BAY = 2.8;
export const LEVEL = 1.9;

type Door = { at: number; open?: boolean };

/** One wall along `axis`, with door openings. */
function wall(axis: 'x' | 'z', fixed: number, from: number, to: number, doors: Door[]) {
  const kit = new Kit();
  const put = (
    k: 'box' | 'glow',
    len: number,
    h: number,
    thick: number,
    along: number,
    y: number,
    out: number,
    color: string,
    intensity?: number,
  ) => {
    const [w, d, x, z] =
      axis === 'x' ? [len, thick, along, fixed + out] : [thick, len, fixed + out, along];
    if (k === 'box') kit.box(w, h, d, x, y, z, color);
    else kit.glow(w, h, d, x, y, z, color, intensity);
  };
  const side = Math.sign(fixed);

  put('box', to - from, WALL_H - DOOR_H, 0.5, (from + to) / 2, (WALL_H + DOOR_H) / 2, 0, WALL_LIGHT);
  put('box', to - from, 0.3, 0.7, (from + to) / 2, DOOR_H + 0.15, 0, WALL_DARK);
  put('glow', to - from, 0.14, 0.1, (from + to) / 2, WALL_H - 0.5, side * 0.32, AMBER, 2);

  // Piers between the openings.
  const edges = [...doors.map((d) => d.at)].sort((a, b) => a - b);
  let cursor = from;
  for (const at of edges) {
    const left = at - DOOR_W / 2;
    if (left > cursor) put('box', left - cursor, DOOR_H, 0.5, (cursor + left) / 2, DOOR_H / 2, 0, WALL_DARK);
    cursor = at + DOOR_W / 2;
  }
  if (to > cursor) put('box', to - cursor, DOOR_H, 0.5, (cursor + to) / 2, DOOR_H / 2, 0, WALL_DARK);

  // Corrugated ribs, outside only.
  for (let p = from + 0.5; p < to; p += 1.1) {
    put('box', 0.2, WALL_H - DOOR_H - 0.5, 0.14, p, (WALL_H + DOOR_H) / 2, side * 0.3, RIB);
  }

  for (const door of doors) {
    if (door.open) {
      // Daylight spilling through an open bay.
      put('glow', DOOR_W + 0.3, 0.16, 0.2, door.at, DOOR_H, side * 0.3, '#ffd9a0', 5);
      continue;
    }
    put('glow', DOOR_W, DOOR_H, 0.12, door.at, DOOR_H / 2, side * 0.05, '#ff9a2e', 0.62);
    for (let y = 0.7; y < DOOR_H; y += 0.7) {
      put('box', DOOR_W, 0.06, 0.08, door.at, y, side * 0.13, '#231a14');
    }
  }
  return kit.build();
}

function floorTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1152;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#14171f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const sx = canvas.width / (HALF_W * 2);
  const sz = canvas.height / DEPTH;
  const px = (x: number) => (x + HALF_W) * sx;
  const pz = (z: number) => (FRONT_Z - z) * sz;
  // Pools of light under each high bay.
  for (let z = -54; z < 30; z += 11.25) {
    for (let x = -30; x <= 30; x += 15) {
      const g = ctx.createRadialGradient(px(x), pz(z), 0, px(x), pz(z), 70);
      g.addColorStop(0, 'rgba(255,214,160,0.3)');
      g.addColorStop(1, 'rgba(255,214,160,0)');
      ctx.fillStyle = g;
      ctx.fillRect(px(x) - 70, pz(z) - 70, 140, 140);
    }
  }
  ctx.fillStyle = '#f59e0b';
  for (const x of [-27.5, -25.9, -9.2, 9.2, 25.9, 27.5, -3.6, 3.6, -18.1 + 3.2, -18.1 - 3.2, 14.9, 21.3]) {
    ctx.fillRect(px(x), pz(20), 2, (20 + 22) * sz);
  }
  ctx.fillRect(px(-38), pz(-25), (76) * sx, 3);
  ctx.fillRect(px(-38), pz(-47), (76) * sx, 3);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function createBuilding(fontFamily: string) {
  const group = new THREE.Group();

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(HALF_W * 2, DEPTH),
    new THREE.MeshStandardMaterial({ map: floorTexture(), roughness: 0.46, metalness: 0.22 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0.08, (FRONT_Z + BACK_Z) / 2);
  floor.receiveShadow = true;
  group.add(floor);

  const frontDoors: Door[] = [-32, -24, -16, -8, 8, 16, 24, 32].map((at) => ({ at }));
  frontDoors.push({ at: 0, open: true });
  const front = wall('x', FRONT_Z, -HALF_W, HALF_W, frontDoors);
  const back = wall('x', BACK_Z, -HALF_W, HALF_W, []);
  const left = wall('z', -HALF_W, BACK_Z, FRONT_Z, [{ at: -52, open: true }]);
  const right = wall('z', HALF_W, BACK_Z, FRONT_Z, [
    { at: -52, open: true },
    { at: -36, open: true },
  ]);
  group.add(front, back, left, right);

  // The roll-up door the camera flies through.
  const rollup = new Kit();
  rollup.glow(DOOR_W, DOOR_H, 0.14, 0, 0, 0, '#ff9a2e', 0.9);
  for (let y = -2.1; y < 2.6; y += 0.7) rollup.box(DOOR_W, 0.06, 0.2, 0, y, 0, '#231a14');
  const door = rollup.build(false);
  door.position.set(0, DOOR_H / 2, FRONT_Z + 0.08);
  front.add(door);

  // LED roof sign, parented to the front wall so it travels with the explode.
  const { cells, cellSize } = sampleText('502', 5, `900 380px ${fontFamily}`);
  const signWidth = 34;
  const pixel = cellSize * signWidth * 0.8;
  const sign = new THREE.InstancedMesh(
    new THREE.BoxGeometry(pixel, pixel, 0.3),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(AMBER).multiplyScalar(2.2) }),
    cells.length,
  );
  const m = new THREE.Matrix4();
  cells.forEach((c, i) => {
    sign.setMatrixAt(i, m.makeTranslation(c.x * signWidth, WALL_H + 5.2 + c.y * signWidth, FRONT_Z));
  });
  front.add(sign);
  const mount = new Kit();
  for (const x of [-14, -5, 5, 14]) mount.box(0.3, 3, 0.3, x, WALL_H + 1, FRONT_Z - 0.3, '#2c3446');
  front.add(mount.build(false));

  // Roof, in strips so it can peel away one panel at a time.
  const panels: THREE.Group[] = [];
  const count = 8;
  const panelD = DEPTH / count;
  for (let i = 0; i < count; i++) {
    const z = FRONT_Z - panelD * (i + 0.5);
    const kit = new Kit();
    kit.box(HALF_W * 2 + 1, 0.4, panelD - 0.05, 0, WALL_H + 0.2, z, '#232a39');
    for (const x of [-30, -15, 0, 15, 30]) {
      kit.glow(1.1, 0.12, 6, x, WALL_H - 1.75, z, '#ffe2bd', 2.8);
      kit.box(1.5, 0.2, 6.4, x, WALL_H - 1.62, z, '#343c4e');
      kit.box(0.12, 1.4, 0.12, x, WALL_H - 0.75, z, '#343c4e');
    }
    kit.box(HALF_W * 2, 0.35, 0.3, 0, WALL_H - 0.3, z + panelD / 2 - 0.2, '#333b4c');
    const panel = kit.build();
    panels.push(panel);
    group.add(panel);
  }

  // Racking: blue uprights, orange beams, the look of a real pallet warehouse.
  const rackKit = new Kit();
  const bays = 15;
  const levels = 5;
  for (const x of RACK_ROWS) {
    for (let b = 0; b <= bays; b++) {
      const z = RACK_START_Z - b * BAY;
      rackKit.box(0.1, levels * LEVEL + 0.5, 0.1, x - 0.6, (levels * LEVEL + 0.5) / 2, z, '#2563eb');
      rackKit.box(0.1, levels * LEVEL + 0.5, 0.1, x + 0.6, (levels * LEVEL + 0.5) / 2, z, '#2563eb');
    }
    for (let b = 0; b < bays; b++) {
      const z = RACK_START_Z - (b + 0.5) * BAY;
      for (let l = 1; l <= levels; l++) {
        rackKit.box(0.08, 0.14, BAY, x - 0.6, l * LEVEL - 1.82, z, '#f97316');
        rackKit.box(0.08, 0.14, BAY, x + 0.6, l * LEVEL - 1.82, z, '#f97316');
      }
    }
  }
  const racks = rackKit.build();
  group.add(racks);

  return { group, front, back, left, right, door, panels, racks, sign };
}
