/**
 * generate-icons.js
 * Converts assets/logo.svg → PNG app icons for Expo.
 * Run: node scripts/generate-icons.js
 * Requires: npm install --save-dev sharp   (or uses @resvg/resvg-js if sharp unavailable)
 */

const fs   = require('fs');
const path = require('path');

const SVG_PATH = path.join(__dirname, '..', 'assets', 'logo.svg');
const OUT_DIR  = path.join(__dirname, '..', 'assets');

// SVG source — force dark-mode look (white logo on dark squircle) for the app icon
const svgSrc = fs.readFileSync(SVG_PATH, 'utf8');

const SIZES = [
  { name: 'icon.png',          size: 1024 },
  { name: 'adaptive-icon.png', size: 1024 },
  { name: 'splash.png',        size: 1284 },   // common splash size
  { name: 'favicon.png',       size: 48   },
];

async function main() {
  let sharp;
  try {
    sharp = require('sharp');
  } catch {
    console.error(
      '\n❌  "sharp" is not installed.\n' +
      '   Run:  npm install --save-dev sharp\n' +
      '   Then re-run this script.\n'
    );
    process.exit(1);
  }

  for (const { name, size } of SIZES) {
    const outPath = path.join(OUT_DIR, name);
    await sharp(Buffer.from(svgSrc))
      .resize(size, size)
      .png()
      .toFile(outPath);
    console.log(`✅  Generated ${name}  (${size}×${size})`);
  }

  console.log('\n🎉  All app icons generated in assets/');
}

main().catch((err) => {
  console.error('Icon generation failed:', err.message);
  process.exit(1);
});
