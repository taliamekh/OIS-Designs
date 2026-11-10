# Furniture library review batch — 0.1.0

November 8, 2026. Proposed original designs; user approval is pending. This work is an early dependency of the manual editor, before scanning. No app features are implemented by these files.

Review [the imported living-room scene](../../furniture/previews/calm-oak-import-test.png), [all-room geometry sheet](../../furniture/previews/all-room-contact-sheet.jpg) and [theme material studies](../../furniture/previews/theme-material-studies.jpg).

Delivered: **39 versioned GLBs, representing 19 distinct geometry families**. Five are detailed Calm Oak living-room review candidates, 14 are first geometry prototypes, and 20 reuse the living-room geometry with four other theme palettes. Those 20 are material studies, not 20 additional furniture designs. No release-ready or user-approved assets are claimed.

- Detailed review set: sofa, lounge chair, oval coffee table, slatted media unit, floor lamp. Separate cushions/welts, softened edges, real legs, cabinet relief and open lamp shade are mesh geometry.
- Prototypes: six beds (twin, full/double, queen, king, bunk, loft), dining table/chair, kitchen base cabinet, bathroom vanity, desk, shoe bench, washer and toy storage.
- All nine requested room groups have real geometry represented. Complete category coverage and all five room/theme combinations remain planned.
- No third-party assets or textures are bundled. Original source models remain editable in Blender. No services were installed or enrolled; nothing published or committed.

[Coverage and expansion plan](COVERAGE.md) · [quality gates](QUALITY.md) · [integration contract](INTEGRATION.md) · [provenance and licences](SOURCES-LICENCES.md) · [verification report](VERIFICATION.md) · [measured manifest](../../furniture/manifest.json) · [validation results](../../furniture/validation.json).

## Reproduce locally

From the repository root, in PowerShell:

```powershell
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python furniture/scripts/build_library.py
& 'C:\Users\talia\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' furniture/scripts/validate_library.py
& 'C:\Program Files\Blender Foundation\Blender 5.2\blender.exe' --background --python furniture/scripts/render_import_test.py
& 'C:\Users\talia\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' furniture/scripts/make_contact_sheets.py
```

Blender 5.2.2 LTS was found and used. Bundled Python, NumPy and Pillow were available. Scripts overwrite this generated version; publish a new version directory and immutable IDs/hashes when accepting a release. Procedural geometry is reproducible; binary hashes are not promised identical across Blender sessions or render options. Revalidate and regenerate the import test after rebuilding. `.blend` files preserve separate named authoring parts; exported meshes batch disconnected parts by material to reduce draw calls. Preview studio lights/floors/cameras are excluded from per-item GLBs.
