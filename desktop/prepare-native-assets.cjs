const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const sourceSvg = path.join(root, 'assets', 'forte-flex-favicon.svg');
const outputIco = path.join(root, 'assets', 'forte-favicon.ico');
const outputPng = path.join(root, 'assets', 'fortissimo-desktop-icon.png');
const sizes = [16, 24, 32, 48, 64, 128, 256];

function buildIco(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  const directory = Buffer.alloc(images.length * 16);
  let offset = 6 + directory.length;
  images.forEach(({ size, buffer }, index) => {
    const entry = index * 16;
    directory.writeUInt8(size === 256 ? 0 : size, entry);
    directory.writeUInt8(size === 256 ? 0 : size, entry + 1);
    directory.writeUInt8(0, entry + 2);
    directory.writeUInt8(0, entry + 3);
    directory.writeUInt16LE(1, entry + 4);
    directory.writeUInt16LE(32, entry + 6);
    directory.writeUInt32LE(buffer.length, entry + 8);
    directory.writeUInt32LE(offset, entry + 12);
    offset += buffer.length;
  });

  return Buffer.concat([header, directory, ...images.map(image => image.buffer)]);
}

async function main() {
  if (!fs.existsSync(sourceSvg)) throw new Error(`Missing original FORTISSIMO icon source: ${sourceSvg}`);

  const images = [];
  for (const size of sizes) {
    const buffer = await sharp(sourceSvg, { density: 384 })
      .resize(size, size, { fit: 'fill' })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer();
    images.push({ size, buffer });
    if (size === 256) fs.writeFileSync(outputPng, buffer);
  }

  fs.writeFileSync(outputIco, buildIco(images));
  console.log(`Prepared original FORTISSIMO Windows icon from ${path.basename(sourceSvg)}.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
