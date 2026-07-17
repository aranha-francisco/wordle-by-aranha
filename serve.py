"""Dev server. Plain `python -m http.server` sends no cache headers, so browsers
heuristically cache JS/CSS and you end up debugging a stale build. This sends
no-store on everything, which keeps the edit-reload loop honest.

    python serve.py [port]

Production hosting should do the opposite (long cache lifetimes); the service
worker in sw.js is what handles offline there.
"""

import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Expires", "0")
        super().end_headers()

    # SimpleHTTPRequestHandler honours If-Modified-Since and replies 304 regardless
    # of the headers above; dropping the header forces a full body every time.
    def send_head(self):
        del self.headers["If-Modified-Since"]
        return super().send_head()


def lan_ip():
    """Best-guess LAN address, for opening the game on a phone."""
    import socket

    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))  # no packets sent; just picks the outbound interface
        return s.getsockname()[0]
    except OSError:
        return None
    finally:
        s.close()


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5500
    root = Path(__file__).parent
    handler = partial(NoCacheHandler, directory=str(root))

    ip = lan_ip()
    lines = [
        f"serving {root} (no-store)",
        f"  this machine:  http://localhost:{port}",
    ]
    if ip:
        lines.append(f"  same wi-fi:    http://{ip}:{port}   <- open this on your phone")
    lines += [
        "",
        "note: plain http is not a secure context, so the service worker will not",
        "register over the LAN address - the game plays, but no offline or",
        "home-screen install. See README for the HTTPS options.",
    ]
    # flush: stdout is block-buffered when piped, which would swallow the banner
    print("\n".join(lines), flush=True)

    # 0.0.0.0 so phones on the same network can reach it, not just localhost.
    ThreadingHTTPServer(("0.0.0.0", port), handler).serve_forever()


if __name__ == "__main__":
    main()
