import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { createBuilding } from './building';
import { createDust, createSky, createStars, createTerrain, SUN_DIR } from './environment';
import { range, smooth } from './kit';
import { createProps } from './props';
import { createSwarm } from './swarm';

type Key = { at: number; pos: [number, number, number]; look: [number, number, number] };

// Chapters match the [data-chapter] sections in App.tsx. Half steps steer the
// camera around the racks so it never clips through anything between stops.
const KEYS: Key[] = [
  { at: 0, pos: [52, 10, 126], look: [-30, 23, 10] },
  { at: 0.55, pos: [6, 5, 54], look: [0, 3.5, 20] },
  { at: 1, pos: [0, 3, 22], look: [0, 4.4, -20] },
  { at: 2, pos: [0, 1.9, 4], look: [-3, 9, -14] },
  { at: 2.55, pos: [0, 2.8, -25.5], look: [18, 3, -30] },
  { at: 3, pos: [19, 3, -36], look: [44, 2.6, -36] },
  { at: 3.5, pos: [8, 4, -40], look: [-20, 2, -42] },
  { at: 4, pos: [-12, 5.4, -35], look: [-25, 1.2, -41] },
  { at: 4.5, pos: [-18.1, 5, -27], look: [-18.1, 6, 0] },
  { at: 5, pos: [-18.1, 5.6, -9], look: [-18.1, 7, 18] },
  { at: 5.6, pos: [-18.1, 19, -27], look: [-4, 4, -45] },
  { at: 6, pos: [-8, 10, -38], look: [12, 0.5, -53] },
  { at: 7, pos: [0, 118, 42], look: [0, 0, -15] },
  { at: 8, pos: [102, 58, 84], look: [0, 12, -15] },
  { at: 9, pos: [0, 30, 126], look: [0, 39, -15] },
  { at: 10, pos: [14, 122, 96], look: [0, 38, -8] },
  { at: 11, pos: [-68, 3, 50], look: [-12, 14, 28] },
];

const GRADE_SHADER = {
  uniforms: { tDiffuse: { value: null }, uTime: { value: 0 } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    varying vec2 vUv;
    float grain(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233)) + uTime) * 43758.5453); }
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float v = smoothstep(1.15, 0.35, length(vUv - 0.5) * 1.35);
      c.rgb *= mix(0.62, 1.0, v);
      c.rgb += (grain(vUv) - 0.5) * 0.022;
      gl_FragColor = c;
    }
  `,
};

export type HQOptions = {
  onChapter: (index: number) => void;
  reducedMotion: boolean;
  fontFamily: string;
};

export class HQExperience {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(38, 1, 0.1, 3200);
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private grade: ShaderPass;
  private curvePos: THREE.CatmullRomCurve3;
  private curveLook: THREE.CatmullRomCurve3;
  private world: ReturnType<typeof createBuilding>;
  private props: ReturnType<typeof createProps>;
  private swarm: ReturnType<typeof createSwarm>;
  private stops: number[] = [];
  private chapter = 0;
  private reported = -1;
  private pointer = new THREE.Vector2();
  private pointerSmooth = new THREE.Vector2();
  private look = new THREE.Vector3();
  private lastFrame = 0;
  private elapsed = 0;
  private frame = 0;
  private dpr: number;
  private slowFrames = 0;
  private portrait = false;
  private observer: ResizeObserver;
  private bayLight = new THREE.PointLight('#ffdcb4', 190, 70, 1.6);
  private aheadLight = new THREE.PointLight('#ffdcb4', 130, 60, 1.6);
  private lastShadowChapter = -1;

  constructor(
    private canvas: HTMLCanvasElement,
    private options: HQOptions,
  ) {
    const mobile = window.innerWidth < 768 || window.matchMedia('(pointer: coarse)').matches;
    this.dpr = Math.min(window.devicePixelRatio, mobile ? 1.4 : 1.75);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.92;
    this.renderer.shadowMap.enabled = !mobile;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;

    this.scene.fog = new THREE.FogExp2('#5c2436', 0.0013);

    const sky = createSky();
    this.scene.add(sky);
    this.scene.add(createStars(mobile ? 500 : 1400));

    // The sky doubles as the reflection source for all PBR surfaces.
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const skyScene = new THREE.Scene();
    skyScene.add(sky.clone());
    this.scene.environment = pmrem.fromScene(skyScene, 0, 1, 2000).texture;
    this.scene.environmentIntensity = 0.42;
    pmrem.dispose();

    this.scene.add(createTerrain());
    this.world = createBuilding(options.fontFamily);
    this.scene.add(this.world.group);
    this.props = createProps(mobile ? 'low' : 'high');
    this.scene.add(this.props.group);
    this.swarm = createSwarm(mobile ? 1 : 3, options.fontFamily, !mobile);
    this.scene.add(this.swarm.mesh);
    this.scene.add(createDust(mobile ? 160 : 520));
    this.addLights(mobile);

    this.curvePos = new THREE.CatmullRomCurve3(
      KEYS.map((k) => new THREE.Vector3(...k.pos)),
      false,
      'catmullrom',
      0.42,
    );
    this.curveLook = new THREE.CatmullRomCurve3(
      KEYS.map((k) => new THREE.Vector3(...k.look)),
      false,
      'catmullrom',
      0.42,
    );

    const target = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      samples: mobile ? 0 : 4,
    });
    this.composer = new EffectComposer(this.renderer, target);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.3, 0.55, 1.05);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.grade = new ShaderPass(GRADE_SHADER);
    this.composer.addPass(this.grade);

    this.resize();
    this.measure();
    this.update(0, 0);

    this.observer = new ResizeObserver(() => this.measure());
    this.observer.observe(document.body);
    window.addEventListener('resize', this.resize);
  }

  /** Compiles shaders without blocking, so the page never freezes on load. */
  async start() {
    await this.renderer.compileAsync(this.scene, this.camera);
    this.renderer.shadowMap.needsUpdate = true;
    this.composer.render();
    if (this.options.reducedMotion) return;
    window.addEventListener('pointermove', this.onPointer, { passive: true });
    document.addEventListener('visibilitychange', this.onVisibility);
    this.lastFrame = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }

  private addLights(mobile: boolean) {
    this.scene.add(new THREE.HemisphereLight('#7f6ea8', '#3a2018', 0.75));

    const sun = new THREE.DirectionalLight('#ffb070', 2.2);
    sun.position.copy(SUN_DIR).multiplyScalar(260).setY(120);
    sun.target.position.set(0, 0, -15);
    sun.castShadow = !mobile;
    sun.shadow.mapSize.set(2048, 2048);
    Object.assign(sun.shadow.camera, { left: -130, right: 130, top: 130, bottom: -130, far: 620 });
    sun.shadow.bias = -0.0006;
    this.scene.add(sun, sun.target);

    // Soft fill so the dock wall is not a silhouette against the sunset.
    const fill = new THREE.DirectionalLight('#ffc48c', 0.85);
    fill.position.set(30, 26, 120);
    this.scene.add(fill);

    // Interior light travels with the camera: two lights instead of dozens,
    // while the floor texture and glowing high bays carry the rest of the look.
    this.scene.add(this.bayLight, this.aheadLight);
  }

  /** Reads where each chapter sits on the page; scroll maps linearly between them. */
  measure = () => {
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-chapter]'));
    const vh = window.innerHeight;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
    this.stops = sections.map((el, i) => {
      const top = el.getBoundingClientRect().top + window.scrollY;
      if (i === 0) return 0;
      return Math.min(maxScroll, top + el.offsetHeight / 2 - vh / 2);
    });
  };

  private scrollChapter() {
    const y = window.scrollY;
    const s = this.stops;
    if (s.length < 2) return 0;
    for (let i = 0; i < s.length - 1; i++) {
      if (y <= s[i + 1]) {
        const u = range(y, s[i], s[i + 1]);
        // Ease each hop so the camera lingers at every stop.
        return i + THREE.MathUtils.lerp(u, u * u * u * (u * (u * 6 - 15) + 10), 0.6);
      }
    }
    return s.length - 1;
  }

  private curveParam(c: number) {
    for (let i = 0; i < KEYS.length - 1; i++) {
      if (c <= KEYS[i + 1].at) {
        return (i + range(c, KEYS[i].at, KEYS[i + 1].at)) / (KEYS.length - 1);
      }
    }
    return 1;
  }

  private update(c: number, time: number) {
    const u = this.curveParam(c);
    const position = this.curvePos.getPoint(u);
    this.curveLook.getPoint(u, this.look);

    // Portrait screens are narrow: recentre the hero and back away from the 502.
    if (this.portrait) {
      this.look.x += 30 * (1 - smooth(c, 0, 0.4));
      const pull = smooth(c, 8.2, 9) * (1 - smooth(c, 9.4, 10)) * 0.62;
      position.sub(this.look).multiplyScalar(1 + pull).add(this.look);
    }

    const near = 1 - smooth(c, 0.2, 0.7);
    const interior = c > 0.75 && c < 8.2;
    const drift = interior ? 0.32 : 2.4;
    position.x += this.pointerSmooth.x * drift + Math.sin(time * 0.22) * 1.1 * near;
    position.y += -this.pointerSmooth.y * drift * 0.45;
    this.camera.position.copy(position);
    this.camera.lookAt(this.look);

    const { front, back, left, right, door, panels, racks, sign } = this.world;
    door.position.y = 2.6 + smooth(c, 0.12, 0.5) * 5;
    door.visible = c < 0.6;
    sign.visible = c < 8.5 || c > 10.6;

    const explode = smooth(c, 7.25, 8) * (1 - smooth(c, 8.4, 8.95));
    front.position.z = explode * 22;
    back.position.z = -explode * 22;
    left.position.x = -explode * 22;
    right.position.x = explode * 22;
    racks.scale.y = 1 + explode * 0.7;

    const back2 = smooth(c, 7.2, 8);
    const close = smooth(c, 8.72, 8.98);
    panels.forEach((panel, i) => {
      const lift = smooth(c, 5.04 + i * 0.05, 5.42 + i * 0.05);
      panel.position.y = lift * (170 * (1 - back2) + (34 + i * 1.6) * back2) * (1 - close);
      panel.rotation.x = lift * (1 - back2) * (1 - close) * (i - 3.5) * 0.05;
      panel.visible = panel.position.y < 165;
    });

    const swarm = this.swarm.uniforms;
    swarm.uAB.value = range(c, 8.3, 9);
    swarm.uBC.value = range(c, 9.25, 10);
    swarm.uCA.value = range(c, 10.25, 10.95);
    swarm.uExplode.value = explode;
    swarm.uMapOn.value = c > 9.6 ? 1 : 0;
    swarm.uTime.value = time;

    const scanOn = smooth(c, 4.35, 4.75) * (1 - smooth(c, 5.2, 5.5));
    const scanZ = 20 - ((time * 8) % 44);
    swarm.uScanOn.value = scanOn;
    swarm.uScanZ.value = scanZ;
    this.props.scan.visible = scanOn > 0.01;
    this.props.scan.position.z = scanZ;

    const arcs = smooth(c, 6.2, 6.8) * (1 - smooth(c, 7.5, 7.95));
    this.props.arcs.visible = arcs > 0.01;
    (this.props.arcs.children[0] as THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial>).material.uniforms.uOpacity.value = arcs;
    this.props.update(time, interior);

    this.bayLight.position.set(this.look.x, 11, this.look.z);
    this.aheadLight.position.set(position.x, Math.min(position.y + 5, 12), position.z);
    const lit = interior ? 1 : 0.15;
    this.bayLight.intensity = 190 * lit;
    this.aheadLight.intensity = 130 * lit;

    // Shadows are static until the building starts to come apart.
    if (c > 5 && c < 11.1 && Math.abs(c - this.lastShadowChapter) > 0.01) {
      this.lastShadowChapter = c;
      this.renderer.shadowMap.needsUpdate = true;
    }

    this.grade.uniforms.uTime.value = time % 10;

    const index = Math.min(this.stops.length - 1, Math.round(c));
    if (index !== this.reported && !this.options.reducedMotion) {
      this.reported = index;
      this.options.onChapter(index);
    }
  }

  private tick = () => {
    this.frame = requestAnimationFrame(this.tick);
    const now = performance.now();
    const dt = Math.min((now - this.lastFrame) / 1000, 0.1);
    this.lastFrame = now;
    this.elapsed += dt;
    const time = this.elapsed;

    this.chapter += (this.scrollChapter() - this.chapter) * (1 - Math.exp(-dt * 5.5));
    this.pointerSmooth.lerp(this.pointer, 1 - Math.exp(-dt * 3));
    this.update(this.chapter, time);
    this.composer.render(dt);
    this.adapt(dt);
  };

  /** Drops resolution on machines that cannot hold a smooth frame rate. */
  private adapt(dt: number) {
    this.slowFrames = dt > 0.03 ? this.slowFrames + 1 : Math.max(0, this.slowFrames - 2);
    if (this.slowFrames > 50 && this.dpr > 0.8) {
      this.slowFrames = 0;
      this.dpr = Math.max(0.8, this.dpr - 0.25);
      this.renderer.setPixelRatio(this.dpr);
      this.composer.setPixelRatio(this.dpr);
      this.resize();
    }
  }

  private onPointer = (e: PointerEvent) => {
    this.pointer.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
  };

  private onVisibility = () => {
    cancelAnimationFrame(this.frame);
    if (document.hidden) return;
    this.lastFrame = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  };

  private resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.portrait = h > w;
    this.camera.aspect = w / h;
    this.camera.fov = this.portrait ? 64 : 38;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.measure();
    if (this.options.reducedMotion) this.composer.render();
  };

  destroy() {
    cancelAnimationFrame(this.frame);
    this.observer.disconnect();
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('pointermove', this.onPointer);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.composer.dispose();
    this.renderer.dispose();
  }
}
