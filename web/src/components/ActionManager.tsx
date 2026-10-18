import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  CheckCheck,
  Download,
  MessageCircle,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Button, ErrorBox, ExternalLink } from "./ui/Primitives";
import { api } from "../lib/api";
import {
  actionLabels,
  calendarFile,
  downloadFile,
  formatDate,
  planText,
} from "../lib/paperwork";
import type { ManagedTask } from "../lib/types";

export const ActionManager = ({
  tasks,
  onChange,
  onNotice,
}: {
  tasks: ManagedTask[];
  onChange: (change: (tasks: ManagedTask[]) => ManagedTask[]) => void;
  onNotice: () => void;
}) => {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const open = tasks.filter((task) => !task.completed);
  const complete = tasks.filter((task) => task.completed);
  const update = (id: string, patch: Partial<ManagedTask>) => {
    onChange((current) =>
      current.map((task) => (task.id === id ? { ...task, ...patch } : task)),
    );
    if (patch.completed !== undefined)
      requestAnimationFrame(() => {
        document
          .getElementById(
            patch.completed ? "completed-task-summary" : `task-${id}`,
          )
          ?.focus();
      });
  };
  const sorted = [...open].sort((a, b) =>
    (a.calendar_date ?? "9999").localeCompare(b.calendar_date ?? "9999"),
  );
  return (
    <div className="next-step-workspace">
      <div className="plan-heading">
        <div>
          <p className="eyebrow">ONE THING AT A TIME</p>
          <h2 ref={heading} tabIndex={-1}>
            {open.length
              ? `${open.length} next ${open.length === 1 ? "step" : "steps"}. You’ve got this.`
              : complete.length
                ? "A little more breathing room."
                : "Turn a notice into a next step."}
          </h2>
          <p className="muted">
            Your checklist stays here for this session. Save a copy before you
            leave.
          </p>
        </div>
        {tasks.length > 0 && (
          <Button
            variant="secondary"
            onClick={() =>
              downloadFile("abridge-my-next-steps.txt", planText(tasks))
            }
          >
            <Download size={17} aria-hidden="true" /> Save my plan (.txt)
          </Button>
        )}
      </div>
      <p className="sr-only" role="status">
        {open.length} steps remaining. {complete.length} completed.
      </p>
      {!tasks.length && (
        <section className="panel plan-empty">
          <CheckCheck size={32} aria-hidden="true" />
          <h3>Less to keep in your head.</h3>
          <p>
            Bring a letter, review the AI’s suggestions, and add the steps you
            want to follow.
          </p>
          <Button onClick={onNotice}>Read a notice</Button>
        </section>
      )}
      <div className="task-list">
        {sorted.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            update={(patch) => update(task.id, patch)}
            remove={() =>
              onChange((current) => current.filter((t) => t.id !== task.id))
            }
          />
        ))}
      </div>
      {complete.length > 0 && (
        <details className="panel completed-tasks">
          <summary id="completed-task-summary">
            Completed ({complete.length})
          </summary>
          <div className="task-list">
            {complete.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                update={(patch) => update(task.id, patch)}
                remove={() =>
                  onChange((current) => current.filter((t) => t.id !== task.id))
                }
              />
            ))}
          </div>
        </details>
      )}
      {tasks.length > 0 && (
        <p className="field-hint">
          Saved plans contain notice excerpts and your notes. Marking a task
          complete does not submit it to anyone.
        </p>
      )}
      <details className="panel human-help">
        <summary>Want a person to help?</summary>
        <p>Use your plan to start a conversation with a community navigator.</p>
        <div className="help-links">
          <div>
            <ExternalLink href="https://211.org/">
              Find local support with 211
            </ExternalLink>
            <p>
              Food, housing, utilities, and other community referrals.
              Availability varies.
            </p>
          </div>
          <div>
            <ExternalLink href="https://www.lsc.gov/about-lsc/what-legal-aid/i-need-legal-help">
              Find civil legal aid
            </ExternalLink>
            <p>
              Locate an LSC-funded organization for civil legal problems.
              Services have their own eligibility rules.
            </p>
          </div>
        </div>
        <p className="field-hint">
          These directories open separately. Abridge does not send your plan or
          contact them.
        </p>
      </details>
    </div>
  );
};

const TaskCard = ({
  task,
  update,
  remove,
}: {
  task: ManagedTask;
  update: (patch: Partial<ManagedTask>) => void;
  remove: () => void;
}) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [reminder, setReminder] = useState(task.calendar_date ?? "");
  const alive = useRef(true);
  const draftVersion = useRef(0);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const prepare = async () => {
    const version = ++draftVersion.current;
    setBusy(true);
    setError("");
    setStatus("");
    try {
      const output = await api.conversation({
        source_text: task.evidence.join("\n"),
        situation: task.situation,
        audience: task.audience,
      });
      if (alive.current && draftVersion.current === version)
        update({ draft: output.draft.questions.join("\n\n") });
    } catch (e) {
      if (alive.current)
        setError(e instanceof Error ? e.message : "Try again.");
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  return (
    <article
      className={`panel task-card ${task.completed ? "task-complete" : ""}`}
    >
      <div className="task-topline">
        <label className="task-check">
          <input
            id={`task-${task.id}`}
            type="checkbox"
            checked={task.completed}
            onChange={(e) => update({ completed: e.target.checked })}
          />
          <span>
            <small>{task.notice}</small>
            <strong>{actionLabels[task.kind]}</strong>
            <span className="sr-only"> — mark complete</span>
          </span>
        </label>
        <button
          className="task-remove"
          aria-label={`Remove ${actionLabels[task.kind]} from ${task.notice}`}
          onClick={remove}
        >
          <Trash2 size={17} aria-hidden="true" />
        </button>
      </div>
      <div className="task-evidence">
        {task.evidence.map((line, i) => (
          <blockquote key={i}>{line}</blockquote>
        ))}
      </div>
      <p className="task-date">
        <CalendarDays size={16} aria-hidden="true" />
        {task.calendar_date
          ? `Date mentioned: ${formatDate(task.calendar_date)}`
          : task.deadline_text
            ? "Timing needs a closer look. Check the quoted wording."
            : "No deadline identified. Ask the sender if one applies."}
      </p>
      {!task.completed && (
        <div className="task-details">
          <details className="conversation-prep">
            <summary>
              <MessageCircle size={17} aria-hidden="true" /> Prepare a
              conversation
            </summary>
            <form
              autoComplete="off"
              onSubmit={(e) => {
                e.preventDefault();
                void prepare();
              }}
            >
              <div className="field">
                <label htmlFor={`situation-${task.id}`}>
                  What might make this step difficult?
                </label>
                <p className="field-hint">
                  Optional. No names or case numbers needed.
                </p>
                <textarea
                  id={`situation-${task.id}`}
                  maxLength={1000}
                  rows={3}
                  placeholder="For example: I work during office hours and don’t have a recent pay stub."
                  value={task.situation}
                  disabled={busy}
                  onChange={(e) => {
                    draftVersion.current++;
                    update({ situation: e.target.value, draft: "" });
                  }}
                />
              </div>
              <div className="field">
                <label htmlFor={`audience-${task.id}`}>
                  Who will you talk to?
                </label>
                <select
                  id={`audience-${task.id}`}
                  value={task.audience}
                  disabled={busy}
                  onChange={(e) => {
                    draftVersion.current++;
                    update({
                      audience: e.target.value as ManagedTask["audience"],
                      draft: "",
                    });
                  }}
                >
                  <option value="sender">The notice’s sender</option>
                  <option value="navigator">A community navigator</option>
                </select>
              </div>
              <ErrorBox message={error} />
              <Button variant="secondary" type="submit" busy={busy}>
                <Sparkles size={16} aria-hidden="true" />
                {busy ? "Preparing on your device…" : "Help me ask"}
              </Button>
            </form>
            {task.draft && (
              <div className="conversation-draft">
                <label htmlFor={`draft-${task.id}`}>
                  Your questions — review and edit
                </label>
                <textarea
                  id={`draft-${task.id}`}
                  rows={8}
                  maxLength={5000}
                  value={task.draft}
                  onChange={(e) => {
                    draftVersion.current++;
                    update({ draft: e.target.value });
                  }}
                />
                <p className="field-hint">
                  AI draft. Check it before using it. Nothing is sent for you.
                </p>
                <Button
                  variant="ghost"
                  onClick={() => {
                    void (async () => {
                      try {
                        await navigator.clipboard.writeText(task.draft);
                        if (alive.current) setStatus("Questions copied.");
                      } catch {
                        if (alive.current)
                          setStatus(
                            "Copy is unavailable. Select the questions or save your plan.",
                          );
                      }
                    })();
                  }}
                >
                  Copy questions
                </Button>
              </div>
            )}
          </details>
          <details className="calendar-prep">
            <summary>Save a calendar reminder</summary>
            <p className="field-hint">
              Check “before,” “received by,” and any times in the original.
              Choose when you want a reminder.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                try {
                  downloadFile(
                    "abridge-reminder.ics",
                    calendarFile(reminder, crypto.randomUUID()),
                    "text/calendar",
                  );
                  setStatus(
                    "Calendar file saved. Import it into your calendar to enable its reminder.",
                  );
                } catch (e) {
                  setStatus(
                    e instanceof Error ? e.message : "Choose a valid date.",
                  );
                }
              }}
            >
              <div className="field">
                <label htmlFor={`reminder-${task.id}`}>
                  Your reminder date
                </label>
                <input
                  type="date"
                  id={`reminder-${task.id}`}
                  required
                  value={reminder}
                  onChange={(e) => setReminder(e.target.value)}
                />
              </div>
              <Button variant="secondary" type="submit">
                Save reminder (.ics)
              </Button>
            </form>
            <p className="field-hint">
              The file requests a 9 a.m. alert on your chosen date. It has a
              generic title with no notice text. Your calendar may sync it or
              change its alerts.
            </p>
          </details>
        </div>
      )}
      <details className="task-original">
        <summary>Original notice</summary>
        <p className="preserve-text">{task.original}</p>
      </details>
      <p role="status" className="field-hint">
        {status}
      </p>
    </article>
  );
};
