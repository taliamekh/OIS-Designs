from pathlib import Path
p=Path(__file__).resolve().parent/'phone-mockups.html'
s=p.read_text(encoding='utf-8').replace('#ois-phone-review .phone button{', '#ois-phone-review :where(.phone) button{').replace('#ois-phone-review .phone button,', '#ois-phone-review :where(.phone) button,').replace('#ois-phone-review .phone button:focus-visible', '#ois-phone-review :where(.phone) button:focus-visible')
p.write_text(s,encoding='utf-8')
