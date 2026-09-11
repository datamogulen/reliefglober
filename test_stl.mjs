// Regressionstest för STL-motorn: bygger alla lägen och kontrollerar att båda
// kropparna är vattentäta (0 oparade riktade kanter) och har positiv volym.
//   node test_stl.mjs            → syntetiskt fält (snabbt, kräver ingen data)
//   node test_stl.mjs --data     → riktiga web/data/relief.bin
//   node test_stl.mjs --data --skriv 0.5   → skriver även STL-filer till utskrift/
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { byggGlob, kontroll, tillStl, ringar } from './web/stl.js';
import { polMedel, jamna, sampla, radieFunktion } from './web/falt.js';

const args = process.argv.slice(2);
let f;
if (args.includes('--data')) {
  const meta = JSON.parse(readFileSync('web/data/relief.json', 'utf8'));
  const raw = readFileSync('web/data/relief.bin');
  const i16 = new Int16Array(raw.buffer, raw.byteOffset, raw.byteLength / 2);
  const data = Float32Array.from(i16);
  f = { W: meta.W, H: meta.H, data, polS: polMedel(data, meta.W, meta.H, 0), polN: polMedel(data, meta.W, meta.H, meta.H - 1) };
} else {
  // Syntetiskt: några "kontinenter" med öar, ekvatorn korsar kusten flera gånger.
  const W = 360, H = 180, data = new Float32Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
    const la = (-90 + (j + 0.5)) * Math.PI / 180, lo = (-180 + (i + 0.5)) * Math.PI / 180;
    let v = 3000 * Math.sin(3 * lo) * Math.cos(2 * la) + 1500 * Math.sin(7 * lo + 2 * la) - 800 * Math.cos(11 * la + lo) - 500;
    if (la < -1.2) v = 2500;                       // "Antarktis"
    data[j * W + i] = v > 0 ? Math.max(v, 1) : Math.min(v, -1);
  }
  f = { W, H, data, polS: polMedel(data, W, H, 0), polN: polMedel(data, W, H, H - 1) };
}
const skriv = args.indexOf('--skriv');
const upp = skriv >= 0 ? parseFloat(args[skriv + 1]) : (args.includes('--data') ? 0.5 : 1);

const fall = [
  { namn: 'full-hel',        kLand: 40, kHav: 40, dela: false, halD: 0 },
  { namn: 'full-halvklot',   kLand: 40, kHav: 40, dela: true,  halD: 5 },
  { namn: 'platthav-halv',   kLand: 60, kHav: 0,  dela: true,  halD: 0 },
  { namn: 'plattland-halv',  kLand: 0,  kHav: 30, dela: true,  halD: 5 },
  { namn: 'gamma-halv',      kLand: 80, kHav: 80, dela: true,  halD: 5, gamma: 0.6 },
];
let fel = 0;
for (const c of fall) {
  const opt = { upplosning: upp, diameter: 120, gamma: 1, landDjup: 2, halDjup: 8, ...c };
  const t0 = Date.now();
  const g = byggGlob(f, opt);
  const ms = Date.now() - t0;
  const kh = kontroll(g.hav), kl = kontroll(g.land);
  // Snittytor (z = 0 efter placering) ska alla peka nedåt mot bädden: negativ xy-area.
  const vandaSnitt = ({ pos, tri }) => {
    let fel = 0, area = 0;
    for (let t = 0; t < tri.length; t += 3) {
      const a = 3 * tri[t], b = 3 * tri[t + 1], cc = 3 * tri[t + 2];
      if (pos[a + 2] !== 0 || pos[b + 2] !== 0 || pos[cc + 2] !== 0) continue;
      const A = (pos[b] - pos[a]) * (pos[cc + 1] - pos[a + 1]) - (pos[cc] - pos[a]) * (pos[b + 1] - pos[a + 1]);
      if (A > 1e-9) fel++;
      area -= A / 2;
    }
    return { fel, area };
  };
  const sh = vandaSnitt(g.hav), sl = vandaSnitt(g.land);
  // Väntad snittarea: stjärnpolygonen genom ekvatorns ytradier (×2 halvklot) minus hålen.
  let vantad = 0;
  if (c.dela) {
    const ne = 2 * ringar(opt.upplosning).NR;
    const rad = radieFunktion({ R: opt.diameter / 2, kLand: opt.kLand, kHav: opt.kHav, gamma: opt.gamma });
    const r = Array.from({ length: ne }, (_, i) => rad(sampla(f, 0, -180 + 360 * i / ne)));
    for (let i = 0; i < ne; i++) vantad += r[i] * r[(i + 1) % ne] * Math.sin(2 * Math.PI / ne);
    vantad -= 2 * Math.PI * (c.halD / 2) ** 2;
  }
  const areaOk = !c.dela || Math.abs(sh.area + sl.area - vantad) / vantad < 0.01;
  const ok = kh.oparade === 0 && kl.oparade === 0 && kh.volymMm3 > 0 && kl.volymMm3 > 0 && !kh.degenererade && !kl.degenererade
    && sh.fel === 0 && sl.fel === 0 && areaOk;
  if (!ok) fel++;
  console.log(`${ok ? 'OK ' : 'FEL'} ${c.namn.padEnd(16)} ${ms} ms  hav ${kh.trianglar} tri, ${kh.oparade} opar, ${(kh.volymMm3 / 1000).toFixed(1)} cm³ | land ${kl.trianglar} tri, ${kl.oparade} opar, ${(kl.volymMm3 / 1000).toFixed(1)} cm³ | kust ${g.info.kustpunkter}`);
  if (c.dela) console.log(`    snitt: ${sh.fel + sl.fel} vända trianglar, area ${((sh.area + sl.area) / 100).toFixed(2)} cm² (väntat ${(vantad / 100).toFixed(2)})`);
  if (skriv >= 0) {
    mkdirSync('utskrift', { recursive: true });
    writeFileSync(`utskrift/${c.namn}_hav.stl`, Buffer.from(tillStl(g.hav)));
    writeFileSync(`utskrift/${c.namn}_land.stl`, Buffer.from(tillStl(g.land)));
  }
}
// Utjämningen får inte flytta kusten.
const j = jamna(f, 1.5);
let flyttad = 0;
for (let i = 0; i < f.data.length; i++) if ((f.data[i] > 0) !== (j.data[i] > 0)) flyttad++;
console.log(`${flyttad ? 'FEL' : 'OK '} utjämning bevarar kusten (${flyttad} celler bytte tecken)`);
process.exit(fel || flyttad ? 1 : 0);
