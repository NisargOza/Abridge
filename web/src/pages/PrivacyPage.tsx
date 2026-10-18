import { LockKeyhole, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "../components/ui/Primitives";
import type { Health } from "../lib/types";

export const PrivacyPage = ({
  health,
  reset,
  refresh,
}: {
  health: Health | null;
  reset: () => void;
  refresh: () => void;
}) => (
  <>
    <div className="page-heading">
      <div>
        <p className="eyebrow">PRIVACY & LOCAL SETUP</p>
        <h1 tabIndex={-1}>Your story stays yours.</h1>
        <p>Useful help should not cost you your privacy.</p>
      </div>
    </div>
    <div className="privacy-grid">
      <section className="panel">
        <ShieldCheck size={29} aria-hidden="true" />
        <h2>What stays on your device</h2>
        <ul className="privacy-list">
          <li>Your income, household details, budget, and debts</li>
          <li>
            Your document text, checklist, conversation drafts, and AI answers
          </li>
          <li>Every benefits check and money calculation</li>
        </ul>
        <p>
          Your browser sends private requests only to 127.0.0.1 on this
          computer. The local engine talks only to the local AI. We do not use
          trackers, accounts, or cloud AI.
        </p>
        <p>
          Entries live in memory for this session. A refresh clears them.
          Abridge stores only public program knowledge and the app’s offline
          shell by default.
        </p>
        <p>
          Plans and calendar files are saved only when you choose to download
          them. Those files remain after clearing the session. Calendar files
          have a generic title; your calendar may sync them.
        </p>
        <Button variant="secondary" onClick={reset}>
          <Trash2 size={16} aria-hidden="true" />
          Clear my session now
        </Button>
      </section>
      <section className="panel">
        <LockKeyhole size={29} aria-hidden="true" />
        <h2>Your local tools</h2>
        <div className="runtime-status">
          <span>Calculation engine</span>
          <strong className={health ? "ready" : "offline"}>
            {health ? "Connected" : "Not connected"}
          </strong>
        </div>
        <div className="runtime-status">
          <span>Local AI</span>
          <strong className={health?.local_ai ? "ready" : "offline"}>
            {health?.local_ai ? "Ready on this computer" : "Not running"}
          </strong>
        </div>
        <Button variant="ghost" onClick={refresh}>
          <RefreshCw size={16} aria-hidden="true" />
          Check connection
        </Button>
        <p>
          AI is optional for benefits and budgeting. Notice analysis and
          conversation preparation need the local AI runtime.
        </p>
        <h3>Start from the repository folder</h3>
        <pre>
          cd engine
          <br />
          uv sync
          <br />
          uv run uvicorn abridge.api.main:app --host 127.0.0.1 --port 8000
          --no-access-log
        </pre>
        <h3>Set up AI once</h3>
        <pre>
          ./scripts/download-model.sh
          <br />
          ./scripts/run-llm.sh
        </pre>
        <p className="field-hint">
          The model download is about 2.84 GB. It contains no personal data.
          Inference runs offline on a desktop computer. Phone inference is not
          supported.
        </p>
      </section>
      <section className="panel">
        <h2>When the internet is used</h2>
        <p>
          The separate source updater fetches public agency pages. It never
          receives your entries. The app makes no background calls to agencies
          during a benefits check.
        </p>
        <p>
          Official links open an agency’s website in a new tab. Abridge sends no
          financial entries with the link. That website has its own privacy
          policy.
        </p>
        <h3>Offline use</h3>
        <p>
          After a production install, the app shell can load offline.
          Calculations still need the local engine. Rewriting also needs the
          downloaded model and local AI service.
        </p>
      </section>
      <section className="panel">
        <h2>Honest limits</h2>
        <p>
          This is a prescreen, not an agency decision. Lifeline and school meal
          income routes use reviewed 2026 rules. WIC, SNAP, and Medicaid are
          information only.
        </p>
        <p>
          We do not submit applications. Missing program facts stay missing.
          Out-of-date rules stop producing an income prescreen.
        </p>
        <p>
          Debt plans assume fixed rates and payments, no new fees or purchases,
          and monthly interest. They help you compare paths, without promising
          an outcome.
        </p>
      </section>
    </div>
  </>
);
