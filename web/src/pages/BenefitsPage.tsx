import { useState } from "react";
import {
  ArrowRight,
  Check,
  Info,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import {
  Button,
  EmptyState,
  ErrorBox,
  ExternalLink,
} from "../components/ui/Primitives";
import { api } from "../lib/api";
import type { Explanation, Household, Screening, Status } from "../lib/types";
import { moneyExact } from "../lib/utils";

const labels: Record<Status, string> = {
  likely_eligible: "You may qualify",
  likely_ineligible: "May not qualify for this route",
  needs_more_information: "More information needed",
};
export const BenefitsPage = ({
  result,
  household,
  onCheck,
}: {
  result: Screening | null;
  household: Household | null;
  onCheck: () => void;
}) => {
  const [filter, setFilter] = useState("all");
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const explain = async () => {
    if (!household) return;
    setBusy(true);
    setError("");
    try {
      setExplanation(await api.explain(household));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">FIND SUPPORT</p>
          <h1 tabIndex={-1}>A few doors worth opening.</h1>
          <p>Start with one. You don’t have to apply for everything today.</p>
        </div>
        {result && (
          <Button variant="secondary" onClick={onCheck}>
            <SlidersHorizontal size={16} aria-hidden="true" />
            Update my details
          </Button>
        )}
      </div>
      {!result ? (
        <EmptyState title="Let’s find a place to start.">
          Answer a few questions to explore support programs.
          <br />
          <Button onClick={onCheck}>
            Check for support
            <ArrowRight size={16} aria-hidden="true" />
          </Button>
        </EmptyState>
      ) : (
        <>
          <div className="info-banner">
            <Info size={20} aria-hidden="true" />
            <div>
              <strong>This is a prescreen, not an approval.</strong>
              <p>
                Only Lifeline and school meal income routes are calculated.
                Other programs need an agency review. Limits use stored rules
                for {result.rule_year}.
              </p>
            </div>
          </div>
          <div className="results-bar">
            <p>
              <strong>
                {
                  result.programs.filter((p) => p.status === "likely_eligible")
                    .length
                }
              </strong>{" "}
              income routes within limits ·{" "}
              <strong>
                {
                  result.programs.filter(
                    (p) => p.status === "needs_more_information",
                  ).length
                }
              </strong>{" "}
              need another look
            </p>
            <div className="field compact">
              <label htmlFor="filter">Show</label>
              <select
                id="filter"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All programs</option>
                <option value="likely_eligible">You may qualify</option>
                <option value="needs_more_information">
                  More information needed
                </option>
                <option value="likely_ineligible">
                  May not qualify for this route
                </option>
              </select>
            </div>
          </div>
          <div className="program-grid">
            {result.programs
              .filter((p) => filter === "all" || p.status === filter)
              .map((p) => (
                <article className="program-card" key={p.id}>
                  <div className="program-top">
                    <span className="category-label">{p.category}</span>
                    <span className={`result-badge ${p.status}`}>
                      {p.status === "likely_eligible" && (
                        <Check size={14} aria-hidden="true" />
                      )}
                      {labels[p.status]}
                    </span>
                  </div>
                  <h2>{p.name}</h2>
                  <p className="scope">{p.scope}</p>
                  <p>{p.reason}</p>
                  {p.income_limit_monthly !== null && (
                    <div className="limit-line">
                      <span>Monthly income limit for this route</span>
                      <strong>{moneyExact(p.income_limit_monthly)}</strong>
                    </div>
                  )}
                  {p.missing.length > 0 && (
                    <details>
                      <summary>What else is needed?</summary>
                      <ul>
                        {p.missing.map((m) => (
                          <li key={m}>{m}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                  <div className="next-step">
                    <strong>Your next step</strong>
                    <p>{p.next_step}</p>
                  </div>
                  <ExternalLink href={p.application_url}>
                    Official application / information
                  </ExternalLink>
                  <div className="source-line">
                    <ExternalLink href={p.source.source_url}>
                      {p.source.source_title}
                    </ExternalLink>
                    <span>
                      Verified {p.source.fetched_at} · Rules{" "}
                      {p.source.rule_year}
                    </span>
                  </div>
                </article>
              ))}
          </div>
          <section className="panel ai-explain">
            <div>
              <Sparkles size={21} aria-hidden="true" />
              <h2>Read the source in plain words.</h2>
              <p>
                Optional local AI can explain public source excerpts. Your
                calculated results stay the same.
              </p>
            </div>
            <Button
              variant="secondary"
              busy={busy}
              onClick={() => {
                void explain();
              }}
            >
              Explain the sources
            </Button>
            <ErrorBox message={error} />
            {explanation && (
              <div className="explanation-results">
                {explanation.items.map((item, i) => (
                  <div key={i}>
                    <blockquote>{item.excerpt}</blockquote>
                    <p>{item.explanation}</p>
                    <ExternalLink href={item.source_url}>
                      {item.source_title}
                    </ExternalLink>
                  </div>
                ))}
                <p className="field-hint">
                  AI explanations can be wrong. Use the official source for
                  decisions.
                </p>
              </div>
            )}
          </section>
          <p className="data-note">
            {result.annual_poverty_guideline !== null
              ? `2026 HHS annual poverty guideline for your household: ${moneyExact(result.annual_poverty_guideline)}. Your reported annual income is ${result.poverty_percentage}% of this guideline.`
              : "Territory rules need local verification; a mainland guideline is not substituted."}
          </p>
        </>
      )}
    </>
  );
};
