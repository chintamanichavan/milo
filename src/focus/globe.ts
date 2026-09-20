import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { budget, Governor } from './quality';
import { buildAircraft, type Plane3D } from './aircraft3d';
import type { Airport } from './airports';

export type CameraMode = 'chase' | 'wing' | 'orbit' | 'overhead';
export const CAMERA_MODES: CameraMode[] = ['chase', 'wing', 'orbit', 'overhead'];

export interface GlobeRoute {
  from: Airport;
  to: Airport;
}

export interface GlobeHandle {
  setProgress(t: number): void;
  setCamera(mode: CameraMode, manual?: boolean): void;
  cameraMode(): CameraMode;
  setAircraft(id: string): void;
  shake(strength?: number): void;
  setRoute(route: GlobeRoute): void;
  lookAt(lat: number, lon: number): void;
  resize(): void;
  pause(): void;
  resume(): void;
  /** low frame rate while the screen is dimmed */
  setQuality(mode: 'full' | 'low'): void;
  dispose(): void;
}

const R = 1;

/** One transcoder and one copy of each texture, however many globes come and go. */
const textureCache = new Map<string, Promise<THREE.Texture>>();
let sharedKtx2: KTX2Loader | null = null;
const VIOLET = new THREE.Color('#a78bfa');
const SKY = new THREE.Color('#9dc4ff');

export function llToVec3(lat: number, lon: number, radius = R): THREE.Vector3 {
  const theta = ((90 - lat) * Math.PI) / 180;
  const phi = ((lon + 180) * Math.PI) / 180;
  return new THREE.Vector3(
    -radius * Math.cos(phi) * Math.sin(theta),
    radius * Math.cos(theta),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

const onSphere = llToVec3;

/** where the sun is overhead right now */
export function sunDirection(when: Date): THREE.Vector3 {
  const start = Date.UTC(when.getUTCFullYear(), 0, 0);
  const dayOfYear = (when.getTime() - start) / 86_400_000;
  const declination = 23.44 * Math.sin((2 * Math.PI * (dayOfYear - 81)) / 365.24);
  const utcHours = when.getUTCHours() + when.getUTCMinutes() / 60;
  return onSphere(declination, 180 - utcHours * 15).normalize();
}

const VERT = `
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  void main() {
    vUv = uv;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    vec4 world = modelMatrix * vec4(position, 1.0);
    vViewDir = normalize(cameraPosition - world.xyz);
    gl_Position = projectionMatrix * viewMatrix * world;
  }`;

const EARTH_FRAG = `
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform sampler2D topoMap;
  uniform sampler2D waterMap;
  uniform sampler2D cloudMap;
  uniform vec3 sunDir;
  uniform float cloudShift;
  uniform float cloudAmount;
  uniform float specAmount;
  uniform float topoAmount;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vViewDir;

  void main() {
    vec3 normal = normalize(vNormalW);
    float lit = dot(normal, normalize(sunDir));

    // relief: slope of the topography lifts one side of every ridge
    float texel = 1.0 / 2048.0;
    float hx = texture2D(topoMap, vUv + vec2(texel, 0.0)).r - texture2D(topoMap, vUv - vec2(texel, 0.0)).r;
    float hy = texture2D(topoMap, vUv + vec2(0.0, texel)).r - texture2D(topoMap, vUv - vec2(0.0, texel)).r;
    float relief = mix(1.0, clamp(1.0 + (hx + hy) * 6.0, 0.75, 1.3), topoAmount);

    vec3 day = texture2D(dayMap, vUv).rgb * relief;
    day = mix(vec3(dot(day, vec3(0.299, 0.587, 0.114))), day, 1.12);

    // water catches the sun
    float water = texture2D(waterMap, vUv).r;
    vec3 halfVec = normalize(normalize(sunDir) + normalize(vViewDir));
    float spec = pow(max(dot(normal, halfVec), 0.0), 90.0) * water * 0.55 * specAmount;

    // city lights: warm, a little bloomed, never grey
    vec3 lights = texture2D(nightMap, vUv).rgb;
    float glow = smoothstep(0.05, 0.4, dot(lights, vec3(0.33)));
    vec3 night = lights * vec3(1.25, 0.92, 0.6) * 1.4 + vec3(1.0, 0.72, 0.38) * glow * 0.35;

    float dayAmount = smoothstep(-0.04, 0.11, lit);
    vec3 col = mix(night, day * (0.25 + 1.05 * max(lit, 0.0)) + spec, dayAmount);

    // cloud layer, with a soft shadow just behind it
    vec2 cloudUv = vec2(vUv.x + cloudShift, vUv.y);
    float cloud = texture2D(cloudMap, cloudUv).g * cloudAmount;
    float shadow = texture2D(cloudMap, cloudUv - vec2(0.004, 0.0)).g * cloudAmount;
    col *= 1.0 - shadow * 0.25 * dayAmount;
    col = mix(col, mix(vec3(0.08, 0.09, 0.12), vec3(1.0), dayAmount), cloud * 0.55 * (0.35 + dayAmount));

    // warmth along the terminator, and limb darkening towards it
    float dusk = exp(-pow(lit * 14.0, 2.0));
    col += vec3(0.42, 0.20, 0.08) * dusk * 0.32;
    float limb = pow(max(dot(normal, normalize(vViewDir)), 0.0), 0.45);
    col *= mix(0.72, 1.0, limb);

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

const ATMO_FRAG = `
  uniform vec3 glow;
  uniform vec3 tint;
  uniform vec3 sunDir;
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  void main() {
    vec3 normal = normalize(vNormalW);
    // soft and wide at the limb, fading inward
    float rim = 1.0 - max(dot(normal, normalize(vViewDir)), 0.0);
    float fres = pow(rim, 2.1) * 0.75 + pow(rim, 5.0) * 0.9;
    float lit = smoothstep(-0.5, 0.45, dot(normal, normalize(sunDir)));
    vec3 col = mix(tint * 0.55 + vec3(0.10, 0.16, 0.30), glow, lit) * fres * (0.5 + lit * 1.6);
    gl_FragColor = vec4(col, fres * (0.25 + lit * 0.9));
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }`;

const STAR_VERT = `
  attribute float seed;
  uniform float time;
  varying float vAlpha;
  void main() {
    vAlpha = 0.35 + 0.35 * sin(time * (0.6 + seed) + seed * 12.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = 1.0 + seed * 1.4;
  }`;

const STAR_FRAG = `
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - vec2(0.5));
    if (d > 0.5) discard;
    gl_FragColor = vec4(vec3(1.0), vAlpha * (1.0 - d * 1.4));
  }`;

function labelSprite(text: string, colour: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 96;
  const ctx = canvas.getContext('2d')!;
  ctx.font = '600 46px ui-monospace, monospace';
  ctx.fillStyle = colour;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 12;
  ctx.fillText(text, 256, 48);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }),
  );
  sprite.scale.set(0.38, 0.071, 1);
  return sprite;
}

export interface GlobeOptions {
  interactive?: boolean;
  route?: GlobeRoute;
  showPlane?: boolean;
  aircraft?: string;
  now?: () => Date;
  /** dolly in from far away when a flight begins */
  flyIn?: boolean;
}

export async function createGlobe(
  host: HTMLElement,
  options: GlobeOptions = {},
): Promise<GlobeHandle> {
  const { interactive = false, showPlane = false, flyIn = false } = options;
  let aircraftId = options.aircraft ?? 'paper';
  const clock = options.now ?? (() => new Date());

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, budget().dpr));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.domElement.style.display = 'block';
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.05, 200);
  camera.position.set(0, 0.4, 3.2);

  const limits = budget();
  const anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  sharedKtx2 ??= new KTX2Loader().setTranscoderPath('/basis/');
  const ktx2 = sharedKtx2.detectSupport(renderer);
  const bitmapLoader = new THREE.ImageBitmapLoader();
  bitmapLoader.setOptions({ imageOrientation: 'flipY' });

  const dress = (texture: THREE.Texture, srgb: boolean): THREE.Texture => {
    texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    texture.anisotropy = anisotropy;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.needsUpdate = true;
    return texture;
  };

  /** compressed if the device can transcode it, decoded off the main thread if not */
  const loadOnce = (ktx: string, jpg: string, srgb: boolean): Promise<THREE.Texture> => {
    const cached = textureCache.get(ktx);
    if (cached) return cached;
    const job = load(ktx, jpg, srgb);
    textureCache.set(ktx, job);
    return job;
  };

  const load = async (ktx: string, jpg: string, srgb: boolean): Promise<THREE.Texture> => {
    try {
      const texture = await ktx2.loadAsync(ktx);
      return dress(texture, srgb);
    } catch {
      /* fall back to the jpeg */
    }
    try {
      const bitmap = (await bitmapLoader.loadAsync(jpg)) as ImageBitmap;
      const texture = new THREE.Texture(bitmap as unknown as HTMLImageElement);
      texture.generateMipmaps = true;
      return dress(texture, srgb);
    } catch {
      return new THREE.Texture();
    }
  };

  const blank = new THREE.Texture();
  const [dayMap, nightMap, topoMap, waterMap, cloudMap] = await Promise.all([
    loadOnce('/earth/day-4k.ktx2', '/earth/day.jpg', true),
    loadOnce('/earth/night-2k.ktx2', '/earth/night.jpg', true),
    limits.topo ? loadOnce('/earth/topo-2k.ktx2', '/earth/topo.jpg', false) : Promise.resolve(blank),
    limits.water ? loadOnce('/earth/water-1k.ktx2', '/earth/water.jpg', false) : Promise.resolve(blank),
    limits.clouds ? loadOnce('/earth/clouds-2k.ktx2', '/earth/clouds.jpg', false) : Promise.resolve(blank),
  ]);

  const sunDir = { value: sunDirection(clock()) };
  const cloudShift = { value: 0 };

  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(R, limits.sphereSegments[0], limits.sphereSegments[1]),
    new THREE.ShaderMaterial({
      uniforms: {
        dayMap: { value: dayMap },
        nightMap: { value: nightMap },
        topoMap: { value: topoMap },
        waterMap: { value: waterMap },
        cloudMap: { value: cloudMap },
        sunDir,
        cloudShift,
        cloudAmount: { value: limits.clouds ? 1 : 0 },
        specAmount: { value: limits.water ? 1 : 0 },
        topoAmount: { value: limits.topo ? 1 : 0 },
      },
      vertexShader: VERT,
      fragmentShader: EARTH_FRAG,
    }),
  );
  scene.add(earth);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.06, 48, 32),
    new THREE.ShaderMaterial({
      uniforms: { glow: { value: SKY }, tint: { value: VIOLET }, sunDir },
      vertexShader: VERT,
      fragmentShader: ATMO_FRAG,
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  scene.add(atmosphere);

  // stars: many, faint, gently twinkling
  const STAR_COUNT = limits.stars;
  const starGeo = new THREE.BufferGeometry();
  const positions = new Float32Array(STAR_COUNT * 3);
  const seeds = new Float32Array(STAR_COUNT);
  for (let i = 0; i < STAR_COUNT; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(40 + Math.random() * 30);
    positions.set([v.x, v.y, v.z], i * 3);
    seeds[i] = Math.random();
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  starGeo.setAttribute('seed', new THREE.BufferAttribute(seeds, 1));
  const starTime = { value: 0 };
  scene.add(
    new THREE.Points(
      starGeo,
      new THREE.ShaderMaterial({
        uniforms: { time: starTime },
        vertexShader: STAR_VERT,
        fragmentShader: STAR_FRAG,
        transparent: true,
        depthWrite: false,
      }),
    ),
  );

  /* ---------- the route ---------- */

  const SEGMENTS = 220;
  let points: THREE.Vector3[] = [];
  let route = options.route;

  const flownMat = new THREE.MeshBasicMaterial({ color: VIOLET });
  const flown = new THREE.Mesh(new THREE.BufferGeometry(), flownMat);
  const ahead = new THREE.Line(
    new THREE.BufferGeometry(),
    new THREE.LineDashedMaterial({ color: VIOLET, dashSize: 0.02, gapSize: 0.022, opacity: 0.5, transparent: true }),
  );
  scene.add(flown, ahead);

  const leaderMat = new THREE.LineBasicMaterial({ color: 0x9aa3a9, transparent: true, opacity: 0.5 });
  const leaderFrom = new THREE.Line(new THREE.BufferGeometry(), leaderMat);
  const leaderTo = new THREE.Line(new THREE.BufferGeometry(), leaderMat.clone());
  scene.add(leaderFrom, leaderTo);

  const pinGeo = new THREE.SphereGeometry(0.014, 16, 16);
  const pinFrom = new THREE.Mesh(pinGeo, new THREE.MeshBasicMaterial({ color: 0xcfd6db }));
  const pinTo = new THREE.Mesh(pinGeo, new THREE.MeshBasicMaterial({ color: VIOLET }));
  scene.add(pinFrom, pinTo);
  let labelFrom = labelSprite('', '#cfd6db');
  let labelTo = labelSprite('', '#c9b6ff');
  scene.add(labelFrom, labelTo);

  scene.add(new THREE.AmbientLight(0xffffff, 0.75));
  const sunLight = new THREE.DirectionalLight(0xfff3e0, 2.2);
  scene.add(sunLight);

  const plane = new THREE.Group();
  plane.visible = showPlane;
  scene.add(plane);
  let model: Plane3D = buildAircraft(aircraftId);
  plane.add(model.group);

  // exhaust: forty points that fade out behind the plane
  const TRAIL = 40;
  const trailGeo = new THREE.BufferGeometry();
  const trailPos = new Float32Array(TRAIL * 3);
  const trailAlpha = new Float32Array(TRAIL);
  trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
  trailGeo.setAttribute('seed', new THREE.BufferAttribute(trailAlpha, 1));
  const trail = new THREE.Points(
    trailGeo,
    new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: `
        attribute float seed;
        varying float vAlpha;
        void main() {
          vAlpha = seed;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = 2.0 + seed * 3.5;
        }`,
      fragmentShader: `
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          gl_FragColor = vec4(0.72, 0.60, 1.0, vAlpha * 0.5 * (1.0 - d * 1.6));
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  trail.visible = showPlane;
  scene.add(trail);

  function buildRoute(next: GlobeRoute): void {
    route = next;
    const a = onSphere(next.from.lat, next.from.lon);
    const b = onSphere(next.to.lat, next.to.lon);
    const angle = a.angleTo(b);
    points = [];
    for (let i = 0; i <= SEGMENTS; i++) {
      const t = i / SEGMENTS;
      const p = new THREE.Vector3().copy(a).lerp(b, t).normalize();
      p.multiplyScalar(R * (1 + Math.max(0.03, angle * 0.055) * Math.sin(Math.PI * t)));
      points.push(p);
    }
    const curve = new THREE.CatmullRomCurve3(points);
    flown.geometry.dispose();
    const { back } = fitRoute();
    flown.geometry = new THREE.TubeGeometry(
      curve,
      SEGMENTS,
      THREE.MathUtils.clamp(back * 0.006, 0.0012, 0.008),
      8,
      false,
    );
    ahead.geometry.dispose();
    ahead.geometry = new THREE.BufferGeometry().setFromPoints(points);
    ahead.computeLineDistances();
    pinFrom.position.copy(a.clone().multiplyScalar(1.006));
    pinTo.position.copy(b.clone().multiplyScalar(1.006));
    labelFrom.position.copy(a.clone().multiplyScalar(1.09));
    labelTo.position.copy(b.clone().multiplyScalar(1.09));
    scene.remove(labelFrom, labelTo);
    labelFrom = labelSprite(next.from.iata, '#cfd6db');
    labelTo = labelSprite(`${next.to.iata} · ${next.to.city}`, '#c9b6ff');
    labelFrom.position.copy(a.clone().multiplyScalar(1.055));
    labelTo.position.copy(b.clone().multiplyScalar(1.075));
    // on a short hop the two labels would sit on top of each other
    labelFrom.visible = angle > 0.17;
    labelTo.scale.set(0.48, 0.089, 1);
    scene.add(labelFrom, labelTo);
    leaderFrom.geometry.setFromPoints([a.clone().multiplyScalar(1.005), a.clone().multiplyScalar(1.05)]);
    leaderTo.geometry.setFromPoints([b.clone().multiplyScalar(1.005), b.clone().multiplyScalar(1.07)]);
    frameRoute();
  }

  /* ---------- camera ---------- */

  const desired = new THREE.Vector3(0, 0, 3.2);
  const desiredTarget = new THREE.Vector3(0, 0, 0);
  let distance = 3.2;
  let progress = 0;
  let lastTouch = 0;
  const introStart = performance.now();
  const INTRO_MS = 2500;

  /** distance at which the whole disc fits the narrower axis, with margin */
  function fitDistance(margin = 1.14): number {
    const halfV = THREE.MathUtils.degToRad(camera.fov) / 2;
    const halfH = Math.atan(Math.tan(halfV) * camera.aspect);
    return (R * margin) / Math.sin(Math.min(halfV, halfH));
  }

  /** the arc's own bounding sphere, so short hops fill the frame too */
  function routeBounds(): { centre: THREE.Vector3; radius: number } {
    if (points.length === 0) return { centre: new THREE.Vector3(0, 0, R), radius: R };
    const centre = new THREE.Vector3();
    for (const p of points) centre.add(p);
    centre.divideScalar(points.length);
    let radius = 0;
    for (const p of points) radius = Math.max(radius, p.distanceTo(centre));
    return { centre, radius: Math.max(0.06, radius) };
  }

  /** how far back the camera must sit to hold the whole arc, with a quarter margin */
  function fitRoute(): { centre: THREE.Vector3; back: number } {
    const halfV = THREE.MathUtils.degToRad(camera.fov) / 2;
    const halfH = Math.atan(Math.tan(halfV) * camera.aspect);
    const { centre, radius } = routeBounds();
    return { centre, back: (radius * 1.25) / Math.sin(Math.min(halfV, halfH)) };
  }

  function routeDistance(): number {
    const fit = fitDistance();
    if (!route) return fit;
    const a = onSphere(route.from.lat, route.from.lon);
    const b = onSphere(route.to.lat, route.to.lon);
    const angle = a.angleTo(b);
    // long routes need a little more room than the disc itself
    return Math.max(fit, fitDistance(1.05 + angle * 0.4));
  }

  let cameraMode: CameraMode = 'chase';
  let manualUntil = 0;
  let cutStart = 0;
  const cutFrom = new THREE.Vector3();
  let lastCycle = Date.now();
  let shakeUntil = 0;
  let shakeAmount = 0;
  /** the ground-truth tests park the camera and expect it to stay put */
  let frozen = false;

  /** Keep the flight in frame, but lean towards the sun so the terminator shows. */
  const MAX_LEAN = THREE.MathUtils.degToRad(52);

  function framePoint(at: THREE.Vector3, tangent: THREE.Vector3): void {
    distance = routeDistance();
    const here = at.clone().normalize();
    const sun = sunDir.value.clone().normalize();
    const between = here.angleTo(sun);
    const lean = between > 1e-3 ? Math.min(1, MAX_LEAN / between) : 0;
    const lit = here.clone().lerp(sun, lean).normalize();
    const landing = progress > 0.96 ? 1 + (progress - 0.96) * 3 : 1;
    const side = tangent.clone().cross(here).normalize();

    if (showPlane && cameraMode === 'chase') {
      // the whole route in frame, seen from behind and above the aircraft
      const { centre, back } = fitRoute();
      const dir = centre
        .clone()
        .normalize()
        .multiplyScalar(1.15)
        .add(tangent.clone().multiplyScalar(-0.5))
        .add(lit.clone().multiplyScalar(0.25))
        .normalize();
      desired.copy(centre.clone().normalize().multiplyScalar(centre.length())).add(dir.multiplyScalar(back));
      desiredTarget.copy(centre);
      return;
    }
    if (showPlane && cameraMode === 'overhead') {
      const { centre, back } = fitRoute();
      desired.copy(centre.clone().normalize().multiplyScalar(centre.length() + back));
      desiredTarget.copy(centre);
      return;
    }
    if (!showPlane || cameraMode === 'orbit') {
      const dir = lit.clone().add(tangent.clone().multiplyScalar(0.1)).normalize();
      desired.copy(dir).multiplyScalar(distance * landing);
      desiredTarget.copy(here).multiplyScalar(-0.12);
      return;
    }
    if (cameraMode === 'wing') {
      // out along the wing: the aircraft near, the route still across the frame
      const { centre, back } = fitRoute();
      const dir = side
        .clone()
        .multiplyScalar(0.9)
        .add(here.clone().multiplyScalar(1.1))
        .add(lit.clone().multiplyScalar(0.2))
        .normalize();
      desired.copy(at.clone().normalize().multiplyScalar(at.length())).add(dir.multiplyScalar(back * 0.9));
      desiredTarget.copy(centre).lerp(at, 0.35);
      return;
    }
    // orbit: the planet entire, the flight a bright thread across it
    const dir = lit.clone().add(tangent.clone().multiplyScalar(0.1)).normalize();
    desired.copy(dir).multiplyScalar(distance * landing);
    desiredTarget.copy(here).multiplyScalar(-0.12);
  }

  function frameRoute(): void {
    if (!route) return;
    const a = onSphere(route.from.lat, route.from.lon);
    const b = onSphere(route.to.lat, route.to.lon);
    const mid = a.clone().add(b).normalize();
    const tangent = b.clone().sub(a).normalize();
    framePoint(mid, tangent);
    if (!showPlane) {
      camera.position.copy(desired);
      camera.lookAt(desiredTarget);
    }
  }

  let controls: OrbitControls | null = null;
  if (interactive) {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.rotateSpeed = 0.35;
    controls.addEventListener('start', () => (lastTouch = Date.now()));
  }

  function placePlane(): void {
    if (points.length === 0) return;
    const i = Math.min(points.length - 2, Math.floor(progress * (points.length - 1)));
    const here = points[i];
    const next = points[i + 1];
    plane.position.copy(here);
    plane.up.copy(here);
    plane.lookAt(next.clone().multiplyScalar(1.001));
    // hold the aircraft at a readable size however close the camera is
    const toCamera = camera.position.distanceTo(here);
    plane.scale.setScalar(THREE.MathUtils.clamp(toCamera * 0.016, 0.004, 0.06));
    const drawn = Math.max(6, Math.floor(progress * SEGMENTS) * 8 * 6);
    flown.geometry.setDrawRange(0, drawn);
    ahead.geometry.setDrawRange(i, points.length - i);

    // trail
    for (let k = TRAIL - 1; k > 0; k--) {
      trailPos.set(trailPos.slice((k - 1) * 3, k * 3), k * 3);
      trailAlpha[k] = trailAlpha[k - 1] * 0.94;
    }
    trailPos.set([here.x, here.y, here.z], 0);
    trailAlpha[0] = 1;
    trailGeo.attributes.position.needsUpdate = true;
    trailGeo.attributes.seed.needsUpdate = true;

    framePoint(here, next.clone().sub(here).normalize());
  }

  /* ---------- loop ---------- */

  let running = true;
  let quality: 'full' | 'low' = 'full';
  let raf = 0;
  let last = 0;
  let onScreen = true;
  /** drops the internal resolution before it drops frames */
  const governor = new Governor((scale) => {
    const rect = host.getBoundingClientRect();
    renderer.setSize(Math.max(1, rect.width * scale), Math.max(1, rect.height * scale), false);
    renderer.domElement.style.width = `${Math.round(rect.width)}px`;
    renderer.domElement.style.height = `${Math.round(rect.height)}px`;
  });

  function render(now = performance.now()): void {
    sunDir.value = sunDirection(clock());
    sunLight.position.copy(sunDir.value.clone().multiplyScalar(12));
    model.update(now / 1000, progress);

    // the view changes itself every forty seconds unless you chose one
    if (showPlane && Date.now() > manualUntil && Date.now() - lastCycle > 40_000) {
      lastCycle = Date.now();
      cameraMode = CAMERA_MODES[(CAMERA_MODES.indexOf(cameraMode) + 1) % CAMERA_MODES.length];
      cutFrom.copy(camera.position);
      cutStart = now;
    }
    cloudShift.value = (cloudShift.value + 0.000006) % 1;
    starTime.value = now / 1000;
    if (showPlane) placePlane();

    // a two and a half second dolly in from a far shot, then cruise
    const introT = flyIn ? Math.min(1, (now - introStart) / INTRO_MS) : 1;
    if (frozen) {
      // the ground-truth tests park the camera; the controls must not re-aim it
      renderer.render(scene, camera);
      return;
    }
    if (introT < 1) {
      const eased = (1 - introT) ** 3;
      camera.position.copy(desired.clone().multiplyScalar(1 + eased * 2.2));
      camera.lookAt(desiredTarget);
    } else if (now - cutStart < 1200) {
      // a cut eases over 1.2 s, whatever the frame rate
      const k = 1 - (1 - (now - cutStart) / 1200) ** 3;
      camera.position.copy(cutFrom.clone().lerp(desired, k));
      camera.lookAt(desiredTarget);
    } else if (Date.now() - lastTouch > 5000) {
      const want = desired.length();
      const dir = camera.position
        .clone()
        .normalize()
        .lerp(desired.clone().normalize(), 0.08)
        .normalize();
      const radius = THREE.MathUtils.lerp(camera.position.length(), want, 0.1);
      camera.position.copy(dir.multiplyScalar(radius));
      camera.lookAt(desiredTarget);
    }
    // labels fade on the far side and hold a steady size, however close the camera gets
    for (const [sprite, pin, width] of [
      [labelFrom, pinFrom, 0.115],
      [labelTo, pinTo, 0.15],
    ] as [THREE.Sprite, THREE.Mesh, number][]) {
      const facing = pin.position.clone().normalize().dot(camera.position.clone().normalize());
      (sprite.material as THREE.SpriteMaterial).opacity = THREE.MathUtils.clamp(
        (facing - 0.1) * 3,
        0,
        1,
      );
      const toPin = camera.position.distanceTo(pin.position);
      const size = THREE.MathUtils.clamp(toPin * width, 0.06, 0.7);
      sprite.scale.set(size, size * 0.1875, 1);
      pin.scale.setScalar(THREE.MathUtils.clamp(toPin * 0.5, 0.25, 2.2));
    }
    // turbulence shakes the aircraft, never the UI
    if (now < shakeUntil) {
      const k = shakeAmount * (shakeUntil - now) / 900;
      plane.position.add(new THREE.Vector3((Math.random() - 0.5) * k, (Math.random() - 0.5) * k, 0));
      plane.rotation.z += (Math.random() - 0.5) * k * 2;
    }
    // OrbitControls aims the camera itself, so it has to share our target
    if (controls) controls.target.copy(desiredTarget);
    controls?.update();
    renderer.render(scene, camera);
  }

  function loop(now: number): void {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    const gap = quality === 'low' ? 33 : 16;
    if (now - last < gap) return;
    last = now;
    if (!onScreen) return;
    governor.frame(now);
    render(now);
  }

  function resize(): void {
    const rect = host.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = `${w}px`;
    renderer.domElement.style.height = `${h}px`;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (route) frameRoute();
    render();
  }

  const observer = new ResizeObserver(() => resize());
  observer.observe(host);
  // a canvas nobody can see costs nothing
  const seen = new IntersectionObserver(
    (entries) => {
      onScreen = entries.some((entry) => entry.isIntersecting);
      if (onScreen && running) render();
    },
    { threshold: 0.01 },
  );
  seen.observe(host);
  resize();
  if (route) buildRoute(route);
  resize();
  if (showPlane || interactive) raf = requestAnimationFrame(loop);
  else {
    // a still globe: draw it once, then only when something changes
    running = false;
    render();
  }

  if (new URLSearchParams(location.search).has('test'))
    (window as unknown as { __milo: unknown }).__milo = {
      /** where a place lands on screen, in CSS pixels */
      project(lat: number, lon: number) {
        const v = llToVec3(lat, lon).project(camera);
        const rect = host.getBoundingClientRect();
        return {
          x: rect.left + ((v.x + 1) / 2) * rect.width,
          y: rect.top + ((1 - v.y) / 2) * rect.height,
          visible: llToVec3(lat, lon).normalize().dot(camera.position.clone().normalize()) > 0,
        };
      },
      /** point the camera straight down at a place, for ground-truth checks */
      centreOn(lat: number, lon: number) {
        frozen = true;
        manualUntil = Date.now() + 600_000;
        const at = llToVec3(lat, lon);
        desiredTarget.set(0, 0, 0);
        camera.position.copy(at.clone().normalize().multiplyScalar(fitDistance(1.02)));
        camera.lookAt(0, 0, 0);
        render();
      },
      sunDirection: () => sunDirection(clock()).toArray(),
      fps: () => governor.fps(),
      scale: () => governor.scale,
      projectVec: (x: number, y: number, z: number) => {
        const v = new THREE.Vector3(x, y, z).project(camera);
        const rect = host.getBoundingClientRect();
        return { x: rect.left + ((v.x + 1) / 2) * rect.width, y: rect.top + ((1 - v.y) / 2) * rect.height };
      },
      camera: () => ({
        pos: camera.position.toArray(),
        desired: desired.toArray(),
        target: desiredTarget.toArray(),
        mode: cameraMode,
      }),
      setCamera: (mode: CameraMode) => {
        cameraMode = mode;
        manualUntil = Date.now() + 600_000;
        lastTouch = 0;
        placePlane();
        camera.position.copy(desired);
        camera.lookAt(desiredTarget);
        render();
      },
      /** strip the sky back to bare texture, for ground-truth checks */
      setLayers({
        clouds: withClouds = true,
        atmosphere: withAtmosphere = true,
        specular: withSpecular = true,
      }) {
        const uniforms = (earth.material as THREE.ShaderMaterial).uniforms;
        uniforms.cloudAmount.value = withClouds ? 1 : 0;
        uniforms.specAmount.value = withSpecular ? 1 : 0;
        atmosphere.visible = withAtmosphere;
        render();
      },
    };

  // battery saver drops the frame rate
  void (navigator as unknown as { getBattery?: () => Promise<{ charging: boolean; level: number }> })
    .getBattery?.()
    .then((battery) => {
      if (!battery.charging && battery.level < 0.25) quality = 'low';
    })
    .catch(() => {});

  return {
    setCamera(mode, manual = false) {
      cameraMode = mode;
      if (manual) manualUntil = Date.now() + 120_000;
      cutFrom.copy(camera.position);
      cutStart = performance.now();
    },
    cameraMode: () => cameraMode,
    setAircraft(id) {
      aircraftId = id;
      plane.remove(model.group);
      model = buildAircraft(id);
      plane.add(model.group);
    },
    shake(strength = 1) {
      shakeUntil = performance.now() + 900 * strength;
      shakeAmount = 0.02 * strength;
    },
    setProgress(t) {
      progress = Math.max(0, Math.min(1, t));
      if (!running) {
        placePlane();
        render();
      }
    },
    setRoute: buildRoute,
    lookAt(lat, lon) {
      const at = onSphere(lat, lon);
      framePoint(at, new THREE.Vector3(0, 1, 0));
      camera.position.copy(desired);
      camera.lookAt(desiredTarget);
      if (!running) render();
    },
    resize,
    pause() {
      if (!running) return;
      running = false;
      cancelAnimationFrame(raf);
      render();
    },
    resume() {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(loop);
    },
    setQuality(mode) {
      quality = mode;
    },
    dispose() {
      running = false;
      cancelAnimationFrame(raf);
      observer.disconnect();
      seen.disconnect();
      controls?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
