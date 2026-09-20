import * as THREE from 'three';
import { budget } from './quality';

/**
 * Satellite imagery streamed onto the globe when there is a network.
 *
 * Tiles are Web Mercator, so each one becomes a small sphere patch whose
 * latitude bounds come from the inverse Mercator projection. A quadtree of
 * tiles around the point the camera is looking at is kept in an LRU cache;
 * everything else is thrown away. Nothing is precached: these are not ours.
 */
const URL_TEMPLATE =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

export const ESRI_ATTRIBUTION = 'Imagery © Esri, Maxar, Earthstar Geographics';

const MAX_TILES = 150;
/** how often the tile set is recomputed, in ms */
export const TILE_INTERVAL = 700;
const RADIUS = 1.0016;

/** inverse Web Mercator: tile row to latitude */
const tileLat = (y: number, z: number): number =>
  (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / 2 ** z))) * 180) / Math.PI;

const tileLon = (x: number, z: number): number => (x / 2 ** z) * 360 - 180;

const lonToTile = (lon: number, z: number): number => ((lon + 180) / 360) * 2 ** z;

const latToTile = (lat: number, z: number): number => {
  const rad = (Math.max(-85, Math.min(85, lat)) * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** z;
};

interface Tile {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  used: number;
  ready: boolean;
}

export interface TileLayer {
  /** called with where the camera is looking and how far away it is */
  update(centre: THREE.Vector3, distance: number): void;
  fade(dt: number): void;
  count(): number;
  dispose(): void;
}

export function createTileLayer(scene: THREE.Scene): TileLayer {
  const limits = budget();
  const maxZoom = limits.tileZoom;
  const group = new THREE.Group();
  group.renderOrder = 1;
  scene.add(group);
  const tiles = new Map<string, Tile>();
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');
  let disposed = false;

  function patch(x: number, y: number, z: number): THREE.Mesh {
    const north = tileLat(y, z);
    const south = tileLat(y + 1, z);
    const west = tileLon(x, z);
    const east = tileLon(x + 1, z);
    const geometry = new THREE.SphereGeometry(
      RADIUS,
      4,
      4,
      ((west + 180) * Math.PI) / 180,
      ((east - west) * Math.PI) / 180,
      ((90 - north) * Math.PI) / 180,
      ((north - south) * Math.PI) / 180,
    );
    return new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }));
  }

  function request(x: number, y: number, z: number): void {
    const key = `${z}/${x}/${y}`;
    const have = tiles.get(key);
    if (have) {
      have.used = performance.now();
      return;
    }
    const mesh = patch(x, y, z);
    const material = mesh.material as THREE.MeshBasicMaterial;
    const tile: Tile = { mesh, material, used: performance.now(), ready: false };
    tiles.set(key, tile);
    group.add(mesh);
    const url = URL_TEMPLATE.replace('{z}', String(z)).replace('{x}', String(x)).replace('{y}', String(y));
    loader.load(
      url,
      (texture) => {
        if (disposed || !tiles.has(key)) {
          texture.dispose();
          return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        material.map = texture;
        material.needsUpdate = true;
        tile.ready = true;
      },
      undefined,
      () => {
        // a missing tile is not worth keeping around
        drop(key);
      },
    );
  }

  function drop(key: string): void {
    const tile = tiles.get(key);
    if (!tile) return;
    group.remove(tile.mesh);
    tile.mesh.geometry.dispose();
    tile.material.map?.dispose();
    tile.material.dispose();
    tiles.delete(key);
  }

  function trim(): void {
    if (tiles.size <= MAX_TILES) return;
    const oldest = [...tiles.entries()].sort((a, b) => a[1].used - b[1].used);
    for (const [key] of oldest.slice(0, tiles.size - MAX_TILES)) drop(key);
  }

  const lastCentre = new THREE.Vector3();
  let lastZoom = 0;

  return {
    update(centre, distance) {
      if (disposed || !navigator.onLine) return;
      // nothing to do until the camera has actually gone somewhere
      if (centre.distanceTo(lastCentre) < 0.02 && tiles.size > 0 && lastZoom) return;
      lastCentre.copy(centre);
      // the closer the camera, the finer the tiles
      const altitude = Math.max(0.02, distance - 1);
      const zoom = Math.round(THREE.MathUtils.clamp(Math.log2(1.4 / altitude) + 5.2, 3, maxZoom));
      const lat = 90 - (Math.acos(THREE.MathUtils.clamp(centre.clone().normalize().y, -1, 1)) * 180) / Math.PI;
      const lon = (Math.atan2(centre.z, -centre.x) * 180) / Math.PI - 180;
      lastZoom = zoom;
      const span = 1;
      const cx = Math.floor(lonToTile(lon, zoom));
      const cy = Math.floor(latToTile(lat, zoom));
      const size = 2 ** zoom;
      for (let dy = -span; dy <= span; dy++)
        for (let dx = -span; dx <= span; dx++) {
          const x = ((cx + dx) % size + size) % size;
          const y = cy + dy;
          if (y < 0 || y >= size) continue;
          request(x, y, zoom);
        }
      trim();
    },
    fade(dt) {
      for (const tile of tiles.values()) {
        if (!tile.ready || tile.material.opacity >= 1) continue;
        tile.material.opacity = Math.min(1, tile.material.opacity + dt * 2.5);
        // once it is fully there, an opaque material is cheaper to draw
        if (tile.material.opacity >= 1) {
          tile.material.transparent = false;
          tile.material.needsUpdate = true;
        }
      }
    },
    count: () => tiles.size,
    dispose() {
      disposed = true;
      for (const key of [...tiles.keys()]) drop(key);
      scene.remove(group);
    },
  };
}
