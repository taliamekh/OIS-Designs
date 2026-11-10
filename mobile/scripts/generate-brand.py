"""Plain-text development launcher assets. No new company logo is asserted."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1] / "assets" / "brand"
root.mkdir(parents=True, exist_ok=True)
font = ImageFont.truetype("C:/Windows/Fonts/seguisb.ttf", 365)
foreground = Image.new("RGBA", (1024, 1024))
draw = ImageDraw.Draw(foreground)
box = draw.textbbox((0, 0), "ois", font=font)
draw.text(((1024 - box[2] + box[0]) / 2 - box[0], (1024 - box[3] + box[1]) / 2 - box[1]), "ois", font=font, fill="#263038")
foreground.save(root / "foreground.png", optimize=True)
icon = Image.new("RGBA", foreground.size, "#f4f3ef")
icon.alpha_composite(foreground)
icon.convert("RGB").save(root / "icon.png", optimize=True)
icon.resize((64, 64), Image.Resampling.LANCZOS).convert("RGB").save(root / "favicon.png", optimize=True)
mask = Image.new("RGBA", foreground.size)
mask.putalpha(foreground.getchannel("A"))
mask.save(root / "monochrome.png", optimize=True)
