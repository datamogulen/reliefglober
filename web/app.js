// Reliefglober — vy, reglage och STL-export.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { sampla, radieFunktion, jamna, polMedel, JORDRADIE_M, H0 } from './falt.js';
import { uppskatta } from './stl.js';

const DATAV = 1;
const $ = id => document.getElementById(id);

// ---------------------------------------------------------------- språk
const I18N = {
  sv: {
    dokTitel: 'Reliefglober — jorden med berg och havsdjup i 3D',
    titel: 'Reliefglober',
    lead: 'Jorden med landet som reser sig och havsbottnen som sjunker ner. Välj relief, snurra på globen och skriv ut den i två färger.',
    laddar: 'Laddar höjddata …',
    visning: 'Relief', full: 'Full relief', platthav: 'Platt hav', plattland: 'Platt land',
    kLand: 'Överhöjning land', kHav: 'Överhöjning hav', lank: 'Samma överhöjning för land och hav',
    gamma: 'Höjdkurva', gammaTips: '1 = linjär. Lägre värden lyfter lågland och grunda hav jämfört med topparna.',
    jamn: 'Utjämning', jamnTips: 'Jämnar ut land och hav var för sig – kustlinjen ligger kvar.', av: 'av',
    farger: 'Utseende', fLand: 'Land', fHav: 'Hav', hojdfarg: 'Höjdfärger (bara på skärmen)', kust: 'Kustlinje',
    utskrift: 'Utskrift – två STL-filer',
    diameter: 'Diameter vid havsytan (mm)', upp: 'Upplösning', landDjup: 'Landskalets djup (mm)',
    halD: 'Styrhål Ø (mm, 0 = inget)', halDjup: 'Styrhålets djup (mm)',
    dela: 'Dela i norra och södra halvklotet (trycks utan stöd)',
    bygg: '⬇ Skapa STL-filer', bygger: 'Bygger geometri …', kontrollerar: 'Kontrollerar och skriver filer …',
    klar: 'Klart', vattentat: 'vattentät', ejVattentat: 'INTE vattentät', tri: 'trianglar',
    visaUtskrift: 'Visa utskriftsmodellen', inaktuell: 'Inställningarna har ändrats – skapa filerna igen.',
    hav: 'hav', land: 'land',
    hogst: 'Högsta berget', djupast: 'Djupaste havet', diam: 'Största diameter', lager: 'Ett 0,2 mm-lager ≈',
    uppsk: 'Filstorlek ≈', sek: 's',
    varnHal: 'Styrhålet går nästan ut i havsbottnen – minska djupet eller överhöjningen.',
    varnStor: 'Stora filer – 0,25° passar bäst för globar över ca 15 cm.',
    nedlHav: '⬇ hav.stl', nedlLand: '⬇ land.stl',
    omText: `<p><b>Data.</b> Höjder och havsdjup kommer från <a href="https://www.ncei.noaa.gov/products/etopo-global-relief-model" target="_blank" rel="noopener">NOAA ETOPO 2022</a> (1 bågminut, isytan på Antarktis och Grönland), medlade till 0,25° (≈ 28 km vid ekvatorn). Kustlinjen kommer från <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a> 10 m, där Antarktis ishyllor räknas som land. Land som ligger under havsytan (t.ex. Kaspiska sänkan) visas i havsnivå, medan Kaspiska havet räknas som hav.</p>
<p><b>Överhöjning.</b> I verklig skala (×1) är Mount Everest bara 0,14 % av jordradien. På en glob med 12 cm diameter blir berget 0,08 mm högt – tunnare än ett papper. Därför behövs överhöjning.</p>
<p><b>Utskrift.</b> Filerna innehåller två kroppar som passar exakt i varandra: <i>hav</i> (globens kärna med havsbottnen) och <i>land</i> (ett skal ovanpå). Öppna båda samtidigt i Bambu Studio, PrusaSlicer eller OrcaSlicer och välj att ladda dem som <i>ett objekt med flera delar</i>. Ge sedan delarna varsin filamentfärg. Halvkloten ligger med snittytan nedåt och trycks utan stöd. Limma ihop dem med en tapp i styrhålet, till exempel en bit rundstav.</p>
<p>0,5° räcker för globar på 8–15 cm. 0,25° ger finare detaljer men betydligt större filer.</p>`,
  },
  en: {
    dokTitel: 'Relief globes — the Earth’s mountains and ocean depths in 3D',
    titel: 'Relief globes',
    lead: 'The Earth with the land rising up and the seafloor sinking down. Choose the relief, spin the globe and print it in two colours.',
    laddar: 'Loading elevation data …',
    visning: 'Relief', full: 'Full relief', platthav: 'Flat ocean', plattland: 'Flat land',
    kLand: 'Land exaggeration', kHav: 'Ocean exaggeration', lank: 'Same exaggeration for land and ocean',
    gamma: 'Height curve', gammaTips: '1 = linear. Lower values lift lowlands and shallow seas relative to the peaks.',
    jamn: 'Smoothing', jamnTips: 'Smooths land and ocean separately, so the coastline stays put.', av: 'off',
    farger: 'Appearance', fLand: 'Land', fHav: 'Ocean', hojdfarg: 'Elevation colours (screen only)', kust: 'Coastline',
    utskrift: 'Print – two STL files',
    diameter: 'Diameter at sea level (mm)', upp: 'Resolution', landDjup: 'Land shell depth (mm)',
    halD: 'Alignment hole Ø (mm, 0 = none)', halDjup: 'Alignment hole depth (mm)',
    dela: 'Split into northern and southern hemispheres (prints without supports)',
    bygg: '⬇ Create STL files', bygger: 'Building geometry …', kontrollerar: 'Checking and writing files …',
    klar: 'Done', vattentat: 'watertight', ejVattentat: 'NOT watertight', tri: 'triangles',
    visaUtskrift: 'Show the print model', inaktuell: 'Settings have changed – create the files again.',
    hav: 'ocean', land: 'land',
    hogst: 'Highest mountain', djupast: 'Deepest ocean', diam: 'Largest diameter', lager: 'One 0.2 mm layer ≈',
    uppsk: 'File size ≈', sek: 's',
    varnHal: 'The alignment hole almost reaches the seafloor – reduce its depth or the exaggeration.',
    varnStor: 'Large files – 0.25° suits globes larger than about 15 cm.',
    nedlHav: '⬇ ocean.stl', nedlLand: '⬇ land.stl',
    omText: `<p><b>Data.</b> Elevations and ocean depths come from <a href="https://www.ncei.noaa.gov/products/etopo-global-relief-model" target="_blank" rel="noopener">NOAA ETOPO 2022</a> (1 arc-minute, ice surface on Antarctica and Greenland), averaged to 0.25° (≈ 28 km at the equator). The coastline comes from <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a> 10 m, with Antarctic ice shelves counted as land. Land below sea level (e.g. the Caspian Depression) is shown at sea level, while the Caspian Sea counts as ocean.</p>
<p><b>Exaggeration.</b> At true scale (×1), Mount Everest is only 0.14% of the Earth’s radius. On a 12 cm globe it would be 0.08 mm tall – thinner than a sheet of paper. That is why exaggeration is needed.</p>
<p><b>Printing.</b> The files hold two bodies that fit exactly together: <i>ocean</i> (the core of the globe with the seafloor) and <i>land</i> (a shell on top). Open both at once in Bambu Studio, PrusaSlicer or OrcaSlicer and load them as <i>one object with multiple parts</i>. Then give each part its own filament colour. The hemispheres lie cut face down and print without supports. Glue them together with a pin in the alignment hole, for example a piece of dowel.</p>
<p>0.5° is enough for globes of 8–15 cm. 0.25° gives finer detail but much larger files.</p>`,
  },
  ja: {
    dokTitel: 'レリーフ地球儀 — 山と海の深さを3Dで',
    titel: 'レリーフ地球儀',
    lead: '陸は盛り上がり、海底は沈み込む地球。起伏を選んで地球儀を回し、2色で3Dプリントできます。',
    laddar: '標高データを読み込み中…',
    visning: '起伏', full: '陸と海の起伏', platthav: '海を平らに', plattland: '陸を平らに',
    kLand: '陸の強調倍率', kHav: '海の強調倍率', lank: '陸と海で同じ倍率にする',
    gamma: '高さカーブ', gammaTips: '1 = 線形。値を下げると、山頂に比べて低地や浅い海が持ち上がります。',
    jamn: '平滑化', jamnTips: '陸と海を別々に平滑化するので、海岸線は動きません。', av: 'なし',
    farger: '表示', fLand: '陸', fHav: '海', hojdfarg: '標高による色分け（画面のみ）', kust: '海岸線',
    utskrift: '印刷 – STLファイル2つ',
    diameter: '海面での直径 (mm)', upp: '解像度', landDjup: '陸の殻の深さ (mm)',
    halD: 'ガイド穴の直径 (mm、0 = なし)', halDjup: 'ガイド穴の深さ (mm)',
    dela: '北半球と南半球に分割（サポートなしで印刷可）',
    bygg: '⬇ STLファイルを作成', bygger: '形状を生成中…', kontrollerar: 'チェックしてファイルを書き出し中…',
    klar: '完了', vattentat: '水密', ejVattentat: '水密ではありません', tri: '三角形',
    visaUtskrift: '印刷モデルを表示', inaktuell: '設定が変更されました。ファイルを作り直してください。',
    hav: '海', land: '陸',
    hogst: '最高峰', djupast: '最深部', diam: '最大直径', lager: '積層0.2 mm ≈',
    uppsk: 'ファイルサイズ ≈', sek: '秒',
    varnHal: 'ガイド穴が海底に近すぎます。深さか強調倍率を下げてください。',
    varnStor: 'ファイルが大きくなります。0.25°は直径約15 cm以上の地球儀向けです。',
    nedlHav: '⬇ 海.stl', nedlLand: '⬇ 陸.stl',
    omText: `<p><b>データ</b>　標高と水深は <a href="https://www.ncei.noaa.gov/products/etopo-global-relief-model" target="_blank" rel="noopener">NOAA ETOPO 2022</a>（1分角、南極とグリーンランドは氷床の表面）を0.25°（赤道で約28 km）に平均したものです。海岸線は <a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a> 10 m を使い、南極の棚氷は陸として扱っています。海面より低い陸地（カスピ海沿岸低地など）は海面の高さで表示し、カスピ海は海として扱います。</p>
<p><b>強調倍率</b>　実際の縮尺（×1）では、エベレストの高さは地球の半径の0.14%にすぎません。直径12 cmの地球儀なら0.08 mmで、紙より薄くなります。そのため高さを強調しています。</p>
<p><b>印刷</b>　ファイルはぴったり組み合わさる2つの部品です。<i>海</i>（海底を含む地球儀の芯）と<i>陸</i>（その上の殻）です。Bambu Studio、PrusaSlicer、OrcaSlicer で両方を同時に開き、<i>複数パーツからなる1つのオブジェクト</i>として読み込んでください。それぞれに別のフィラメント色を割り当てます。半球は切断面を下にして置かれ、サポートなしで印刷できます。ガイド穴にダボなどのピンを入れて接着してください。</p>
<p>直径8〜15 cmなら0.5°で十分です。0.25°はより精細ですが、ファイルがかなり大きくなります。</p>`,
  },
};
const SPRAKNYCKEL = 'relief_sprak';
let LANG = (() => {
  try { const s = localStorage.getItem(SPRAKNYCKEL); if (I18N[s]) return s; } catch {}
  const n = (navigator.language || '').toLowerCase();
  return n.startsWith('sv') ? 'sv' : n.startsWith('ja') ? 'ja' : 'en';
})();
const T = k => I18N[LANG][k] ?? I18N.sv[k] ?? k;
const LOCALE = { sv: 'sv-SE', en: 'en-GB', ja: 'ja-JP' };
const tal = (x, d = 0) => x.toLocaleString(LOCALE[LANG], { minimumFractionDigits: d, maximumFractionDigits: d });

function tillampaSprak() {
  document.documentElement.lang = LANG;
  document.title = T('dokTitel');
  document.querySelectorAll('[data-t]').forEach(el => { el.textContent = T(el.dataset.t); });
  document.querySelectorAll('[data-th]').forEach(el => { el.innerHTML = T(el.dataset.th); });
  document.querySelectorAll('#sprak button').forEach(b => b.classList.toggle('aktiv', b.dataset.sprak === LANG));
  $('upp').options[1].text = LANG === 'sv' ? '0,5°' : '0.5°';
  $('upp').options[2].text = LANG === 'sv' ? '0,25°' : '0.25°';
  if (redo) { visaVarden(); uppdateraMatt(); if (senaste) visaStatus(); }
}
document.querySelectorAll('#sprak button').forEach(b => b.addEventListener('click', () => {
  LANG = b.dataset.sprak;
  try { localStorage.setItem(SPRAKNYCKEL, LANG); } catch {}
  tillampaSprak();
}));

// ---------------------------------------------------------------- inställningar
const INSTNYCKEL = 'relief_inst';
const STD = {
  lage: 'full', kLand: 40, kHav: 40, lank: true, gamma: 1, jamn: 0,
  fLand: '#c9b27a', fHav: '#2f6bb3', hojdfarg: false, kust: true,
  diameter: 120, upp: 0.5, landDjup: 2, dela: true, halD: 5, halDjup: 8,
};
const S = { ...STD };
try { Object.assign(S, JSON.parse(localStorage.getItem(INSTNYCKEL) || '{}')); } catch {}
const spara = () => { try { localStorage.setItem(INSTNYCKEL, JSON.stringify(S)); } catch {} };

const KMAX = 250;
const kFranReglage = v => Math.pow(KMAX, v / 1000);
const reglageFranK = k => Math.round(Math.log(Math.max(1, k)) / Math.log(KMAX) * 1000);
const kText = k => '×' + (k < 10 ? tal(k, 1) : tal(k));
const JAMN_STEG = [0, 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4];     // grader

const kL = () => (S.lage === 'plattland' ? 0 : S.kLand);
const kH = () => (S.lage === 'platthav' ? 0 : S.kHav);

// ---------------------------------------------------------------- scen
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f17);
const camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
camera.position.set(0.9, 1.4, 3.3);
scene.add(camera);
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true; controls.enablePan = false;
controls.minDistance = 1.35; controls.maxDistance = 9;
controls.autoRotate = true; controls.autoRotateSpeed = 0.6;
controls.addEventListener('start', () => { controls.autoRotate = false; });

// Belysning för utskriftsmodellen (globen har egen shader).
scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x303848, 0.9));
const kamLjus = new THREE.DirectionalLight(0xffffff, 1.6);
kamLjus.position.set(-1.5, 2, 2.5);
camera.add(kamLjus);

let falt0, falt, meta, redo = false, senaste = null, modell = null, bygger = false;

const GLSL_GEMENSAM = `
  uniform sampler2D hojd;
  uniform float uR, kL, kH, gam, polS, polN, texW, texH;
  const float PI = 3.141592653589793;
  float sHojd(vec2 ll) {
    float v = (ll.y + PI * 0.5) / PI;
    float s = texture(hojd, vec2((ll.x + PI) / (2.0 * PI), v)).r;
    float y = v * texH - 0.5;
    if (y < 0.0) s = mix(polS, s, clamp((y + 0.5) / 0.5, 0.0, 1.0));
    else if (y > texH - 1.0) s = mix(polN, s, clamp((texH - 0.5 - y) / 0.5, 0.0, 1.0));
    return s;
  }
  float radie(float s) {
    float c = ${H0.toFixed(1)} * pow(abs(s) / ${H0.toFixed(1)}, gam);
    return s > 0.0 ? uR + kL * uR / ${JORDRADIE_M.toFixed(1)} * c : uR - kH * uR / ${JORDRADIE_M.toFixed(1)} * c;
  }
  vec3 rikt(vec2 ll) { float cl = cos(ll.y); return vec3(cl * sin(ll.x), sin(ll.y), cl * cos(ll.x)); }
  vec3 punkt(vec2 ll) { return rikt(ll) * radie(sHojd(ll)); }
`;

const uniforms = {
  hojd: { value: null }, uR: { value: 1 }, kL: { value: 40 }, kH: { value: 40 }, gam: { value: 1 },
  polS: { value: 0 }, polN: { value: 0 }, texW: { value: 1440 }, texH: { value: 720 },
  fLand: { value: new THREE.Color() }, fHav: { value: new THREE.Color() },
  hojdfarg: { value: 0 }, kust: { value: 1 }, ljus: { value: new THREE.Vector3(0, 1, 0) },
};

const globMaterial = new THREE.ShaderMaterial({
  uniforms,
  vertexShader: GLSL_GEMENSAM + `
    varying vec2 vLL;
    void main() {
      vLL = position.xy;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(punkt(vLL), 1.0);
    }`,
  fragmentShader: GLSL_GEMENSAM + `
    uniform vec3 fLand, fHav, ljus;
    uniform float hojdfarg, kust;
    varying vec2 vLL;
    vec3 rampLand(float h) {
      vec3 c0 = vec3(.29,.50,.26), c1 = vec3(.62,.72,.43), c2 = vec3(.80,.71,.50), c3 = vec3(.60,.46,.33), c4 = vec3(.96,.96,.97);
      if (h < 400.0) return mix(c0, c1, h / 400.0);
      if (h < 1400.0) return mix(c1, c2, (h - 400.0) / 1000.0);
      if (h < 2800.0) return mix(c2, c3, (h - 1400.0) / 1400.0);
      return mix(c3, c4, clamp((h - 2800.0) / 1800.0, 0.0, 1.0));
    }
    vec3 rampHav(float h) {
      float d = -h;
      vec3 c0 = vec3(.66,.86,.93), c1 = vec3(.40,.68,.86), c2 = vec3(.18,.44,.71), c3 = vec3(.09,.25,.49), c4 = vec3(.03,.10,.25);
      if (d < 200.0) return mix(c0, c1, d / 200.0);
      if (d < 2500.0) return mix(c1, c2, (d - 200.0) / 2300.0);
      if (d < 5500.0) return mix(c2, c3, (d - 2500.0) / 3000.0);
      return mix(c3, c4, clamp((d - 5500.0) / 4000.0, 0.0, 1.0));
    }
    void main() {
      float s = sHojd(vLL);
      vec2 dx = vec2(PI / texW, 0.0), dy = vec2(0.0, PI / texH);
      vec2 n1 = vec2(vLL.x, min(vLL.y + dy.y, PI * 0.5)), s1 = vec2(vLL.x, max(vLL.y - dy.y, -PI * 0.5));
      vec3 pe = punkt(vLL + dx) - punkt(vLL - dx);
      vec3 pn = punkt(n1) - punkt(s1);
      vec3 n = cross(pe, pn);
      float ln = length(n);
      vec3 N = ln > 1e-12 ? n / ln : normalize(rikt(vLL));
      vec3 bas = s > 0.0 ? fLand : fHav;
      if (hojdfarg > 0.5) bas = s > 0.0 ? rampLand(s) : rampHav(s);
      float dif = max(dot(N, ljus), 0.0);
      vec3 col = bas * (0.30 + 0.85 * dif);
      if (kust > 0.5) {
        float w = fwidth(s);
        col = mix(col, vec3(0.06, 0.07, 0.09), (1.0 - smoothstep(0.0, 1.4 * w, abs(s))) * 0.75);
      }
      gl_FragColor = vec4(pow(col, vec3(1.0 / 1.1)), 1.0);
    }`,
});

function globGeometri(nLon, nLat) {
  const pos = new Float32Array((nLon + 1) * (nLat + 1) * 3);
  let p = 0;
  for (let j = 0; j <= nLat; j++) for (let i = 0; i <= nLon; i++) {
    pos[p++] = -Math.PI + 2 * Math.PI * i / nLon;
    pos[p++] = -Math.PI / 2 + Math.PI * j / nLat;
    pos[p++] = 0;
  }
  const idx = new Uint32Array(nLon * nLat * 6);
  let q = 0;
  for (let j = 0; j < nLat; j++) for (let i = 0; i < nLon; i++) {
    const a = j * (nLon + 1) + i, b = a + 1, c = a + nLon + 1, d = c + 1;
    idx[q++] = a; idx[q++] = b; idx[q++] = d; idx[q++] = a; idx[q++] = d; idx[q++] = c;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  return g;
}
const mobil = matchMedia('(pointer:coarse)').matches;
const glob = new THREE.Mesh(globGeometri(mobil ? 720 : 1440, mobil ? 360 : 720), globMaterial);
glob.frustumCulled = false;
scene.add(glob);

// ---------------------------------------------------------------- layout
const panel = $('panel');
function storlek() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  const smal = w <= 760;
  const pw = smal || panel.classList.contains('dold') ? 0 : panel.offsetWidth;
  const ph = smal && !panel.classList.contains('dold') ? panel.offsetHeight : 0;
  camera.setViewOffset(w, h, pw / 2, ph / 2, w, h);
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', storlek);
$('panelknapp').addEventListener('click', () => {
  panel.classList.toggle('dold');
  document.body.classList.toggle('panelDold', panel.classList.contains('dold'));
  setTimeout(storlek, 50);
});

// ---------------------------------------------------------------- reglage
function visaVarden() {
  document.querySelectorAll('#lage button').forEach(b => b.classList.toggle('aktiv', b.dataset.lage === S.lage));
  $('kLand').value = reglageFranK(S.kLand); $('kHav').value = reglageFranK(S.kHav);
  $('kLandUt').textContent = S.lage === 'plattland' ? '–' : kText(S.kLand);
  $('kHavUt').textContent = S.lage === 'platthav' ? '–' : kText(S.kHav);
  $('radKLand').classList.toggle('av', S.lage === 'plattland');
  $('radKHav').classList.toggle('av', S.lage === 'platthav');
  $('kLand').disabled = S.lage === 'plattland'; $('kHav').disabled = S.lage === 'platthav';
  $('lank').checked = S.lank;
  $('gamma').value = S.gamma; $('gammaUt').textContent = tal(S.gamma, 2);
  $('jamn').value = JAMN_STEG.indexOf(S.jamn) >= 0 ? JAMN_STEG.indexOf(S.jamn) : 0;
  $('jamnUt').textContent = S.jamn ? tal(S.jamn, S.jamn % 1 ? 2 : 0) + '°' : T('av');
  $('fLand').value = S.fLand; $('fHav').value = S.fHav;
  $('hojdfarg').checked = S.hojdfarg; $('kust').checked = S.kust;
  $('diameter').value = S.diameter; $('upp').value = String(S.upp); $('landDjup').value = S.landDjup;
  $('halD').value = S.halD; $('halDjup').value = S.halDjup; $('dela').checked = S.dela;
  $('halD').disabled = $('halDjup').disabled = !S.dela;
}

function tillUniforms() {
  uniforms.kL.value = kL(); uniforms.kH.value = kH(); uniforms.gam.value = S.gamma;
  uniforms.fLand.value.set(S.fLand); uniforms.fHav.value.set(S.fHav);
  uniforms.hojdfarg.value = S.hojdfarg ? 1 : 0; uniforms.kust.value = S.kust ? 1 : 0;
  if (modell) modell.children[0].children.forEach((m, i) => m.material.color.set(i ? S.fLand : S.fHav));
}

let faltMax = 0, faltMin = 0;
function uppdateraMatt() {
  const R = S.diameter / 2;
  const rad = radieFunktion({ R, kLand: kL(), kHav: kH(), gamma: S.gamma });
  const upp = rad(faltMax) - R, ned = R - rad(faltMin);
  const mm = x => tal(x, x < 10 ? 2 : 1) + ' mm';
  // höjd (m) som ger 0,2 mm radiellt på land (eller hav i platt-land-läget)
  const k = kL() || kH();
  let lager = '';
  if (k > 0) {
    const c = 0.2 / (k * R / JORDRADIE_M);
    const m = H0 * Math.pow(c / H0, 1 / S.gamma);
    lager = `<br>${T('lager')} <b>${tal(Math.round(m / 10) * 10)} m</b>`;
  }
  const est = uppskatta(S.upp, meta ? meta.landandelYta : 0.3);
  const mb = t => tal(t * 50 / 1e6, t * 50 / 1e6 < 10 ? 1 : 0);
  $('matt').innerHTML =
    `${T('hogst')}: <b>+${mm(upp)}</b> · ${T('djupast')}: <b>−${mm(ned)}</b>` +
    `<br>${T('diam')}: <b>${mm(2 * rad(faltMax))}</b>${lager}` +
    `<br>${T('uppsk')} ${T('hav')} <b>${mb(est.hav)} MB</b>, ${T('land')} <b>${mb(est.land)} MB</b>`;
  const varn = [];
  if (S.dela && S.halD > 0 && R - ned - S.halDjup < 3) varn.push(T('varnHal'));
  if (S.upp === 0.25 && S.diameter < 150) varn.push(T('varnStor'));
  $('varning').hidden = !varn.length;
  $('varning').textContent = varn.join(' ');
}

function andrat({ geometri = true } = {}) {
  tillUniforms(); visaVarden(); uppdateraMatt(); spara();
  if (geometri && senaste && !senaste.inaktuell) { senaste.inaktuell = true; visaStatus(); }
}

document.querySelectorAll('#lage button').forEach(b => b.addEventListener('click', () => { S.lage = b.dataset.lage; andrat(); }));
$('kLand').addEventListener('input', e => { S.kLand = +kFranReglage(+e.target.value).toPrecision(3); if (S.lank) S.kHav = S.kLand; andrat(); });
$('kHav').addEventListener('input', e => { S.kHav = +kFranReglage(+e.target.value).toPrecision(3); if (S.lank) S.kLand = S.kHav; andrat(); });
$('lank').addEventListener('change', e => { S.lank = e.target.checked; if (S.lank) S.kHav = S.kLand; andrat(); });
$('gamma').addEventListener('input', e => { S.gamma = +e.target.value; andrat(); });
let jamnTimer = 0;
$('jamn').addEventListener('input', e => {
  S.jamn = JAMN_STEG[+e.target.value]; andrat();
  clearTimeout(jamnTimer); jamnTimer = setTimeout(tillampaJamning, 120);
});
$('fLand').addEventListener('input', e => { S.fLand = e.target.value; andrat({ geometri: false }); });
$('fHav').addEventListener('input', e => { S.fHav = e.target.value; andrat({ geometri: false }); });
$('hojdfarg').addEventListener('change', e => { S.hojdfarg = e.target.checked; andrat({ geometri: false }); });
$('kust').addEventListener('change', e => { S.kust = e.target.checked; andrat({ geometri: false }); });
const talFalt = (id, min, max) => $(id).addEventListener('change', e => {
  const v = parseFloat(String(e.target.value).replace(',', '.'));
  if (Number.isFinite(v)) S[id] = Math.min(max, Math.max(min, v));
  andrat();
});
talFalt('diameter', 30, 400); talFalt('landDjup', 0.6, 20); talFalt('halD', 0, 30); talFalt('halDjup', 1, 40);
$('upp').addEventListener('change', e => { S.upp = +e.target.value; andrat(); });
$('dela').addEventListener('change', e => { S.dela = e.target.checked; andrat(); });

function tillampaJamning() {
  falt = S.jamn ? jamna(falt0, S.jamn) : falt0;
  faltMax = -Infinity; faltMin = Infinity;
  for (const v of falt.data) { if (v > faltMax) faltMax = v; if (v < faltMin) faltMin = v; }
  uniforms.hojd.value.image.data = falt.data;
  uniforms.hojd.value.needsUpdate = true;
  uniforms.polS.value = falt.polS; uniforms.polN.value = falt.polN;
  uppdateraMatt();
}

// ---------------------------------------------------------------- tooltip
const tips = $('tips'), ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let drar = false;
canvas.addEventListener('pointerdown', () => { drar = true; tips.style.display = 'none'; });
window.addEventListener('pointerup', () => { drar = false; });
canvas.addEventListener('pointerleave', () => { tips.style.display = 'none'; });
canvas.addEventListener('pointermove', ev => {
  if (drar || !redo || modell?.visible || ev.pointerType === 'touch') return;
  const r = canvas.getBoundingClientRect();
  ndc.set((ev.clientX - r.left) / r.width * 2 - 1, -(ev.clientY - r.top) / r.height * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const o = ray.ray.origin, d = ray.ray.direction;
  const rad = radieFunktion({ R: 1, kLand: kL(), kHav: kH(), gamma: S.gamma });
  let rr = 1, lat = 0, lon = 0, s = 0, traff = false;
  for (let it = 0; it < 5; it++) {
    const b = o.dot(d), c = o.lengthSq() - rr * rr, disk = b * b - c;
    if (disk < 0) { traff = false; break; }
    const t = -b - Math.sqrt(disk);
    const p = o.clone().addScaledVector(d, t);
    lat = Math.asin(THREE.MathUtils.clamp(p.y / p.length(), -1, 1)) * 180 / Math.PI;
    lon = Math.atan2(p.x, p.z) * 180 / Math.PI;
    s = sampla(falt, lat, lon); rr = rad(s); traff = true;
  }
  if (!traff) { tips.style.display = 'none'; return; }
  const s0 = sampla(falt0, lat, lon);
  const ja = LANG === 'ja';
  const latT = ja ? `${lat >= 0 ? '北緯' : '南緯'} ${tal(Math.abs(lat), 1)}°` : `${tal(Math.abs(lat), 1)}° ${lat >= 0 ? 'N' : 'S'}`;
  const ost = LANG === 'sv' ? 'Ö' : 'E';
  const lonT = ja ? `${lon >= 0 ? '東経' : '西経'} ${tal(Math.abs(lon), 1)}°` : `${tal(Math.abs(lon), 1)}° ${lon >= 0 ? ost : (LANG === 'sv' ? 'V' : 'W')}`;
  const h = Math.abs(s0) <= 1 ? '≈ 0 m' : `${s0 > 0 ? '+' : '−'}${tal(Math.round(Math.abs(s0) / 10) * 10)} m`;
  tips.textContent = `${latT}, ${lonT} · ${s0 > 0 ? T('land') : T('hav')} ${h}`;
  tips.style.display = 'block';
  tips.style.left = (ev.clientX + 14) + 'px'; tips.style.top = (ev.clientY + 14) + 'px';
});

// ---------------------------------------------------------------- STL
const worker = new Worker(new URL('./stl-worker.js', import.meta.url), { type: 'module' });
let jobb = 0, t0 = 0, urlar = [];

function filnamn(del) {
  const k = S.lage === 'full' ? (S.kLand === S.kHav ? `x${Math.round(S.kLand)}` : `land-x${Math.round(S.kLand)}_hav-x${Math.round(S.kHav)}`)
    : S.lage === 'platthav' ? `platt-hav_x${Math.round(S.kLand)}` : `platt-land_x${Math.round(S.kHav)}`;
  return `reliefglob_${S.diameter}mm_${k}${S.gamma !== 1 ? '_g' + S.gamma : ''}${S.jamn ? '_j' + S.jamn : ''}_${del}.stl`;
}

$('bygg').addEventListener('click', () => {
  if (bygger || !redo) return;
  bygger = true; $('bygg').disabled = true; t0 = performance.now();
  senaste = { status: 'bygger' }; visaStatus();
  const opt = {
    upplosning: S.upp, diameter: S.diameter, kLand: kL(), kHav: kH(), gamma: S.gamma,
    landDjup: S.landDjup, dela: S.dela, halD: S.dela ? S.halD : 0, halDjup: S.halDjup,
  };
  worker.postMessage({ id: ++jobb, opt, falt: { W: falt.W, H: falt.H, polS: falt.polS, polN: falt.polN, data: falt.data } });
});

worker.onmessage = e => {
  const m = e.data;
  if (m.id !== jobb) return;
  if (m.typ === 'status') { senaste = { status: m.nyckel }; visaStatus(); return; }
  bygger = false; $('bygg').disabled = false;
  if (m.typ === 'fel') { senaste = { status: 'fel', text: m.text }; visaStatus(); console.error(m.text); return; }
  urlar.forEach(u => URL.revokeObjectURL(u));
  const hav = URL.createObjectURL(new Blob([m.stlHav], { type: 'model/stl' }));
  const land = URL.createObjectURL(new Blob([m.stlLand], { type: 'model/stl' }));
  urlar = [hav, land];
  senaste = {
    status: 'klar', sek: (performance.now() - t0) / 1000, kh: m.kh, kl: m.kl,
    mbHav: m.stlHav.byteLength / 1e6, mbLand: m.stlLand.byteLength / 1e6,
    hav, land, namnHav: filnamn('hav'), namnLand: filnamn('land'),
  };
  visaStatus();
  byggModell(m);
  if (window._nerHook) window._nerHook(m);
  else {
    ladda(hav, senaste.namnHav);
    setTimeout(() => ladda(land, senaste.namnLand), 400);
  }
};

function ladda(url, namn) {
  const a = document.createElement('a');
  a.href = url; a.download = namn; document.body.appendChild(a); a.click(); a.remove();
}

function visaStatus() {
  const st = $('status'), nl = $('nedl');
  nl.innerHTML = '';
  if (!senaste) { st.innerHTML = ''; return; }
  if (senaste.status === 'bygger' || senaste.status === 'kontrollerar') {
    st.textContent = T(senaste.status); return;
  }
  if (senaste.status === 'fel') { st.innerHTML = `<span class="fel">${senaste.text}</span>`; return; }
  const k = (kk, mb) => `${tal(kk.trianglar)} ${T('tri')}, ${tal(mb, 1)} MB, ${tal(kk.volymMm3 / 1000, 1)} cm³ – ` +
    (kk.oparade === 0 ? `<span class="ok">${T('vattentat')} ✓</span>` : `<span class="fel">${T('ejVattentat')} (${kk.oparade})</span>`);
  st.innerHTML = `${T('klar')} (${tal(senaste.sek, 1)} ${T('sek')})<br><b>${T('hav')}</b>: ${k(senaste.kh, senaste.mbHav)}<br><b>${T('land')}</b>: ${k(senaste.kl, senaste.mbLand)}` +
    (senaste.inaktuell ? `<br><span class="fel">${T('inaktuell')}</span>` : '');
  for (const [url, namn, txt] of [[senaste.hav, senaste.namnHav, 'nedlHav'], [senaste.land, senaste.namnLand, 'nedlLand']]) {
    const a = document.createElement('a');
    a.href = url; a.download = namn; a.textContent = T(txt); a.title = namn;
    nl.appendChild(a);
  }
}

function byggModell(m) {
  if (modell) {
    scene.remove(modell);
    modell.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });
  }
  const mesh = (d, farg) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(d.pos, 3));
    g.setIndex(new THREE.BufferAttribute(d.tri, 1));
    return new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: farg, flatShading: true, roughness: 0.8, metalness: 0 }));
  };
  const inre = new THREE.Group();
  inre.add(mesh(m.hav, S.fHav), mesh(m.land, S.fLand));
  inre.rotation.x = -Math.PI / 2;                  // STL: z upp → three: y upp
  modell = new THREE.Group();
  modell.add(inre);
  const rMax = m.info.rMax;
  if (m.opt.dela) { modell.scale.setScalar(0.5 / (rMax + 2)); modell.position.y = -0.22; }
  else modell.scale.setScalar(1 / (m.opt.diameter / 2));
  modell.children[0].children.forEach(o => { o.frustumCulled = false; });
  scene.add(modell);
  $('visaUtskrift').disabled = false;
  $('visaUtskrift').checked = true;
  visaUtskrift(true);
}
function visaUtskrift(pa) {
  if (!modell) return;
  modell.visible = pa; glob.visible = !pa;
  if (pa) tips.style.display = 'none';
}
$('visaUtskrift').addEventListener('change', e => visaUtskrift(e.target.checked));

// ---------------------------------------------------------------- start
function loop() {
  controls.update();
  const f = camera.position.clone().normalize();
  const hoger = new THREE.Vector3().crossVectors(camera.up, f).normalize();
  const upp = new THREE.Vector3().crossVectors(f, hoger);
  uniforms.ljus.value.copy(f).multiplyScalar(0.55).addScaledVector(upp, 0.62).addScaledVector(hoger, -0.55).normalize();
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

async function start() {
  tillampaSprak(); visaVarden(); storlek();
  meta = await fetch(`data/relief.json?v=${DATAV}`).then(r => r.json());
  const buf = await fetch(`data/relief.bin?v=${DATAV}`).then(r => r.arrayBuffer());
  const data = Float32Array.from(new Int16Array(buf));
  falt0 = { W: meta.W, H: meta.H, data, polS: polMedel(data, meta.W, meta.H, 0), polN: polMedel(data, meta.W, meta.H, meta.H - 1) };
  const tex = new THREE.DataTexture(data, meta.W, meta.H, THREE.RedFormat, THREE.FloatType);
  tex.internalFormat = 'R16F';
  tex.minFilter = tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = false; tex.needsUpdate = true;
  uniforms.hojd.value = tex; uniforms.texW.value = meta.W; uniforms.texH.value = meta.H;
  tillampaJamning();
  redo = true;
  tillUniforms(); uppdateraMatt();
  $('laddar').remove();
  window._relief = { S, andrat, visaUtskrift, camera, controls };
}
loop();
start().catch(err => { $('laddar').textContent = 'Fel: ' + err; console.error(err); });
