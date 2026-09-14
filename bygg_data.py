"""Bygger webbens höjdfält web/data/relief.bin + relief.json.

Källor (hämtas till ~/Development/Data/Reliefglober/, aldrig till repot):
  * NOAA NCEI ETOPO 2022 v1, 60 bågsekunder, "surface" (isytan på Antarktis/Grönland,
    havsbotten i haven). doi:10.25921/fd45-gt74. Public domain.
  * Natural Earth 10m land + antarktiska ishyllor (land) och sjöar. Public domain.

Varje 0,25°-cell (15×15 ETOPO-pixlar) blir land om minst halva cellen är land
enligt Natural Earth. Landceller får medelhöjden över cellens landpixlar (sjöpixlar
undantas; celler som helt är sjö fylls från närmaste landcell) och minst +1 m;
havsceller får medeldjupet över havspixlarna och högst −1 m. Tecknet bär alltså
kustlinjen: landsänkor (Kaspiska sänkan, Qattara, Döda havet-regionen) visas som
land i havsnivå, Kaspiska havet som hav.

Utdata: int16 little endian, rad 0 = sydligast (lat −89,875), kolumn 0 = lon −179,875.
"""
from pathlib import Path
import json
import subprocess

import numpy as np
import shapefile
import xarray as xr
from PIL import Image, ImageDraw
from scipy import ndimage

DATA = Path.home() / "Development/Data/Reliefglober"
ETOPO_URL = ("https://www.ngdc.noaa.gov/thredds/fileServer/global/ETOPO2022/60s/"
             "60s_surface_elev_netcdf/ETOPO_2022_v1_60s_N90W180_surface.nc")
ETOPO = DATA / "ETOPO_2022_v1_60s_N90W180_surface.nc"
NE = DATA / "ne"
UT = Path(__file__).parent / "web" / "data"

PPD = 60          # ETOPO-pixlar per grad
BLOCK = 15        # → 0,25°
W, H = 360 * PPD, 180 * PPD


def hamta():
    DATA.mkdir(parents=True, exist_ok=True)
    if not ETOPO.exists():
        subprocess.run(["curl", "-sSL", "-C", "-", "-o", str(ETOPO), ETOPO_URL], check=True)
    for namn in ["ne_10m_land", "ne_10m_antarctic_ice_shelves_polys", "ne_10m_lakes"]:
        if not (NE / f"{namn}.shp").exists():
            NE.mkdir(exist_ok=True)
            z = NE / f"{namn}.zip"
            subprocess.run(["curl", "-sSL", "-o", str(z),
                            f"https://naciscdn.org/naturalearth/10m/physical/{namn}.zip"], check=True)
            subprocess.run(["unzip", "-oq", str(z), "-d", str(NE)], check=True)


def rastrera(shp, bild=None, varde=1):
    """Fyller polygoner (med hål) i en W×H-bild, rad 0 = norr."""
    if bild is None:
        bild = Image.new("L", (W, H), 0)
    rit = ImageDraw.Draw(bild)
    for form in shapefile.Reader(str(shp)).shapes():
        delar = list(form.parts) + [len(form.points)]
        pts = np.asarray(form.points)
        for a, b in zip(delar[:-1], delar[1:]):
            ring = pts[a:b]
            if len(ring) < 3:
                continue
            xy = [((x + 180) * PPD, (90 - y) * PPD) for x, y in ring]
            # shapefile: yttre ringar medurs, hål moturs (signerad area i lon/lat)
            area = np.sum(ring[:-1, 0] * ring[1:, 1] - ring[1:, 0] * ring[:-1, 1])
            rit.polygon(xy, fill=varde if area < 0 else (0 if varde else 1))
    return bild


def main():
    hamta()
    print("rastrerar Natural Earth …")
    land = rastrera(NE / "ne_10m_land.shp")
    land = rastrera(NE / "ne_10m_antarctic_ice_shelves_polys.shp", land)
    land = np.asarray(land, dtype=bool)[::-1]           # rad 0 = söder
    sjo = np.asarray(rastrera(NE / "ne_10m_lakes.shp"), dtype=bool)[::-1]

    print("läser ETOPO …")
    ds = xr.open_dataset(ETOPO)
    z = ds["z"]
    if z.lat.values[0] > z.lat.values[-1]:
        z = z.isel(lat=slice(None, None, -1))
    z = z.values.astype(np.float32)
    assert z.shape == (H, W), z.shape

    # Diagnostik: har ETOPO sjöbotten eller sjöyta?
    for namn, lat, lon in [("Övre sjön", 47.7, -87.5), ("Bajkal", 53.5, 108.2), ("Kaspiska", 42.0, 51.0)]:
        j, i = int((lat + 90) * PPD), int((lon + 180) * PPD)
        print(f"  {namn}: ETOPO {z[j, i]:.0f} m, land={land[j, i]}, sjö={sjo[j, i]}")

    h, w = H // BLOCK, W // BLOCK
    ut = np.zeros((h, w), np.float32)
    andel = np.zeros((h, w), np.float32)
    print("blockmedlar till 0,25° …")
    steg = 60
    for r0 in range(0, h, steg):
        r1 = min(h, r0 + steg)
        sl = slice(r0 * BLOCK, r1 * BLOCK)
        zz = z[sl].reshape(r1 - r0, BLOCK, w, BLOCK)
        ll = land[sl].reshape(r1 - r0, BLOCK, w, BLOCK)
        ss = sjo[sl].reshape(r1 - r0, BLOCK, w, BLOCK)
        fl = ll.mean(axis=(1, 3))
        mL = ll & ~ss
        nL = mL.sum(axis=(1, 3))
        medL = np.where(nL > 0, (zz * mL).sum(axis=(1, 3)) / np.maximum(nL, 1), np.nan)
        mH = ~ll
        nH = mH.sum(axis=(1, 3))
        medH = np.where(nH > 0, (zz * mH).sum(axis=(1, 3)) / np.maximum(nH, 1), zz.mean(axis=(1, 3)))
        ar_land = fl >= 0.5
        ut[r0:r1] = np.where(ar_land, medL, np.minimum(medH, -1))
        andel[r0:r1] = fl

    ar_land = andel >= 0.5
    saknas = ar_land & np.isnan(ut)
    if saknas.any():
        giltig = ar_land & ~np.isnan(ut)
        # närmaste giltiga landcell (longitud-wrap via tredubblad rad)
        trip = np.concatenate([~giltig] * 3, axis=1)
        _, (ji, ii) = ndimage.distance_transform_edt(trip, return_indices=True)
        ji, ii = ji[:, w:2 * w], ii[:, w:2 * w] % w
        ut[saknas] = ut[ji[saknas], ii[saknas]]
        print(f"  {saknas.sum()} helt sjötäckta landceller fyllda från närmaste land")
    ut = np.where(ar_land, np.maximum(ut, 1), np.minimum(ut, -1))
    ut = np.clip(np.rint(ut), -32767, 32767).astype("<i2")

    UT.mkdir(parents=True, exist_ok=True)
    (UT / "relief.bin").write_bytes(ut.tobytes())
    jmax = np.unravel_index(np.argmax(ut), ut.shape)
    jmin = np.unravel_index(np.argmin(ut), ut.shape)
    cell = lambda j, i: [round(-90 + (j + 0.5) * 0.25, 3), round(-180 + (i + 0.5) * 0.25, 3)]
    vikt = np.cos(np.radians(-90 + (np.arange(h) + 0.5) * 0.25))[:, None]
    meta = {
        "W": w, "H": h, "upplosning": 0.25, "format": "int16le, meter, rad 0 = söder, cellcentrerat",
        "landandel": round(float(ar_land.mean()), 4),
        "landandelYta": round(float((ar_land * vikt).sum() / (vikt.sum() * w)), 4),
        "max": {"m": int(ut.max()), "latlon": cell(*jmax)},
        "min": {"m": int(ut.min()), "latlon": cell(*jmin)},
        "kalla": "NOAA NCEI ETOPO 2022 (60″, surface) doi:10.25921/fd45-gt74 + Natural Earth 10m land/ishyllor/sjöar",
    }
    (UT / "relief.json").write_text(json.dumps(meta, ensure_ascii=False, indent=1))
    print(json.dumps(meta, ensure_ascii=False, indent=1))


def bygg_granser():
    """Natural Earth 1:50M landgränser → web/data/granser.json (lon,lat-följder, 3 decimaler)."""
    namn = "ne_50m_admin_0_boundary_lines_land"
    if not (NE / f"{namn}.shp").exists():
        NE.mkdir(parents=True, exist_ok=True)
        z = NE / f"{namn}.zip"
        subprocess.run(["curl", "-sSL", "-o", str(z),
                        f"https://naciscdn.org/naturalearth/50m/cultural/{namn}.zip"], check=True)
        subprocess.run(["unzip", "-oq", str(z), "-d", str(NE)], check=True)
    linjer = []
    for form in shapefile.Reader(str(NE / namn)).shapes():
        delar = list(form.parts) + [len(form.points)]
        for a, b in zip(delar[:-1], delar[1:]):
            if b - a >= 2:
                linjer.append([round(v, 3) for p in form.points[a:b] for v in p])
    UT.mkdir(parents=True, exist_ok=True)
    (UT / "granser.json").write_text(json.dumps(
        {"kalla": "Natural Earth 1:50M admin-0 boundary lines (land), public domain", "linjer": linjer},
        separators=(",", ":")))
    print(f"granser.json: {len(linjer)} linjer, {sum(len(l) for l in linjer) // 2} punkter")


if __name__ == "__main__":
    import sys
    if "--granser" not in sys.argv:
        main()
    bygg_granser()
