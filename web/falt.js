// Reliefglober — höjdfältet: sampling, reliefkurva och utjämning.
// Delas av webbvyn (app.js), STL-workern och node-testet så att skärm och
// utskrift alltid räknar exakt likadant.
//
// Fältet: { W, H, data: Float32Array (meter), polS, polN }
//   cellcentrerat rutnät: lat_j = -90 + (j+0,5)·180/H,  lon_i = -180 + (i+0,5)·360/W
//   TECKNET bär land/hav: land > 0 (minst +1 m), hav < 0 (högst −1 m). Nollkonturen
//   är alltså kustlinjen, och ytan blir kontinuerlig i alla tre lägena.

export const JORDRADIE_M = 6371000;
export const H0 = 8000;               // referenshöjd för höjdkurvan (m)
const D2R = Math.PI / 180;

// Bilinjär sampling, longitud med wrap, mot polerna blandas polvärdet in.
export function sampla(f, lat, lon) {
  const { W, H, data } = f;
  let x = (lon + 180) / 360 * W - 0.5;
  x = ((x % W) + W) % W;
  const x0 = Math.floor(x), fx = x - x0, x1 = (x0 + 1) % W;
  const rad = j => data[j * W + x0] * (1 - fx) + data[j * W + x1] * fx;
  const y = (lat + 90) / 180 * H - 0.5;
  if (y <= 0) {
    const t = Math.max(0, (y + 0.5) / 0.5);
    return f.polS + (rad(0) - f.polS) * t;
  }
  if (y >= H - 1) {
    const t = Math.max(0, (H - 0.5 - y) / 0.5);
    return f.polN + (rad(H - 1) - f.polN) * t;
  }
  const y0 = Math.floor(y), fy = y - y0;
  return rad(y0) * (1 - fy) + rad(y0 + 1) * fy;
}

// Radie (mm) som funktion av höjd s (m). kLand/kHav = överhöjning (0 = platt),
// gamma < 1 lyfter låglandet/grundhaven relativt topparna.
export function radieFunktion({ R, kLand, kHav, gamma }) {
  const m = R / JORDRADIE_M;
  return s => {
    const a = s < 0 ? -s : s;
    const c = gamma === 1 ? a : H0 * Math.pow(a / H0, gamma);
    return s > 0 ? R + kLand * m * c : R - kHav * m * c;
  };
}

// Kustbevarande utjämning: land och hav jämnas var för sig (normaliserad
// faltning), så kustlinjen ligger kvar och inga höjder blöder över kusten.
// sigma i grader; tre boxpass per riktning ≈ gauss. Longitudradien växer
// med 1/cos(lat) så att utjämningen blir lika stor i km överallt.
export function jamna(f, sigmaGrader) {
  const { W, H, data } = f;
  if (!(sigmaGrader > 0)) return f;
  const cell = 180 / H;
  const sig = sigmaGrader / cell;                       // i celler
  const r = Math.max(1, Math.round((Math.sqrt(4 * sig * sig + 1) - 1) / 2));
  const N = W * H;
  const A = new Float32Array(N), MA = new Float32Array(N);
  const B = new Float32Array(N), MB = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const v = data[i];
    if (v > 0) { A[i] = v; MA[i] = 1; } else { B[i] = v; MB[i] = 1; }
  }
  const tmp = new Float32Array(Math.max(W, H));
  const radLon = new Int32Array(H);
  for (let j = 0; j < H; j++) {
    const lat = -90 + (j + 0.5) * cell;
    radLon[j] = Math.min(Math.floor(W / 2) - 1, Math.round(r / Math.max(Math.cos(lat * D2R), 1e-3)));
  }
  const boxLon = a => {
    for (let j = 0; j < H; j++) {
      const rr = radLon[j], o = j * W, n = 2 * rr + 1;
      let sum = 0;
      for (let k = -rr; k <= rr; k++) sum += a[o + ((k % W) + W) % W];
      for (let i = 0; i < W; i++) {
        tmp[i] = sum / n;
        sum += a[o + (i + rr + 1) % W] - a[o + ((i - rr) % W + W) % W];
      }
      a.set(tmp.subarray(0, W), o);
    }
  };
  const boxLat = a => {
    const n = 2 * r + 1;
    for (let i = 0; i < W; i++) {
      let sum = 0;
      for (let k = -r; k <= r; k++) sum += a[Math.min(H - 1, Math.max(0, k)) * W + i];
      for (let j = 0; j < H; j++) {
        tmp[j] = sum / n;
        sum += a[Math.min(H - 1, j + r + 1) * W + i] - a[Math.max(0, j - r) * W + i];
      }
      for (let j = 0; j < H; j++) a[j * W + i] = tmp[j];
    }
  };
  for (const a of [A, MA, B, MB]) for (let p = 0; p < 3; p++) { boxLon(a); boxLat(a); }
  const ut = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const v = data[i];
    ut[i] = v > 0 ? Math.max(1, A[i] / Math.max(MA[i], 1e-6))
                  : Math.min(-1, B[i] / Math.max(MB[i], 1e-6));
  }
  return { ...f, data: ut, polS: polMedel(ut, W, H, 0), polN: polMedel(ut, W, H, H - 1) };
}

export function polMedel(data, W, H, j) {
  let s = 0;
  for (let i = 0; i < W; i++) s += data[j * W + i];
  return s / W;
}
