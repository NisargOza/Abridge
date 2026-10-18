import { describe, expect, it } from "vitest";
import { calendarFile, planText } from "./paperwork";
import type { ManagedTask } from "./types";

describe("user-controlled private exports", () => {
  it("creates a generic all-day calendar event across month boundaries with no source data", () => {
    const value = calendarFile(
      "2026-12-31",
      "test-id",
      new Date("2026-10-18T12:00:00Z"),
    );
    expect(value).toContain(
      "DTSTART;VALUE=DATE:20261231\r\nDTEND;VALUE=DATE:20270101",
    );
    expect(value).toContain("TRIGGER:PT9H");
    expect(value).toContain("DTSTAMP:20261018T120000Z");
    expect(value).toContain("SUMMARY:Check your Abridge next step");
    expect(value).not.toContain("proof of income");
    expect(value.split("\r\n").every((line) => line.length <= 75)).toBe(true);
  });
  it("rejects invalid or injected calendar dates", () => {
    for (const date of [
      "2026-02-30",
      "11/12/2026",
      "2026-11-18\r\nSUMMARY:private",
      "",
    ]) {
      expect(() => calendarFile(date, "test")).toThrow("valid reminder date");
    }
  });
  it("exports the reviewed task, status, and edited questions for a human helper", () => {
    const task: ManagedTask = {
      id: "one",
      kind: "documents",
      notice: "Income verification",
      original: "FULL_PRIVATE_ORIGINAL",
      evidence: ["Please provide proof of income."],
      deadline_text: null,
      calendar_date: null,
      completed: true,
      situation: "No pay stub.",
      audience: "navigator",
      draft: "Where can I find help?",
    };
    const value = planText([task]);
    expect(value).toContain("[DONE]");
    expect(value).toContain("Please provide proof of income.");
    expect(value).toContain("No pay stub.");
    expect(value).toContain("Where can I find help?");
    expect(value).not.toContain("FULL_PRIVATE_ORIGINAL");
  });
});
