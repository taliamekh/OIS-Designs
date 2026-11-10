# Distinct design policy — 300-design production run

The earlier 39 files are retained for compatibility but excluded from the new 300-design target. Their theme palettes and bed-size variants are not independent designs.

A new design needs a documented construction, silhouette or functional difference, actual geometry and a full visual review. Colour/material, mirroring, uniform/non-uniform scaling, bed size and tiny extra details do not earn a new design count. Multiple sizes/colours reference one `designId` and `familyId`.

Stages: `planned` → `geometry-candidate` → `validated-candidate` → `visually-reviewed` → `internally-accepted`. Internal acceptance means usable original planning furniture after geometry and contact-sheet review. It does not mean user visual approval, manufacturer accuracy, certified construction or phone validation. Rejected/near-duplicate designs remain in the ledger and do not count.

Exact canonical geometry hashes ignore material colours, node names and triangle ordering. Additional normalized-shape hashes catch scaled copies; mirrored signatures catch reflected copies. Silhouette-image comparisons and explicit human-readable distinction review catch meaningful near-duplicates that hashes alone cannot. Automated uniqueness does not establish design quality.

Scope: living, bedroom, children's rooms, dining, kitchen, bathroom, office, entry/hall, laundry/utility and storage. Themes coordinate material language while each design keeps its own construction. Sources and generated assets stay under `furniture/`; review documents stay under `docs/furniture/`.
