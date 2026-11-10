"""Small deterministic refinements to the review-only drawing source."""
from pathlib import Path
p = Path(__file__).resolve().parent / 'phone-mockups.html'
s = p.read_text(encoding='utf-8')
s = s.replace("state.surface==='wall'?'North wall only':'Living room floor'", "state.surface==='wall'?(state.wallFace==='north'?'North wall only':'East wall only'):'Living room floor'")
s = s.replace("${['Living room','Kitchen','Hall'].map(r=>", "${(state.floor==='first'?['Bedroom','Bathroom','Landing']:['Living room','Kitchen','Hall']).map(r=>")
s = s.replace("state.x=Math.max(.1,Math.min(2.8,state.x));state.z=Math.max(.1,Math.min(1.9,state.z));", "constrain();")
s = s.replace("if(a==='reset-view'){push();state.x=1.2;state.z=.8;", "if(a==='reset-view'){push();state.x=2;state.z=1.5;")
s = s.replace("'Top view · room 4.00 × 3.00 m'", "'Top view · room 4.00 × 3.00 m'")
# Give all in-phone segmented actions a full touch target.
s += '\n<style>\n#ois-phone-review .seg button{min-height:44px}#ois-phone-review .floating button{min-height:44px}#ois-phone-review .phone .link-btn{min-height:44px}#ois-phone-review .context select{min-height:44px}@media(pointer:coarse){#ois-phone-review .screen-picker button{min-height:44px}}\n</style>\n' if '.seg button{min-height:44px}' not in s else ''
p.write_text(s, encoding='utf-8')
