"""Local-only Phase 3 review server. Read-only mounts of existing model/runtime files."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import unquote, urlsplit
import mimetypes

ROOT = Path(__file__).resolve().parents[1]
WORKSPACE = ROOT.parent
MOUNTS = {
    '/furniture/': WORKSPACE / 'furniture',
    '/three/': WORKSPACE / 'mobile/node_modules/three',
    '/': ROOT,
}

class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        path = unquote(urlsplit(path).path)
        if path == '/':
            return str(ROOT / 'review/index.html')
        for prefix, base in MOUNTS.items():
            if path.startswith(prefix):
                candidate = (base / path[len(prefix):]).resolve()
                if candidate.is_relative_to(base.resolve()):
                    return str(candidate)
                break
        return str(ROOT / 'not-found')

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, *_):
        pass

mimetypes.add_type('text/javascript', '.js')
mimetypes.add_type('model/gltf-binary', '.glb')
print('Spatial review: http://127.0.0.1:8772', flush=True)
ThreadingHTTPServer(('127.0.0.1', 8772), Handler).serve_forever()
