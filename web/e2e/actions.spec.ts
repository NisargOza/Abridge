import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";

const notice =
  "You must submit proof of income before November 18, 2026. If the documents are not received by the deadline, your request may be closed. Your interview is scheduled for November 20, 2026. Bring a photo ID. Your outstanding balance is $275.50. Sending documents does not mean approval.";

test.beforeEach(async ({ page }) => {
  await page.route("http://127.0.0.1:8000/api/**", (route) =>
    route.continue({ url: route.request().url().replace(":8000/", ":8001/") }),
  );
});

test("review notice, track tasks, prepare questions, export, return, and clear with the real API", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("/");
  await page.locator(".welcome-tools summary").click();
  await page
    .getByRole("button", { name: "Paperwork & next steps", exact: true })
    .click();
  await page.getByLabel("A name for this notice").fill("Income verification");
  await page.getByLabel("Document text").fill(notice);
  await page.getByRole("button", { name: "Find my next steps" }).click();
  await expect(
    page.getByRole("heading", { name: "What your notice asks for" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add to my next steps" }),
  ).toBeDisabled();
  await page
    .getByLabel("I checked these steps against the full notice.")
    .check();
  await page.getByRole("button", { name: "Add to my next steps" }).click();
  await expect(page.locator(".task-card")).toHaveCount(2);
  const first = page.locator(".task-card").first();
  await first.getByText("Prepare a conversation").click();
  await first
    .getByLabel("What might make this step difficult?")
    .fill("I work during office hours and have no recent pay stub.");
  await first.getByRole("button", { name: "Help me ask" }).click();
  const draft = first.getByLabel("Your questions — review and edit");
  await expect(draft).toHaveValue(/pay stub/);
  await draft.fill(
    "What other proof of income can I provide?\nHow can I confirm receipt?",
  );
  await first.getByText("Save a calendar reminder", { exact: true }).click();
  await first.getByLabel("Your reminder date").fill("2026-11-16");
  const calendarWait = page.waitForEvent("download");
  await first.getByRole("button", { name: "Save reminder (.ics)" }).click();
  const calendar = await calendarWait;
  const contents = await readFile((await calendar.path())!, "utf8");
  expect(contents).toContain("DTSTART;VALUE=DATE:20261116");
  expect(contents).not.toContain("income");
  expect(contents).not.toContain("275");
  const planWait = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save my plan (.txt)" }).click();
  const plan = await planWait;
  const saved = await readFile((await plan.path())!, "utf8");
  expect(saved).toContain("What other proof of income can I provide?");
  expect(saved).toContain("Income verification");
  await first.getByRole("checkbox").click();
  await expect(page.getByText("Completed (1)")).toBeVisible();
  await page
    .getByRole("button", { name: "My money plan", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Paperwork & next steps", exact: true })
    .click();
  await expect(page.getByText("Completed (1)")).toBeVisible();
  await page.getByText("Completed (1)").click();
  await expect(page.locator(".task-complete")).toContainText(
    "Income verification",
  );
  await page.getByText("Want a person to help?").click();
  await expect(
    page.getByRole("link", { name: /Find local support with 211/ }),
  ).toHaveAttribute("referrerpolicy", "no-referrer");
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.setViewportSize({ width: 320, height: 780 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(requests.every((url) => new URL(url).hostname === "127.0.0.1")).toBe(
    true,
  );
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
  await page.getByRole("button", { name: "Clear session" }).click();
  await page.locator(".welcome-tools summary").click();
  await page
    .getByRole("button", { name: "Paperwork & next steps", exact: true })
    .click();
  await expect(page.getByLabel("Document text")).toHaveValue("");
  await page.getByRole("button", { name: /My next steps/ }).click();
  await expect(page.locator(".task-card")).toHaveCount(0);
});

test("failed analysis preserves the original and prevents stale tasks from being added", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator(".welcome-tools summary").click();
  await page
    .getByRole("button", { name: "Paperwork & next steps", exact: true })
    .click();
  await page.route("http://127.0.0.1:8000/api/actions", (route) =>
    route.fulfill({
      json: {
        mode: "unavailable",
        tasks: [],
        message: "Local AI is unavailable. Read the original.",
      },
    }),
  );
  await page.getByLabel("Document text").fill(notice);
  await page.getByRole("button", { name: "Find my next steps" }).click();
  await expect(page.getByRole("alert")).toContainText("unavailable");
  await expect(page.locator(".original")).toContainText(notice);
  await expect(
    page.getByRole("button", { name: "Add to my next steps" }),
  ).toHaveCount(0);
});
