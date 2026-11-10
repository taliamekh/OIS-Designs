"""Verify glTF-exported roughness green against the original bank; no source edits."""
import json, sys
from pathlib import Path
from PIL import Image, ImageChops
run = Path(sys.argv[1])
rows = json.loads((run / 'repacked-images.json').read_text(encoding='utf-8'))
result = []
for row in rows:
    original = Image.open(row['bankPath']).convert('RGBA')
    embedded = Image.open(row['embeddedPath']).convert('RGBA')
    if original.size != embedded.size:
        raise ValueError('Repacked image dimensions changed')
    # glTF metallic-roughness carries roughness in G; original maps are grayscale.
    diff = ImageChops.difference(original.getchannel('G'), embedded.getchannel('G'))
    maximum = diff.getextrema()[1]
    result.append({**row, 'roughnessGreenMaxDifference': maximum, 'pass': maximum == 0})
(run / 'repacked-image-result.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
if not all(row['pass'] for row in result):
    raise ValueError('Repacked roughness pixels differ from source bank')
print(json.dumps({'checked': len(result), 'passed': len(result)}))
