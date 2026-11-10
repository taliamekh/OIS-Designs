from pathlib import Path
p=Path(__file__).resolve().parent/'phone-mockups.html'
s=p.read_text(encoding='utf-8').replace('#ois-phone-review button', '#ois-phone-review .phone button')
p.write_text(s,encoding='utf-8')
