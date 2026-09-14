# Reliefglober

Interaktiv jordglob där landet reser sig och havsbottnen sjunker ner. Du kan välja
full relief, platt hav eller platt land, ändra överhöjningen och skriva ut globen i två
färger som **två STL-filer: en för hav och en för land**. Landsgränser kan visas på
globen och skrivas ut som en tunn remsa i en tredje STL-fil.

**Live:** https://hedin.it/relief-globes/

*An interactive globe where the land rises and the seafloor sinks. Choose full relief,
flat ocean or flat land, adjust the exaggeration and export the globe for two-colour
3D printing as two STL files (ocean + land). UI in Swedish, English and Japanese.*

## Delar

| Fil | Vad |
|---|---|
| `bygg_data.py` | Hämtar ETOPO 2022 och Natural Earth och bygger `web/data/relief.bin` (0,25°, int16) |
| `web/index.html`, `web/app.js` | Vy (Three.js, höjdfältet förskjuts i shadern) och reglage, sv/en/ja |
| `web/falt.js` | Sampling, reliefkurva och kustbevarande utjämning, delas av vy, export och test |
| `web/stl.js`, `web/stl-worker.js` | Geometrimotorn: hav- och landkropp, halvklot med styrhål, binär STL |
| `test_stl.mjs` | Regressionstest: vattentäthet, orientering, snittarea (`node test_stl.mjs [--data]`) |

## Geometrin

- **Havskroppen** är en stjärnformad solid. Över hav har den havsbottnens radie, under land
  landskalets undersida (`R − landDjup`). Den bär hela kärnan.
- **Landkroppen** är ett skal mellan `R − landDjup` och landytan.
- Kustlinjen är höjdfältets nollkontur. Varje yttriangel klipps mot den, och kustpunkterna
  delas exakt mellan grannar. Lodräta väggar följer kusten och delas av båda kropparna
  med motsatt orientering, så att delarna passar kant i kant i slicern.
- Nätet består av ringar med jämna breddgradssteg och `∝ cos(lat)` punkter per ring,
  hopsydda med blixtlåstriangulering. Det ger inga T-korsningar och inga polsplitter.
- **Landsgränser** (valfritt): Natural Earth 1:50M landgränser blir en sluten remsa per
  sammanhängande linjebit över land. Toppen ligger en vald höjd över högsta ytpunkten
  tvärs remsan, och botten sänks 0,3 mm ner i landet så att remsan fäster. Vid ekvatorn
  delas remsorna med plan ändyta.
- **Halvklot:** ekvatorn är en ring, så snittet blir exakt plant. Havets snittyta
  trianguleras mot styrhålet och landets snittband som remsor. Södra halvklotet vänds
  så att båda ligger med snittytan nedåt.

## Licens

Koden är fri att använda, ändra och sprida under [MIT-licensen](LICENSE). Behåll
upphovsrättsraden. Bygger du något på reliefgloberna blir jag glad för en länk till
https://hedin.it/relief-globes/ eller hit.

*Code released under the [MIT License](LICENSE) — keep the copyright notice. If you
build on it, a link back to https://hedin.it/relief-globes/ or this repository is
much appreciated.*

## Data

- NOAA NCEI **ETOPO 2022** v1, 60″, *surface* (isytan på Antarktis och Grönland),
  doi:[10.25921/fd45-gt74](https://doi.org/10.25921/fd45-gt74). Public domain.
- **Natural Earth** 10m land, antarktiska ishyllor och sjöar samt 50m landgränser
  (`web/data/granser.json`, byggs med `python bygg_data.py --granser`). Public domain.

Varje 0,25°-cell räknas som land om minst hälften är land. Landceller får medelhöjden
över sina landpixlar, där sjöpixlar undantas eftersom ETOPO har sjöbottnar. Havsceller
får medeldjupet över sina havspixlar. Blockmedlet gör att de högsta topparna jämnas ut:
cirka 6 200 m i Tibet och cirka −9 700 m i Tongagraven.
