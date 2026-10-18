import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  ArrowRight,
  CheckCheck,
  FileText,
  LockKeyhole,
  Upload,
} from "lucide-react";
import { ActionManager } from "../components/ActionManager";
import { Button, ErrorBox } from "../components/ui/Primitives";
import { api } from "../lib/api";
import { actionLabels, exampleNotice, formatDate } from "../lib/paperwork";
import type { PaperworkSession } from "../lib/types";

export const DocumentsPage = ({
  state,
  setState,
}: {
  state: PaperworkSession;
  setState: Dispatch<SetStateAction<PaperworkSession>>;
}) => {
  const [view, setView] = useState<"notice" | "plan">(
    state.tasks.length ? "plan" : "notice",
  );
  const [mode, setMode] = useState<"steps" | "read">("steps");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const alive = useRef(true);
  const fileAttempt = useRef(0);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const file = async (upload: File | undefined) => {
    if (!upload) return;
    const attempt = ++fileAttempt.current;
    if (!upload.name.toLowerCase().endsWith(".txt") || upload.size > 72000) {
      setError(
        "Choose a plain text (.txt) file under 72 KB. For a PDF, copy and paste its text.",
      );
      return;
    }
    try {
      const contents = await upload.text();
      if (!alive.current || attempt !== fileAttempt.current) return;
      if (contents.length > 18000) {
        setError(
          "This document is too long. Try a section under 18,000 characters.",
        );
        return;
      }
      setState((s) => ({ ...s, text: contents }));
      setReviewed(false);
      setError("");
    } catch {
      if (alive.current)
        setError("This file could not be read. Try pasting its text.");
    }
  };
  const read = async () => {
    fileAttempt.current++;
    setBusy(true);
    setError("");
    setReviewed(false);
    try {
      if (mode === "read") {
        const result = await api.document(state.text);
        if (alive.current) setState((s) => ({ ...s, result }));
      } else {
        const result = await api.actions(state.text);
        if (alive.current)
          setState((s) => ({
            ...s,
            actions: {
              ...result,
              original: state.text,
              name: state.name.trim() || "My notice",
            },
          }));
      }
    } catch (e) {
      if (alive.current)
        setError(e instanceof Error ? e.message : "Try again.");
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  const result = state.result;
  const actions = state.actions;
  const dirty =
    mode === "read"
      ? result?.original !== state.text
      : actions?.original !== state.text;
  const added =
    !!actions?.tasks.length &&
    actions.tasks.every((action) =>
      state.tasks.some(
        (task) =>
          task.original === actions.original &&
          task.kind === action.kind &&
          task.evidence.join("\n") === action.evidence.join("\n"),
      ),
    );
  const add = () => {
    if (!actions || dirty || !reviewed) return;
    const newTasks = actions.tasks.filter(
      (action) =>
        !state.tasks.some(
          (task) =>
            task.original === actions.original &&
            task.kind === action.kind &&
            task.evidence.join("\n") === action.evidence.join("\n"),
        ),
    );
    if (state.tasks.length + newTasks.length > 24) {
      setError(
        "This session holds up to 24 steps. Save your plan, then remove steps you no longer need.",
      );
      return;
    }
    setState((s) => ({
      ...s,
      tasks: [
        ...s.tasks,
        ...newTasks.map((action) => ({
          ...action,
          id: crypto.randomUUID(),
          notice: actions.name,
          original: actions.original,
          completed: false,
          situation: "",
          audience: "sender" as const,
          draft: "",
        })),
      ],
    }));
    setView("plan");
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">PAPERWORK & NEXT STEPS</p>
          <h1 tabIndex={-1}>Less paperwork. More progress.</h1>
          <p>Understand what’s asked. Keep track. Get ready to ask for help.</p>
        </div>
      </div>
      <nav className="paperwork-views" aria-label="Paperwork views">
        <button
          aria-pressed={view === "notice"}
          onClick={() => setView("notice")}
        >
          <FileText size={17} aria-hidden="true" /> Read a notice
        </button>
        <button aria-pressed={view === "plan"} onClick={() => setView("plan")}>
          <CheckCheck size={17} aria-hidden="true" /> My next steps{" "}
          <span>{state.tasks.filter((t) => !t.completed).length}</span>
        </button>
      </nav>
      {view === "plan" ? (
        <ActionManager
          tasks={state.tasks}
          onChange={(change) =>
            setState((s) => ({ ...s, tasks: change(s.tasks) }))
          }
          onNotice={() => setView("notice")}
        />
      ) : (
        <div className="document-layout">
          <section className="panel">
            <h2>Your letter or notice</h2>
            <p className="muted">
              Paste text or choose a .txt file. For PDFs, copy the text here.
            </p>
            <ErrorBox message={error} />
            <form
              autoComplete="off"
              onSubmit={(e) => {
                e.preventDefault();
                void read();
              }}
            >
              <div className="field">
                <label htmlFor="notice-name">
                  A name for this notice{" "}
                  <span className="muted">(optional)</span>
                </label>
                <input
                  id="notice-name"
                  maxLength={60}
                  placeholder="For example: Income verification"
                  value={state.name}
                  disabled={busy}
                  onChange={(e) =>
                    setState((s) => ({ ...s, name: e.target.value }))
                  }
                />
              </div>
              <div className="field">
                <label htmlFor="document-text">Document text</label>
                <textarea
                  id="document-text"
                  minLength={20}
                  maxLength={18000}
                  rows={10}
                  required
                  disabled={busy}
                  placeholder="Paste the part you want help with…"
                  value={state.text}
                  onChange={(e) => {
                    fileAttempt.current++;
                    setState((s) => ({ ...s, text: e.target.value }));
                    setReviewed(false);
                  }}
                  aria-describedby="doc-limit"
                />
                <div className="document-controls">
                  <span id="doc-limit">
                    {state.text.length.toLocaleString()} / 18,000 characters
                  </span>
                  <label className="upload-button" htmlFor="document-file">
                    <Upload size={16} aria-hidden="true" />
                    Choose .txt file
                    <input
                      id="document-file"
                      type="file"
                      accept=".txt,text/plain"
                      disabled={busy}
                      onChange={(e) => {
                        void file(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>
              <fieldset className="document-mode">
                <legend>What would help?</legend>
                <label>
                  <input
                    type="radio"
                    name="document-mode"
                    checked={mode === "steps"}
                    disabled={busy}
                    onChange={() => setMode("steps")}
                  />
                  Find next steps
                </label>
                <label>
                  <input
                    type="radio"
                    name="document-mode"
                    checked={mode === "read"}
                    disabled={busy}
                    onChange={() => setMode("read")}
                  />
                  Read in plain words
                </label>
              </fieldset>
              <div className="local-note">
                <LockKeyhole size={17} aria-hidden="true" />
                <span>Private AI, running on your computer.</span>
              </div>
              <Button type="submit" busy={busy} className="full-button">
                {busy
                  ? "Reading on your device…"
                  : mode === "steps"
                    ? "Find my next steps"
                    : "Help me understand this"}
                <ArrowRight size={17} aria-hidden="true" />
              </Button>
            </form>
            <Button
              variant="ghost"
              disabled={busy}
              onClick={() => {
                fileAttempt.current++;
                setState((s) => ({
                  ...s,
                  text: "",
                  name: "",
                  result: null,
                  actions: null,
                }));
                setError("");
                setReviewed(false);
              }}
            >
              Clear document
            </Button>
            {state.tasks.length > 0 && (
              <p className="field-hint">
                Added steps stay in your plan until you remove them or clear the
                session.
              </p>
            )}
          </section>
          <section
            className="document-output"
            aria-live="polite"
            aria-busy={busy}
          >
            {mode === "steps" ? (
              !actions ? (
                <div className="context-card">
                  <CheckCheck size={28} aria-hidden="true" />
                  <h2>A next step, with less guesswork.</h2>
                  <p>
                    AI finds requests in your notice. You review the original
                    wording, then add them to your checklist.
                  </p>
                  <ol className="quiet-steps">
                    <li>Bring a notice.</li>
                    <li>Check the suggested steps.</li>
                    <li>Track them and prepare questions.</li>
                  </ol>
                  <p className="field-hint">
                    No clear deadline? It stays unknown. Local AI can take a
                    minute.
                  </p>
                  {!state.text && (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        fileAttempt.current++;
                        setState((s) => ({
                          ...s,
                          text: exampleNotice,
                          name: "Fictional sample notice",
                        }));
                        setReviewed(false);
                      }}
                    >
                      Try a fictional notice
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  {dirty && (
                    <div className="info-banner">
                      Your text changed. Read it again before adding steps.
                    </div>
                  )}
                  <div
                    className={
                      actions.mode === "local_ai" ? "info-banner" : "error-box"
                    }
                    role={actions.mode === "local_ai" ? "status" : "alert"}
                  >
                    {actions.message}
                  </div>
                  {actions.tasks.length > 0 && (
                    <section className="panel action-preview">
                      <p className="eyebrow">LOCAL AI · YOU REVIEW</p>
                      <h2>What your notice asks for</h2>
                      <ol>
                        {actions.tasks.map((action, i) => (
                          <li key={i}>
                            <h3>{actionLabels[action.kind]}</h3>
                            {action.evidence.map((quote, n) => (
                              <blockquote key={n}>{quote}</blockquote>
                            ))}
                            <p className="field-hint">
                              {action.calendar_date
                                ? `Date mentioned: ${formatDate(action.calendar_date)}. Check exact timing above.`
                                : "No unambiguous calendar date. Check the wording or ask the sender."}
                            </p>
                          </li>
                        ))}
                      </ol>
                      <label className="review-check">
                        <input
                          type="checkbox"
                          checked={reviewed}
                          disabled={dirty || added}
                          onChange={(e) => setReviewed(e.target.checked)}
                        />
                        I checked these steps against the full notice.
                      </label>
                      <Button
                        onClick={add}
                        disabled={!reviewed || dirty || added}
                      >
                        {added ? "Already in my plan" : "Add to my next steps"}
                        <ArrowRight size={16} aria-hidden="true" />
                      </Button>
                    </section>
                  )}
                  <details
                    className="panel original"
                    open={actions.mode !== "local_ai"}
                  >
                    <summary>Original document</summary>
                    <p className="preserve-text">{actions.original}</p>
                  </details>
                </>
              )
            ) : !result ? (
              <div className="context-card">
                <FileText size={28} aria-hidden="true" />
                <h2>Plain words. Details kept close.</h2>
                <p>
                  Read a simpler version alongside the original. Dates, amounts,
                  and conditions are checked; meaning still needs your review.
                </p>
              </div>
            ) : (
              <>
                {dirty && (
                  <div className="info-banner">
                    Your text changed. Read it again to update the result.
                  </div>
                )}
                <div
                  className={result.rewrite ? "info-banner" : "error-box"}
                  role={result.rewrite ? "status" : "alert"}
                >
                  {result.message}
                </div>
                {result.rewrite && (
                  <article className="panel rewrite">
                    <p className="eyebrow">
                      LOCAL AI · CHECK AGAINST THE ORIGINAL
                    </p>
                    <h2>{result.rewrite.title}</h2>
                    <p className="preserve-text">
                      {result.rewrite.plain_language}
                    </p>
                    {result.rewrite.action_items.length > 0 && (
                      <>
                        <h3>Actions mentioned in your document</h3>
                        <ul>
                          {result.rewrite.action_items.map((a, i) => (
                            <li key={i}>{a}</li>
                          ))}
                        </ul>
                      </>
                    )}
                  </article>
                )}
                <details className="panel original" open={!result.rewrite}>
                  <summary>Original document</summary>
                  <p className="preserve-text">{result.original}</p>
                </details>
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
};
