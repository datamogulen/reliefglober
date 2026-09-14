// Bygger STL-filerna i bakgrunden så att sidan inte fryser.
import { byggGlob, byggGranser, kontroll, tillStl } from './stl.js';

onmessage = e => {
  const { falt, opt, id, linjer } = e.data;
  try {
    postMessage({ typ: 'status', nyckel: 'bygger', id });
    const g = byggGlob(falt, opt);
    const gr = opt.granser && linjer ? byggGranser(falt, opt, linjer, g.info.rMax) : null;
    postMessage({ typ: 'status', nyckel: 'kontrollerar', id });
    const kh = kontroll(g.hav), kl = kontroll(g.land), kg = gr && kontroll(gr);
    const stlHav = tillStl(g.hav, 'Reliefglob hav - hedin.it/relief-globes');
    const stlLand = tillStl(g.land, 'Reliefglob land - hedin.it/relief-globes');
    const stlGranser = gr && tillStl(gr, 'Reliefglob granser - hedin.it/relief-globes');
    const mesh = m => m && { pos: Float32Array.from(m.pos), tri: m.tri };
    const hav = mesh(g.hav), land = mesh(g.land), granser = mesh(gr);
    const flytt = [stlHav, stlLand, hav.pos.buffer, hav.tri.buffer, land.pos.buffer, land.tri.buffer];
    if (gr) flytt.push(stlGranser, granser.pos.buffer, granser.tri.buffer);
    postMessage({ typ: 'klar', id, opt, info: g.info, kh, kl, kg, stlHav, stlLand, stlGranser, hav, land, granser }, flytt);
  } catch (err) {
    postMessage({ typ: 'fel', id, text: String(err && err.stack || err) });
  }
};
