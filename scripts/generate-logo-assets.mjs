// =============================================================================
// UGCast — logo & icon asset generator
//
// Recreates the angular "A" brand mark (forward-slash leg + vertical bar) and
// renders every asset the app needs, themed to the project's real design tokens
// (deep emerald-black surfaces + champagne-gold accent) from src/app/globals.css.
//
// Run:  node scripts/generate-logo-assets.mjs
// Deps: sharp (already a dependency)
// =============================================================================
import sharp from "sharp";
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const P = (...p) => join(ROOT, ...p);

// ---- Palette (snapped to globals.css @theme tokens) ------------------------
const GREEN_DEEP = "#0a130d"; // --color-bg-page
const GREEN_BG   = "#111d15"; // --color-bg-card
const GREEN_HI   = "#1b2c20"; // radial highlight (≈ --color-bg-card-hover)
const GOLD_LT    = "#f4eccf"; // --color-primary-100
const GOLD       = "#d3b969"; // --color-primary-500
const GOLD_DP    = "#977b39"; // --color-primary-700
const CREAM      = "#f2efe2"; // --color-primary-text
const SAGE       = "#97a398"; // --color-secondary-text

// ---- The mark (512x512 canvas) ---------------------------------------------
// A bold forward-slash leg + short foot (the "A"), with the right leg
// dispersing into gold shards that fan up-and-right (motion / AI generation).
const SLASH = `<path d="M92 372 L188 372 L300 150 L204 150 Z"/>`;
const FOOT  = `<path d="M214 372 L300 372 L330 300 L244 300 Z"/>`;
// [cx, cy, w, h, rotation] — fragments shrink as they travel from the leg
const FRAGS = [
  [330, 232, 46, 32, -14], [346, 180, 40, 28, -10], [360, 286, 40, 28, -18],
  [396, 210, 32, 24, -12], [402, 268, 30, 22, -16], [392, 156, 30, 22, -8], [422, 330, 26, 19, -22],
  [376, 128, 24, 18, -6],
  [446, 238, 22, 16, -12], [444, 186, 20, 15, -10], [452, 292, 20, 15, -16], [430, 140, 18, 14, -6],
  [470, 320, 15, 11, -20],
  [486, 214, 14, 11, -12], [484, 262, 13, 10, -14], [482, 166, 12, 9, -9], [458, 120, 12, 9, -6],
];
const FRAG_RECTS = FRAGS.map(
  ([cx, cy, w, h, r]) =>
    `<rect x="${cx - w / 2}" y="${cy - h / 2}" width="${w}" height="${h}" rx="2" transform="rotate(${r} ${cx} ${cy})"/>`
).join("");
const MARK_PATHS = SLASH + FOOT + FRAG_RECTS;

// Scale the mark about its center (for padding / maskable safe-zone)
const mark = (fill, scale = 1) => {
  const t = scale === 1 ? "" : ` transform="translate(256 256) scale(${scale}) translate(-256 -256)"`;
  return `<g fill="${fill}"${t}>${MARK_PATHS}</g>`;
};

const DEFS = `<defs>
    <linearGradient id="gold" x1="0.08" y1="0.05" x2="0.92" y2="0.98">
      <stop offset="0" stop-color="${GOLD_LT}"/>
      <stop offset="0.5" stop-color="${GOLD}"/>
      <stop offset="1" stop-color="${GOLD_DP}"/>
    </linearGradient>
    <radialGradient id="surface" cx="0.34" cy="0.20" r="0.95">
      <stop offset="0" stop-color="${GREEN_HI}"/>
      <stop offset="0.55" stop-color="${GREEN_BG}"/>
      <stop offset="1" stop-color="${GREEN_DEEP}"/>
    </radialGradient>
  </defs>`;

const svg = (inner, size = 512) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="${size}" height="${size}">${DEFS}${inner}</svg>`;

// ---- Variant builders ------------------------------------------------------
const vTile = svg(
  `<rect width="512" height="512" rx="114" fill="url(#surface)"/>
   <rect x="6" y="6" width="500" height="500" rx="108" fill="none" stroke="url(#gold)" stroke-opacity="0.45" stroke-width="3"/>
   ${mark("url(#gold)")}`
);
const vCircle = svg(
  `<circle cx="256" cy="256" r="252" fill="url(#surface)"/>
   <circle cx="256" cy="256" r="246" fill="none" stroke="url(#gold)" stroke-opacity="0.5" stroke-width="3"/>
   ${mark("url(#gold)", 0.92)}`
);
const vMaskable = svg(
  `<rect width="512" height="512" fill="url(#surface)"/>${mark("url(#gold)", 0.66)}`
);
const vMarkGold  = svg(mark("url(#gold)"));
const vMarkCream = svg(mark(CREAM));
const vMarkGreen = svg(mark(GREEN_DEEP));

// Horizontal lockup: tile mark + UGCAST wordmark (serif, letter-spaced)
const lockup = (w = 1280, h = 360) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${DEFS}
  <g transform="translate(40 ${(h-200)/2}) scale(0.390625)">
    <rect width="512" height="512" rx="114" fill="url(#surface)"/>
    <rect x="6" y="6" width="500" height="500" rx="108" fill="none" stroke="url(#gold)" stroke-opacity="0.45" stroke-width="3"/>
    ${mark("url(#gold)")}
  </g>
  <text x="270" y="${h/2}" dominant-baseline="central" font-family="Georgia, 'Times New Roman', 'Playfair Display', serif"
        font-size="150" letter-spacing="14" fill="${CREAM}">UGCAST</text>
</svg>`;

// Social card (1200x630)
const ogCard = () => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">${DEFS}
  <rect width="1200" height="630" fill="${GREEN_DEEP}"/>
  <rect width="1200" height="630" fill="url(#surface)" opacity="0.9"/>
  <rect x="1" y="1" width="1198" height="628" fill="none" stroke="url(#gold)" stroke-opacity="0.30" stroke-width="2"/>
  <g transform="translate(470 96) scale(0.45)">
    <rect width="512" height="512" rx="114" fill="${GREEN_BG}"/>
    <rect x="6" y="6" width="500" height="500" rx="108" fill="none" stroke="url(#gold)" stroke-opacity="0.5" stroke-width="3"/>
    ${mark("url(#gold)")}
  </g>
  <text x="600" y="410" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif"
        font-size="104" letter-spacing="12" fill="${CREAM}">UGCAST</text>
  <text x="600" y="486" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif"
        font-size="33" letter-spacing="7" fill="${SAGE}">AI UGC ACTORS THAT SELL</text>
  <line x1="520" y1="528" x2="680" y2="528" stroke="url(#gold)" stroke-width="2" stroke-opacity="0.7"/>
</svg>`;

// ---- ICO writer (embeds PNGs; sizes 16/32/48) ------------------------------
async function writeIco(path, sizes) {
  const pngs = await Promise.all(
    sizes.map((s) => sharp(Buffer.from(vTile)).resize(s, s).png().toBuffer())
  );
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
  let offset = 6 + sizes.length * 16;
  const entries = sizes.map((s, i) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(s >= 256 ? 0 : s, 0);
    e.writeUInt8(s >= 256 ? 0 : s, 1);
    e.writeUInt8(0, 2); e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
    e.writeUInt32LE(pngs[i].length, 8);
    e.writeUInt32LE(offset, 12);
    offset += pngs[i].length;
    return e;
  });
  await writeFile(path, Buffer.concat([header, ...entries, ...pngs]));
}

// ---- Emit ------------------------------------------------------------------
const png = (svgStr, size) => sharp(Buffer.from(svgStr)).resize(size, size).png();

await mkdir(P("public", "brand"), { recursive: true });

const tasks = [
  // Vector sources (brand kit)
  writeFile(P("public/brand/mark-gold.svg"), vMarkGold),
  writeFile(P("public/brand/mark-cream.svg"), vMarkCream),
  writeFile(P("public/brand/mark-green.svg"), vMarkGreen),
  writeFile(P("public/brand/icon-tile.svg"), vTile),
  writeFile(P("public/brand/icon-circle.svg"), vCircle),
  writeFile(P("public/brand/wordmark.svg"), lockup()),
  // Convenience copies served from web root / used by the app
  writeFile(P("public/logo-mark.svg"), vMarkGold),
  writeFile(P("public/icon-tile.svg"), vTile),
  // Next.js App Router metadata files (auto-detected)
  writeFile(P("src/app/icon.svg"), vTile),
  png(vTile, 180).toFile(P("src/app/apple-icon.png")),
  // opengraph-image / twitter-image are rendered at native 1200x630 below
  // PWA / manifest raster icons
  png(vTile, 192).toFile(P("public/icon-192.png")),
  png(vTile, 512).toFile(P("public/icon-512.png")),
  png(vMaskable, 192).toFile(P("public/icon-maskable-192.png")),
  png(vMaskable, 512).toFile(P("public/icon-maskable-512.png")),
  png(vTile, 16).toFile(P("public/favicon-16.png")),
  png(vTile, 32).toFile(P("public/favicon-32.png")),
  png(vTile, 48).toFile(P("public/favicon-48.png")),
  // Brand preview sheet (transparent gold mark over a card for the kit folder)
  png(vMarkGold, 512).toFile(P("public/brand/mark-gold.png")),
  // Wordmark raster (handy for decks / readme)
  sharp(Buffer.from(lockup())).png().toFile(P("public/brand/wordmark.png")),
];

// opengraph/twitter need exact 1200x630 — render the card at native ratio
tasks.push(
  sharp(Buffer.from(ogCard())).png().toFile(P("src/app/opengraph-image.png")),
  sharp(Buffer.from(ogCard())).png().toFile(P("src/app/twitter-image.png")),
);

await Promise.all(tasks);
await writeIco(P("src/app/favicon.ico"), [16, 32, 48]);

// Web manifest
const manifest = {
  name: "UGCast",
  short_name: "UGCast",
  description: "AI UGC video ads with realistic AI actors, scripts, and voiceovers.",
  start_url: "/",
  display: "standalone",
  background_color: GREEN_DEEP,
  theme_color: GREEN_DEEP,
  icons: [
    { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    { src: "/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
    { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
};
await writeFile(P("public/manifest.webmanifest"), JSON.stringify(manifest, null, 2));

console.log("✓ Logo & icon assets generated.");
