/**
 * Builds the Earth textures from NASA Visible Earth sources.
 *
 *   node --max-old-space-size=8192 scripts/build_earth.ts <day21600.jpg> <night13500.jpg> <topo21600.png> <clouds.jpg>
 *
 * Writes into public/earth:
 *   cube/{px,nx,py,ny,pz,nz}.jpg  day map as a cubemap, 6 × 4096², no seams
 *   day.jpg                       8K equirect, the fallback while the cube streams
 *   night.jpg                     8K city lights
 *   normal.jpg                    4K tangent-space normals, Sobel from the topography
 *   topo.jpg water.jpg clouds.jpg as before
 *
 * The cube faces are generated in the same frame the app uses for lat/lon, so a
 * fragment shader can sample textureCube(day, normalize(position)) directly.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const [daySrc, nightSrc, topoSrc, cloudSrc] = process.argv.slice(2);
const OUT = 'public/earth';
mkdirSync(`${OUT}/cube`, { recursive: true });

const FACE = 4096;
/** equirect working size: a little over the face resolution, to keep memory sane */
const EQ_W = 12288;
const EQ_H = 6144;

interface Raw {
  data: Buffer;
  width: number;
  height: number;
}

async function raw(path: string, width: number, height: number): Promise<Raw> {
  const { data, info } = await sharp(path, { limitInputPixels: false })
    .resize(width, height, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}

/** bilinear sample of an equirect map, wrapping in longitude */
function sample(src: Raw, u: number, v: number, out: [number, number, number]): void {
  const x = u * src.width - 0.5;
  const y = Math.min(src.height - 1.001, Math.max(0, v * src.height - 0.5));
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const fx = x - x0;
  const fy = y - y0;
  const x1 = (((x0 + 1) % src.width) + src.width) % src.width;
  const xa = ((x0 % src.width) + src.width) % src.width;
  const y1 = Math.min(src.height - 1, y0 + 1);
  for (let c = 0; c < 3; c++) {
    const p00 = src.data[(y0 * src.width + xa) * 3 + c];
    const p10 = src.data[(y0 * src.width + x1) * 3 + c];
    const p01 = src.data[(y1 * src.width + xa) * 3 + c];
    const p11 = src.data[(y1 * src.width + x1) * 3 + c];
    out[c] = (p00 * (1 - fx) + p10 * fx) * (1 - fy) + (p01 * (1 - fx) + p11 * fx) * fy;
  }
}

/** GL cube face conventions, in the app's own lat/lon frame */
const FACES: [string, (u: number, v: number) => [number, number, number]][] = [
  ['px', (u, v) => [1, -v, -u]],
  ['nx', (u, v) => [-1, -v, u]],
  ['py', (u, v) => [u, 1, v]],
  ['ny', (u, v) => [u, -1, -v]],
  ['pz', (u, v) => [u, -v, 1]],
  ['nz', (u, v) => [-u, -v, -1]],
];

async function buildCube(src: Raw): Promise<void> {
  const rgb: [number, number, number] = [0, 0, 0];
  for (const [name, toDir] of FACES) {
    const out = Buffer.allocUnsafe(FACE * FACE * 3);
    for (let y = 0; y < FACE; y++) {
      const v = (2 * (y + 0.5)) / FACE - 1;
      for (let x = 0; x < FACE; x++) {
        const u = (2 * (x + 0.5)) / FACE - 1;
        const [dx, dy, dz] = toDir(u, v);
        const len = Math.hypot(dx, dy, dz);
        const nx = dx / len;
        const ny = dy / len;
        const nz = dz / len;
        // invert the app's mapping: lat from y, lon from atan2(z, -x)
        const lat = 90 - (Math.acos(Math.max(-1, Math.min(1, ny))) * 180) / Math.PI;
        const lon = (Math.atan2(nz, -nx) * 180) / Math.PI - 180;
        sample(src, ((lon + 180) / 360 + 1) % 1, (90 - lat) / 180, rgb);
        const at = (y * FACE + x) * 3;
        out[at] = rgb[0];
        out[at + 1] = rgb[1];
        out[at + 2] = rgb[2];
      }
    }
    const info = await sharp(out, { raw: { width: FACE, height: FACE, channels: 3 } })
      .jpeg({ quality: 82, progressive: true, mozjpeg: true })
      .toFile(`${OUT}/cube/${name}.jpg`);
    console.log(`cube/${name}.jpg`, `${(info.size / 1e6).toFixed(2)} MB`);
  }
}

/** Sobel over the height map, written as a tangent-space normal map */
async function buildNormals(path: string): Promise<void> {
  const size = 4096;
  const height = await sharp(path, { limitInputPixels: false })
    .resize(size, size / 2, { fit: 'fill' })
    .greyscale()
    .raw()
    .toBuffer();
  const w = size;
  const h = size / 2;
  const out = Buffer.allocUnsafe(w * h * 3);
  const at = (x: number, y: number): number =>
    height[Math.min(h - 1, Math.max(0, y)) * w + (((x % w) + w) % w)];
  const strength = 2.2;
  for (let y = 0; y < h; y++) {
    // longitudes converge at the poles, so the horizontal gradient is scaled
    const lat = 90 - (180 * (y + 0.5)) / h;
    const scale = 1 / Math.max(0.15, Math.cos((lat * Math.PI) / 180));
    for (let x = 0; x < w; x++) {
      const tl = at(x - 1, y - 1), t = at(x, y - 1), tr = at(x + 1, y - 1);
      const l = at(x - 1, y), r = at(x + 1, y);
      const bl = at(x - 1, y + 1), b = at(x, y + 1), br = at(x + 1, y + 1);
      const dx = (tr + 2 * r + br - tl - 2 * l - bl) / 255;
      const dy = (bl + 2 * b + br - tl - 2 * t - tr) / 255;
      let nx = -dx * strength * Math.min(4, scale);
      let ny = -dy * strength;
      const nz = 1;
      const len = Math.hypot(nx, ny, nz);
      nx /= len;
      ny /= len;
      const i = (y * w + x) * 3;
      out[i] = Math.round((nx * 0.5 + 0.5) * 255);
      out[i + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      out[i + 2] = Math.round((nz / len) * 0.5 * 255 + 127.5);
    }
  }
  const info = await sharp(out, { raw: { width: w, height: h, channels: 3 } })
    .jpeg({ quality: 78, progressive: true, mozjpeg: true })
    .toFile(`${OUT}/normal.jpg`);
  console.log('normal.jpg', `${(info.size / 1e6).toFixed(2)} MB`);
}

const day = await raw(daySrc, EQ_W, EQ_H);
console.log('source loaded', day.width, day.height);
await buildCube(day);

// the equirect fallback, used until the cube has streamed in
let info = await sharp(daySrc, { limitInputPixels: false })
  .resize(8192, 4096, { fit: 'fill' })
  .modulate({ saturation: 1.1 })
  .jpeg({ quality: 78, progressive: true, mozjpeg: true })
  .toFile(`${OUT}/day.jpg`);
console.log('day.jpg', `${(info.size / 1e6).toFixed(2)} MB`);

info = await sharp(nightSrc, { limitInputPixels: false })
  .resize(8192, 4096, { fit: 'fill' })
  .jpeg({ quality: 70, progressive: true, mozjpeg: true })
  .toFile(`${OUT}/night.jpg`);
console.log('night.jpg', `${(info.size / 1e6).toFixed(2)} MB`);

info = await sharp(topoSrc, { limitInputPixels: false })
  .resize(4096, 2048, { fit: 'fill' })
  .greyscale()
  .jpeg({ quality: 70, progressive: true, mozjpeg: true })
  .toFile(`${OUT}/topo.jpg`);
console.log('topo.jpg', `${(info.size / 1e6).toFixed(2)} MB`);

info = await sharp(topoSrc, { limitInputPixels: false })
  .resize(2048, 1024, { fit: 'fill' })
  .greyscale()
  .threshold(14)
  .negate()
  .jpeg({ quality: 60, progressive: true, mozjpeg: true })
  .toFile(`${OUT}/water.jpg`);
console.log('water.jpg', `${(info.size / 1e6).toFixed(2)} MB`);

info = await sharp(cloudSrc, { limitInputPixels: false })
  .resize(4096, 2048, { fit: 'fill' })
  .jpeg({ quality: 68, progressive: true, mozjpeg: true })
  .toFile(`${OUT}/clouds.jpg`);
console.log('clouds.jpg', `${(info.size / 1e6).toFixed(2)} MB`);

await buildNormals(topoSrc);
writeFileSync(`${OUT}/manifest.json`, JSON.stringify({ face: FACE, built: new Date().toISOString() }));
console.log('done');
