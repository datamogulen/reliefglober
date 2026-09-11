// Reliefglober — geometrimotor för utskriften: TVÅ slutna kroppar.
//
//   HAV-kroppen  = stjärnformad solid med radien ρ = havsytan (havsbotten) över hav
//                  och ρ = rIn (landskalets undersida) under land. Den bär globens kärna.
//   LAND-kroppen = skal över land mellan rIn och landytan.
//
// Ytan tas från ett ringnät (ringar med jämna breddgradssteg, antal punkter ∝ cos(lat),
// ringar sys ihop med blixtlås-triangulering → inga polsplitter, inga T-korsningar).
// Varje triangel klipps mot nollkonturen (kusten) med linjär interpolation; kustpunkter
// cachas per kant så grannar delar dem exakt. Längs kusten går lodräta väggar rIn → R
// som delas (med motsatt orientering) av båda kropparna.
//
// Valfritt: dela vid ekvatorn i två halvklot (plan snittyta nedåt, trycks utan stöd)
// med ett centrerat styrhål för en tapp. Kontrollera alltid med kontroll(): 0 oparade
// riktade kanter = vattentät och konsekvent orienterad.

import { sampla, radieFunktion } from './falt.js';

const D2R = Math.PI / 180, TVAPI = 2 * Math.PI;

class Buf {
  constructor(T, n = 1 << 16) { this.T = T; this.a = new T(n); this.n = 0; }
  push3(x, y, z) {
    if (this.n + 3 > this.a.length) { const b = new this.T(this.a.length * 2); b.set(this.a); this.a = b; }
    this.a[this.n++] = x; this.a[this.n++] = y; this.a[this.n++] = z;
  }
  get data() { return this.a.subarray(0, this.n); }
}

class Kropp {
  constructor(nGrid) {
    this.pos = new Buf(Float64Array); this.tri = new Buf(Uint32Array); this.nv = 0;
    this.gTop = new Int32Array(nGrid).fill(-1); this.gIn = new Int32Array(nGrid).fill(-1);
    this.xTop = new Map(); this.xIn = new Map();
  }
  ny(x, y, z) { this.pos.push3(x, y, z); return this.nv++; }
  t(a, b, c) { this.tri.push3(a, b, c); }
}

// Antal punkter per ring för given upplösning (grader).
export function ringar(upplosning) {
  const NR = 2 * Math.round(90 / upplosning);
  const n = new Int32Array(NR + 1), off = new Int32Array(NR + 2);
  for (let j = 0; j <= NR; j++) {
    const lat = -90 + j * 180 / NR;
    n[j] = (j === 0 || j === NR) ? 1 : Math.max(8, Math.round(2 * NR * Math.cos(lat * D2R)));
    off[j + 1] = off[j] + n[j];
  }
  return { NR, n, off, NV: off[NR + 1] };
}

// Grov förhandsuppskattning av triangelantal (för att visa filstorlek innan bygget).
export function uppskatta(upplosning, landAndel = 0.3) {
  const { NV } = ringar(upplosning);
  const yta = 2 * NV;
  return { hav: yta, land: Math.round(2 * landAndel * yta) };
}

// f = höjdfält (se falt.js). opt = { upplosning, diameter, kLand, kHav, gamma,
//   landDjup, dela, halD, halDjup }. Returnerar { hav:{pos,tri}, land:{pos,tri}, info }.
export function byggGlob(f, opt) {
  const R = opt.diameter / 2;
  const rad = radieFunktion({ R, kLand: opt.kLand, kHav: opt.kHav, gamma: opt.gamma });
  const rIn = R - opt.landDjup;
  const { NR, n, off, NV } = ringar(opt.upplosning);

  const dir = new Float64Array(3 * NV), s = new Float64Array(NV), rTop = new Float64Array(NV);
  const land = new Uint8Array(NV);
  let rMax = 0, rMinHav = Infinity;
  for (let j = 0; j <= NR; j++) {
    const lat = -90 + j * 180 / NR, cl = Math.cos(lat * D2R), sl = Math.sin(lat * D2R);
    for (let i = 0; i < n[j]; i++) {
      const g = off[j] + i, lon = -180 + 360 * i / n[j];
      dir[3 * g] = cl * Math.cos(lon * D2R); dir[3 * g + 1] = cl * Math.sin(lon * D2R); dir[3 * g + 2] = sl;
      if (j === 0 || j === NR) { dir[3 * g] = 0; dir[3 * g + 1] = 0; dir[3 * g + 2] = j === 0 ? -1 : 1; }
      let v = j === 0 ? f.polS : j === NR ? f.polN : sampla(f, lat, lon);
      if (v === 0) v = -1e-3;
      s[g] = v; land[g] = v > 0 ? 1 : 0; rTop[g] = rad(v);
      if (rTop[g] > rMax) rMax = rTop[g];
      if (!land[g] && rTop[g] < rMinHav) rMinHav = rTop[g];
    }
  }

  // Kustpunkter, en per kant med teckenbyte.
  const korsId = new Map(), xd = new Buf(Float64Array);
  let nKors = 0;
  const kors = (a, b) => {
    const lo = a < b ? a : b, hi = a < b ? b : a, key = lo * NV + hi;
    let c = korsId.get(key);
    if (c === undefined) {
      const t = s[lo] / (s[lo] - s[hi]);
      let x = dir[3 * lo] + t * (dir[3 * hi] - dir[3 * lo]);
      let y = dir[3 * lo + 1] + t * (dir[3 * hi + 1] - dir[3 * lo + 1]);
      let z = dir[3 * lo + 2] + t * (dir[3 * hi + 2] - dir[3 * lo + 2]);
      const l = Math.hypot(x, y, z); x /= l; y /= l; z /= l;
      xd.push3(x, y, z); c = nKors++; korsId.set(key, c);
    }
    return NV + c;
  };
  const vTop = (K, P) => {
    if (P < NV) {
      let id = K.gTop[P];
      if (id < 0) { const r = rTop[P]; id = K.gTop[P] = K.ny(dir[3 * P] * r, dir[3 * P + 1] * r, dir[3 * P + 2] * r); }
      return id;
    }
    const c = P - NV; let id = K.xTop.get(c);
    if (id === undefined) { const d = xd.a; id = K.ny(d[3 * c] * R, d[3 * c + 1] * R, d[3 * c + 2] * R); K.xTop.set(c, id); }
    return id;
  };
  const vIn = (K, P) => {
    if (P < NV) {
      let id = K.gIn[P];
      if (id < 0) id = K.gIn[P] = K.ny(dir[3 * P] * rIn, dir[3 * P + 1] * rIn, dir[3 * P + 2] * rIn);
      return id;
    }
    const c = P - NV; let id = K.xIn.get(c);
    if (id === undefined) { const d = xd.a; id = K.ny(d[3 * c] * rIn, d[3 * c + 1] * rIn, d[3 * c + 2] * rIn); K.xIn.set(c, id); }
    return id;
  };

  const nH = opt.dela ? 2 : 1;                       // halvklot 0 = norra, 1 = södra
  const O = [], L = [];
  for (let h = 0; h < nH; h++) { O.push(new Kropp(NV)); L.push(new Kropp(NV)); }
  let nVagg = 0;

  const landTri = (h, A, B, C) => {
    const l = L[h], o = O[h];
    l.t(vTop(l, A), vTop(l, B), vTop(l, C));
    l.t(vIn(l, A), vIn(l, C), vIn(l, B));
    o.t(vIn(o, A), vIn(o, B), vIn(o, C));
  };
  const havTri = (h, A, B, C) => { const o = O[h]; o.t(vTop(o, A), vTop(o, B), vTop(o, C)); };
  // u→v = kustkanten så som den löper i landytans moturs-ordning
  const vagg = (h, u, v) => {
    const l = L[h], o = O[h];
    const ut = vTop(l, u), vt = vTop(l, v), ui = vIn(l, u), vi = vIn(l, v);
    l.t(vt, ut, ui); l.t(vt, ui, vi);
    const ut2 = vTop(o, u), vt2 = vTop(o, v), ui2 = vIn(o, u), vi2 = vIn(o, v);
    o.t(ut2, vt2, vi2); o.t(ut2, vi2, ui2);
    nVagg++;
  };
  const yta = (h, a, b, c) => {
    const k = land[a] + land[b] + land[c];
    if (k === 0) return havTri(h, a, b, c);
    if (k === 3) return landTri(h, a, b, c);
    let p, q, r;
    if (land[a] !== land[b] && land[a] !== land[c]) { p = a; q = b; r = c; }
    else if (land[b] !== land[a] && land[b] !== land[c]) { p = b; q = c; r = a; }
    else { p = c; q = a; r = b; }
    const xpq = kors(p, q), xrp = kors(r, p);
    if (land[p]) {
      landTri(h, p, xpq, xrp);
      havTri(h, xpq, q, r); havTri(h, xpq, r, xrp);
      vagg(h, xpq, xrp);
    } else {
      havTri(h, p, xpq, xrp);
      landTri(h, xpq, q, r); landTri(h, xpq, r, xrp);
      vagg(h, xrp, xpq);
    }
  };

  // Blixtlås mellan ring j (söder) och j+1 (norr); alla ringar börjar på lon −180.
  const je = NR / 2;
  for (let j = 0; j < NR; j++) {
    const h = opt.dela ? (j + 1 <= je ? 1 : 0) : 0;
    const na = n[j], nb = n[j + 1], A = off[j], B = off[j + 1];
    let i = 0, k = 0;
    while (i < na || k < nb) {
      const angA = (i + 1) / na, angB = (k + 1) / nb;
      if (k >= nb || (i < na && angA <= angB)) {
        if (na > 1) yta(h, A + i % na, A + (i + 1) % na, B + k % nb);
        i++;
      } else {
        if (nb > 1) yta(h, A + i % na, B + (k + 1) % nb, B + k % nb);
        k++;
      }
    }
  }

  // Snittytor vid ekvatorn (+ styrhål).
  if (opt.dela) {
    const ne = n[je], E = off[je];
    for (let h = 0; h < 2; h++) {
      const o = O[h], l = L[h];
      const sign = h === 1 ? 1 : -1;                // södra: normal +z, norra: −z
      const T = (K, a, b, c) => (sign > 0 ? K.t(a, b, c) : K.t(a, c, b));

      // Havskroppens snittpolygon österut, med kustparen utbrutna.
      const ids = [], ang = [];
      for (let i = 0; i < ne; i++) {
        const g = E + i, g2 = E + (i + 1) % ne;
        ids.push(land[g] ? vIn(o, g) : vTop(o, g)); ang.push(TVAPI * i / ne);
        if (land[g] !== land[g2]) {
          const X = kors(g, g2), c = X - NV;
          let a = Math.atan2(xd.a[3 * c + 1], xd.a[3 * c]) + Math.PI;
          if (i === ne - 1 && a < Math.PI) a += TVAPI;
          const xt = vTop(o, X), xi = vIn(o, X);
          if (!land[g]) T(o, ids[ids.length - 1], xt, xi);
          else T(o, xi, xt, vTop(o, g2));
          ids.push(xi); ang.push(a);
        }
      }
      const K = ids.length;
      if (opt.halD > 0) {
        const hr = opt.halD / 2, zc = -sign * opt.halDjup;
        const M = Math.max(24, Math.round(TVAPI * hr / 0.3));
        const h0 = [], hb = [];
        for (let m = 0; m < M; m++) {
          const a = TVAPI * (m + 0.5) / M, x = -hr * Math.cos(a), y = -hr * Math.sin(a);
          h0.push(o.ny(x, y, 0)); hb.push(o.ny(x, y, zc));
        }
        let m = 0, k = 0;
        while (m < M || k < K) {
          const nIn = TVAPI * (m + 1.5) / M;
          const nUt = k + 1 < K ? ang[k + 1] : TVAPI + ang[0];
          if (k < K && (m >= M || nUt <= nIn)) { T(o, h0[m % M], ids[k], ids[(k + 1) % K]); k++; }
          else { T(o, h0[m % M], ids[k % K], h0[(m + 1) % M]); m++; }
        }
        const bc = o.ny(0, 0, zc);
        for (let q = 0; q < M; q++) {
          const q2 = (q + 1) % M;
          T(o, h0[q], h0[q2], hb[q2]); T(o, h0[q], hb[q2], hb[q]); T(o, bc, hb[q], hb[q2]);
        }
      } else {
        const c = o.ny(0, 0, 0);
        for (let k = 0; k < K; k++) T(o, c, ids[k], ids[(k + 1) % K]);
      }

      // Landkroppens snittband: yttre kedja (topp) mot inre (rIn).
      const quad = (pi, po, co, ci) => { T(l, pi, po, co); T(l, pi, co, ci); };
      let start = -1;
      for (let i = 0; i < ne; i++) if (!land[E + i]) { start = i; break; }
      if (start < 0) {
        for (let i = 0; i < ne; i++) {
          const g = E + i, g2 = E + (i + 1) % ne;
          quad(vIn(l, g), vTop(l, g), vTop(l, g2), vIn(l, g2));
        }
      } else {
        let pO = -1, pI = -1;
        for (let st = 0; st < ne; st++) {
          const g = E + (start + st) % ne, g2 = E + (start + st + 1) % ne;
          if (land[g] !== land[g2]) {
            const X = kors(g, g2);
            if (!land[g]) { pO = vTop(l, X); pI = vIn(l, X); }
            else quad(pI, pO, vTop(l, X), vIn(l, X));
          }
          if (land[g2]) {
            const cO = vTop(l, g2), cI = vIn(l, g2);
            quad(pI, pO, cO, cI); pO = cO; pI = cI;
          }
        }
      }
    }
  }

  // Placera: hel glob i origo; halvklot sida vid sida med snittytan på z = 0.
  const dx = rMax + 4;
  const samla = kroppar => {
    let nv = 0, nt = 0;
    for (const K of kroppar) { nv += K.nv; nt += K.tri.n / 3; }
    const pos = new Float64Array(3 * nv), tri = new Uint32Array(3 * nt);
    let vo = 0, to = 0;
    kroppar.forEach((K, h) => {
      const p = K.pos.data;
      for (let i = 0; i < p.length; i += 3) {
        let x = p[i], y = p[i + 1], z = p[i + 2];
        if (opt.dela) {
          if (h === 1) { y = -y; z = -z; x += dx; } else x -= dx;
        }
        pos[vo * 3 + i] = x; pos[vo * 3 + i + 1] = y; pos[vo * 3 + i + 2] = z;
      }
      const t = K.tri.data;
      for (let i = 0; i < t.length; i++) tri[to + i] = t[i] + vo;
      vo += K.nv; to += t.length;
    });
    return { pos, tri };
  };

  return {
    hav: samla(O), land: samla(L),
    info: { NV, kustpunkter: nKors, vaggar: nVagg, rMax, rMinHav, rIn, R },
  };
}

// Vattentäthet: varje riktad kant a→b ska mötas av exakt en b→a. Plus volym.
export function kontroll({ pos, tri }) {
  const nv = pos.length / 3, nt = tri.length / 3;
  const fw = new Float64Array(3 * nt), bw = new Float64Array(3 * nt);
  let degenererade = 0, vol = 0;
  for (let t = 0; t < nt; t++) {
    const a = tri[3 * t], b = tri[3 * t + 1], c = tri[3 * t + 2];
    if (a === b || b === c || c === a) degenererade++;
    fw[3 * t] = a * nv + b; fw[3 * t + 1] = b * nv + c; fw[3 * t + 2] = c * nv + a;
    bw[3 * t] = b * nv + a; bw[3 * t + 1] = c * nv + b; bw[3 * t + 2] = a * nv + c;
    const ax = pos[3 * a], ay = pos[3 * a + 1], az = pos[3 * a + 2];
    const bx = pos[3 * b], by = pos[3 * b + 1], bz = pos[3 * b + 2];
    const cx = pos[3 * c], cy = pos[3 * c + 1], cz = pos[3 * c + 2];
    vol += ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx);
  }
  fw.sort(); bw.sort();
  let i = 0, j = 0, oparade = 0;
  while (i < fw.length && j < bw.length) {
    if (fw[i] === bw[j]) { i++; j++; }
    else if (fw[i] < bw[j]) { oparade++; i++; }
    else j++;
  }
  oparade += fw.length - i;
  return { trianglar: nt, hornpunkter: nv, oparade, degenererade, volymMm3: vol / 6 };
}

// Binär STL (mm).
export function tillStl({ pos, tri }, rubrik = 'Reliefglob') {
  const nt = tri.length / 3;
  const buf = new ArrayBuffer(84 + 50 * nt), dv = new DataView(buf);
  const txt = new TextEncoder().encode(rubrik.slice(0, 79));
  new Uint8Array(buf, 0, 80).set(txt);
  dv.setUint32(80, nt, true);
  let o = 84;
  for (let t = 0; t < nt; t++) {
    const a = 3 * tri[3 * t], b = 3 * tri[3 * t + 1], c = 3 * tri[3 * t + 2];
    const ux = pos[b] - pos[a], uy = pos[b + 1] - pos[a + 1], uz = pos[b + 2] - pos[a + 2];
    const vx = pos[c] - pos[a], vy = pos[c + 1] - pos[a + 1], vz = pos[c + 2] - pos[a + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    dv.setFloat32(o, nx, true); dv.setFloat32(o + 4, ny, true); dv.setFloat32(o + 8, nz, true); o += 12;
    for (const p of [a, b, c]) {
      dv.setFloat32(o, pos[p], true); dv.setFloat32(o + 4, pos[p + 1], true); dv.setFloat32(o + 8, pos[p + 2], true); o += 12;
    }
    dv.setUint16(o, 0, true); o += 2;
  }
  return buf;
}
