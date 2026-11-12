// WCAG 2.2-contrast van het app-palet (zelfde rekenwijze als de website). Run: node tools/contrast.mjs
const clamp01 = (v) => Math.min(1, Math.max(0, v));
function oklchToLinear(L, C, H) {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map(clamp01);
}
const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const ratio = (a, b) => {
  const [x, y] = [lum(oklchToLinear(...a)), lum(oklchToLinear(...b))];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
// Gelijk houden met 02-Preview/app/tokens.css. Website-tokens ongewijzigd; vino en oro zijn nieuw.
export const T = {
  espresso: [0.2, 0.018, 50],
  espresso2: [0.255, 0.024, 48],
  crema: [0.968, 0.014, 85],
  arena: [0.925, 0.028, 78],
  tinta: [0.23, 0.022, 50],
  tinta2: [0.44, 0.03, 50],
  terracota: [0.5, 0.13, 40],
  cobre: [0.76, 0.1, 62],
  crema2: [0.84, 0.02, 80],
  rojo: [0.47, 0.17, 27],
  vino: [0.32, 0.1, 14],
  vino2: [0.38, 0.12, 16],
  oro: [0.82, 0.09, 78],
  lineLight: [0.62, 0.03, 60],
  lineDark: [0.52, 0.03, 55],
  ok: [0.47, 0.1, 150],
  err: [0.5, 0.17, 27],
  errDark: [0.76, 0.12, 35],
};
const pairs = [
  ['tinta', 'crema', 4.5], ['tinta2', 'crema', 4.5], ['tinta2', 'arena', 4.5],
  ['terracota', 'crema', 4.5], ['crema', 'espresso', 4.5], ['crema2', 'espresso', 4.5],
  ['cobre', 'espresso', 4.5], ['cobre', 'espresso2', 4.5], ['crema', 'rojo', 4.5],
  ['crema', 'vino', 4.5], ['crema2', 'vino', 4.5], ['oro', 'vino', 4.5], ['oro', 'vino2', 4.5],
  ['crema', 'vino2', 4.5], ['vino', 'crema', 4.5], ['vino', 'arena', 4.5], ['ok', 'crema', 4.5],
  ['err', 'crema', 4.5], ['errDark', 'espresso', 4.5], ['lineLight', 'crema', 3],
  ['lineDark', 'espresso', 3], ['oro', 'espresso', 4.5],
];
let fail = 0;
for (const [fg, bg, min] of pairs) {
  const r = ratio(T[fg], T[bg]);
  if (r < min) fail++;
  console.log(`${r >= min ? 'ok  ' : 'FAIL'} ${fg} op ${bg}: ${r.toFixed(2)} (min ${min})`);
}
process.exitCode = fail ? 1 : 0;
