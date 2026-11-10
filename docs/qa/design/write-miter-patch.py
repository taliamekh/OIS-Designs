from pathlib import Path
import difflib
root = Path(__file__).resolve().parent
before = (root / 'concave-miter-before.geometry.ts').read_text(encoding='utf-8')
after = (root / 'concave-miter-after.geometry.ts').read_text(encoding='utf-8')
patch = ''.join(difflib.unified_diff(before.splitlines(keepends=True), after.splitlines(keepends=True), fromfile='a/mobile/src/domain/geometry.ts', tofile='b/mobile/src/domain/geometry.ts', n=3))
(root / 'concave-trim-candidate.patch').write_text(patch, encoding='utf-8')
print(f'Wrote focused {len(patch.splitlines())}-line candidate patch; no production edit.')
