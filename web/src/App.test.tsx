import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { App } from "./App";
import { api } from "./lib/api";
import type { BudgetResult, Screening } from "./lib/types";

const screening: Screening = {
  programs: [
    {
      id: "lifeline",
      name: "Lifeline",
      category: "Phone & internet",
      status: "likely_eligible",
      scope: "Federal income route",
      reason:
        "Your reported income is within the federal Lifeline income limit.",
      missing: [],
      next_step: "Bring proof of income.",
      application_url: "https://www.lifelinesupport.org/get-started/",
      source: {
        id: "lifeline",
        source_url: "https://www.lifelinesupport.org/how-to-qualify/",
        source_title: "USAC · Lifeline",
        fetched_at: "2026-10-12",
        rule_year: "2026",
        effective_from: "2026-01-01",
        effective_to: "2026-12-31",
      },
      income_limit_monthly: 3073.5,
      modeled: true,
    },
  ],
  annual_poverty_guideline: 27320,
  poverty_percentage: 105.4,
  rule_year: 2026,
  disclaimer: "This is a prescreen.",
};
const budget: BudgetResult = {
  essentials: 1450,
  minimum_payments: 95,
  remaining: 555,
  funded_extra: 75,
  funding_gap: 0,
  dti_percentage: 4,
  dti_label: "Listed debt payments divided by gross income.",
  strategies: [],
  notes: [],
};

beforeEach(() => {
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
  vi.spyOn(api, "health").mockResolvedValue({
    status: "ok",
    local_ai: true,
    rule_year: 2026,
  });
  vi.spyOn(api, "screen").mockResolvedValue(screening);
  vi.spyOn(api, "budget").mockResolvedValue(budget);
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

it("opens clearly labeled sample results instead of staying on the welcome screen", async () => {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Explore a sample" }));
  await screen.findByRole("heading", { name: "A few doors worth opening." });
  expect(screen.getByText(/Sample household/)).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Lifeline" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "My money plan" }));
  expect(screen.getByLabelText("Take-home income ($)")).toHaveValue(2100);
});

it("keeps failed samples on the welcome screen with visible feedback and a working retry", async () => {
  vi.mocked(api.budget).mockRejectedValueOnce(
    new Error("The local engine could not respond."),
  );
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Explore a sample" }));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "local engine could not respond",
  );
  expect(screen.queryByText(/Sample household/)).not.toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Explore a sample" }),
  ).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Explore a sample" }));
  await screen.findByRole("heading", { name: "A few doors worth opening." });
});

it("removes all fictional profile and budget data when starting a personal check", async () => {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Explore a sample" }));
  await screen.findByText(/Sample household/);
  fireEvent.click(screen.getByRole("button", { name: "Use my information" }));
  expect(screen.getByLabelText("Where do you live?")).toHaveValue("");
  expect(
    screen.getByLabelText("Monthly household income before taxes ($)"),
  ).toHaveValue(null);
  expect(screen.queryByText(/Sample household/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "My money plan" }));
  expect(screen.getByLabelText("Take-home income ($)")).toHaveValue(null);
  expect(
    screen.queryByLabelText("Name (use any nickname)"),
  ).not.toBeInTheDocument();
});

it("does not replace a chosen personal flow when a delayed sample finishes", async () => {
  let finish: (value: Screening) => void = () => {};
  vi.mocked(api.screen).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: "Explore a sample" }));
  fireEvent.click(screen.getByRole("button", { name: "Find support for me" }));
  finish(screening);
  await waitFor(() =>
    expect(
      screen.getByRole("heading", { name: "A few details. A place to start." }),
    ).toBeInTheDocument(),
  );
  expect(screen.queryByText(/Sample household/)).not.toBeInTheDocument();
  expect(
    screen.getByLabelText("Monthly household income before taxes ($)"),
  ).toHaveValue(null);
});
