import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { buildFlare } from './flare';
import { budget, effects, Governor, markBenchmark } from './quality';
import { createTileLayer, TILE_INTERVAL, type TileLayer } from './tiles';
import { buildAircraft, type Plane3D } from './aircraft3d';
import type { Airport } from './airports';

export type CameraMode = 'chase' | 'wing' | 'cabin' | 'orbit' | 'overhead';
export const CAMERA_MODES: CameraMode[] = ['chase', 'wing', 'cabin', 'orbit', 'overhead'];

export interface GlobeRoute {
  from: Airport;
  to: Airport;
}

export interface GlobeHandle {
  setProgress(t: number): void;
  setPhase(phase: string): void;
  setCamera(mode: CameraMode, manual?: boolean): void;
  cameraMode(): CameraMode;
  tiles(): number;
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
  uniform sampler2D normalMap;
  uniform sampler2D waterMap;
  uniform sampler2D cloudMap;
  uniform vec3 sunDir;
  uniform float cloudShift;
  uniform float cloudAmount;
  uniform float cloudVisible;
  uniform float cloudNear;
  uniform float specAmount;
  uniform float waveAmount;
  uniform float seaTime;
  uniform float normalAmount;
  uniform float nightGain;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vViewDir;

  void main() {
    vec3 normal = normalize(vNormalW);
    vec3 sun = normalize(sunDir);
    float lit = dot(normal, sun);

    // relief: the terrain normal map tilts each slope towards or away from the sun
    vec3 east = normalize(cross(vec3(0.0, 1.0, 0.0), normal));
    vec3 north = cross(normal, east);
    vec3 slope = (texture2D(normalMap, vUv).xyz * 2.0 - 1.0) * normalAmount;
    vec3 ground = normalize(normal + east * slope.x - north * slope.y);
    float litGround = dot(ground, sun);
    float relief = mix(1.0, clamp(1.0 + (litGround - lit) * 2.2, 0.55, 1.55), normalAmount);

    vec3 day = texture2D(dayMap, vUv).rgb * relief;
    day = mix(vec3(dot(day, vec3(0.299, 0.587, 0.114))), day, 1.12);

    // water catches the sun, and micro-waves break the glint into glitter
    float water = texture2D(waterMap, vUv).r;
    vec3 halfVec = normalize(sun + normalize(vViewDir));
    vec2 ripple = vec2(
      sin(vUv.x * 1900.0 + seaTime * 1.9) * sin(vUv.y * 1100.0 - seaTime * 1.3)
        + 0.5 * sin(vUv.x * 4300.0 - seaTime * 2.7),
      sin(vUv.y * 1700.0 + seaTime * 1.5) * sin(vUv.x * 900.0 + seaTime * 2.1)
        + 0.5 * sin(vUv.y * 3700.0 + seaTime * 3.1)
    ) * 0.02 * waveAmount;
    // at a grazing angle a pixel covers miles of sea, and the ripples would
    // only alias into a hatch, so they ease off towards the limb
    ripple *= smoothstep(0.15, 0.5, max(dot(normal, normalize(vViewDir)), 0.0));
    vec3 sea = normalize(normal + east * ripple.x + north * ripple.y);
    float gloss = pow(max(dot(sea, halfVec), 0.0), 90.0);
    float sheen = pow(max(dot(normal, halfVec), 0.0), 26.0) * 0.25;
    float spec = (mix(pow(max(dot(normal, halfVec), 0.0), 90.0), gloss, waveAmount) + sheen * waveAmount)
      * water * 0.55 * specAmount;

    // city lights: warm, a little bloomed, never grey
    vec3 lights = texture2D(nightMap, vUv).rgb;
    float glow = smoothstep(0.05, 0.4, dot(lights, vec3(0.33)));
    vec3 night = lights * vec3(1.3, 0.94, 0.58) * nightGain
      + vec3(1.0, 0.72, 0.38) * glow * 0.4
      // earthshine: the dark side is never truly black
      + vec3(0.012, 0.017, 0.032);

    // twilight blends over about twelve degrees, with the scattering going warm
    float dayAmount = smoothstep(-0.10, 0.11, lit);
    vec3 col = mix(night, day * (0.25 + 1.05 * max(lit, 0.0)) + spec, dayAmount);

    // cloud layer, with a soft shadow just behind it
    vec2 cloudUv = vec2(vUv.x + cloudShift, vUv.y);
    float cloud = texture2D(cloudMap, cloudUv).g * cloudAmount * cloudNear;
    // the shadow is the cloud that stands between this ground and the sun, so it
    // falls away from the light and stretches out as the sun gets low
    // ground distance to walk towards the sun, in degrees; longitudes crowd
    // together away from the equator, so the map step is not the ground step
    float cosLat = max(0.2, length(vec2(normal.x, normal.z)));
    float reach = 2.2 / max(0.25, abs(lit));
    vec2 throwUv = vec2(dot(sun, east) * reach / (360.0 * cosLat), dot(sun, north) * reach / 180.0);
    float shadow = texture2D(cloudMap, cloudUv + clamp(throwUv, -0.03, 0.03)).g * cloudAmount * cloudNear;
    col *= 1.0 - shadow * 0.3 * dayAmount;
    col = mix(col, mix(vec3(0.08, 0.09, 0.12), vec3(1.0), dayAmount), cloud * 0.55 * cloudVisible * (0.35 + dayAmount));

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

  // Rayleigh scatters blue hardest, so a long path through air goes orange:
  // the day limb reads blue, the terminator red, the night side almost nothing.
  const vec3 RAYLEIGH = vec3(5.5, 13.0, 22.4);

  void main() {
    vec3 normal = normalize(vNormalW);
    vec3 view = normalize(vViewDir);
    vec3 sun = normalize(sunDir);
    float rim = 1.0 - max(dot(normal, view), 0.0);
    float thickness = pow(rim, 2.0) * 0.8 + pow(rim, 5.5) * 1.1;
    float lit = dot(normal, sun);
    float day = smoothstep(-0.35, 0.35, lit);

    // how much air the light crosses on its way to the eye
    float grazing = pow(1.0 - abs(lit), 3.0);
    vec3 scattered = exp(-RAYLEIGH * (0.012 + grazing * 0.085));
    vec3 blue = glow * 0.9;
    vec3 sunsetColour = normalize(scattered) * 1.35;

    // Mie: a forward-scattering halo around the sun itself
    float mie = pow(max(dot(view, -sun), 0.0), 8.0) * 0.35;

    vec3 col = mix(tint * 0.18 + vec3(0.03, 0.05, 0.10), mix(sunsetColour, blue, day), day * 0.85 + 0.15);
    col *= thickness * (0.35 + day * 1.7);
    col += sunsetColour * grazing * day * thickness * 0.8;
    col += glow * mie * day;
    gl_FragColor = vec4(col, thickness * (0.16 + day * 0.95));
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

/** a soft round blot, for the aircraft's shadow */
function softDisc(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.75)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

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
  const fx = effects();
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
  const [dayMap, nightMap, waterMap, cloudMap, normalMap] = await Promise.all([
    loadOnce('/earth/day-4k.ktx2', '/earth/day.jpg', true),
    loadOnce('/earth/night-2k.ktx2', '/earth/night.jpg', true),
    limits.water ? loadOnce('/earth/water-1k.ktx2', '/earth/water.jpg', false) : Promise.resolve(blank),
    limits.clouds ? loadOnce('/earth/clouds-2k.ktx2', '/earth/clouds.jpg', false) : Promise.resolve(blank),
    limits.normals ? loadOnce('/earth/normal-2k.ktx2', '/earth/normal.jpg', false) : Promise.resolve(blank),
  ]);

  const sunDir = { value: sunDirection(clock()) };
  const cloudShift = { value: 0 };
  const seaTime = { value: 0 };
  const waveAmount = { value: 0 };
  const cloudNear = { value: 1 };

  // satellite imagery on top of the base map, when there is a network
  let tileLayer: TileLayer | null = null;

  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(R, limits.sphereSegments[0], limits.sphereSegments[1]),
    new THREE.ShaderMaterial({
      uniforms: {
        dayMap: { value: dayMap },
        nightMap: { value: nightMap },
        normalMap: { value: normalMap },
        waterMap: { value: waterMap },
        cloudMap: { value: cloudMap },
        sunDir,
        cloudShift,
        cloudAmount: { value: limits.clouds ? 1 : 0 },
        cloudVisible: { value: 1 },
        cloudNear,
        specAmount: { value: limits.water ? 1 : 0 },
        waveAmount,
        seaTime,
        normalAmount: { value: limits.normals ? 1 : 0 },
        nightGain: { value: limits.nightGain },
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
  /** the tests can switch the air off; the cabin view hides it for itself */
  let atmosphereOn = true;

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
  const stars = new THREE.Points(
    starGeo,
    new THREE.ShaderMaterial({
      uniforms: { time: starTime },
      vertexShader: STAR_VERT,
      fragmentShader: STAR_FRAG,
      transparent: true,
      depthWrite: false,
    }),
  );
  scene.add(stars);

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

  // the sun is the key light; the earth below is a soft fill
  const sunLight = new THREE.DirectionalLight(0xfff3e0, 3.4);
  // bloom and edge smoothing ride a post chain, which is a separate download
  let gone = false;
  let composer: { render(): void; setSize(w: number, h: number): void; setPixelRatio(r: number): void } | null = null;
  if (limits.atmosphere && (fx.bloom || fx.smaa)) {
    void (async () => {
      const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { SMAAPass }, { OutputPass }] =
        await Promise.all([
          import('three/examples/jsm/postprocessing/EffectComposer.js'),
          import('three/examples/jsm/postprocessing/RenderPass.js'),
          import('three/examples/jsm/postprocessing/UnrealBloomPass.js'),
          import('three/examples/jsm/postprocessing/SMAAPass.js'),
          import('three/examples/jsm/postprocessing/OutputPass.js'),
        ]);
      if (gone) return;
      const made = new EffectComposer(renderer);
      made.addPass(new RenderPass(scene, camera));
      // only the bright side of the terminator and the city lights should bleed
      if (fx.bloom) made.addPass(new UnrealBloomPass(new THREE.Vector2(1, 1), 0.3, 0.5, 0.92));
      if (fx.smaa) made.addPass(new SMAAPass());
      made.addPass(new OutputPass());
      composer = made;
      resize();
    })();
  }

  // the sun through the lens, on the tiers that can afford it
  const flare = fx.flare && limits.atmosphere ? buildFlare() : null;
  if (flare) scene.add(flare.group);

  scene.add(sunLight);
  const fill = new THREE.HemisphereLight(0x8aa3c8, 0x2a2f38, 0.9);
  scene.add(fill);

  const plane = new THREE.Group();
  plane.visible = showPlane;
  scene.add(plane);

  // the aircraft's shadow on the ground: it sits above the streamed imagery, or
  // it would be buried under it
  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(1, 28),
    new THREE.MeshBasicMaterial({
      map: softDisc(),
      color: 0x05070b,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    }),
  );
  blob.renderOrder = 12;
  blob.visible = false;
  scene.add(blob);
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
      THREE.MathUtils.clamp(back * 0.0022, 0.0009, 0.0035),
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
  /** critically-damped spring, so the camera never snaps or drifts */
  const velocity = new THREE.Vector3();
  const spring = (dt: number, stiffness = 26): void => {
    const step = Math.min(0.05, dt);
    const pull = desired.clone().sub(camera.position).multiplyScalar(stiffness);
    const drag = velocity.clone().multiplyScalar(2 * Math.sqrt(stiffness));
    velocity.add(pull.sub(drag).multiplyScalar(step));
    camera.position.add(velocity.clone().multiplyScalar(step));
  };
  let distance = 3.2;
  let progress = 0;
  let lastTouch = 0;
  let phaseName = 'cruise';
  let turnRate = 0;
  const lastHeading = new THREE.Vector3();
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

  /**
   * How much ground the frame actually covers, in degrees, by throwing the four
   * corners of the view at the planet. A camera looking along the ground sees
   * far more of it than one looking straight down, and the imagery has to know.
   */
  function groundSpan(at: THREE.Vector3): number {
    const middle = at.clone().normalize();
    const height = camera.position.length();
    const horizon = Math.acos(Math.min(1, 1 / Math.max(1.0001, height)));
    let widest = 0;
    for (const [x, y] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ]) {
      const ray = new THREE.Vector3(x, y, 0.5).unproject(camera).sub(camera.position).normalize();
      const along = -ray.dot(camera.position);
      const miss = camera.position.lengthSq() - along * along;
      let angle = horizon;
      if (miss < 1) {
        const hit = camera.position
          .clone()
          .add(ray.multiplyScalar(along - Math.sqrt(1 - miss)))
          .normalize();
        angle = hit.angleTo(middle);
      }
      widest = Math.max(widest, Math.min(horizon, angle));
    }
    return (widest * 2 * 180) / Math.PI;
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
  let lastSpring = performance.now();
  let lastTiles = 0;
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
        .multiplyScalar(0.8)
        .add(tangent.clone().multiplyScalar(-0.85))
        .add(lit.clone().multiplyScalar(0.25))
        .normalize();
      desired.copy(centre.clone().normalize().multiplyScalar(centre.length())).add(dir.multiplyScalar(back));
      desiredTarget.copy(centre);
      return;
    }
    if (showPlane && cameraMode === 'cabin') {
      // a window seat: out to the side and a little down, the horizon just above the middle
      desired.copy(at);
      desiredTarget
        .copy(at)
        .add(side.clone().multiplyScalar(-1))
        .add(tangent.clone().multiplyScalar(0.28))
        .add(here.clone().multiplyScalar(-0.27));
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
    const heading = next.clone().sub(here).normalize();
    if (lastHeading.lengthSq() > 0) {
      const side = heading.clone().cross(here).normalize();
      turnRate = heading.clone().sub(lastHeading).dot(side) * 60;
    }
    lastHeading.copy(heading);
    plane.position.copy(here);
    plane.up.copy(here);
    plane.lookAt(next.clone().multiplyScalar(1.001));
    // hold the aircraft at a readable size however close the camera is
    const toCamera = camera.position.distanceTo(here);
    const scale = THREE.MathUtils.clamp(toCamera * 0.024, 0.006, 0.08);
    plane.scale.setScalar(scale);

    // the shadow follows the aircraft at any height, thrown a little away from
    // the sun, which is what tells you how high the thing is flying
    const low = phaseName === 'taxi' || phaseName === 'takeoff' || phaseName === 'landing';
    blob.visible = showPlane && cameraMode !== 'cabin';
    if (blob.visible) {
      const up = here.clone().normalize();
      const sun = sunDir.value.clone().normalize();
      const sideways = sun.clone().sub(up.clone().multiplyScalar(sun.dot(up)));
      if (sideways.lengthSq() > 1e-6) sideways.normalize();
      // the higher it flies, the further the shadow runs from the aircraft
      blob.position
        .copy(up)
        .multiplyScalar(1.0035)
        .add(sideways.multiplyScalar(-scale * (low ? 0.6 : 2.2)));
      blob.lookAt(0, 0, 0);
      // an ellipse lying along the heading, not a circle
      blob.updateMatrixWorld();
      const right = new THREE.Vector3().setFromMatrixColumn(blob.matrixWorld, 0).normalize();
      const upward = new THREE.Vector3().setFromMatrixColumn(blob.matrixWorld, 1).normalize();
      blob.rotateZ(Math.atan2(heading.dot(upward), heading.dot(right)));
      blob.scale.set(scale * (low ? 2.6 : 2.0), scale * (low ? 1.5 : 1.1), 1);
      (blob.material as THREE.MeshBasicMaterial).opacity = low ? 0.36 : 0.24;
    }
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
    composer?.setSize(Math.max(1, rect.width * scale), Math.max(1, rect.height * scale));
  });

  function render(now = performance.now()): void {
    sunDir.value = sunDirection(clock());
    sunLight.position.copy(sunDir.value).multiplyScalar(12);
    // the fill leans towards day or night, depending where the aircraft is
    if (points.length) {
      const lit = plane.position.clone().normalize().dot(sunDir.value);
      fill.intensity = 0.35 + Math.max(0, lit) * 0.9;
    }
    model.update(now / 1000, phaseName, turnRate);

    // the view changes itself every forty seconds unless you chose one
    if (showPlane && Date.now() > manualUntil && Date.now() - lastCycle > 40_000) {
      lastCycle = Date.now();
      cameraMode = CAMERA_MODES[(CAMERA_MODES.indexOf(cameraMode) + 1) % CAMERA_MODES.length];
      cutFrom.copy(camera.position);
      cutStart = now;
    }
    cloudShift.value = (cloudShift.value + 0.000006) % 1;
    seaTime.value = now / 1000;
    // the cloud map is two thousand pixels wide: lovely from orbit, a smear from
    // the cruising altitude of an aircraft, so it thins out as the camera drops
    // and never takes the whole frame while a route is on screen
    const height = camera.position.length();
    const cloudy =
      height <= 1.08
        ? 0
        : height <= 1.6
          ? 0.25 * ((height - 1.08) / 0.52)
          : 0.25 + 0.75 * Math.min(1, (height - 1.6) / 1.4);
    cloudNear.value = showPlane ? Math.min(0.6, cloudy) : cloudy;
    // ripples are only worth drawing from close in; far out they would just crawl
    waveAmount.value =
      limits.water && fx.waves
        ? Math.max(0, Math.min(1, (2.6 - camera.position.length()) / 0.8))
        : 0;
    starTime.value = now / 1000;
    if (flare) flare.update(camera, sunDir.value);
    if (showPlane) placePlane();

    // stream sharper imagery around whatever the camera is looking at
    if (tileLayer) {
      tileLayer.fade(Math.min(0.05, (now - lastSpring) / 1000));
      if (now - lastTiles > TILE_INTERVAL) {
        lastTiles = now;
        // from the window seat, the ground that matters is out beside the aircraft
        const at =
          showPlane && cameraMode === 'cabin'
            ? camera.position.clone().add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(0.09)).normalize()
            : desiredTarget.lengthSq() > 0.01
              ? desiredTarget
              : plane.position;
        // and where the aircraft will be in a couple of minutes
        const ahead = showPlane && points.length ? points[Math.min(points.length - 1, Math.round(progress * points.length) + 12)] : undefined;
        tileLayer.update(at, camera.position.length(), groundSpan(at), ahead);
      }
    }

    // a two and a half second dolly in from a far shot, then cruise
    const introT = flyIn ? Math.min(1, (now - introStart) / INTRO_MS) : 1;
    if (frozen) {
      // the ground-truth tests park the camera; the controls must not re-aim it
      draw();
      return;
    }
    if (introT < 1) {
      const eased = (1 - introT) ** 3;
      camera.position.copy(desired.clone().multiplyScalar(1 + eased * 2.2));
      velocity.set(0, 0, 0);
      camera.lookAt(desiredTarget);
    } else if (now - cutStart < 1200) {
      // a cut eases over 1.2 s, whatever the frame rate
      const k = 1 - (1 - (now - cutStart) / 1200) ** 3;
      camera.position.copy(cutFrom.clone().lerp(desired, k));
      camera.lookAt(desiredTarget);
    } else if (Date.now() - lastTouch > 5000) {
      spring((now - lastSpring) / 1000);
      camera.lookAt(desiredTarget);
    }
    const cabin = showPlane && cameraMode === 'cabin';
    if (cabin) {
      camera.up.copy(plane.position).normalize();
      camera.position.copy(desired);
      camera.lookAt(desiredTarget);
      if (camera.near !== 0.0004) {
        camera.near = 0.0004;
        camera.far = 60;
        camera.updateProjectionMatrix();
      }
      // inside the air there is sky, not a glowing shell: the page paints it behind the canvas
      const lit = plane.position.clone().normalize().dot(sunDir.value.clone().normalize());
      const sky = lit > 0.12 ? 'day' : lit > -0.12 ? 'dusk' : 'night';
      if (renderer.domElement.dataset.sky !== sky) renderer.domElement.dataset.sky = sky;
    } else if (camera.near !== 0.05) {
      camera.up.set(0, 1, 0);
      camera.near = 0.05;
      camera.far = 200;
      camera.updateProjectionMatrix();
      delete renderer.domElement.dataset.sky;
    }
    // from the seat you see the wing through the window frame, not the aircraft from outside
    plane.visible = showPlane && !cabin;
    atmosphere.visible = !cabin && atmosphereOn;
    stars.visible = !cabin || renderer.domElement.dataset.sky === 'night';
    lastSpring = now;
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
    draw();
  }

  const drawSize = new THREE.Vector2();

  function draw(): void {
    // whatever the layout has done to the canvas, the projection matches the
    // buffer we are about to fill, or the planet comes out an egg
    renderer.getSize(drawSize);
    const aspect = drawSize.x / Math.max(1, drawSize.y);
    if (Math.abs(camera.aspect - aspect) > 0.002) {
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
    }
    if (composer) composer.render();
    else renderer.render(scene, camera);
  }

  function loop(now: number): void {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    const gap = quality === 'low' ? 33 : 16;
    if (now - last < gap) return;
    last = now;
    if (!onScreen) return;
    governor.frame(now);
    // after ten seconds of honest work, decide whether this device can afford the extras
    if (now > 10_000 && governor.fps() > 0) markBenchmark(governor.fps(), governor.scale);
    render(now);
  }

  function resize(): void {
    const rect = host.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    renderer.setSize(Math.max(1, w * governor.scale), Math.max(1, h * governor.scale), false);
    renderer.domElement.style.width = `${w}px`;
    renderer.domElement.style.height = `${h}px`;
    composer?.setPixelRatio(renderer.getPixelRatio());
    composer?.setSize(Math.max(1, w * governor.scale), Math.max(1, h * governor.scale));
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
  if (showPlane && navigator.onLine) tileLayer = createTileLayer(scene, sunDir);
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
      centreOn(lat: number, lon: number, distance?: number) {
        frozen = true;
        manualUntil = Date.now() + 600_000;
        const at = llToVec3(lat, lon);
        desiredTarget.set(0, 0, 0);
        camera.position.copy(at.clone().normalize().multiplyScalar(distance ?? fitDistance(1.02)));
        camera.lookAt(0, 0, 0);
        render();
      },
      sunDirection: () => sunDirection(clock()).toArray(),
      fps: () => governor.fps(),
      tiles: () => tileLayer?.count() ?? 0,
      seams: () => tileLayer?.seams() ?? { zoom: 0, edges: [], centres: [] },
      setTiles: (on: boolean) => {
        if (!on) {
          tileLayer?.dispose();
          tileLayer = null;
        } else if (!tileLayer && showPlane) tileLayer = createTileLayer(scene, sunDir);
      },
      scale: () => governor.scale,
      /** pin the render scale, for screenshots on software rasterisers */
      setScale: (value: number) => {
        governor.scale = value;
        const rect = host.getBoundingClientRect();
        renderer.setSize(Math.max(1, rect.width * value), Math.max(1, rect.height * value), false);
        renderer.domElement.style.width = `${Math.round(rect.width)}px`;
        renderer.domElement.style.height = `${Math.round(rect.height)}px`;
        composer?.setSize(Math.max(1, rect.width * value), Math.max(1, rect.height * value));
        render();
      },
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
        normals: withNormals = limits.normals,
        cloudLayer: withCloudLayer = true,
      }) {
        const uniforms = (earth.material as THREE.ShaderMaterial).uniforms;
        uniforms.cloudAmount.value = withClouds ? 1 : 0;
        uniforms.cloudVisible.value = withCloudLayer ? 1 : 0;
        uniforms.specAmount.value = withSpecular ? 1 : 0;
        uniforms.normalAmount.value = withNormals && limits.normals ? 1 : 0;
        atmosphereOn = withAtmosphere;
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
    tiles: () => tileLayer?.count() ?? 0,
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
    setPhase(phase: string) {
      phaseName = phase;
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
      gone = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      seen.disconnect();
      tileLayer?.dispose();
      flare?.dispose();
      controls?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
