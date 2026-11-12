// Zet beelden uit de website om naar WebP voor de preview en schrijft de kaart als JSON.
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const site = resolve(process.argv[2]);
const out = resolve(process.argv[3]);
const require = createRequire(`${site}/package.json`);
const sharp = require('sharp');

const images = {
  hero: 'stock-hero-video-poster.jpg',
  tapas: 'stock-tapas-tabla.jpg',
  cazuelas: 'stock-tapas-cazuelas.jpg',
  'tapas-warm': 'tapas-bord-warm.jpg',
  grill: 'grill-vlees.jpg',
  vis: 'verse-vis.jpg',
  paella: 'paella-pan.jpg',
  churros: 'stock-churros.jpg',
  wijn: 'sfeer-wijn-kaarsen.jpg',
  sangria: 'stock-sangria.jpg',
  lunch: 'lunch-serveren.jpg',
  puerta: 'stock-puerta-caleta.jpg',
  interieur: 'interieur-1.jpg',
  exterieur: 'exterieur.jpg',
  kaarsen: 'sfeer-kaarsen.jpg',
};
mkdirSync(`${out}/assets/img`, { recursive: true });
for (const [name, file] of Object.entries(images)) {
  for (const w of [640, 1280]) {
    await sharp(`${site}/src/assets/images/${file}`)
      .rotate()
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: 72 })
      .toFile(`${out}/assets/img/${name}-${w}.webp`);
  }
}

const data = await import(pathToFileURL(`${site}/src/data/site.ts`).href);
const keep = [
  'site', 'facts', 'teBevestigen', 'openingHours', 'reservation', 'tagLabels', 'twaalfUurtje',
  'lunch', 'salads', 'starters', 'tapasPriced', 'tapasCold', 'tapasWarm', 'tapasDay', 'ninosTapas',
  'sangria', 'grill', 'mainsNote', 'fish', 'paella', 'paellaNote', 'ninos', 'desserts', 'coffees',
  'coffeeNote', 'wines', 'services', 'seniorMenu',
];
const json = Object.fromEntries(keep.map((k) => [k, data[k]]));
writeFileSync(
  `${out}/app/site-data.js`,
  `// Gegenereerd door tools/prep-assets.mjs uit 01-Websites-Klanten/Restaurant-La-Caleta/src/data/site.ts. Niet met de hand wijzigen.\nexport const SITE = ${JSON.stringify(json, null, 1)};\n`,
);
console.log('ok', Object.keys(json).length, 'blokken');
