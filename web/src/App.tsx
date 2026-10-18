import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ChevronRight,
  FileText,
  HeartHandshake,
  LayoutDashboard,
  Menu,
  ShieldCheck,
  Sparkles,
  Sprout,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { api, clearPendingRequests } from "./lib/api";
import { emptyPaperwork } from "./lib/paperwork";
import type {
  BudgetInput,
  BudgetResult,
  Health,
  Household,
  Screening,
} from "./lib/types";
import { WelcomeHeader, WelcomePage } from "./pages/WelcomePage";
import { OverviewPage } from "./pages/OverviewPage";
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
  { id: "documents", label: "Paperwork & next steps", icon: FileText },
] as const;

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
  const [paperwork, setPaperwork] = useState(emptyPaperwork);
  const [health, setHealth] = useState<Health | null>(null);
  const [sample, setSample] = useState(false);
  const [sampleBusy, setSampleBusy] = useState(false);
  const [error, setError] = useState("");
  const main = useRef<HTMLElement>(null);
  const previousPage = useRef<Page>("home");
  const alive = useRef(true);
  const sampleAttempt = useRef(0);
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
  useEffect(() => {
    if (!mobileMenu) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileMenu(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileMenu]);
  const navigate = (target: Page) => {
    sampleAttempt.current += 1;
    setSampleBusy(false);
    setPage(target);
    setMobileMenu(false);
    setError("");
    window.scrollTo({ top: 0, behavior: "instant" });
  };
  const explore = async () => {
    const attempt = ++sampleAttempt.current;
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
      if (!alive.current || attempt !== sampleAttempt.current) return;
      setHousehold(h);
      setScreening(s);
      setBudgetInput(b);
      setBudgetResult(r);
      setSample(true);
      navigate("benefits");
    } catch (e) {
      if (alive.current && attempt === sampleAttempt.current)
        setError(e instanceof Error ? e.message : "Try again.");
    } finally {
      if (alive.current && attempt === sampleAttempt.current)
        setSampleBusy(false);
    }
  };
  const startCheck = () => {
    if (sample) {
      setHousehold(null);
      setScreening(null);
      setBudgetInput(null);
      setBudgetResult(null);
      setSample(false);
    }
    navigate("check");
  };
  const chooseTool = (target: "check" | "budget" | "documents" | "privacy") => {
    if (target === "check") startCheck();
    else navigate(target);
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
  const isWelcome =
    page === "home" &&
    !household &&
    !budgetInput &&
    !paperwork.text &&
    !paperwork.tasks.length;
  return (
    <div className={`app-layout ${isWelcome ? "welcome-layout" : ""}`}>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      {!isWelcome && (
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
              aria-controls="primary-navigation"
              onClick={() => setMobileMenu(!mobileMenu)}
            >
              {mobileMenu ? <X /> : <Menu />}
            </button>
          </div>
          <div className="sidebar-tagline">A little help. A way forward.</div>
          <nav className="nav-items" id="primary-navigation">
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
            <button
              className="nav-item privacy-nav"
              onClick={() => navigate("privacy")}
              aria-current={page === "privacy" ? "page" : undefined}
            >
              <ShieldCheck size={20} aria-hidden="true" />
              Privacy & local setup
            </button>
            <div className="sidebar-foot">
              MADE FOR PEOPLE, NOT PROFIT{" "}
              <Sprout size={14} aria-hidden="true" />
            </div>
          </div>
        </aside>
      )}
      <div className="workspace">
        {isWelcome ? (
          <WelcomeHeader
            onHome={() => navigate("home")}
            onChoose={chooseTool}
          />
        ) : (
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
                <span className="status-dot" aria-hidden="true" />
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
        )}
        <main id="main" ref={main} className="main-content">
          {sample && (
            <div className="sample-banner">
              <Sparkles size={16} aria-hidden="true" />
              <span>
                Sample household · 3 people in New York. These are made-up
                details.
              </span>
              <button onClick={startCheck}>
                Use my information <ArrowRight size={14} aria-hidden="true" />
              </button>
            </div>
          )}
          <div
            className={`page-stage page-${page} ${isWelcome ? "page-welcome" : ""}`}
            key={`${page}-${isWelcome ? "welcome" : "workspace"}`}
          >
            {page === "home" &&
              (isWelcome ? (
                <WelcomePage
                  busy={sampleBusy}
                  error={error}
                  onStart={startCheck}
                  onSample={() => {
                    void explore();
                  }}
                />
              ) : (
                <OverviewPage
                  likely={likely}
                  screening={screening}
                  budget={budgetResult}
                  openTasks={
                    paperwork.tasks.filter((task) => !task.completed).length
                  }
                  onSupport={() =>
                    screening ? navigate("benefits") : startCheck()
                  }
                  onBudget={() => navigate("budget")}
                  onDocument={() => navigate("documents")}
                />
              ))}
            {page === "check" && (
              <CheckPage initial={household} onComplete={complete} />
            )}
            {page === "benefits" && (
              <BenefitsPage
                result={screening}
                household={household}
                onCheck={startCheck}
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
            {page === "documents" && (
              <DocumentsPage state={paperwork} setState={setPaperwork} />
            )}
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
          </div>
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
