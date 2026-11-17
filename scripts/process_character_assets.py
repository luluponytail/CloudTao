from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(r"C:\Users\lenovo\.codex\generated_images\01a1ca02-b0b4-7e43-b96c-be41945fec4c\exec-26d00ccd-82fc-42b8-81a8-cfbde4cdfca1.png")
OUT = ROOT / "public" / "assets" / "characters"
OUT.mkdir(parents=True, exist_ok=True)

source = Image.open(SOURCE).convert("RGBA")
names = ["novice", "greeter", "oracle-master", "taichi-master", "librarian"]
edges = [0, 434, 868, 1303, 1737, 2172]
for index, name in enumerate(names):
    cell = source.crop((edges[index], 0, edges[index + 1], source.height))
    bbox = cell.getbbox()
    if bbox is None:
        raise RuntimeError(f"Empty generated character cell: {name}")
    sprite = cell.crop(bbox)
    scale = min(150 / sprite.height, 118 / sprite.width)
    sprite = sprite.resize((round(sprite.width * scale), round(sprite.height * scale)), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (128, 160), (0, 0, 0, 0))
    canvas.alpha_composite(sprite, ((128 - sprite.width) // 2, 160 - sprite.height))
    canvas.save(OUT / f"{name}.png", optimize=True)

map_png = ROOT / "public" / "assets" / "maps" / "cloud-tao-main-map.png"
if map_png.exists():
    Image.open(map_png).save(map_png.with_suffix(".webp"), "WEBP", quality=88, method=6)
