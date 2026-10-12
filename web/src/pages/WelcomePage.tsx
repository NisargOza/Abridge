import { useRef } from "react";
import {
  ArrowRight,
  BookOpenText,
  ChevronDown,
  HeartHandshake,
  LockKeyhole,
  Sprout,
  Wallet,
} from "lucide-react";
import { Bridge } from "../components/Bridge";
import { Button, ErrorBox } from "../components/ui/Primitives";

type Tool = "check" | "budget" | "documents" | "privacy";

export const WelcomeHeader = ({
  onHome,
  onChoose,
}: {
  onHome: () => void;
  onChoose: (tool: Tool) => void;
}) => {
  const menu = useRef<HTMLDetailsElement>(null);
  const choose = (tool: Tool) => {
    if (menu.current) menu.current.open = false;
    onChoose(tool);
  };
  return (
    <header className="welcome-header">
      <button className="brand" onClick={onHome} aria-label="Abridge home">
        <img src="/icon.svg" alt="" />
        <span>
          abridge<span className="brand-dot">.</span>
        </span>
      </button>
      <nav aria-label="Welcome navigation" className="welcome-navigation">
        <a href="#how-it-works" className="welcome-how">
          How it works
        </a>
        <details
          ref={menu}
          className="welcome-tools"
          onKeyDown={(event) => {
            if (event.key === "Escape" && menu.current) {
              menu.current.open = false;
              menu.current.querySelector("summary")?.focus();
            }
          }}
        >
          <summary>
            Tools
            <ChevronDown size={15} aria-hidden="true" />
          </summary>
          <div className="welcome-tool-menu">
            <button onClick={() => choose("check")}>
              <HeartHandshake size={18} aria-hidden="true" />
              Find support
            </button>
            <button onClick={() => choose("budget")}>
              <Wallet size={18} aria-hidden="true" />
              My money plan
            </button>
            <button onClick={() => choose("documents")}>
              <BookOpenText size={18} aria-hidden="true" />
              Understand a document
            </button>
          </div>
        </details>
        <button
          className="welcome-privacy"
          aria-label="Privacy & local setup"
          onClick={() => choose("privacy")}
        >
          <LockKeyhole size={15} aria-hidden="true" />
          <span>Privacy & local setup</span>
        </button>
      </nav>
    </header>
  );
};

export const WelcomePage = ({
  busy,
  error,
  onStart,
  onSample,
}: {
  busy: boolean;
  error: string;
  onStart: () => void;
  onSample: () => void;
}) => (
  <>
    <section className="welcome-hero">
      <div className="welcome-copy">
        <p className="eyebrow">A LITTLE HELP. A WAY FORWARD.</p>
        <h1 tabIndex={-1}>
          A little breathing room.<span>A clearer next step.</span>
        </h1>
        <p className="welcome-intro">
          Money can feel heavy. Find support, make a money plan, and understand
          your paperwork—one small step at a time.
        </p>
        <div className="welcome-actions">
          <Button onClick={onStart}>
            Find support for me
            <ArrowRight size={18} aria-hidden="true" />
          </Button>
          <Button variant="ghost" busy={busy} onClick={onSample}>
            Explore a sample
            <ArrowRight size={17} aria-hidden="true" />
          </Button>
        </div>
        <ErrorBox message={error} />
        <p className="welcome-reassurance">
          <LockKeyhole size={14} aria-hidden="true" />
          Free to use. No account. Your details stay on this device.
        </p>
      </div>
      <div className="welcome-illustration">
        <span className="illustration-caption">
          <Sprout size={15} aria-hidden="true" />
          SMALL STEPS CAN MAKE ROOM
        </span>
        <Bridge />
        <span className="illustration-foot">At your pace. On your terms.</span>
      </div>
    </section>
    <section
      id="how-it-works"
      className="welcome-steps"
      aria-labelledby="steps-title"
    >
      <div className="welcome-section-heading">
        <p className="eyebrow">START WITH WHAT YOU NEED</p>
        <h2 id="steps-title">You don’t have to do everything today.</h2>
        <p>
          Start with a support check, or choose any tool from the menu above.
        </p>
      </div>
      <div className="welcome-step-grid">
        <article>
          <span className="step-mark">
            <HeartHandshake size={21} aria-hidden="true" />
          </span>
          <h3>Find a little support</h3>
          <p>
            A few questions show programs worth exploring, and what else an
            agency needs to know.
          </p>
        </article>
        <article>
          <span className="step-mark peach">
            <Wallet size={21} aria-hidden="true" />
          </span>
          <h3>Make room in your budget</h3>
          <p>
            See your monthly picture and compare two debt plans. Cover the
            basics first.
          </p>
        </article>
        <article>
          <span className="step-mark lavender">
            <BookOpenText size={21} aria-hidden="true" />
          </span>
          <h3>Make sense of a document</h3>
          <p>
            Read a letter or notice in plain words, with private AI running on
            your computer.
          </p>
        </article>
      </div>
    </section>
  </>
);
