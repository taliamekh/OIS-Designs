from pathlib import Path
p=Path(__file__).resolve().parent/'phone-mockups.html'
s=p.read_text(encoding='utf-8')
s=s.replace("x:1.2,z:.8,rotation", "x:1.2,z:2,rotation")
s=s.replace('${35+state.z*60}', '${215-state.z*60}')
s=s.replace("state.z+=el.dataset.nudge==='down'?step:el.dataset.nudge==='up'?-step:0", "state.z+=el.dataset.nudge==='up'?step:el.dataset.nudge==='down'?-step:0")
s=s.replace("start.z+(e.clientY-start.py)/(60*scale)", "start.z-(e.clientY-start.py)/(60*scale)")
p.write_text(s,encoding='utf-8')
