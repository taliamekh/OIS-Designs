from pathlib import Path
import hashlib, difflib, json
root=Path(__file__).resolve().parent
workspace=root.parents[2]
before=(root/'geometry-return-0511/mobile__src__domain__geometry.ts').read_bytes()
after=(workspace/'mobile/src/domain/geometry.ts').read_bytes()
sha=lambda b:hashlib.sha256(b).hexdigest()
assert sha(before)=='0b029dd1ee4d1070fc8dfaffd96b5baded62ce8d1ec4d5556fd5c27fdcf57364'
assert sha(after)=='0c3a99288b3dc0d44f78168c5b036690c4d716b8b1f578c3b46aba4f06545244', 'Owner source changed; review before making a checkpoint'
patch=''.join(difflib.unified_diff(before.decode().splitlines(keepends=True),after.decode().splitlines(keepends=True),fromfile='a/mobile/src/domain/geometry.ts',tofile='b/mobile/src/domain/geometry.ts',n=3))
(root/'concave-trim-owner-repair.patch').write_text(patch,encoding='utf-8')
(root/'concave-trim-owner-repair-bindings.json').write_text(json.dumps({'kind':'Read-only diff of the app owner implemented production repair; QA did not apply it','before':sha(before),'after':sha(after),'patchSha256':sha(patch.encode())},indent=2)+'\n',encoding='utf-8')
print(f'Captured exact app-owner {len(patch.splitlines())}-line repair diff; no production writes.')
