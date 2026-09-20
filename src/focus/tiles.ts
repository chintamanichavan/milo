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
// far enough above the map that neither the globe's facets nor the patch's own
// sag can poke through it and dapple the imagery
const RADIUS = 1.0025;

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
  material: THREE.ShaderMaterial;
  used: number;
  ready: boolean;
  zoom: number;
}

// the imagery has to take the same light as the map underneath it, and step
// aside at night so the city lights show through
const TILE_VERT = `
  varying vec2 vUv;
  varying vec3 vNormalW;
  void main() {
    vUv = uv;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const TILE_FRAG = `
  uniform sampler2D map;
  uniform vec3 sunDir;
  uniform float fade;
  uniform float ready;
  varying vec2 vUv;
  varying vec3 vNormalW;
  void main() {
    float lit = dot(normalize(vNormalW), normalize(sunDir));
    float dayAmount = smoothstep(-0.10, 0.11, lit);
    vec3 col = texture2D(map, vUv).rgb * (0.25 + 1.05 * max(lit, 0.0));
    gl_FragColor = vec4(col, fade * dayAmount * ready);
  }
`;

export interface TileLayer {
  /** called with where the camera is looking and how far away it is */
  update(centre: THREE.Vector3, distance: number): void;
  fade(dt: number): void;
  count(): number;
  dispose(): void;
}

export function createTileLayer(scene: THREE.Scene, sunDir: { value: THREE.Vector3 }): TileLayer {
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
    // a wide tile needs more segments, or the flat quads sink into the sphere
    const segments = Math.max(4, Math.min(12, Math.round((east - west) / 2.5)));
    const geometry = new THREE.SphereGeometry(
      RADIUS,
      segments,
      segments,
      ((west + 180) * Math.PI) / 180,
      ((east - west) * Math.PI) / 180,
      ((90 - north) * Math.PI) / 180,
      ((north - south) * Math.PI) / 180,
    );
    return new THREE.Mesh(
      geometry,
      new THREE.ShaderMaterial({
        uniforms: { map: { value: null }, sunDir, fade: { value: 0 }, ready: { value: 0 } },
        vertexShader: TILE_VERT,
        fragmentShader: TILE_FRAG,
        transparent: true,
        depthWrite: false,
      }),
    );
  }

  function request(x: number, y: number, z: number): void {
    const key = `${z}/${x}/${y}`;
    const have = tiles.get(key);
    if (have) {
      have.used = performance.now();
      return;
    }
    const mesh = patch(x, y, z);
    const material = mesh.material as THREE.ShaderMaterial;
    // finer tiles draw last, so they win wherever they overlap a coarser one
    mesh.renderOrder = 1 + z;
    const tile: Tile = { mesh, material, used: performance.now(), ready: false, zoom: z };
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
        // the base maps arrive compressed and are sampled raw, so the imagery is
        // left alone too — otherwise the tiles come out far darker than the map
        texture.colorSpace = THREE.LinearSRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        material.uniforms.map.value = texture;
        material.uniforms.ready.value = 1;
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
    (tile.material.uniforms.map.value as THREE.Texture | null)?.dispose();
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
      // the closer the camera, the finer the tiles
      const altitude = Math.max(0.02, distance - 1);
      const zoom = Math.round(THREE.MathUtils.clamp(Math.log2(1.4 / altitude) + 5.2, 3, maxZoom));
      // from far off, a tile is no sharper than the map already underneath it,
      // and its colours only patchwork the planet
      group.visible = zoom >= 6;
      if (!group.visible) return;
      // nothing to do until the camera has gone somewhere or changed its height
      if (centre.distanceTo(lastCentre) < 0.02 && tiles.size > 0 && zoom === lastZoom) return;
      lastCentre.copy(centre);
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
      // once the finer set has arrived, the coarser one underneath can go
      const current = [...tiles.values()].filter((t) => t.zoom === zoom);
      if (current.length > 0 && current.every((t) => t.ready))
        for (const [key, tile] of [...tiles.entries()]) if (tile.zoom !== zoom) drop(key);
      trim();
    },
    fade(dt) {
      for (const tile of tiles.values()) {
        const fade = tile.material.uniforms.fade;
        if (!tile.ready || fade.value >= 1) continue;
        fade.value = Math.min(1, fade.value + dt * 2.5);
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
