"""
fetch_assets.py — downloads the CC0 textures, sky and props listed in
blender/assets.json into blender/assets/ (git-ignored). Plain Python 3, no
Blender needed. Safe to re-run: files already present are skipped.

    python blender/fetch_assets.py            # everything (~60 MB)
    python blender/fetch_assets.py --list     # what is cached, what is missing

Sources: Poly Haven (api.polyhaven.com) and ambientCG (ambientcg.com), both CC0.
"""

from __future__ import annotations

import argparse
import io
import json
import sys
import urllib.request
import zipfile
from pathlib import Path

HERE = Path(__file__).resolve().parent
ASSETS = HERE / "assets"
UA = {"User-Agent": "drprop-blender/1.0 (+https://github.com/brandonkow/drprop)"}

# Poly Haven map name → our file name.
PH_MAPS = {"Diffuse": "diff", "Rough": "rough", "nor_gl": "nor", "Displacement": "disp"}
# ambientCG file suffix → our file name.
ACG_MAPS = {"_Color.jpg": "diff", "_Roughness.jpg": "rough", "_NormalGL.jpg": "nor", "_Displacement.jpg": "disp"}


def get(url: str) -> bytes:
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r:
        return r.read()


def save(path: Path, url: str) -> None:
    if path.exists() and path.stat().st_size > 0:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    data = get(url)
    tmp = path.with_suffix(path.suffix + ".part")
    tmp.write_bytes(data)
    tmp.replace(path)
    print(f"  {path.relative_to(HERE)}  {len(data) / 1e6:.1f} MB")


def ph_files(asset_id: str) -> dict:
    return json.loads(get(f"https://api.polyhaven.com/files/{asset_id}"))


def texture(key: str, spec: dict) -> None:
    out = ASSETS / "textures" / key
    if all((out / f"{n}.jpg").exists() for n in ("diff", "rough", "nor")):
        return
    if spec["source"] == "polyhaven":
        files = ph_files(spec["id"])
        for ph_name, ours in PH_MAPS.items():
            if ph_name in files:
                save(out / f"{ours}.jpg", files[ph_name][spec["res"]]["jpg"]["url"])
    elif spec["source"] == "ambientcg":
        name = f"{spec['id']}_{spec['res']}-JPG"
        archive = zipfile.ZipFile(io.BytesIO(get(f"https://ambientcg.com/get?file={name}.zip")))
        out.mkdir(parents=True, exist_ok=True)
        for member in archive.namelist():
            for suffix, ours in ACG_MAPS.items():
                if member.endswith(suffix):
                    (out / f"{ours}.jpg").write_bytes(archive.read(member))
                    print(f"  {(out / f'{ours}.jpg').relative_to(HERE)}")
    else:
        raise ValueError(f"unknown source {spec['source']}")


def model(key: str, spec: dict) -> None:
    out = ASSETS / "models" / key
    if (out / "model.gltf").exists():
        return
    entry = ph_files(spec["id"])["gltf"][spec["res"]]["gltf"]
    for rel, inc in entry.get("include", {}).items():
        save(out / rel, inc["url"])
    # Written last: its presence marks the model as complete.
    save(out / "model.gltf", entry["url"])


def main() -> None:
    parser = argparse.ArgumentParser(description="Fetch the CC0 assets for the Blender store renders.")
    parser.add_argument("--list", action="store_true", help="show what is cached")
    args = parser.parse_args()
    manifest = json.loads((HERE / "assets.json").read_text())
    kinds = (("textures", texture, lambda k: ASSETS / "textures" / k / "diff.jpg"),
             ("models", model, lambda k: ASSETS / "models" / k / "model.gltf"))
    failed = []
    for kind, fetch, marker in kinds:
        for key, spec in manifest.get(kind, {}).items():
            if args.list:
                print(f"{'ok     ' if marker(key).exists() else 'missing'}  {kind[:-1]:8} {key:18} {spec['id']}")
                continue
            print(f"{kind[:-1]} {key} ({spec['source']}: {spec['id']})")
            try:
                fetch(key, spec)
            except Exception as e:  # keep going; the scripts fall back to procedural materials
                failed.append(key)
                print(f"  failed: {e}", file=sys.stderr)
    if failed:
        print(f"\n{len(failed)} failed ({', '.join(failed)}); renders use procedural stand-ins for those.")
        sys.exit(1)


if __name__ == "__main__":
    main()
