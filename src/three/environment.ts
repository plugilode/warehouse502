import * as THREE from 'three';
import { AMBER, Kit, seeded } from './kit';

export const SUN_DIR = new THREE.Vector3(-0.42, 0.075, -1).normalize();

const SKY_FRAG = /* glsl */ `
  varying vec3 vDir;
  uniform vec3 uSun;
  void main() {
    vec3 dir = normalize(vDir);
    float h = dir.y;
    vec3 zenith = vec3(0.012, 0.016, 0.055);
    vec3 mid = vec3(0.085, 0.035, 0.17);
    vec3 rose = vec3(0.46, 0.09, 0.16);
    vec3 horizon = vec3(0.98, 0.33, 0.085);
    vec3 col = mix(horizon, rose, smoothstep(0.0, 0.09, h));
    col = mix(col, mid, smoothstep(0.05, 0.27, h));
    col = mix(col, zenith, smoothstep(0.2, 0.68, h));
    col = mix(col, vec3(0.05, 0.03, 0.06), smoothstep(0.0, -0.04, h));
    float sun = max(dot(dir, uSun), 0.0);
    col += vec3(1.2, 0.42, 0.12) * pow(sun, 22.0) * 0.32;
    col += vec3(2.4, 1.2, 0.4) * pow(sun, 520.0);
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function createSky() {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { uSun: { value: SUN_DIR } },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: SKY_FRAG,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(1400, 32, 20), material);
}

export function createStars(count: number) {
  const rand = seeded(11);
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2;
    const y = 0.16 + rand() * 0.84;
    const r = Math.sqrt(1 - y * y);
    positions.set([Math.cos(a) * r * 1300, y * 1300, Math.sin(a) * r * 1300], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color: '#c9d6ff',
      size: 2.2,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.75,
      fog: false,
      depthWrite: false,
    }),
  );
}

function hills(x: number, z: number) {
  return (
    Math.sin(x * 0.011 + z * 0.006) * 4 +
    Math.sin(x * 0.03 - z * 0.022) * 1.6 +
    Math.sin(x * 0.09 + z * 0.07) * 0.5
  );
}

export function createTerrain() {
  const group = new THREE.Group();

  const geo = new THREE.PlaneGeometry(2800, 2800, 150, 150);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const dist = Math.hypot(x, z + 15);
    const fade = Math.min(1, Math.max(0, (dist - 150) / 220));
    pos.setY(i, hills(x, z) * fade - 0.15);
  }
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ color: '#2b1a24', roughness: 1, flatShading: true }),
  );
  ground.receiveShadow = true;
  group.add(ground);

  // Mesas: flat-topped New Mexico silhouettes, layered so the fog gives depth.
  const rand = seeded(502);
  const mesaGeo = new THREE.CylinderGeometry(0.62, 1, 1, 9, 2);
  const stretch = mesaGeo.attributes.position;
  for (let i = 0; i < stretch.count; i++) {
    const wobble = 0.85 + 0.3 * Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 0.3;
    stretch.setX(i, stretch.getX(i) * wobble);
    stretch.setZ(i, stretch.getZ(i) * (2 - wobble));
  }
  mesaGeo.translate(0, 0.5, 0);
  mesaGeo.computeVertexNormals();

  const mesaCount = 74;
  const mesas = new THREE.InstancedMesh(
    mesaGeo,
    new THREE.MeshStandardMaterial({ color: '#40202c', roughness: 0.95, flatShading: true }),
    mesaCount,
  );
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < mesaCount; i++) {
    const a = rand() * Math.PI * 2;
    const r = 340 + rand() * 780;
    const w = 40 + rand() * 120;
    q.setFromAxisAngle(up, rand() * Math.PI);
    m.compose(
      new THREE.Vector3(Math.cos(a) * r, -1, Math.sin(a) * r - 60),
      q,
      new THREE.Vector3(w, 14 + rand() * 46, w * (0.4 + rand() * 0.5)),
    );
    mesas.setMatrixAt(i, m);
  }
  group.add(mesas);

  // Site: apron, road and painted markings.
  const site = new Kit();
  site.box(250, 0.1, 210, 0, 0.02, -15, '#20222c');
  site.box(1500, 0.1, 18, 0, 0.05, 66, '#14151c');
  for (let x = -740; x < 740; x += 14) site.glow(5.5, 0.04, 0.22, x, 0.13, 66, AMBER, 0.75);
  site.box(1500, 0.05, 0.3, 0, 0.11, 57.6, '#cfd3dc').box(1500, 0.05, 0.3, 0, 0.11, 74.4, '#cfd3dc');
  for (let x = -36; x <= 36; x += 8) {
    site.box(0.2, 0.05, 15, x + 4, 0.09, 38, '#d9a13a');
  }
  group.add(site.build(false));

  // Yard lights along the apron.
  const poles = new Kit();
  for (const x of [-58, -30, 30, 58]) {
    poles.box(0.4, 13, 0.4, x, 6.5, 54, '#2c303c');
    poles.box(4, 0.3, 0.8, x, 13, 53.4, '#2c303c');
    poles.glow(3.4, 0.14, 0.5, x, 12.8, 53.4, '#ffd9a0', 3.2);
  }
  group.add(poles.build(false));

  return group;
}

/** Soft dust drifting through the air. */
export function createDust(count: number) {
  const rand = seeded(77);
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions.set([(rand() - 0.5) * 110, rand() * 15, -15 + (rand() - 0.5) * 120], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 32, 32);

  return new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      map: new THREE.CanvasTexture(canvas),
      color: '#ffcf87',
      size: 0.16,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
}
