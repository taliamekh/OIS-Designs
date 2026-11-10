from pathlib import Path
p=Path(__file__).resolve().parent/'phone-review-v3.js'
s=p.read_text(encoding='utf-8').replace("state.filterRoom==='all'||a.room===state.filterRoom", "state.filterRoom==='all'||(a.rooms||[a.room]).includes(state.filterRoom)")
if 'window.__oisReviewState=' not in s:s=s.replace('render();\n})();', 'window.__oisReviewState=()=>JSON.parse(JSON.stringify(state));\nrender();\n})();')
p.write_text(s,encoding='utf-8')
