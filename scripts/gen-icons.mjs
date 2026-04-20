// Generates icon-192.png and icon-512.png in public/
// Uses only Node.js built-ins — no extra deps needed.
// Run once: node scripts/gen-icons.mjs
import { deflateSync } from 'zlib';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '../public');
mkdirSync(publicDir, { recursive: true });

// CRC32 lookup table
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  CRC_TABLE[i] = c;
}
function crc32(buf) {
  let crc = 0xffffffff;
  for (const b of buf) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.allocUnsafe(4);
  len.writeUInt32BE(data.length, 0);
  const crcVal = Buffer.allocUnsafe(4);
  crcVal.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crcVal]);
}

function makePNG(size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 2;  // color type: RGB
  ihdr[10] = ihdr[11] = ihdr[12] = 0;

  // Draw: dark bg + teal disc + inner accent ring
  const cx = size / 2, cy = size / 2;
  const r1 = size * 0.42, r2 = size * 0.30;
  const BG  = [13,  17,  23];   // #0d1117
  const MID = [26, 102,  80];   // #1a6650 (dim teal ring)
  const FG  = [57, 208, 160];   // #39d0a0

  const rows = [];
  for (let y = 0; y < size; y++) {
    const row = [0]; // filter byte = None
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - cx, y - cy);
      row.push(...(d <= r2 ? FG : d <= r1 ? MID : BG));
    }
    rows.push(Buffer.from(row));
  }

  const idat = deflateSync(Buffer.concat(rows));

  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

for (const size of [192, 512]) {
  writeFileSync(join(publicDir, `icon-${size}.png`), makePNG(size));
  console.log(`icon-${size}.png`);
}
