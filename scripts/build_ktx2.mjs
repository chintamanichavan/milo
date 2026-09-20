/**
 * Compresses the Earth textures to KTX2 (ETC1S) so they stay small on the GPU.
 *
 *   npm i --no-save ktx2-encoder sharp && node scripts/build_ktx2.mjs
 *
 * Run from the project root, after build_earth.ts has written the JPEGs.
 */
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { encodeToKTX2 } from 'ktx2-encoder';

const OUT = 'public/earth';
const decoder = async (buffer) => {
  const { data, info } = await sharp(Buffer.from(buffer), { limitInputPixels: false })
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { width: info.width, height: info.height, data: new Uint8Array(data) };
};

const jobs = [
  ['day.jpg', 'day-4k.ktx2', 4096, 2048, 190],
  ['night.jpg', 'night-2k.ktx2', 2048, 1024, 160],
  ['clouds.jpg', 'clouds-2k.ktx2', 2048, 1024, 150],
  ['topo.jpg', 'topo-2k.ktx2', 2048, 1024, 150],
  ['water.jpg', 'water-1k.ktx2', 1024, 512, 140],
];

for (const [src, dst, w, h, quality] of jobs) {
  // a compressed texture cannot be flipped at upload time, so bake the flip in:
  // its first row must be the bottom of the image, matching flipY on the JPEG path
  const jpeg = await sharp(`${OUT}/${src}`, { limitInputPixels: false })
    .resize(w, h, { fit: 'fill' }).flip().jpeg({ quality: 92 }).toBuffer();
  const t0 = Date.now();
  const ktx2 = await encodeToKTX2(new Uint8Array(jpeg), {
    isUASTC: false,
    needSupercompression: true,
    generateMipmap: true,
    isSRGB: !src.startsWith('topo') && !src.startsWith('water'),
    qualityLevel: quality,
    compressionLevel: 4,
    isYFlipped: false,
    imageDecoder: decoder,
  });
  writeFileSync(`${OUT}/${dst}`, Buffer.from(ktx2));
  console.log(dst, `${(ktx2.byteLength / 1e6).toFixed(2)} MB`, `${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
