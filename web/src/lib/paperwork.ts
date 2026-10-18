import type { ActionKind, ManagedTask, PaperworkSession } from "./types";

export const emptyPaperwork = (): PaperworkSession => ({
  text: "",
  name: "",
  result: null,
  actions: null,
  tasks: [],
});

export const exampleNotice =
  "You must submit proof of income before November 18, 2026.\nIf the documents are not received by the deadline, your request may be closed.\nYour interview is scheduled for November 20, 2026.\nBring a photo ID.\nYour outstanding balance is $275.50.\nSending documents does not mean approval.";

export const actionLabels: Record<ActionKind, string> = {
  documents: "Documents & forms",
  appointment: "Appointment",
  contact: "Contact the sender",
  payment: "Payment request",
};

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value + "T00:00:00Z"));

// No source text, case details, or notice names go into a calendar. A calendar
// may sync to a provider even though Abridge itself never contacts that provider.
export const calendarFile = (value: string, uid: string, now = new Date()) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value))
    throw new Error("Choose a valid reminder date.");
  const start = new Date(value + "T00:00:00Z");
  if (
    !Number.isFinite(start.getTime()) ||
    start.toISOString().slice(0, 10) !== value
  )
    throw new Error("Choose a valid reminder date.");
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);
  const date = (d: Date) => d.toISOString().slice(0, 10).replaceAll("-", "");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Abridge//Private next steps//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid.replace(/[^a-zA-Z0-9-]/g, "")}@abridge.local`,
    `DTSTAMP:${now
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}Z$/, "Z")}`,
    `DTSTART;VALUE=DATE:${date(start)}`,
    `DTEND;VALUE=DATE:${date(end)}`,
    "SUMMARY:Check your Abridge next step",
    "DESCRIPTION:Review your original notice and your private next-step plan.",
    "BEGIN:VALARM",
    "TRIGGER:PT9H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Review your next step",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
};

export const planText = (tasks: ManagedTask[]) =>
  [
    "ABRIDGE — MY NEXT STEPS",
    "Personal copy. Contains notice excerpts and any conversation notes you added.",
    "AI suggestions need review. This is not a submission or proof of completion.",
    ...tasks.flatMap((task, i) => [
      "",
      `${i + 1}. [${task.completed ? "DONE" : "OPEN"}] ${actionLabels[task.kind]}`,
      `Notice: ${task.notice}`,
      ...task.evidence.map((line) => `Original: ${line}`),
      ...(task.calendar_date
        ? [
            `Date mentioned: ${formatDate(task.calendar_date)} — check exact timing in the original.`,
          ]
        : []),
      ...(task.situation ? [`My situation: ${task.situation}`] : []),
      ...(task.draft
        ? [
            `Questions for the ${task.audience === "sender" ? "sender" : "community navigator"}:`,
            task.draft,
          ]
        : []),
    ]),
    "",
  ].join("\n");

export const downloadFile = (
  name: string,
  content: string,
  type = "text/plain",
) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
