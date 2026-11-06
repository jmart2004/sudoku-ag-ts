// Draws the logo (a 3x3 box in the four player colours) into the source
// images that `npm run android:icons` turns into launcher icons and splash
// screens, and into the website's icons.

import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CELLS = ["#f97316", "", "#3b82f6", "", "#6366f1", "", "#22c55e", "", "#d946ef"];

// The board tile, `size` px wide, centred at (cx, cy).
function tile(cx, cy, size, { surface = "#ffffff", empty = "#eef0f7" } = {}) {
  const pad = size * 0.09, gap = size * 0.06;
  const cell = (size - 2 * pad - 2 * gap) / 3;
  const x0 = cx - size / 2, y0 = cy - size / 2;
  const cells = CELLS.map((color, i) => {
    const x = x0 + pad + (i % 3) * (cell + gap);
    const y = y0 + pad + Math.floor(i / 3) * (cell + gap);
    return `<rect x="${x}" y="${y}" width="${cell}" height="${cell}" rx="${cell * 0.18}" fill="${color || empty}"/>`;
  }).join("");
  return `<rect x="${x0}" y="${y0}" width="${size}" height="${size}" rx="${size * 0.2}" fill="${surface}"/>${cells}`;
}

const gradient = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
  <stop offset="0" stop-color="#818cf8"/><stop offset="1" stop-color="#4f46e5"/></linearGradient></defs>`;
const svg = (w, h, body) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${gradient}${body}</svg>`);
const write = (file, w, h, body) => sharp(svg(w, h, body)).png().toFile(path.join(ROOT, file));

await Promise.all([
  write("assets/icon-only.png", 1024, 1024, `<rect width="1024" height="1024" fill="url(#g)"/>${tile(512, 512, 600)}`),
  write("assets/icon-background.png", 1024, 1024, `<rect width="1024" height="1024" fill="url(#g)"/>`),
  // Adaptive icons crop to the middle ~66%, so the tile stays well inside.
  write("assets/icon-foreground.png", 1024, 1024, tile(512, 512, 440)),
  write("assets/splash.png", 2732, 2732, `<rect width="2732" height="2732" fill="#f5f6fb"/>${tile(1366, 1366, 520)}`),
  write("assets/splash-dark.png", 2732, 2732,
    `<rect width="2732" height="2732" fill="#0b0f1a"/>${tile(1366, 1366, 520, { surface: "#121829", empty: "#1c2438" })}`),
  write("public/logo192.png", 192, 192, `<rect width="192" height="192" rx="40" fill="url(#g)"/>${tile(96, 96, 116)}`),
  write("public/logo512.png", 512, 512, `<rect width="512" height="512" rx="108" fill="url(#g)"/>${tile(256, 256, 310)}`),
]);
console.log("Icons written to assets/ and public/");
