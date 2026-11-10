"""Decisions after actual inspection of the first bedroom/dining/living sheets.
This is a reproducible decision transcript, not an automated visual-quality test.
"""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from record_visual_review import record
if (Path(__file__).resolve().parent/'visual-decisions.json').exists():
 raise SystemExit('Historical review already recorded. Do not replay against changed sheet indices; inspect and record the current sheets explicitly.')
rework={
 'curved-seven-sofa':'Seat modules overlap; rebuild radial seat/deck/back layout and re-render.',
 'barrel-enclosure':'Seat corners intersect curved shell; fit oval cushion inside a wider lower shell.',
 'barrel-dining':'Shared curved-shell cushion intersection; regenerate corrected builder.',
 'shell-dining':'Fit cushion inside curved shell and verify front/back after regeneration.',
 'egg-swivel':'Shell/cushion intersection near bottom; repair before accepting.',
 'petal-lounge':'Shell/cushion intersection; repair before accepting.',
 'hex-hairpin':'Hairpin supports lie outside hex top and appear unattached; inset support layout.',
 'arch-side-table':'Visible dark twisting near arch/top joint; repair tube transport and verify joint.',
 'nested-oval-tables':'Support rails extend beyond shaped tops; revise support fit.',
 'oval-trestle-coffee':'Inset trestle supports to keep them inside the oval top outline.',
 'oval-panel-dining':'Inset panel ends so all supports meet the oval top.',
 'cane-head-bed':'Add actual upright support between woven headboard and bed frame.',
 'draped-canopy-bed':'Curtains are too narrow to read as drapery; create visibly gathered cloth, distinguish from bare four-poster.',
 'cheval-dressing-mirror':'Current opaque blue glass is not a convincing mirror; revise material.',
 'upholstered-dressing-stool':'Inset legs under elliptical seat; current legs look disconnected.',
 'tractor-counter-stool':'Inset legs under the saddle/oval seat.',
 'woven-dressing-screen':'Rotate whole rigid panel geometry about panel pivot; current members can separate.',
 'captain-storage-bed':'Refine enclosed storage-body support and drawer edges before accepting.',
 'aquarium-console':'Opaque blue tank needs real transparent glass material.',
 'wine-diagonal-cabinet':'Diagonal boards protrude outside carcase; clip every divider to interior bounds.',
}
record(['bedroom-01.jpg','bedroom-02.jpg','bedroom-03.jpg','dining-01.jpg','dining-02.jpg','dining-03.jpg','living-01.jpg','living-02.jpg','living-03.jpg','living-04.jpg'],rework)
