const sharp = require("sharp");
const { default: pngToIco } = require("png-to-ico");
const fs = require("fs");
const path = require("path");

const BG = "#0d0d0d";
const FG = "#7c3aed";

function createSvg(size) {
  const fontSize = Math.round(size * 0.45);
  const y = Math.round(size * 0.58);
  return Buffer.from(`
    <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${size}" height="${size}" rx="${Math.round(size * 0.15)}" fill="${BG}"/>
      <text x="50%" y="${y}" text-anchor="middle" font-family="monospace" font-weight="bold" font-size="${fontSize}" fill="${FG}">&lt;/&gt;</text>
    </svg>
  `);
}

async function main() {
  const outDir = path.join(__dirname, "..", "public");
  const iconsDir = path.join(outDir, "icons");

  fs.mkdirSync(iconsDir, { recursive: true });

  // Generate PWA icons
  const sizes = [
    { name: "icon-192.png", size: 192, dir: iconsDir },
    { name: "icon-512.png", size: 512, dir: iconsDir },
  ];

  // Favicon and touch icon sizes
  const faviconSizes = [
    { name: "favicon-16x16.png", size: 16, dir: outDir },
    { name: "favicon-32x32.png", size: 32, dir: outDir },
    { name: "apple-touch-icon.png", size: 180, dir: outDir },
  ];

  const all = [...sizes, ...faviconSizes];

  for (const { name, size, dir } of all) {
    const svg = createSvg(size);
    await sharp(svg).png().toFile(path.join(dir, name));
    console.log(`  Created ${name} (${size}x${size})`);
  }

  // Generate favicon.ico from 32x32 PNG
  const png32 = path.join(outDir, "favicon-32x32.png");
  const png16 = path.join(outDir, "favicon-16x16.png");
  const icoBuffer = await pngToIco([png32, png16]);
  fs.writeFileSync(path.join(outDir, "favicon.ico"), icoBuffer);
  console.log("  Created favicon.ico");

  console.log("Done!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
