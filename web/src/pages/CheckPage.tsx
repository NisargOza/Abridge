import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, LockKeyhole } from "lucide-react";
import { Button, ErrorBox, Field } from "../components/ui/Primitives";
import { api } from "../lib/api";
import type { Household, Screening, Tri } from "../lib/types";
import { stateOptions } from "../lib/utils";

const Question = ({
  id,
  label,
  hint,
  value,
  set,
}: {
  id: string;
  label: string;
  hint: string;
  value: Tri;
  set: (v: Tri) => void;
}) => (
  <div className="field">
    <label htmlFor={id}>{label}</label>
    <p id={`${id}-hint`} className="field-hint">
      {hint}
    </p>
    <select
      id={id}
      aria-describedby={`${id}-hint`}
      value={value === null ? "" : String(value)}
      onChange={(e) =>
        set(e.target.value === "" ? null : e.target.value === "true")
      }
    >
      <option value="">I’m not sure / skip</option>
      <option value="true">Yes</option>
      <option value="false">No</option>
    </select>
  </div>
);

export const CheckPage = ({
  initial,
  onComplete,
}: {
  initial: Household | null;
  onComplete: (h: Household, s: Screening) => void;
}) => {
  const [step, setStep] = useState(1);
  const [state, setState] = useState(initial?.state ?? "");
  const [size, setSize] = useState(String(initial?.household_size ?? 1));
  const [income, setIncome] = useState(
    initial ? String(initial.monthly_gross_income) : "",
  );
  const [confirmed, setConfirmed] = useState<Tri>(
    initial?.household_confirmed ?? null,
  );
  const [lifeline, setLifeline] = useState<Tri>(
    initial?.lifeline_already_received ?? null,
  );
  const [school, setSchool] = useState<Tri>(
    initial?.school_participating ?? null,
  );
  const [wic, setWic] = useState<Tri>(initial?.wic_category ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const stepTitle = useRef<HTMLHeadingElement>(null);
  const go = (value: number) => {
    setStep(value);
    setError("");
    setTimeout(() => stepTitle.current?.focus(), 0);
  };
  const submit = async () => {
    setBusy(true);
    setError("");
    const h: Household = {
      state,
      household_size: Number(size),
      monthly_gross_income: Number(income),
      household_confirmed: confirmed,
      lifeline_already_received: lifeline,
      school_participating: school,
      wic_category: wic,
    };
    try {
      onComplete(h, await api.screen(h));
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
          <h1 tabIndex={-1}>A few details. A place to start.</h1>
          <p>Rough numbers are okay. We’ll be clear about what else we need.</p>
        </div>
      </div>
      <div className="wizard-layout">
        <section className="panel wizard">
          <div className="step-indicator">
            <span className="step-number">{step}</span>
            <span>Step {step} of 2</span>
            <div className="step-track">
              <span style={{ width: `${step * 50}%` }} />
            </div>
          </div>
          <h2 ref={stepTitle} tabIndex={-1}>
            {step === 1
              ? "Tell us a little about your household."
              : "A few more details, if you know them."}
          </h2>
          <p className="muted">
            {step === 1
              ? "We use these details for a local benefits prescreen."
              : "You can skip any question. We’ll show where more information is needed."}
          </p>
          <ErrorBox message={error} />
          <form
            autoComplete="off"
            onSubmit={(e) => {
              e.preventDefault();
              if (step === 1) go(2);
              else void submit();
            }}
          >
            {step === 1 ? (
              <div className="form-stack">
                <div className="field">
                  <label htmlFor="state">Where do you live?</label>
                  <select
                    id="state"
                    required
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                  >
                    <option value="" disabled>
                      Select a state or territory
                    </option>
                    {stateOptions.map(([code, name]) => (
                      <option key={code} value={code}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <Field
                  id="size"
                  label="People in your household"
                  hint="Include yourself and people who share income and expenses. Program definitions can differ."
                  type="number"
                  min="1"
                  max="20"
                  step="1"
                  required
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                />
                <Field
                  id="income"
                  label="Monthly household income before taxes ($)"
                  hint="Include income for everyone counted above. Use a typical month."
                  type="number"
                  min="0"
                  max="10000000"
                  step="0.01"
                  required
                  placeholder="For example, 2400"
                  value={income}
                  onChange={(e) => setIncome(e.target.value)}
                />
              </div>
            ) : (
              <div className="form-stack">
                <Question
                  id="confirmed"
                  label="Does this count include everyone who shares income and living costs?"
                  hint="Roommates with separate money may be a separate household. Count all gross income for the people included."
                  value={confirmed}
                  set={setConfirmed}
                />
                <Question
                  id="lifeline"
                  label="Does your household already get a Lifeline discount?"
                  hint="The federal phone and internet program allows one discount per household."
                  value={lifeline}
                  set={setLifeline}
                />
                <Question
                  id="school"
                  label="Does a child attend a school in the federal meal program?"
                  hint="Your school office can tell you. This includes the National School Lunch or Breakfast Program."
                  value={school}
                  set={setSchool}
                />
                <Question
                  id="wic"
                  label="Is anyone pregnant, postpartum, breastfeeding, or under age 5?"
                  hint="WIC has specific category rules. A clinic also checks nutrition risk and state rules."
                  value={wic}
                  set={setWic}
                />
              </div>
            )}
            <div className="form-actions">
              {step === 2 && (
                <Button type="button" variant="ghost" onClick={() => go(1)}>
                  <ArrowLeft size={17} aria-hidden="true" />
                  Back
                </Button>
              )}
              <Button type="submit" busy={busy}>
                {step === 1 ? "Continue" : "See my support options"}
                <ArrowRight size={17} aria-hidden="true" />
              </Button>
            </div>
          </form>
        </section>
        <aside className="context-card">
          <LockKeyhole size={23} aria-hidden="true" />
          <h2>This stays between you and your device.</h2>
          <p>
            No account. No names, addresses, or Social Security numbers. Your
            entries stay in memory for this session.
          </p>
        </aside>
      </div>
    </>
  );
};
