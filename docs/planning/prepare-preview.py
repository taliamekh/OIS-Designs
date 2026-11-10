"""Embed verified OIS assets and copy the review fragment to this chat's visual surface."""
from pathlib import Path
import base64

folder = Path(__file__).resolve().parent
source = folder / 'phone-mockups.html'
html = source.read_text(encoding='utf-8')
for token, name, mime in [
    ('__LOGO__', 'ois-logo.png', 'image/png'),
    ('__OFFICE__', 'ois-office-preview.jpg', 'image/jpeg'),
]:
    data = base64.b64encode((folder / 'research' / name).read_bytes()).decode()
    html = html.replace(token, f'data:{mime};base64,{data}')
source.write_text(html, encoding='utf-8')
target = Path('C:/Users/talia/.codex/visualizations/2026/11/08/01a1bcd1-1d0e-73d2-9d70-4b706a2121c7/ois-phone-mockups.html')
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(html, encoding='utf-8')
print(f'Review fragment: {len(html.encode())} bytes')
