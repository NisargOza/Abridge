import { ArrowRight, BookOpenText, HeartHandshake, Wallet } from "lucide-react";
import { Bridge } from "../components/Bridge";
import { Button } from "../components/ui/Primitives";
import type { BudgetResult, Screening } from "../lib/types";
import { money } from "../lib/utils";

export const OverviewPage = ({
  likely,
  screening,
  budget,
  onSupport,
  onBudget,
  onDocument,
}: {
  likely: number;
  screening: Screening | null;
  budget: BudgetResult | null;
  onSupport: () => void;
  onBudget: () => void;
  onDocument: () => void;
}) => (
  <>
    <div className="page-heading">
      <div>
        <p className="eyebrow">ONE SMALL STEP AT A TIME</p>
        <h1 tabIndex={-1}>Your space, at your pace.</h1>
        <p>
          Your results are here for this session. Pick up where you left off.
        </p>
      </div>
    </div>
    <section className="hero">
      <div className="hero-copy">
        <div className="hero-eyebrow">
          <span />
          YOUR NEXT STEP
        </div>
        <h2>
          {screening
            ? "A few doors worth opening."
            : "Your money plan is ready."}
        </h2>
        <p>
          {screening
            ? `${likely} income routes are within the limits you checked. Take a closer look at the details, then choose one next step.`
            : "You have a clearer picture of what comes in and goes out. Take a look at your plan when you’re ready."}
        </p>
        <Button onClick={screening ? onSupport : onBudget}>
          {screening ? "Review support options" : "Review my money plan"}
          <ArrowRight size={18} aria-hidden="true" />
        </Button>
      </div>
      <Bridge />
    </section>
    <section
      className="workspace-tools"
      aria-labelledby="workspace-tools-title"
    >
      <div className="section-heading">
        <h2 id="workspace-tools-title">Your tools, when you need them</h2>
      </div>
      <div className="workspace-tool-list">
        <button onClick={onSupport}>
          <span className="tool-icon sage">
            <HeartHandshake size={22} aria-hidden="true" />
          </span>
          <span>
            <strong>
              {screening ? "Review your support check" : "Check for support"}
            </strong>
            <small>
              {screening
                ? `${likely} income routes within limits · full program details`
                : "Explore programs and see what else is needed"}
            </small>
          </span>
          <ArrowRight size={18} aria-hidden="true" />
        </button>
        <button onClick={onBudget}>
          <span className="tool-icon peach">
            <Wallet size={22} aria-hidden="true" />
          </span>
          <span>
            <strong>
              {budget ? "Review your budget" : "Build a money plan"}
            </strong>
            <small>
              {budget
                ? `${money(budget.remaining)} after listed costs · debt comparisons ready`
                : "Put essentials first, then explore debt payments"}
            </small>
          </span>
          <ArrowRight size={18} aria-hidden="true" />
        </button>
        <button onClick={onDocument}>
          <span className="tool-icon lavender">
            <BookOpenText size={22} aria-hidden="true" />
          </span>
          <span>
            <strong>Read a document in plain words</strong>
            <small>Private help with a letter, notice, or form</small>
          </span>
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
    </section>
  </>
);
