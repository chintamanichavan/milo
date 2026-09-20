import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Airport } from './airports';

export interface GlobeRoute {
  from: Airport;
  to: Airport;
}

export interface GlobeHandle {
  setProgress(t: number): void;
  setRoute(route: GlobeRoute): void;
  lookAt(lat: number, lon: number): void;
  resize(): void;
  pause(): void;
  resume(): void;
  dispose(): void;
}

const R = 1;
const VIOLET = new THREE.Color('#a78bfa');

/** lat/lon to a point on the sphere, matching three's equirectangular UVs */
function onSphere(lat: number, lon: number, radius = R): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

/** Where the sun is overhead right now, so the night side is really night. */
export function sunDirection(when: Date): THREE.Vector3 {
  const start = Date.UTC(when.getUTCFullYear(), 0, 0);
  const dayOfYear = (when.getTime() - start) / 86_400_000;
  const declination = 23.44 * Math.sin((2 * Math.PI * (dayOfYear - 81)) / 365.24);
  const utcHours = when.getUTCHours() + when.getUTCMinutes() / 60;
  const subsolarLon = 180 - utcHours * 15;
  return onSphere(declination, subsolarLon).normalize();
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
  uniform vec3 sunDir;
  uniform vec3 rim;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  void main() {
    float lit = dot(normalize(vNormalW), normalize(sunDir));
    float mixv = smoothstep(-0.12, 0.28, lit);
    vec3 day = texture2D(dayMap, vUv).rgb;
    vec3 night = texture2D(nightMap, vUv).rgb;
    night = pow(night, vec3(0.85)) * 1.25;
    vec3 col = mix(night, day, mixv);
    // a warm line along the terminator
    float dusk = exp(-pow(lit * 5.0, 2.0));
    col += vec3(0.35, 0.18, 0.05) * dusk * 0.6;
    float fres = pow(1.0 - max(dot(normalize(vNormalW), normalize(vViewDir)), 0.0), 3.0);
    col += rim * fres * 0.55;
    gl_FragColor = vec4(col, 1.0);
  }`;

const CLOUD_FRAG = `
  uniform sampler2D cloudMap;
  uniform vec3 sunDir;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  void main() {
    float alpha = texture2D(cloudMap, vUv).g;
    float lit = smoothstep(-0.2, 0.35, dot(normalize(vNormalW), normalize(sunDir)));
    vec3 col = mix(vec3(0.10, 0.11, 0.15), vec3(1.0), lit);
    gl_FragColor = vec4(col, alpha * 0.55);
  }`;

const ATMO_FRAG = `
  uniform vec3 glow;
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  void main() {
    float fres = pow(1.0 - max(dot(normalize(vNormalW), normalize(vViewDir)), 0.0), 2.2);
    gl_FragColor = vec4(glow, fres * 0.9);
  }`;

export interface GlobeOptions {
  interactive?: boolean;
  route?: GlobeRoute;
  showPlane?: boolean;
  /** overridden by the test hook */
  now?: () => Date;
}

export async function createGlobe(
  host: HTMLElement,
  options: GlobeOptions = {},
): Promise<GlobeHandle> {
  const { interactive = false, showPlane = false } = options;
  const clock = options.now ?? (() => new Date());

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0.6, 3);

  const loader = new THREE.TextureLoader();
  const load = (url: string): Promise<THREE.Texture> =>
    new Promise((resolve) => loader.load(url, resolve, undefined, () => resolve(new THREE.Texture())));
  const [dayMap, nightMap, cloudMap] = await Promise.all([
    load('/earth/day.jpg'),
    load('/earth/night.jpg'),
    load('/earth/clouds.jpg'),
  ]);
  for (const t of [dayMap, nightMap, cloudMap]) {
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
  }

  const sunDir = { value: sunDirection(clock()) };
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(R, 96, 64),
    new THREE.ShaderMaterial({
      uniforms: { dayMap: { value: dayMap }, nightMap: { value: nightMap }, sunDir, rim: { value: VIOLET } },
      vertexShader: VERT,
      fragmentShader: EARTH_FRAG,
    }),
  );
  scene.add(earth);

  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.008, 64, 48),
    new THREE.ShaderMaterial({
      uniforms: { cloudMap: { value: cloudMap }, sunDir },
      vertexShader: VERT,
      fragmentShader: CLOUD_FRAG,
      transparent: true,
      depthWrite: false,
    }),
  );
  scene.add(clouds);

  const atmosphere = new THREE.Mesh(
    new THREE.SphereGeometry(R * 1.035, 48, 32),
    new THREE.ShaderMaterial({
      uniforms: { glow: { value: VIOLET } },
      vertexShader: VERT,
      fragmentShader: ATMO_FRAG,
      transparent: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  scene.add(atmosphere);

  const starGeo = new THREE.BufferGeometry();
  const stars = new Float32Array(1400 * 3);
  for (let i = 0; i < 1400; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(30 + Math.random() * 20);
    stars.set([v.x, v.y, v.z], i * 3);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(stars, 3));
  scene.add(
    new THREE.Points(starGeo, new THREE.PointsMaterial({ size: 0.12, color: 0xffffff, opacity: 0.75, transparent: true })),
  );

  // --- the route ---
  const SEGMENTS = 160;
  const arcGeo = new THREE.BufferGeometry();
  const flownGeo = new THREE.BufferGeometry();
  const arc = new THREE.Line(arcGeo, new THREE.LineBasicMaterial({ color: VIOLET, transparent: true, opacity: 0.3 }));
  const flown = new THREE.Line(flownGeo, new THREE.LineBasicMaterial({ color: VIOLET }));
  scene.add(arc, flown);

  const pinGeo = new THREE.SphereGeometry(0.012, 12, 12);
  const pinFrom = new THREE.Mesh(pinGeo, new THREE.MeshBasicMaterial({ color: 0x9aa3a9 }));
  const pinTo = new THREE.Mesh(pinGeo, new THREE.MeshBasicMaterial({ color: VIOLET }));
  scene.add(pinFrom, pinTo);

  const plane = new THREE.Mesh(
    new THREE.ConeGeometry(0.018, 0.055, 3),
    new THREE.MeshBasicMaterial({ color: VIOLET }),
  );
  plane.visible = showPlane;
  scene.add(plane);

  let points: THREE.Vector3[] = [];
  let route = options.route;

  function buildRoute(next: GlobeRoute): void {
    route = next;
    const a = onSphere(next.from.lat, next.from.lon);
    const b = onSphere(next.to.lat, next.to.lon);
    points = [];
    for (let i = 0; i <= SEGMENTS; i++) {
      const t = i / SEGMENTS;
      const p = a.clone().lerp(b, t).normalize();
      p.multiplyScalar(R * (1 + 0.07 * Math.sin(Math.PI * t)));
      points.push(p);
    }
    arcGeo.setFromPoints(points);
    flownGeo.setFromPoints(points);
    flownGeo.setDrawRange(0, 2);
    pinFrom.position.copy(a.clone().multiplyScalar(1.01));
    pinTo.position.copy(b.clone().multiplyScalar(1.01));
  }
  if (route) buildRoute(route);

  let progress = 0;
  const desired = new THREE.Vector3(0, 0, 3);

  function placePlane(): void {
    if (points.length === 0) return;
    const i = Math.min(points.length - 2, Math.floor(progress * (points.length - 1)));
    const here = points[i];
    const ahead = points[i + 1];
    plane.position.copy(here);
    plane.lookAt(ahead);
    plane.rotateX(Math.PI / 2);
    flownGeo.setDrawRange(0, Math.max(2, Math.floor(progress * points.length)));
    desired.copy(here).normalize().multiplyScalar(2.9).add(ahead.clone().normalize().multiplyScalar(0.15));
  }

  let controls: OrbitControls | null = null;
  let lastTouch = 0;
  if (interactive) {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.rotateSpeed = 0.4;
    controls.addEventListener('start', () => (lastTouch = Date.now()));
    controls.addEventListener('change', () => (lastTouch = Date.now()));
  }

  function frameRoute(): void {
    if (!route) return;
    const mid = onSphere(
      (route.from.lat + route.to.lat) / 2,
      (route.from.lon + route.to.lon) / 2,
    ).normalize();
    desired.copy(mid).multiplyScalar(3.1);
    camera.position.copy(desired);
    camera.lookAt(0, 0, 0);
  }
  if (!showPlane) frameRoute();

  let running = true;
  let raf = 0;
  function render(): void {
    sunDir.value = sunDirection(clock());
    clouds.rotation.y += 0.00012;
    if (showPlane) {
      placePlane();
      if (Date.now() - lastTouch > 5000) {
        camera.position.lerp(desired, 0.02);
        camera.lookAt(0, 0, 0);
      }
    }
    controls?.update();
    renderer.render(scene, camera);
  }
  function loop(): void {
    if (!running) return;
    render();
    raf = requestAnimationFrame(loop);
  }

  function resize(): void {
    const w = host.clientWidth || 1;
    const h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  resize();
  loop();
  const onResize = (): void => resize();
  window.addEventListener('resize', onResize);

  return {
    setProgress(t) {
      progress = Math.max(0, Math.min(1, t));
      if (!running) {
        placePlane();
        render();
      }
    },
    setRoute: buildRoute,
    lookAt(lat, lon) {
      desired.copy(onSphere(lat, lon).normalize().multiplyScalar(3.1));
      lastTouch = 0;
      camera.position.copy(desired);
      camera.lookAt(0, 0, 0);
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
      loop();
    },
    dispose() {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      controls?.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
