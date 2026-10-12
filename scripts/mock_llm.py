"""Synthetic local inference boundary used only by browser integration tests."""
import json
from http.server import BaseHTTPRequestHandler, HTTPServer


class Handler(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:
        pass

    def send(self, value: object) -> None:
        content = json.dumps(value).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def do_GET(self) -> None:
        self.send({"status": "ok"})

    def do_POST(self) -> None:
        request = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        original = request["messages"][1]["content"]
        value = {"title": "Your notice, in plain words", "plain_language": original, "action_items": []}
        self.send({"choices": [{"message": {"content": json.dumps(value)}}]})


if __name__ == "__main__":
    HTTPServer(("127.0.0.1", 8091), Handler).serve_forever()
