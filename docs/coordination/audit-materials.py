"""Read-only PBR map diagnostics and a labelled review sheet.
Statistics are evidence about image data, not visual approval or physical matching.
"""
from pathlib import Path
from collections import defaultdict
import argparse
import hashlib
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument('--source', type=Path, default=ROOT / 'mobile' / 'assets' / 'materials')
parser.add_argument('--output', type=Path, default=Path(__file__).resolve().parent / 'material-review')
options = parser.parse_args()
SOURCE = options.source.resolve()
OUTPUT = options.output.resolve()
OUTPUT.mkdir(exist_ok=True)
IDS = ['white-oak', 'walnut', 'maple', 'herringbone', 'bamboo', 'slate', 'marble', 'terrazzo', 'concrete', 'carpet']
rows = []
arrays = {}
normal_groups = defaultdict(list)
errors = []
for material in IDS:
    row = {'id': material, 'maps': {}}
    for kind in ['colour', 'normal', 'rough']:
        file = SOURCE / f'{material}-{kind}.png'
        raw = file.read_bytes()
        im = Image.open(file)
        im.load()
        data = np.array(im)
        digest = hashlib.sha256(raw).hexdigest()
        row['maps'][kind] = {'sha256': digest, 'bytes': len(raw), 'size': list(im.size), 'mode': im.mode, 'min': int(data.min()), 'max': int(data.max()), 'std': float(data.std())}
        if kind == 'colour': arrays[material] = data.astype(float).mean(axis=2)
        if kind == 'normal':
            normal_groups[digest].append(material)
            vectors = data.astype(float) / 255 * 2 - 1
            norm_error = np.abs(np.linalg.norm(vectors, axis=2) - 1)
            row['normalLengthMaxError'] = float(norm_error.max())
            if norm_error.max() > .025: errors.append(f'{material}: invalid normal length')
        if im.size != (512, 512): errors.append(f'{material}: unexpected {kind} size {im.size}')
    rows.append(row)

correlations = []
for index, a in enumerate(IDS):
    for b in IDS[index + 1:]:
        correlation = float(np.corrcoef(arrays[a].ravel(), arrays[b].ravel())[0, 1])
        if correlation > .995:
            correlations.append({'a': a, 'b': b, 'normalizedBrightnessCorrelation': correlation})

sheet = Image.new('RGB', (1600, 680), '#f1f1ec')
draw = ImageDraw.Draw(sheet)
font_path = Path('C:/Windows/Fonts/arial.ttf')
font = ImageFont.truetype(str(font_path), 19) if font_path.exists() else ImageFont.load_default()
small = ImageFont.truetype(str(font_path), 14) if font_path.exists() else ImageFont.load_default()
for index, material in enumerate(IDS):
    x, y = (index % 5) * 320, (index // 5) * 340
    im = Image.open(SOURCE / f'{material}-colour.png').convert('RGB')
    im.thumbnail((304, 286))
    sheet.paste(im, (x + 8, y + 8))
    draw.text((x + 8, y + 302), material, fill='#181b1e', font=font)
    draw.text((x + 8, y + 324), 'Base colour only; not a rendered PBR test', fill='#555b60', font=small)
sheet.save(OUTPUT / 'floor-base-colour-sheet.jpg', quality=94)
result = {
    'source': str(SOURCE),
    'floorMaterialCount': len(IDS),
    'errors': errors,
    'identicalNormalMapGroups': [ids for ids in normal_groups.values() if len(ids) > 1],
    'highBrightnessCorrelations': correlations,
    'limitations': 'Image data and base-colour review only; does not prove full 3D appearance, correct UVs, colour space, physical paint/wood matching or device performance.',
    'materials': rows
}
(OUTPUT / 'results.json').write_text(json.dumps(result, indent=2) + '\n')
print(json.dumps({key: value for key, value in result.items() if key != 'materials'}, indent=2))
raise SystemExit(bool(errors))
