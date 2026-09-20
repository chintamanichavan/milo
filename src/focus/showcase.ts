import * as THREE from 'three';
import { buildAircraft } from './aircraft3d';

/** A single small turntable for the hangar — one canvas, paused when off screen. */
export async function showcase(host: HTMLElement, aircraft: string): Promise<() => void> {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 2.1, 7.4);
  camera.lookAt(0, 0, 0);
  scene.add(new THREE.HemisphereLight(0x9ab0d0, 0x20242c, 1.1));
  const key = new THREE.DirectionalLight(0xfff4e2, 2.6);
  key.position.set(4, 6, 5);
  scene.add(key);

  const model = buildAircraft(aircraft);
  scene.add(model.group);

  let running = true;
  let raf = 0;
  const resize = (): void => {
    const rect = host.getBoundingClientRect();
    renderer.setSize(Math.max(1, rect.width), Math.max(1, rect.height), false);
    camera.aspect = Math.max(0.2, rect.width / Math.max(1, rect.height));
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  const loop = (now: number): void => {
    if (!running) return;
    raf = requestAnimationFrame(loop);
    model.group.rotation.y = now / 4200;
    model.update(now / 1000, 'cruise', 0);
    renderer.render(scene, camera);
  };
  const seen = new IntersectionObserver((entries) => {
    const visible = entries.some((e) => e.isIntersecting);
    if (visible && !running) {
      running = true;
      raf = requestAnimationFrame(loop);
    } else if (!visible && running) {
      running = false;
      cancelAnimationFrame(raf);
    }
  });
  seen.observe(host);
  raf = requestAnimationFrame(loop);

  return () => {
    running = false;
    cancelAnimationFrame(raf);
    observer.disconnect();
    seen.disconnect();
    model.dispose();
    renderer.dispose();
    renderer.domElement.remove();
  };
}
