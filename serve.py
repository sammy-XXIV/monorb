# python serve.py : static server for chogverse on port 8125 (all interfaces: phone on same Wi-Fi can open it) with caching disabled (edits always show on reload)
import http.server, functools
class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store"); super().end_headers()
http.server.ThreadingHTTPServer(("0.0.0.0", 8125), functools.partial(H, directory=".")).serve_forever()
