import * as THREE from 'three';
import { AMBER, CYAN, Kit, seeded } from './kit';

/** Semi-truck, 17 m long, nose pointing along +x. */
export function createTruck(trailerColor = '#d9dde6', cabColor = AMBER) {
  const k = new Kit();
  k.box(12.6, 2.9, 2.6, -2.2, 2.75, 0, trailerColor);
  k.glow(12.6, 0.16, 0.05, -2.2, 3.5, 1.325, AMBER, 2.2);
  k.glow(12.6, 0.16, 0.05, -2.2, 3.5, -1.325, AMBER, 2.2);
  k.box(13.4, 0.26, 1.2, -1.6, 1.15, 0, '#20232c');
  k.box(3, 2.5, 2.5, 6.2, 2.45, 0, cabColor);
  k.box(1.1, 1.05, 2.4, 7.25, 3, 0, '#10141d');
  k.box(0.4, 0.5, 2.4, 7.85, 1.3, 0, '#20232c');
  k.glow(0.12, 0.3, 0.5, 7.86, 1.65, 0.95, '#fff4dd', 5);
  k.glow(0.12, 0.3, 0.5, 7.86, 1.65, -0.95, '#fff4dd', 5);
  k.glow(0.08, 0.26, 0.5, -8.54, 1.75, 1, '#ff2a2a', 6);
  k.glow(0.08, 0.26, 0.5, -8.54, 1.75, -1, '#ff2a2a', 6);
  for (const x of [-7.4, -6, 3.8, 6.4]) {
    k.wheel(0.56, 0.5, x, 0.56, 1.12, '#0d0e12');
    k.wheel(0.56, 0.5, x, 0.56, -1.12, '#0d0e12');
  }
  return k.build(false);
}

function createForklift() {
  const k = new Kit();
  k.box(1.2, 0.9, 2, 0, 0.75, 0, AMBER);
  k.box(1.1, 0.08, 1.5, 0, 2.1, -0.15, '#20232c');
  for (const [x, z] of [[-0.5, 0.55], [0.5, 0.55], [-0.5, -0.8], [0.5, -0.8]]) {
    k.box(0.07, 1.3, 0.07, x, 1.5, z, '#20232c');
  }
  k.box(0.1, 3, 0.1, -0.35, 1.5, 1.1, '#20232c').box(0.1, 3, 0.1, 0.35, 1.5, 1.1, '#20232c');
  k.box(0.15, 0.06, 1.2, -0.3, 0.3, 1.75, '#20232c').box(0.15, 0.06, 1.2, 0.3, 0.3, 1.75, '#20232c');
  k.box(1.05, 0.85, 1.05, 0, 0.8, 1.75, '#b98a57');
  k.glow(0.22, 0.22, 0.22, 0, 2.28, -0.15, AMBER, 9);
  k.glow(0.8, 0.08, 0.05, 0, 0.95, 1.03, '#fff4dd', 5);
  return k.build(false);
}

/** Warehouse floor life: forklifts, belts, parcels, scanner and network arcs. */
export function createProps(quality: 'high' | 'low') {
  const group = new THREE.Group();
  const rand = seeded(9);

  const parked: [number, number, number, number][] = [
    [-16, 39.5, -Math.PI / 2, 0],
    [24, 39.5, -Math.PI / 2, 1],
    [49.5, -36, 0, 2],
    [49.5, -52, 0, 3],
    [-49.5, -52, Math.PI, 4],
  ];
  for (const [x, z, rot, i] of parked) {
    const truck = createTruck(i % 2 ? '#c8ced9' : '#e4e6ec', i === 1 ? '#475569' : AMBER);
    truck.position.set(x, 0, z);
    truck.rotation.y = rot;
    group.add(truck);
  }

  const roadTrucks = [createTruck(), createTruck('#b9c1cf', '#e2e8f0')];
  roadTrucks[1].rotation.y = Math.PI;
  group.add(...roadTrucks);

  const lifts = [-26.7, -9.5, 9.5, 26.7, 18.1, -26.7].map((x, i) => {
    const lift = createForklift();
    lift.position.x = x;
    group.add(lift);
    return { lift, phase: i * 1.7, speed: 0.13 + i * 0.012 };
  });

  // Conveyors.
  const belt = new Kit();
  const loop = [
    new THREE.Vector3(-34, 1.35, -30),
    new THREE.Vector3(-14, 1.35, -30),
    new THREE.Vector3(-14, 1.35, -44),
    new THREE.Vector3(-34, 1.35, -44),
  ];
  const beltPiece = (a: THREE.Vector3, b: THREE.Vector3) => {
    const c = a.clone().add(b).multiplyScalar(0.5);
    const lenX = Math.abs(a.x - b.x) + 1.5;
    const lenZ = Math.abs(a.z - b.z) + 1.5;
    belt.box(lenX, 0.14, lenZ, c.x, 1.02, c.z, '#11131a');
    const alongX = lenX > lenZ;
    belt.glow(alongX ? lenX : 0.06, 0.05, alongX ? 0.06 : lenZ, c.x + (alongX ? 0 : 0.8), 1.1, c.z + (alongX ? 0.8 : 0), AMBER, 1.8);
    belt.glow(alongX ? lenX : 0.06, 0.05, alongX ? 0.06 : lenZ, c.x - (alongX ? 0 : 0.8), 1.1, c.z - (alongX ? 0.8 : 0), AMBER, 1.8);
    const len = alongX ? lenX : lenZ;
    for (let t = -len / 2 + 1; t < len / 2; t += 3) {
      for (const side of [-0.7, 0.7]) {
        const dx = alongX ? t : side;
        const dz = alongX ? side : t;
        belt.box(0.1, 1, 0.1, c.x + dx, 0.5, c.z + dz, '#343c4e');
      }
    }
  };
  for (let i = 0; i < 4; i++) beltPiece(loop[i], loop[(i + 1) % 4]);
  const crossA = new THREE.Vector3(-41, 1.35, -52);
  const crossB = new THREE.Vector3(41, 1.35, -52);
  beltPiece(crossA, crossB);
  for (const [x, z] of [[-24, -37], [-30, -37], [-18, -37]]) {
    belt.box(4, 0.1, 2.2, x, 1, z, '#7a5c3a').box(0.1, 1, 2, x - 1.8, 0.5, z, '#343c4e').box(0.1, 1, 2, x + 1.8, 0.5, z, '#343c4e');
    belt.glow(3.2, 0.08, 0.1, x, 2.9, z, '#ffe2bd', 4);
  }
  group.add(belt.build(false));

  const curve = new THREE.CurvePath<THREE.Vector3>();
  for (let i = 0; i < 4; i++) curve.add(new THREE.LineCurve3(loop[i], loop[(i + 1) % 4]));
  const loopPoints = curve.getSpacedPoints(400);

  const loopCount = 34;
  const crossCount = 34;
  const parcels = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial({ roughness: 0.75 }),
    loopCount + crossCount,
  );
  parcels.frustumCulled = false;
  const tones = ['#c79a63', '#b98a57', '#d6ad78', AMBER];
  const sizes: THREE.Vector3[] = [];
  const color = new THREE.Color();
  for (let i = 0; i < loopCount + crossCount; i++) {
    parcels.setColorAt(i, color.set(tones[Math.floor(rand() * tones.length)]));
    sizes.push(new THREE.Vector3(0.7 + rand() * 0.45, 0.4 + rand() * 0.5, 0.7 + rand() * 0.45));
  }
  group.add(parcels);

  // Inventory scanner: a thin sheet of light sweeping the racks.
  const scan = new THREE.Mesh(
    new THREE.PlaneGeometry(68, 13),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color(CYAN).multiplyScalar(1.8),
      transparent: true,
      opacity: 0.05,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  scan.position.y = 6.5;
  scan.visible = false;
  group.add(scan);

  // 3PL network: light travelling out of the building towards the horizon.
  const arcMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    fog: false,
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      uniform float uTime, uOpacity;
      void main() {
        float pulse = pow(fract(vUv.x * 2.0 - uTime * 0.4), 7.0);
        vec3 col = mix(vec3(1.0, 0.55, 0.08), vec3(0.3, 0.85, 1.0), vUv.x);
        gl_FragColor = vec4(col * (0.8 + pulse * 9.0), (0.22 + pulse) * uOpacity);
      }
    `,
  });
  const arcs = new THREE.Group();
  const arcCount = quality === 'high' ? 16 : 9;
  for (let i = 0; i < arcCount; i++) {
    const a = (i / arcCount) * Math.PI * 2 + rand() * 0.25;
    const r = 180 + rand() * 260;
    const start = new THREE.Vector3(Math.cos(a) * 12, 13, -15 + Math.sin(a) * 12);
    const end = new THREE.Vector3(Math.cos(a) * r, 0, -15 + Math.sin(a) * r);
    const mid = start.clone().lerp(end, 0.5).setY(45 + r * 0.22);
    const tube = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(start, mid, end), 60, 0.14, 6);
    arcs.add(new THREE.Mesh(tube, arcMaterial));
  }
  arcs.visible = false;
  group.add(arcs);

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const p = new THREE.Vector3();

  return {
    group,
    arcs,
    scan,
    update(time: number, interior: boolean) {
      roadTrucks[0].position.set(((time * 16 + 400) % 800) - 400, 0, 70);
      roadTrucks[1].position.set(400 - ((time * 12 + 180) % 800), 0, 62);
      arcMaterial.uniforms.uTime.value = time;

      if (!interior) return;
      for (const { lift, phase, speed } of lifts) {
        const s = Math.sin(time * speed + phase);
        lift.position.z = -1 + s * 18;
        lift.rotation.y = Math.cos(time * speed + phase) > 0 ? 0 : Math.PI;
      }
      for (let i = 0; i < loopCount; i++) {
        const u = (i / loopCount + time * 0.018) % 1;
        const point = loopPoints[Math.floor(u * 400)];
        p.set(point.x, point.y + sizes[i].y / 2 - 0.2, point.z);
        parcels.setMatrixAt(i, m.compose(p, q, sizes[i]));
      }
      for (let i = 0; i < crossCount; i++) {
        const j = loopCount + i;
        const u = (i / crossCount + time * 0.03) % 1;
        p.lerpVectors(crossA, crossB, u);
        p.y += sizes[j].y / 2 - 0.2;
        parcels.setMatrixAt(j, m.compose(p, q, sizes[j]));
      }
      parcels.instanceMatrix.needsUpdate = true;
    },
  };
}
