"""Original seamless floor candidates, generated from bounded periodic fields.

Default output is isolated in this review folder. The app owner decides when to
copy reviewed maps into production. No third-party photographs/textures are used.
Normal maps derive from a height field in metres at a documented 2 m repeat.
"""
from pathlib import Path
import argparse
import hashlib
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFont

N = 512
REPEAT = 2.0
Y, X = np.mgrid[0:N, 0:N] / N
HERE = Path(__file__).resolve().parent


def periodic(seed, nx=8, ny=8):
    """Cubic-interpolated periodic value noise; no random discontinuity at tile edges."""
    grid = np.random.default_rng(seed).random((ny, nx))
    px, py = X * nx, Y * ny
    ix, iy = np.floor(px).astype(int), np.floor(py).astype(int)
    fx, fy = px - ix, py - iy
    fx, fy = fx * fx * (3 - 2 * fx), fy * fy * (3 - 2 * fy)
    top = grid[iy % ny, ix % nx] * (1 - fx) + grid[iy % ny, (ix + 1) % nx] * fx
    bottom = grid[(iy + 1) % ny, ix % nx] * (1 - fx) + grid[(iy + 1) % ny, (ix + 1) % nx] * fx
    return top * (1 - fy) + bottom * fy


def fbm(seed):
    return .53 * periodic(seed, 3, 3) + .29 * periodic(seed + 1, 9, 9) + .18 * periodic(seed + 2, 27, 27)


def finish(base, brightness, height, roughness):
    colour = np.clip(np.asarray(base)[None, None, :] * brightness[:, :, None], 0, 255).astype('uint8')
    # The UV repeat is2m, so derivatives are height-metres / surface-metres.
    pixel = REPEAT / N
    dx = (np.roll(height, -1, axis=1) - np.roll(height, 1, axis=1)) / (2 * pixel)
    dy = (np.roll(height, -1, axis=0) - np.roll(height, 1, axis=0)) / (2 * pixel)
    # PNG rows run downward; TextureLoader.flipY=true maps increasingV upward.
    # Confirmed against a physically displaced Three180 plane in render-review.
    normals = np.stack((-dx, dy, np.ones_like(dx)), axis=-1)
    normals /= np.linalg.norm(normals, axis=2)[:, :, None]
    normal = np.rint(np.clip(normals * .5 + .5, 0, 1) * 255).astype('uint8')
    rough = np.rint(np.clip(roughness, .04, 1) * 255).astype('uint8')
    return colour, normal, rough


def wood(species):
    seed, bands, segments, base, rough, frequency = {
        'white-oak': (1201, 8, 2, (190, 163, 120), .66, 13),
        'walnut': (2203, 7, 2, (105, 73, 49), .52, 7),
        'maple': (3301, 10, 2, (214, 191, 153), .57, 17),
        'bamboo': (4409, 16, 1, (189, 163, 104), .56, 8),
    }[species]
    rng = np.random.default_rng(seed)
    board = np.floor(Y * bands).astype(int)
    phases = rng.uniform(0, 1, bands)
    cellx = X * segments + phases[board]
    plank = np.floor(cellx).astype(int) % segments
    variation = rng.uniform(-.06, .06, (bands, segments))[board, plank]
    across = Y * bands - board
    drift = periodic(seed + 2, 5, bands) - .5
    grain_phase = across * frequency + drift * (1.1 if species == 'walnut' else .42)
    grain = np.sin(2 * np.pi * grain_phase)
    fine = periodic(seed + 3, 12, 128) - .5
    if species == 'white-oak':
        # Open pores and short medullary-ray flecks distinguish this oak treatment.
        pores = np.maximum(0, np.sin(2 * np.pi * (grain_phase * 1.9 + drift))) ** 11
        ray = np.maximum(0, periodic(seed + 4, 128, 48) - .72) * .14
        texture = grain * .025 - pores * .055 + ray + fine * .022
        relief = grain * .000035 - pores * .00009 + fine * .000025
    elif species == 'walnut':
        broad = np.sin(2 * np.pi * (across * 2.1 + drift * .8))
        texture = grain * .035 + broad * .055 + fine * .025
        relief = grain * .000055 + broad * .00002 + fine * .00004
    elif species == 'maple':
        curly = np.sin(2 * np.pi * (X * 9 + periodic(seed + 6, 4, 6) * .6))
        texture = grain * .011 + curly * .015 + fine * .012
        relief = grain * .000018 + fine * .00002
    else:
        # Fine fibres and staggered stem nodes, rather than recoloured oak boards.
        fibres = np.sin(2 * np.pi * (across * 18 + drift * .25))
        node_distance = np.minimum(cellx % 1, 1 - cellx % 1) * REPEAT / segments
        node = np.exp(-(node_distance / .009) ** 2)
        texture = fibres * .018 - node * .09 + fine * .02
        relief = fibres * .000025 + node * .00012
    dlong = np.minimum(across, 1 - across) * REPEAT / bands
    dend = np.minimum(cellx % 1, 1 - cellx % 1) * REPEAT / segments
    joint = np.maximum(np.exp(-(dlong / .0024) ** 4), np.exp(-(dend / .0024) ** 4))
    bright = 1 + variation + texture - joint * .23
    height = relief - joint * .00085
    roughness = rough + fine * .06 - texture * .16 + joint * .12
    return finish(base, bright, height, roughness)


def herringbone():
    # A true4:1 rectangular parquet tiling. Each integer cell belongs to either
    # a4x1 horizontal plank or a1x4 vertical plank; alternating diagonal bands
    # meet end-to-side. The whole layout is rotated45degrees in room UVs.
    length, scale = 4, 8
    u, v = (X + Y) * scale, (X - Y) * scale
    iu, iv = np.floor(u).astype(int), np.floor(v).astype(int)
    band = np.floor((iu + iv) / (2 * length)).astype(int)
    horizontal = (iu + iv) % (2 * length) < length
    origin_u = np.where(horizontal, 2 * length * band - iv, iu)
    origin_v = np.where(horizontal, iv, 2 * length * band + length - iu)
    local_u, local_v = u - origin_u, v - origin_v
    along = np.where(horizontal, local_u, local_v)
    across = np.where(horizontal, local_v, local_u)
    distance = np.minimum(np.minimum(along, length - along), np.minimum(across, 1 - across))
    metres_per_cell = REPEAT / (scale * np.sqrt(2))
    joint = np.exp(-np.maximum(0, distance * metres_per_cell / .0022) ** 4)
    # Wrapped keys preserve per-plank variation at both texture boundaries.
    key_a = (origin_u + origin_v) % (2 * scale)
    key_b = (origin_u - origin_v) % (2 * scale)
    value = (np.sin(key_a * 12.9898 + key_b * 78.233 + horizontal * 23) * 43758.5453) % 1
    grain = np.sin(2 * np.pi * (across * 11 + .15 * np.sin(along * np.pi / 2)))
    pores = np.maximum(grain, 0) ** 8
    bright = .94 + value * .13 + grain * .018 - pores * .024 - joint * .25
    height = grain * .000035 - pores * .000045 - joint * .0009
    rough = .65 + (value - .5) * .07 + joint * .15 - grain * .018
    return finish((174, 137, 89), bright, height, rough)


def mineral(kind):
    seed = {'slate': 5101, 'marble': 6101, 'concrete': 7103}[kind]
    cloud, detail = fbm(seed), periodic(seed + 20, 90, 90)
    fracx, fracy = X * 4 % 1, Y * 4 % 1
    edge = np.minimum(np.minimum(fracx, 1 - fracx), np.minimum(fracy, 1 - fracy)) * REPEAT / 4
    joint = np.exp(-(edge / .003) ** 4)
    if kind == 'slate':
        cleavage = np.abs(periodic(seed + 30, 14, 22) - .5)
        bright = .89 + cloud * .22 + (cleavage - .22) * .14 - joint * .22
        height = (cloud - .5) * .00045 + cleavage * .0005 - joint * .001
        rough = .84 + (detail - .5) * .11 + joint * .07
        base = (86, 94, 96)
    elif kind == 'marble':
        field = .7 * periodic(seed + 30, 4, 4) + .3 * periodic(seed + 31, 13, 13)
        major = np.exp(-((field - .50) / .015) ** 2)
        branches = np.exp(-((.6 * cloud + .4 * periodic(seed + 32, 25, 25) - .47) / .009) ** 2)
        vein = np.maximum(major * .75, branches * .30)
        bright = .98 + (cloud - .5) * .05 - vein * .29 - joint * .17
        height = -joint * .00075 - vein * .000015
        rough = .23 + (cloud - .5) * .045 + joint * .27
        base = (229, 229, 221)
    else:
        pores = np.maximum(0, .22 - detail) ** 2
        bright = .97 + (cloud - .5) * .18 - pores * .5 + (detail - .5) * .018
        height = (cloud - .5) * .00012 - pores * .001
        rough = .78 + (cloud - .5) * .10 + (detail - .5) * .04
        base = (164, 162, 153)
    return finish(base, bright, height, rough)


def terrazzo():
    rng = np.random.default_rng(8123)
    colour = np.zeros((N, N, 3), dtype=float) + np.asarray((199, 192, 179))
    cloud = periodic(8124, 14, 14) - .5
    colour += cloud[:, :, None] * 8
    rough = np.full((N, N), .56)
    palette = [(232, 226, 209), (158, 151, 138), (106, 109, 105), (194, 167, 141), (221, 214, 196)]
    for _ in range(470):
        cx, cy = rng.uniform(0, N, 2)
        radius = rng.uniform(1.8, 8.5)
        count = int(rng.integers(4, 8))
        angles = np.linspace(0, 2 * np.pi, count, endpoint=False) + rng.uniform(0, 1)
        radii = radius * rng.uniform(.65, 1.25, count)
        mask = Image.new('1', (N, N))
        draw = ImageDraw.Draw(mask)
        for ox in (-N, 0, N):
            for oy in (-N, 0, N):
                draw.polygon([(cx + ox + np.cos(a) * r, cy + oy + np.sin(a) * r) for a, r in zip(angles, radii)], fill=1)
        selected = np.asarray(mask, dtype=bool)
        colour[selected] = np.asarray(palette[int(rng.integers(len(palette)))]) * rng.uniform(.94, 1.04)
        rough[selected] = rng.uniform(.41, .59)
    fine = periodic(8125, 128, 128) - .5
    colour = np.clip(colour + fine[:, :, None] * 3, 0, 255).astype('uint8')
    _, normal, rough_map = finish((1, 1, 1), np.ones((N, N)), fine * .000012, rough)
    return colour, normal, rough_map


def carpet():
    row, column = np.floor(Y * 128), np.floor(X * 128)
    warp = np.cos(2 * np.pi * (X * 128 + (row % 2) * .15))
    weft = np.cos(2 * np.pi * Y * 128)
    tuft = np.maximum(warp, weft)
    fibre = periodic(9197, 256, 256) - .5
    cloud = periodic(9198, 8, 8) - .5
    bright = 1 + tuft * .025 + fibre * .045 + cloud * .035
    height = tuft * .00016 + fibre * .0001
    rough = .96 + fibre * .045 - tuft * .015
    return finish((170, 158, 137), bright, height, rough)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, default=HERE / 'maps')
    options = parser.parse_args()
    dest = options.output.resolve()
    dest.mkdir(parents=True, exist_ok=True)
    ids = ['white-oak', 'walnut', 'maple', 'herringbone', 'bamboo', 'slate', 'marble', 'terrazzo', 'concrete', 'carpet']
    rows = []
    sheet = Image.new('RGB', (1600, 680), '#f1f1ec')
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 19)
    for index, material in enumerate(ids):
        maps = wood(material) if material in ['white-oak', 'walnut', 'maple', 'bamboo'] else herringbone() if material == 'herringbone' else mineral(material) if material in ['slate', 'marble', 'concrete'] else terrazzo() if material == 'terrazzo' else carpet()
        row = {'id': material, 'repeatMetres': REPEAT, 'maps': {}}
        for kind, data in zip(['colour', 'normal', 'rough'], maps):
            file = dest / f'{material}-{kind}.png'
            Image.fromarray(data).save(file)
            raw = file.read_bytes()
            row['maps'][kind] = {'file': file.name, 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()}
        rows.append(row)
        preview = Image.fromarray(maps[0]).resize((286, 286), Image.Resampling.LANCZOS)
        sx, sy = index % 5 * 320 + 8, index // 5 * 340 + 8
        sheet.paste(preview, (sx, sy))
        draw.text((sx, sy + 294), material, fill='#181b1e', font=font)
    sheet.save(dest / 'floor-candidates.jpg', quality=94)
    manifest = {'resolution': N, 'repeatMetres': REPEAT, 'normalConvention': 'Three TextureLoader flipY=true; tangent+V green, positive image-dY derivative; calibrated against displaced geometry', 'provenance': 'Original periodic procedural fields; no third-party geometry, images or textures', 'maturity': 'Review candidates, not physical-match or native-validation claims', 'materials': rows}
    (dest / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps({'materials': len(rows), 'mapBytes': sum(v['bytes'] for r in rows for v in r['maps'].values()), 'output': str(dest)}))


if __name__ == '__main__':
    main()
