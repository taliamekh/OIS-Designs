"""Produce analytic test textures; not production floor content."""
import numpy as np
from pathlib import Path
from PIL import Image
from generate_floors import X, Y, N, REPEAT

dest = Path(__file__).resolve().parent / 'calibration'
dest.mkdir(exist_ok=True)
height = .018 * np.sin(2 * np.pi * X * 2) + .014 * np.cos(2 * np.pi * Y * 3)
dx = (np.roll(height, -1, axis=1) - np.roll(height, 1, axis=1)) / (2 * REPEAT / N)
dy = (np.roll(height, -1, axis=0) - np.roll(height, 1, axis=0)) / (2 * REPEAT / N)
def encode(sign):
    vectors = np.stack((-dx, sign * dy, np.ones_like(dx)), axis=-1)
    vectors /= np.linalg.norm(vectors, axis=2)[:, :, None]
    return np.rint(np.clip(vectors * .5 + .5, 0, 1) * 255).astype('uint8')
minus, plus = encode(-1), encode(1)
Image.fromarray(minus).save(dest / 'negative-image-dy.png')
Image.fromarray(plus).save(dest / 'positive-image-dy.png')
print('Created analytic normal calibration maps')
