from pathlib import Path
p=Path(__file__).resolve().parent/'phone-review-v3.js'
s=p.read_text(encoding='utf-8').replace("state.wallColor=el.value;render();remember()", "setHex(el.value);render();remember()")
helper="""function setHex(hex){const n=parseInt(hex.slice(1),16),r=(n>>16&255)/255,g=(n>>8&255)/255,b=(n&255)/255,max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;state.wallColor=hex;state.value=max;state.sat=max?d/max:0;state.hue=d?((max===r?(g-b)/d+(g<b?6:0):max===g?(b-r)/d+2:(r-g)/d+4)*60):0}
"""
if 'function setHex' not in s:s=s.replace('function hsvToHex',helper+'function hsvToHex')
p.write_text(s,encoding='utf-8')
