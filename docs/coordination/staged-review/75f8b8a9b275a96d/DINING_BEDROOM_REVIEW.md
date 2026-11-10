# Staged furniture review — 02:42 UTC

The coordinator visually inspected all six archived dining/bedroom contact sheets (60 model front/back pairs) in the accompanying frozen index. This is feedback on those exact v0.3.2 hashes, not producer acceptance, user approval, native loading or a review of later v0.4.0 successors. The source snapshot associated with these records is `furniture/sources/pipeline-55642edf77b9875f.py`.

## Repairs required before accepting affected models

| Model | Observation and source evidence |
| --- | --- |
| hanging-valet-stand | The central upright/shoulder assembly floats between two separate sled feet. The horizontal trouser bar also floats in front of the upright. Snapshot line776 creates separate sleds, a shaft at y=-.08 and a bar at y=.16, with no connecting members. Add an actual joined base and trouser-rail supports. |
| cheval-dressing-mirror | Mirror frame visibly floats between the side uprights. Snapshot lines823–824 put uprights at ±w/2 but the frame spans only .85w, leaving side gaps and no pivots. The uprights also miss the sleds at ±(w/2-.06). A tangent-only successor must also correct these assembly gaps. |
| woven-dressing-screen | The three separate panels do not meet at common hinge axes. Snapshot lines784–787 position each panel independently, alternate y and rotate around its own centre; no hinge geometry joins the exposed gaps. Build a connected folded divider with aligned edges and visible hinge/pin attachments. |
| spindle-dining | The bowed top rail is visibly detached from all seven spindle ends, as in the previously reported woven-bow sibling. Snapshot239–240 calculates the two profiles independently. Current builder source appears to contain a subsequent endpoint repair; regenerate and review the successor rather than accepting this archived shape. |
| upholstered-dressing-stool | The seat is a flat sharp-edged elliptical slab rather than the described saddle-shaped upholstered seat. Snapshot185 uses a constant-thickness slab and the rendered material reads as timber. Provide the promised seat construction/material, or reconcile the design brief and distinct-design claim honestly. |

## Bounded positive observations

The reviewed table supports are visibly placed under their tops. The rectangular trestle has joined A frames and a stretcher. The wine lattice no longer has the large protrusions seen in the older review. The draped canopy shows four gathered curtains. Bed headboards, quilt rails, dresser bases, and luggage-rack straps are recognizable at contact-sheet scale. These observations do not accept unlisted rows by omission; hidden connectivity, glass, material detail, design uniqueness and full-size render inspection remain separate gates.

The glass-display-hutch and cheval mirror also had formal tangent issues in the older staged batch. The producer has v0.4.0 successors for some affected models; their format validity and visual correctness must be assessed against those successor hashes.
