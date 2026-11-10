"""Local asset QA only. Serves furniture and installed Three source, no whole-repo listing."""
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import unquote,urlsplit
ROOT=Path(__file__).resolve().parents[1]
THREE=ROOT.parent/'mobile/node_modules/three'
class Handler(SimpleHTTPRequestHandler):
 def do_GET(self):
  if urlsplit(self.path).path=='/favicon.ico':self.send_response(204);self.end_headers();return
  super().do_GET()
 def translate_path(self,path):
  p=unquote(urlsplit(path).path)
  base=THREE if p.startswith('/three/') else ROOT
  rel=p[len('/three/'):] if p.startswith('/three/') else p.lstrip('/')
  if not rel:rel='review/index.html'
  target=(base/rel).resolve()
  if not target.is_relative_to(base.resolve()):return str(ROOT/'__not_found__')
  return str(target)
 def list_directory(self,path):self.send_error(403,'No directory listing');return None
 def end_headers(self):
  self.send_header('Cache-Control','no-store');super().end_headers()
if __name__=='__main__':
 print('Furniture QA: http://127.0.0.1:8768/ (Three dependency read-only from mobile)',flush=True)
 ThreadingHTTPServer(('127.0.0.1',8768),Handler).serve_forever()
