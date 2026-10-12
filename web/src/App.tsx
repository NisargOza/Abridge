import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpenText,
  Check,
  ChevronRight,
  CircleHelp,
  FileText,
  HeartHandshake,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  ShieldCheck,
  Sparkles,
  Sprout,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { Button, ErrorBox } from "./components/ui/Primitives";
import { api, clearPendingRequests } from "./lib/api";
import type {
  BudgetInput,
  BudgetResult,
  Health,
  Household,
  Screening,
} from "./lib/types";
import { money } from "./lib/utils";
import { CheckPage } from "./pages/CheckPage";
import { BenefitsPage } from "./pages/BenefitsPage";
import { BudgetPage } from "./pages/BudgetPage";
import { DocumentsPage } from "./pages/DocumentsPage";
import { PrivacyPage } from "./pages/PrivacyPage";

export type Page =
  "home" | "check" | "benefits" | "budget" | "documents" | "privacy";
const navigation = [
  { id: "home", label: "Overview", icon: LayoutDashboard },
  { id: "benefits", label: "Find support", icon: HeartHandshake },
  { id: "budget", label: "My money plan", icon: Wallet },
  { id: "documents", label: "Understand a document", icon: FileText },
] as const;

const Bridge = () => (
  <svg viewBox="0 0 330 205" className="bridge-art" aria-hidden="true">
    <circle cx="256" cy="46" r="25" fill="#e6b573" />
    <path d="M0 181Q81 150 159 176T330 178V205H0" fill="#496558" />
    <path
      d="M47 158V126a118 118 0 0 1 236 0v32"
      fill="none"
      stroke="#719182"
      strokeWidth="24"
    />
    <path
      d="M75 158V129a90 90 0 0 1 180 0v29"
      fill="none"
      stroke="#dce5d4"
      strokeWidth="17"
    />
    <path
      d="M105 158V134a60 60 0 0 1 120 0v24"
      fill="none"
      stroke="#b9cbb6"
      strokeWidth="13"
    />
    <path
      d="M28 162h273"
      stroke="#eddfba"
      strokeWidth="9"
      strokeLinecap="round"
    />
    <path
      d="M11 193q58-13 107 0t92 0t111 0"
      fill="none"
      stroke="#98afa0"
      strokeWidth="2"
    />
    <path
      d="M311 157v-31m0 13-13-13m13 7 10-15"
      stroke="#a8c0a4"
      strokeWidth="3"
      fill="none"
    />
  </svg>
);

export const App = () => {
  const [session, setSession] = useState(0);
  const [cleared, setCleared] = useState(false);
  const reset = () => {
    clearPendingRequests();
    setSession((s) => s + 1);
    setCleared(true);
  };
  return (
    <>
      <Session key={session} reset={reset} />
      <div className="sr-only" role="status">
        {cleared
          ? "Your financial information and documents have been cleared from this session."
          : ""}
      </div>
    </>
  );
};

const Session = ({ reset }: { reset: () => void }) => {
  const [page, setPage] = useState<Page>("home");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [household, setHousehold] = useState<Household | null>(null);
  const [screening, setScreening] = useState<Screening | null>(null);
  const [budgetInput, setBudgetInput] = useState<BudgetInput | null>(null);
  const [budgetResult, setBudgetResult] = useState<BudgetResult | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [sample, setSample] = useState(false);
  const [sampleBusy, setSampleBusy] = useState(false);
  const [error, setError] = useState("");
  const main = useRef<HTMLElement>(null);
  const previousPage = useRef<Page>("home");
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    void api
      .health()
      .then((h) => {
        if (alive.current) setHealth(h);
      })
      .catch(() => {
        if (alive.current) setHealth(null);
      });
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (previousPage.current !== page)
      main.current?.querySelector("h1")?.focus();
    previousPage.current = page;
    document.title = `Abridge · ${page === "home" ? "A little breathing room" : page === "check" ? "Check for support" : (navigation.find((n) => n.id === page)?.label ?? "Your privacy")}`;
  }, [page]);
  const navigate = (target: Page) => {
    setPage(target);
    setMobileMenu(false);
    setError("");
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const explore = async () => {
    setSampleBusy(true);
    setError("");
    const h: Household = {
      state: "NY",
      household_size: 3,
      monthly_gross_income: 2400,
      household_confirmed: true,
      school_participating: true,
      lifeline_already_received: false,
      wic_category: null,
    };
    const b: BudgetInput = {
      monthly_take_home: 2100,
      monthly_gross_income: 2400,
      expenses: {
        housing: 850,
        utilities: 140,
        food: 280,
        transport: 100,
        health: 40,
        other: 40,
      },
      debts: [
        {
          id: "sample-card",
          name: "Credit card",
          balance: 1800,
          apr: 22,
          minimum_payment: 60,
        },
        {
          id: "sample-medical",
          name: "Medical bill",
          balance: 650,
          apr: 0,
          minimum_payment: 35,
        },
      ],
      extra_payment: 75,
    };
    try {
      const [s, r] = await Promise.all([api.screen(h), api.budget(b)]);
      if (!alive.current) return;
      setHousehold(h);
      setScreening(s);
      setBudgetInput(b);
      setBudgetResult(r);
      setSample(true);
    } catch (e) {
      if (alive.current)
        setError(e instanceof Error ? e.message : "Try again.");
    } finally {
      if (alive.current) setSampleBusy(false);
    }
  };
  const complete = (h: Household, s: Screening) => {
    setHousehold(h);
    setScreening(s);
    setSample(false);
    navigate("benefits");
  };
  const likely =
    screening?.programs.filter((p) => p.status === "likely_eligible").length ??
    0;
  return (
    <div className="app-layout">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside
        className={`sidebar ${mobileMenu ? "is-open" : ""}`}
        aria-label="Main navigation"
      >
        <div className="brand-row">
          <button
            className="brand"
            onClick={() => navigate("home")}
            aria-label="Abridge home"
          >
            <img src="/icon.svg" alt="" />
            <span>
              abridge<span className="brand-dot">.</span>
            </span>
          </button>
          <button
            className="menu-toggle"
            aria-label={mobileMenu ? "Close navigation" : "Open navigation"}
            aria-expanded={mobileMenu}
            onClick={() => setMobileMenu(!mobileMenu)}
          >
            {mobileMenu ? <X /> : <Menu />}
          </button>
        </div>
        <div className="sidebar-tagline">A little help. A way forward.</div>
        <nav className="nav-items">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => navigate(id)}
              className={`nav-item ${page === id || (id === "benefits" && page === "check") ? "active" : ""}`}
              aria-current={page === id ? "page" : undefined}
            >
              <Icon size={20} aria-hidden="true" />
              {label}
              {page === id && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy-mini">
            <div className="icon-box">
              <LockKeyhole size={19} aria-hidden="true" />
            </div>
            <strong>Your story stays yours.</strong>
            <p>Your information stays on this device. Always.</p>
            <button onClick={() => navigate("privacy")}>
              How we protect your privacy{" "}
              <ArrowUpRight size={14} aria-hidden="true" />
            </button>
          </div>
          <button
            className="nav-item privacy-nav"
            onClick={() => navigate("privacy")}
            aria-current={page === "privacy" ? "page" : undefined}
          >
            <ShieldCheck size={20} aria-hidden="true" />
            Privacy & local setup
          </button>
          <div className="sidebar-foot">
            MADE FOR PEOPLE, NOT PROFIT <Sprout size={14} aria-hidden="true" />
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span className="breadcrumb">
            Your space <ChevronRight size={14} aria-hidden="true" />{" "}
            <strong>
              {page === "check"
                ? "Check for support"
                : page === "privacy"
                  ? "Privacy & setup"
                  : navigation.find((n) => n.id === page)?.label}
            </strong>
          </span>
          <div className="topbar-right">
            <span className="private-badge">
              <span className="status-dot" />
              Private by design
            </span>
            <button
              className="clear-button"
              aria-label="Clear session"
              onClick={reset}
            >
              <Trash2 size={15} aria-hidden="true" />
              <span>Clear session</span>
            </button>
          </div>
        </header>
        <main id="main" ref={main} className="main-content">
          {sample && (
            <div className="sample-banner">
              <Sparkles size={16} aria-hidden="true" />
              <span>
                You’re exploring sample data. These are not your personal
                results.
              </span>
              <button onClick={() => navigate("check")}>
                Use my information <ArrowRight size={14} aria-hidden="true" />
              </button>
            </div>
          )}
          {page === "home" && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">ONE SMALL STEP AT A TIME</p>
                  <h1 tabIndex={-1}>
                    {household
                      ? "Welcome back to your space."
                      : "Let’s find your way forward."}
                  </h1>
                  <p>
                    Money can feel heavy. You don’t have to figure it all out at
                    once.
                  </p>
                </div>
                <span className="quiet-label">
                  <LockKeyhole size={15} aria-hidden="true" />
                  No account needed
                </span>
              </div>
              <ErrorBox message={error} />
              <section className="hero">
                <div className="hero-copy">
                  <div className="hero-eyebrow">
                    <span /> A LITTLE HELP CAN GO A LONG WAY
                  </div>
                  <h2>
                    A little breathing room.
                    <br />
                    <em>A clearer next step.</em>
                  </h2>
                  <p>
                    Find support you may qualify for, make a money plan, and
                    turn confusing paperwork into plain words.
                  </p>
                  <Button onClick={() => navigate("check")}>
                    {household
                      ? "Update my support check"
                      : "Find support for me"}
                    <ArrowRight size={18} aria-hidden="true" />
                  </Button>
                  <div className="hero-note">
                    <ShieldCheck size={15} aria-hidden="true" />
                    Free to use. No judgment. Just support.
                  </div>
                </div>
                <Bridge />
              </section>
              <div className="section-heading">
                <h2>
                  {household ? "Your next steps" : "Start wherever you are"}
                </h2>
                <span>YOU SET THE PACE</span>
              </div>
              <div className="tool-grid">
                <button
                  className="tool-card"
                  onClick={() => navigate(household ? "benefits" : "check")}
                >
                  <span className="tool-icon sage">
                    <HeartHandshake size={25} aria-hidden="true" />
                  </span>
                  <span className="tool-title">
                    Find a little support{" "}
                    <ArrowUpRight size={19} aria-hidden="true" />
                  </span>
                  <span className="tool-description">
                    Explore help with food, health care, phone bills, and more.
                  </span>
                  <span className="tool-footer">
                    {screening
                      ? `${likely} income checks within limits`
                      : "A few questions to get started"}
                    <ArrowRight size={16} aria-hidden="true" />
                  </span>
                </button>
                <button
                  className="tool-card"
                  onClick={() => navigate("budget")}
                >
                  <span className="tool-icon peach">
                    <Wallet size={25} aria-hidden="true" />
                  </span>
                  <span className="tool-title">
                    Make room in your budget{" "}
                    <ArrowUpRight size={19} aria-hidden="true" />
                  </span>
                  <span className="tool-description">
                    See what’s coming in, what’s going out, and a debt plan that
                    fits.
                  </span>
                  <span className="tool-footer">
                    {budgetResult
                      ? `${money(budgetResult.remaining)} after listed costs`
                      : "Small steps, a clearer picture"}
                    <ArrowRight size={16} aria-hidden="true" />
                  </span>
                </button>
                <button
                  className="tool-card"
                  onClick={() => navigate("documents")}
                >
                  <span className="tool-icon lavender">
                    <BookOpenText size={25} aria-hidden="true" />
                  </span>
                  <span className="tool-title">
                    Make sense of the fine print{" "}
                    <ArrowUpRight size={19} aria-hidden="true" />
                  </span>
                  <span className="tool-description">
                    Get a plain-language version of a letter, notice, or form.
                  </span>
                  <span className="tool-footer">
                    Private AI on your computer
                    <ArrowRight size={16} aria-hidden="true" />
                  </span>
                </button>
              </div>
              <div className="home-bottom">
                <section className="why-card">
                  <div className="section-heading">
                    <h2>A space built around you</h2>
                    <span className="small-bridge">⌒</span>
                  </div>
                  <div className="promise-row">
                    <span>
                      <Check size={16} aria-hidden="true" />
                    </span>
                    <div>
                      <h3>Your privacy comes first</h3>
                      <p>No sign-ups, no trackers, no sharing your story.</p>
                    </div>
                  </div>
                  <div className="promise-row">
                    <span>
                      <Check size={16} aria-hidden="true" />
                    </span>
                    <div>
                      <h3>Clear answers, honest limits</h3>
                      <p>
                        We tell you what we know and what needs another look.
                      </p>
                    </div>
                  </div>
                  <div className="promise-row">
                    <span>
                      <Check size={16} aria-hidden="true" />
                    </span>
                    <div>
                      <h3>Progress, at your pace</h3>
                      <p>
                        Start small. Come back to the rest when you’re ready.
                      </p>
                    </div>
                  </div>
                </section>
                <section className="gentle-card">
                  <CircleHelp size={23} aria-hidden="true" />
                  <h2>Not sure where to start?</h2>
                  <p>
                    Take a look around with a sample household. See how Abridge
                    can help before sharing anything.
                  </p>
                  <Button
                    variant="secondary"
                    busy={sampleBusy}
                    onClick={() => {
                      void explore();
                    }}
                  >
                    Explore a sample
                    <ArrowRight size={16} aria-hidden="true" />
                  </Button>
                  <span>Made-up details. Real calculations.</span>
                </section>
              </div>
            </>
          )}
          {page === "check" && (
            <CheckPage initial={household} onComplete={complete} />
          )}
          {page === "benefits" && (
            <BenefitsPage
              result={screening}
              household={household}
              onCheck={() => navigate("check")}
            />
          )}
          {page === "budget" && (
            <BudgetPage
              initial={budgetInput}
              household={household}
              result={budgetResult}
              onResult={(b, r) => {
                setBudgetInput(b);
                setBudgetResult(r);
              }}
            />
          )}
          {page === "documents" && <DocumentsPage />}
          {page === "privacy" && (
            <PrivacyPage
              health={health}
              reset={reset}
              refresh={() => {
                void api
                  .health()
                  .then(setHealth)
                  .catch(() => setHealth(null));
              }}
            />
          )}
          <footer className="main-footer">
            <span>
              <Sprout size={15} aria-hidden="true" />A little help. A way
              forward.
            </span>
            <p>
              This is an estimate, not legal, tax, or financial advice. The
              agency makes the final decision.
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
};
