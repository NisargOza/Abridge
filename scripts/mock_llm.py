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
        value = {
            "title": "Your notice, in plain words",
            "plain_language": original,
            "action_items": [],
        }
        schema = request["response_format"]["json_schema"]["name"]
        if schema == "ActionExtraction":
            value = {
                "tasks": [
                    {"kind": "documents", "evidence_ids": [0, 1], "deadline_evidence_id": 0},
                    {"kind": "appointment", "evidence_ids": [2, 3], "deadline_evidence_id": 2},
                ]
            }
        elif schema == "ConversationDraft":
            value = {
                "questions": [
                    "What other proof of income could I provide without a recent pay stub?",
                    "How can I submit documents outside office hours?",
                    "How can I confirm the documents arrive before the deadline?",
                ]
            }
        self.send({"choices": [{"message": {"content": json.dumps(value)}}]})


if __name__ == "__main__":
    HTTPServer(("127.0.0.1", 8091), Handler).serve_forever()
