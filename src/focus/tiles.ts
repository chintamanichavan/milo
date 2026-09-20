import * as THREE from 'three';
import { budget } from './quality';

/**
 * Satellite imagery streamed onto the globe when there is a network.
 *
 * Tiles are Web Mercator, so each one becomes a small sphere patch whose
 * latitude bounds come from the inverse Mercator projection. They arrive a
 * whole zoom level at a time: a level covers the frame or it is not shown at
 * all, and the level below it stays underneath, so the planet never ends up
 * with one sharp square sitting on a soft map. Nothing is precached: the
 * imagery is not ours to keep.
 */
const URL_TEMPLATE =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

export const ESRI_ATTRIBUTION = 'Imagery © Esri, Maxar, Earthstar Geographics';

/** how often the tile set is recomputed, in ms */
export const TILE_INTERVAL = 700;
// far enough above the map that neither the globe's facets nor the patch's own
// sag can poke through it and dapple the imagery
const RADIUS = 1.0025;
/** below this the map underneath is just as sharp, and its colours are kinder */
const MIN_ZOOM = 6;
/** a level appears only once this much of it has arrived */
const COVER = 0.95;
/** and it has this long to manage that before we settle for the map */
const PATIENCE_MS = 6000;
/** how long a level, or a late tile inside one, takes to come up */
const FADE_MS = 400;
const MAX_TILES = 110;
/** how far past the frame to fetch, and how far ahead along the route */
const MARGIN = 1.15;
const LOOK_AHEAD = 1;
/** rings of tiles per level: the widest one carries the far field */
const REACH_WIDE = 3;
const REACH_NEAR = 2;

/** inverse Web Mercator: tile row to latitude */
const tileLat = (y: number, z: number): number =>
  (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / 2 ** z))) * 180) / Math.PI;

const tileLon = (x: number, z: number): number => (x / 2 ** z) * 360 - 180;

const lonToTile = (lon: number, z: number): number => ((lon + 180) / 360) * 2 ** z;

const latToTile = (lat: number, z: number): number => {
  const rad = (Math.max(-85, Math.min(85, lat)) * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** z;
};

const latLonOf = (point: THREE.Vector3): [number, number] => {
  const p = point.clone().normalize();
  return [
    90 - (Math.acos(THREE.MathUtils.clamp(p.y, -1, 1)) * 180) / Math.PI,
    (Math.atan2(p.z, -p.x) * 180) / Math.PI - 180,
  ];
};

interface Tile {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  ready: boolean;
  x: number;
  y: number;
  bounds: { west: number; east: number; south: number; north: number };
}

interface Rect {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

interface Level {
  zoom: number;
  group: THREE.Group;
  tiles: Map<string, Tile>;
  covered: Rect | null;
  /** the middle of the level's reach, and where it starts and finishes fading */
  middle: { value: THREE.Vector3 };
  rim: { value: THREE.Vector2 };
  opacity: { value: number };
  shown: boolean;
  started: number;
  stalled: boolean;
}

// the imagery has to take the same light as the map underneath it, step aside
// at night so the city lights show through, and match the map's colours closely
// enough that a half-finished level shows no seam
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
  uniform vec3 tint;
  uniform float fade;
  uniform float level;
  uniform vec3 middle;
  uniform vec2 rim;
  varying vec2 vUv;
  varying vec3 vNormalW;
  void main() {
    float lit = dot(normalize(vNormalW), normalize(sunDir));
    float dayAmount = smoothstep(-0.10, 0.11, lit);
    vec3 col = texture2D(map, vUv).rgb * tint * (0.25 + 1.05 * max(lit, 0.0));
    // a level melts into whatever lies under it over the last of its reach.
    // The fade is measured across the ground rather than across the tile, so it
    // stays soft even where the ground is seen almost edge on.
    float away = acos(clamp(dot(normalize(vNormalW), middle), -1.0, 1.0));
    float soft = 1.0 - smoothstep(rim.x, rim.y, away);
    gl_FragColor = vec4(col, fade * level * dayAmount * soft);
  }
`;

export interface TileLayer {
  /**
   * @param centre what the camera is looking at
   * @param distance how far the camera is from the middle of the earth
   * @param spanDeg how much ground the frame covers, in degrees
   * @param ahead where the aircraft is heading, if it is flying
   */
  update(centre: THREE.Vector3, distance: number, spanDeg: number, ahead?: THREE.Vector3): void;
  fade(dt: number): void;
  count(): number;
  /** the joins, the middles and the outer rim of the sharpest level on show */
  seams(): {
    zoom: number;
    edges: [number, number][];
    centres: [number, number][];
    rim: [number, number][];
  };
  dispose(): void;
}

export function createTileLayer(scene: THREE.Scene, sunDir: { value: THREE.Vector3 }): TileLayer {
  const limits = budget();
  const maxZoom = limits.tileZoom;
  const root = new THREE.Group();
  scene.add(root);
  const levels = new Map<number, Level>();
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');
  let disposed = false;

  /* ---------- matching the imagery to the map underneath ---------- */

  // a thumbnail of the base map, so every tile can be balanced against the
  // ground colour the globe already shows there
  let base: ImageData | null = null;
  const thumb = new Image();
  thumb.crossOrigin = 'anonymous';
  thumb.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = thumb.naturalWidth;
    canvas.height = thumb.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;
    ctx.drawImage(thumb, 0, 0);
    base = ctx.getImageData(0, 0, canvas.width, canvas.height);
  };
  thumb.src = '/earth/day-512.jpg';

  // one colour correction for the whole layer. Per tile it chequerboards, and
  // per level the two levels that meet disagree about the colour of the ground.
  const tint = { value: new THREE.Vector3(1, 1, 1) };
  let matched = 0;

  const swatch = document.createElement('canvas');
  swatch.width = swatch.height = 8;
  const swatchCtx = swatch.getContext('2d', { willReadFrequently: true });

  /** the base map's average colour over a patch of ground */
  function baseColour(b: Tile['bounds']): [number, number, number] | null {
    if (!base) return null;
    const { width, height, data } = base;
    const x0 = Math.floor(((b.west + 180) / 360) * width);
    const x1 = Math.ceil(((b.east + 180) / 360) * width);
    const y0 = Math.floor(((90 - b.north) / 180) * height);
    const y1 = Math.ceil(((90 - b.south) / 180) * height);
    let r = 0;
    let g = 0;
    let bl = 0;
    let n = 0;
    for (let y = Math.max(0, y0); y < Math.min(height, Math.max(y1, y0 + 1)); y++)
      for (let x = Math.max(0, x0); x < Math.min(width, Math.max(x1, x0 + 1)); x++) {
        const i = (y * width + x) * 4;
        r += data[i];
        g += data[i + 1];
        bl += data[i + 2];
        n++;
      }
    return n ? [r / n, g / n, bl / n] : null;
  }

  /** the tile's own average colour */
  function tileColour(image: CanvasImageSource): [number, number, number] | null {
    if (!swatchCtx) return null;
    swatchCtx.clearRect(0, 0, 8, 8);
    swatchCtx.drawImage(image, 0, 0, 8, 8);
    const { data } = swatchCtx.getImageData(0, 0, 8, 8);
    let r = 0;
    let g = 0;
    let b = 0;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }
    const n = data.length / 4;
    return [r / n, g / n, b / n];
  }

  /**
   * Balance the imagery against the map it lands on, as one correction for the
   * whole layer: it is worked out per tile, then eased into a running average so
   * that neither one tile nor one level can step away from its neighbours.
   */
  function matchTint(tile: Tile, image: CanvasImageSource): void {
    const want = baseColour(tile.bounds);
    const have = tileColour(image);
    if (!want || !have) return;
    // pull most of the way towards the map's colour, never more than half again
    const ratio = (a: number, b: number): number =>
      THREE.MathUtils.clamp(1 + 0.75 * (a / Math.max(8, b) - 1), 0.65, 1.5);
    const found = new THREE.Vector3(
      ratio(want[0], have[0]),
      ratio(want[1], have[1]),
      ratio(want[2], have[2]),
    );
    matched += 1;
    tint.value.lerp(found, matched < 6 ? 1 / matched : 0.12);
  }

  /* ---------- tiles ---------- */

  function patch(x: number, y: number, z: number, level: Level): Tile {
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
    const material = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: null },
        sunDir,
        tint,
        fade: { value: 0 },
        level: level.opacity,
        middle: level.middle,
        rim: level.rim,
      },
      vertexShader: TILE_VERT,
      fragmentShader: TILE_FRAG,
      transparent: true,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    return { mesh, material, ready: false, x, y, bounds: { west, east, south, north } };
  }

  function request(level: Level, x: number, y: number): void {
    const key = `${x}/${y}`;
    if (level.tiles.has(key)) return;
    const tile = patch(x, y, level.zoom, level);
    level.tiles.set(key, tile);
    level.group.add(tile.mesh);
    const url = URL_TEMPLATE.replace('{z}', String(level.zoom))
      .replace('{x}', String(x))
      .replace('{y}', String(y));
    loader.load(
      url,
      (texture) => {
        if (disposed || level.tiles.get(key) !== tile) {
          texture.dispose();
          return;
        }
        // the base maps arrive compressed and are sampled raw, so the imagery is
        // left alone too — otherwise the tiles come out far darker than the map
        texture.colorSpace = THREE.LinearSRGBColorSpace;
        texture.minFilter = THREE.LinearFilter;
        texture.generateMipmaps = false;
        tile.material.uniforms.map.value = texture;
        if (texture.image) matchTint(tile, texture.image as CanvasImageSource);
        tile.ready = true;
      },
      undefined,
      () => {
        // a tile the server will not give us must not hold the level back
        tile.ready = true;
        tile.material.uniforms.fade.value = 0;
        tile.material.visible = false;
      },
    );
  }

  function dropTile(level: Level, key: string): void {
    const tile = level.tiles.get(key);
    if (!tile) return;
    level.group.remove(tile.mesh);
    tile.mesh.geometry.dispose();
    (tile.material.uniforms.map.value as THREE.Texture | null)?.dispose();
    tile.material.dispose();
    level.tiles.delete(key);
  }

  function dropLevel(zoom: number): void {
    const level = levels.get(zoom);
    if (!level) return;
    for (const key of [...level.tiles.keys()]) dropTile(level, key);
    root.remove(level.group);
    levels.delete(zoom);
  }

  /** how far the level reaches from its middle, in radians */
  function reachOf(level: Level, lat: number): number {
    const rect = level.covered;
    if (!rect) return 0;
    const tileDeg = 360 / 2 ** level.zoom;
    const shrink = Math.max(0.12, Math.cos((lat * Math.PI) / 180));
    const rings = Math.min((rect.x1 - rect.x0) / 2, (rect.y1 - rect.y0) / 2) + 0.5;
    return ((rings * tileDeg * shrink * Math.PI) / 180) * 0.98;
  }

  /** the tiles a level needs to cover the frame, plus a margin and the way ahead */
  function wanted(zoom: number, lat: number, lon: number, spanDeg: number, ahead?: THREE.Vector3): Rect {
    const tileDeg = 360 / 2 ** zoom;
    const shrink = Math.max(0.12, Math.cos((lat * Math.PI) / 180));
    const reach = Math.min(
      zoom === MIN_ZOOM ? REACH_WIDE : REACH_NEAR,
      Math.max(1, Math.ceil(((spanDeg / 2) * MARGIN) / (tileDeg * shrink))),
    );
    const cx = Math.floor(lonToTile(lon, zoom));
    const cy = Math.floor(latToTile(lat, zoom));
    const rect = { x0: cx - reach, x1: cx + reach, y0: cy - reach, y1: cy + reach };
    if (ahead) {
      // the ground the aircraft is about to fly over is fetched before it gets there
      const [aLat, aLon] = latLonOf(ahead);
      const ax = Math.floor(lonToTile(aLon, zoom));
      const ay = Math.floor(latToTile(aLat, zoom));
      rect.x0 = Math.min(rect.x0, ax - LOOK_AHEAD);
      rect.x1 = Math.max(rect.x1, ax + LOOK_AHEAD);
      rect.y0 = Math.min(rect.y0, ay - LOOK_AHEAD);
      rect.y1 = Math.max(rect.y1, ay + LOOK_AHEAD);
    }
    return rect;
  }

  function fill(level: Level, rect: Rect): void {
    const size = 2 ** level.zoom;
    for (let y = rect.y0; y <= rect.y1; y++) {
      if (y < 0 || y >= size) continue;
      for (let x = rect.x0; x <= rect.x1; x++) request(level, ((x % size) + size) % size, y);
    }
    level.covered = rect;
  }

  function openLevel(zoom: number, rect: Rect): Level {
    const group = new THREE.Group();
    // finer levels draw last, so they win wherever they overlap a coarser one
    group.renderOrder = zoom;
    root.add(group);
    const level: Level = {
      zoom,
      group,
      tiles: new Map(),
      covered: null,
      middle: { value: new THREE.Vector3(0, 1, 0) },
      rim: { value: new THREE.Vector2(1, 2) },
      opacity: { value: 0 },
      shown: false,
      started: performance.now(),
      stalled: false,
    };
    levels.set(zoom, level);
    fill(level, rect);
    return level;
  }

  const share = (level: Level): number => {
    if (level.tiles.size === 0) return 0;
    let ready = 0;
    for (const tile of level.tiles.values()) if (tile.ready) ready++;
    return ready / level.tiles.size;
  };

  /** keep the sharpest level on show and one underneath it, and nothing else */
  function prune(): void {
    const shown = [...levels.values()].filter((l) => l.shown).map((l) => l.zoom);
    const deepest = shown.length ? Math.max(...shown) : MIN_ZOOM - 1;
    for (const level of [...levels.values()])
      if (level.shown && level.zoom < deepest - 1) dropLevel(level.zoom);
    let total = 0;
    for (const level of levels.values()) total += level.tiles.size;
    while (total > MAX_TILES) {
      const coarsest = Math.min(...[...levels.keys()]);
      if (coarsest >= deepest) break;
      total -= levels.get(coarsest)!.tiles.size;
      dropLevel(coarsest);
    }
  }

  const lastCentre = new THREE.Vector3();
  let lastZoom = 0;

  return {
    update(centre, distance, spanDeg, ahead) {
      if (disposed || !navigator.onLine) return;
      // the closer the camera, the finer the tiles
      const altitude = Math.max(0.02, distance - 1);
      const target = Math.round(THREE.MathUtils.clamp(Math.log2(1.4 / altitude) + 5.2, 3, maxZoom));
      // from far off, a tile is no sharper than the map already underneath it,
      // and its colours only patchwork the planet
      root.visible = target >= MIN_ZOOM;
      if (!root.visible) return;
      const moved = centre.distanceTo(lastCentre) > 0.004 || target !== lastZoom;
      lastCentre.copy(centre);
      lastZoom = target;
      const [lat, lon] = latLonOf(centre);
      const here = centre.clone().normalize();

      // anything sharper than the camera now needs is thrown away
      for (const level of [...levels.values()]) if (level.zoom > target) dropLevel(level.zoom);

      // levels already on show follow the camera, so the frame stays covered
      for (const level of levels.values())
        if (level.shown && moved) fill(level, wanted(level.zoom, lat, lon, spanDeg, ahead));

      for (const level of levels.values()) {
        level.middle.value.copy(here);
        const reach = reachOf(level, lat);
        level.rim.value.set(reach * 0.62, reach);
      }

      const working = [...levels.values()].find((l) => !l.shown);
      if (working) {
        if (moved) fill(working, wanted(working.zoom, lat, lon, spanDeg, ahead));
        // a level that cannot come together in six seconds is left hidden, and
        // nothing finer is asked for: better the plain map than a patchwork
        if (!working.stalled && performance.now() - working.started > PATIENCE_MS && share(working) < COVER)
          working.stalled = true;
      } else {
        const shown = [...levels.values()].filter((l) => l.shown).map((l) => l.zoom);
        const deepest = shown.length ? Math.max(...shown) : MIN_ZOOM - 1;
        const next = Math.max(MIN_ZOOM, deepest + 1);
        if (next <= target) openLevel(next, wanted(next, lat, lon, spanDeg, ahead));
      }
      prune();
    },

    fade(dt) {
      const step = (dt * 1000) / FADE_MS;
      for (const level of levels.values()) {
        if (!level.shown && !level.stalled && share(level) >= COVER) level.shown = true;
        if (level.shown && level.opacity.value < 1)
          level.opacity.value = Math.min(1, level.opacity.value + step);
        for (const tile of level.tiles.values()) {
          const fade = tile.material.uniforms.fade;
          if (tile.ready && fade.value < 1) fade.value = Math.min(1, fade.value + step);
        }
      }
    },

    count() {
      let total = 0;
      for (const level of levels.values()) total += level.tiles.size;
      return total;
    },

    seams() {
      const shown = [...levels.values()].filter((l) => l.shown && l.opacity.value > 0.9);
      const edges: [number, number][] = [];
      const centres: [number, number][] = [];
      const rim: [number, number][] = [];
      if (shown.length === 0) return { zoom: 0, edges, centres, rim };
      const level = shown.reduce((a, b) => (a.zoom > b.zoom ? a : b));
      for (const tile of level.tiles.values()) {
        const { west, east, south, north } = tile.bounds;
        for (let i = 1; i < 5; i++) {
          const t = i / 5;
          // along the tile's own seams, where a mismatch would show
          edges.push([south + (north - south) * t, west]);
          edges.push([north, west + (east - west) * t]);
          centres.push([south + (north - south) * t, (west + east) / 2]);
          centres.push([(south + north) / 2, west + (east - west) * t]);
        }
      }
      // and the ring where each level fades out onto the one beneath it, which
      // is the join that has to disappear
      for (const one of shown) {
        const [cLat, cLon] = latLonOf(one.middle.value);
        const lat1 = (cLat * Math.PI) / 180;
        const lon1 = (cLon * Math.PI) / 180;
        for (const d of [one.rim.value.x * 1.02, (one.rim.value.x + one.rim.value.y) / 2, one.rim.value.y * 0.98])
          for (let i = 0; i < 16; i++) {
            const bearing = (i / 16) * Math.PI * 2;
            const lat2 = Math.asin(
              Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(bearing),
            );
            const lon2 =
              lon1 +
              Math.atan2(
                Math.sin(bearing) * Math.sin(d) * Math.cos(lat1),
                Math.cos(d) - Math.sin(lat1) * Math.sin(lat2),
              );
            rim.push([(lat2 * 180) / Math.PI, (lon2 * 180) / Math.PI]);
          }
      }
      return { zoom: level.zoom, edges, centres, rim };
    },

    dispose() {
      disposed = true;
      for (const zoom of [...levels.keys()]) dropLevel(zoom);
      scene.remove(root);
    },
  };
}
