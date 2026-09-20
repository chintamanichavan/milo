import * as THREE from 'three';

/** a soft round blob, drawn once and reused for every ghost */
function disc(inner: string, outer: string, ring = false): THREE.Texture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const g = canvas.getContext('2d')!;
  const grad = g.createRadialGradient(size / 2, size / 2, ring ? size * 0.3 : 0, size / 2, size / 2, size / 2);
  if (ring) grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(ring ? 0.75 : 0, inner);
  grad.addColorStop(1, outer);
  g.fillStyle = grad;
  g.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

interface Ghost {
  sprite: THREE.Sprite;
  /** where it sits on the line from the sun to the middle of the frame */
  along: number;
  size: number;
  strength: number;
}

export interface Flare {
  group: THREE.Group;
  update(camera: THREE.PerspectiveCamera, sunDir: THREE.Vector3): void;
  dispose(): void;
}

/**
 * The sun through a lens: a halo where it sits, a streak across it, and a few
 * ghosts thrown back through the middle of the frame.
 */
export function buildFlare(): Flare {
  const group = new THREE.Group();
  group.renderOrder = 20;
  const halo = disc('rgba(255,248,232,0.95)', 'rgba(255,214,150,0)');
  const ring = disc('rgba(180,200,255,0.5)', 'rgba(120,90,220,0)', true);
  const streak = disc('rgba(220,232,255,0.8)', 'rgba(120,150,255,0)');
  const textures = [halo, ring, streak];

  const make = (map: THREE.Texture, along: number, size: number, strength: number, stretch = 1): Ghost => {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthTest: false,
        depthWrite: false,
        sizeAttenuation: false,
      }),
    );
    sprite.scale.set(size * stretch, size, 1);
    sprite.renderOrder = 20;
    group.add(sprite);
    return { sprite, along, size, strength };
  };

  const ghosts: Ghost[] = [
    make(halo, 0, 0.13, 0.7),
    make(streak, 0, 0.035, 0.4, 11),
    make(ring, 0.45, 0.05, 0.22),
    make(halo, 0.72, 0.025, 0.18),
    make(ring, 1.3, 0.07, 0.16),
    make(halo, 1.75, 0.04, 0.12),
  ];

  const sunPoint = new THREE.Vector3();
  const ndc = new THREE.Vector3();
  const place = new THREE.Vector3();

  return {
    group,
    update(camera, sunDir) {
      // the sun sits far out in its own direction; find where that lands on screen
      sunPoint.copy(sunDir).normalize().multiplyScalar(60);
      ndc.copy(sunPoint).project(camera);
      const behind = ndc.z > 1;
      // and the planet blocks it whenever it stands between us and the light
      const toCentre = camera.position.clone().negate();
      const alongRay = toCentre.dot(sunDir.clone().normalize());
      const miss = Math.sqrt(Math.max(0, toCentre.lengthSq() - alongRay * alongRay));
      // the planet's edge cuts the light off, rather than switching it
      const clear = alongRay > 0 ? Math.max(0, Math.min(1, (miss - 1.0) / 0.12)) : 1;
      // strongest with the sun in frame, gone once it leaves it
      const offCentre = Math.hypot(ndc.x, ndc.y);
      const fade = Math.max(0, Math.min(1, 1.05 - offCentre)) * clear;
      group.visible = !behind && fade > 0.01;
      if (!group.visible) return;
      for (const ghost of ghosts) {
        const x = ndc.x * (1 - ghost.along);
        const y = ndc.y * (1 - ghost.along);
        place.set(x, y, 0.5).unproject(camera);
        ghost.sprite.position.copy(place);
        (ghost.sprite.material as THREE.SpriteMaterial).opacity = ghost.strength * fade;
      }
    },
    dispose() {
      for (const ghost of ghosts) (ghost.sprite.material as THREE.SpriteMaterial).dispose();
      for (const texture of textures) texture.dispose();
    },
  };
}
