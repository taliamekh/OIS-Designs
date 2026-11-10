"""Regenerate original wall and reviewed floor materials. Superseded floor algorithm archived in .tools/."""
from pathlib import Path
import subprocess,sys
scripts=Path(__file__).resolve().parent
subprocess.run([sys.executable,str(scripts/'generate-walls.py')],check=True)
subprocess.run([sys.executable,str(scripts/'generate-floors.py')],check=True)
