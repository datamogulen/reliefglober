// Bygger STL-filerna i bakgrunden så att sidan inte fryser.
import { byggGlob, kontroll, tillStl } from './stl.js';

onmessage = e => {
  const { falt, opt, id } = e.data;
  try {
    postMessage({ typ: 'status', nyckel: 'bygger', id });
    const g = byggGlob(falt, opt);
    postMessage({ typ: 'status', nyckel: 'kontrollerar', id });
    const kh = kontroll(g.hav), kl = kontroll(g.land);
    const stlHav = tillStl(g.hav, 'Reliefglob hav - hedin.it/relief-globes');
    const stlLand = tillStl(g.land, 'Reliefglob land - hedin.it/relief-globes');
    const hav = { pos: Float32Array.from(g.hav.pos), tri: g.hav.tri };
    const land = { pos: Float32Array.from(g.land.pos), tri: g.land.tri };
    postMessage({ typ: 'klar', id, opt, info: g.info, kh, kl, stlHav, stlLand, hav, land },
      [stlHav, stlLand, hav.pos.buffer, hav.tri.buffer, land.pos.buffer, land.tri.buffer]);
  } catch (err) {
    postMessage({ typ: 'fel', id, text: String(err && err.stack || err) });
  }
};
