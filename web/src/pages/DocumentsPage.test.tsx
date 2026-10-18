import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { useState } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { DocumentsPage } from "./DocumentsPage";
import { api } from "../lib/api";
import { emptyPaperwork } from "../lib/paperwork";
import type { ConversationResult } from "../lib/types";

const notice = "Please provide proof of income before November 18, 2026.";
const Harness = () => {
  const [state, setState] = useState(emptyPaperwork);
  return <DocumentsPage state={state} setState={setState} />;
};
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
const preview = async () => {
  vi.spyOn(api, "actions").mockResolvedValue({
    mode: "local_ai",
    message: "Review these steps.",
    tasks: [
      {
        kind: "documents",
        evidence: [notice],
        deadline_text: notice,
        calendar_date: "2026-11-18",
      },
    ],
  });
  fireEvent.change(screen.getByLabelText("Document text"), {
    target: { value: notice },
  });
  fireEvent.click(screen.getByRole("button", { name: "Find my next steps" }));
  await screen.findByRole("heading", { name: "What your notice asks for" });
};

it("requires review, blocks stale analysis, deduplicates additions and preserves the checklist", async () => {
  render(<Harness />);
  await preview();
  const add = screen.getByRole("button", { name: "Add to my next steps" });
  expect(add).toBeDisabled();
  fireEvent.click(
    screen.getByLabelText("I checked these steps against the full notice."),
  );
  fireEvent.change(screen.getByLabelText("Document text"), {
    target: { value: notice + " Updated." },
  });
  expect(add).toBeDisabled();
  fireEvent.change(screen.getByLabelText("Document text"), {
    target: { value: notice },
  });
  fireEvent.click(
    screen.getByLabelText("I checked these steps against the full notice."),
  );
  fireEvent.click(add);
  expect(
    screen.getByRole("heading", { name: /1 next step/ }),
  ).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Read a notice" }));
  expect(
    screen.getByRole("button", { name: "Already in my plan" }),
  ).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Clear document" }));
  fireEvent.click(screen.getByRole("button", { name: /My next steps/ }));
  expect(screen.getAllByText(notice)).toHaveLength(2);
});

it("keeps a task completed while a conversation response resolves, and clears stale draft context", async () => {
  let finish: (value: ConversationResult) => void = () => {};
  vi.spyOn(api, "conversation").mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  render(<Harness />);
  await preview();
  fireEvent.click(
    screen.getByLabelText("I checked these steps against the full notice."),
  );
  fireEvent.click(screen.getByRole("button", { name: "Add to my next steps" }));
  fireEvent.click(screen.getByText("Prepare a conversation"));
  fireEvent.change(
    screen.getByLabelText("What might make this step difficult?"),
    { target: { value: "No pay stub" } },
  );
  fireEvent.click(screen.getByRole("button", { name: "Help me ask" }));
  const card = screen.getByLabelText(/mark complete/).closest("article")!;
  fireEvent.click(within(card).getByRole("checkbox"));
  await act(async () =>
    finish({
      draft: {
        questions: ["What proof can I provide?", "Where can I submit it?"],
      },
    }),
  );
  expect(screen.getByText("Completed (1)")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Completed (1)"));
  fireEvent.click(screen.getByLabelText(/mark complete/));
  fireEvent.click(screen.getByText("Prepare a conversation"));
  expect(
    screen.getByLabelText("What might make this step difficult?"),
  ).toHaveValue("No pay stub");
  expect(screen.queryByLabelText(/Your questions/)).not.toBeInTheDocument();
});
