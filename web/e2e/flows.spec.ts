import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Exercise a separate real API instance while the user's local app stays running.
// Only the inference boundary is synthetic; browser requests keep their normal shape.
test.beforeEach(async ({ page }) => {
  await page.route("http://127.0.0.1:8000/api/**", (route) =>
    route.continue({ url: route.request().url().replace(":8000/", ":8001/") }),
  );
});

const accessible = async (page: Page) => {
  await expect(page.locator("main h1")).toBeVisible();
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    scan.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        failure: n.failureSummary,
      })),
    })),
  ).toEqual([]);
};

const chooseTool = async (page: Page, name: string) => {
  const welcomeMenu = page.locator(".welcome-tools");
  if (await welcomeMenu.isVisible())
    await welcomeMenu.locator("summary").click();
  await page.getByRole("button", { name, exact: true }).click();
};

const startCheck = async (page: Page) => {
  await page.getByRole("button", { name: "Find support for me" }).click();
  await page.getByLabel("Where do you live?").selectOption("NY");
  await page.getByLabel("People in your household").fill("3");
  await page
    .getByLabel("Monthly household income before taxes ($)")
    .fill("2400");
  await accessible(page);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
};

test("real engine support flow, missing facts, sources, privacy, and clear session", async ({
  page,
}) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("/");
  await accessible(page);
  await startCheck(page);
  await accessible(page);
  await page.getByRole("button", { name: "See my support options" }).click();
  await expect(
    page.getByRole("heading", { name: "A few doors worth opening." }),
  ).toBeVisible();
  await expect(
    page
      .locator(".result-badge")
      .filter({ hasText: "More information needed" }),
  ).toHaveCount(5);
  await accessible(page);
  await page.getByRole("button", { name: "Update my details" }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Does this count include").selectOption("true");
  await page.getByLabel("Does your household already").selectOption("false");
  await page.getByLabel("Does a child attend").selectOption("true");
  await page.getByRole("button", { name: "See my support options" }).click();
  await expect(
    page.locator(".result-badge").filter({ hasText: "You may qualify" }),
  ).toHaveCount(2);
  await accessible(page);
  await page
    .getByLabel("Show", { exact: true })
    .selectOption("likely_eligible");
  await expect(page.locator(".program-card")).toHaveCount(2);
  await expect(
    page.getByRole("link", { name: /Official application/ }).first(),
  ).toHaveAttribute("rel", "noopener noreferrer");
  await page
    .getByRole("button", { name: "Privacy & local setup", exact: true })
    .click();
  await accessible(page);
  await expect(page.getByText("Connected", { exact: true })).toBeVisible();
  expect(requests.every((url) => new URL(url).hostname === "127.0.0.1")).toBe(
    true,
  );
  expect(
    await page.evaluate(() => [localStorage.length, sessionStorage.length]),
  ).toEqual([0, 0]);
  await page.getByRole("button", { name: "Clear my session now" }).click();
  await expect(
    page.getByRole("heading", {
      name: /A little breathing room\.\s*A clearer next step\./,
    }),
  ).toBeVisible();
  await chooseTool(page, "Find support");
  await expect(
    page.getByRole("heading", { name: "A few details. A place to start." }),
  ).toBeVisible();
  await expect(page.getByLabel("Where do you live?")).toHaveValue("");
  await expect(
    page.getByLabel("Monthly household income before taxes ($)"),
  ).toHaveValue("");
  await accessible(page);
});

test("real budget math, debt strategies and shortfall", async ({ page }) => {
  await page.goto("/");
  await chooseTool(page, "My money plan");
  await accessible(page);
  await page.getByLabel("Take-home income ($)").fill("1000");
  await page.getByLabel("Income before taxes ($)").fill("2000");
  await page.getByLabel("Housing ($)").fill("500");
  await page.getByRole("button", { name: "Add debt" }).click();
  await page.getByLabel("Name (use any nickname)").fill("Bill");
  await page.getByLabel("Balance ($)", { exact: true }).fill("1000");
  await page.getByLabel("APR (%)").fill("0");
  await page.getByLabel("Monthly minimum ($)").fill("100");
  await page.getByLabel("Extra debt payment per month ($)").fill("150");
  await page.getByRole("button", { name: "Build my money plan" }).click();
  await expect(
    page.locator(".strategy-card").getByText("4 months", { exact: true }),
  ).toHaveCount(2);
  await expect(page.getByText("5%", { exact: true })).toBeVisible();
  await accessible(page);
  await page.getByLabel("Take-home income ($)").fill("550");
  await page.getByRole("button", { name: "Build my money plan" }).click();
  await expect(page.getByText("MONTHLY GAP", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Needs a different plan", { exact: true }),
  ).toHaveCount(2);
  await accessible(page);
});

test("document route with real FastAPI and mocked local inference", async ({
  page,
}) => {
  await page.goto("/");
  await chooseTool(page, "Understand a document");
  await accessible(page);
  const notice =
    "You must pay $500 before October 31, 2026. If you do not reply, the case may close.";
  await page.getByLabel("Document text").fill(notice);
  await page.getByRole("button", { name: "Help me understand this" }).click();
  await expect(
    page.getByRole("heading", { name: "Your notice, in plain words" }),
  ).toBeVisible();
  await page.getByText("Original document", { exact: true }).click();
  await expect(
    page.locator(".document-output").getByText(notice, { exact: true }),
  ).toHaveCount(2);
  await accessible(page);
  await page
    .getByRole("button", { name: "Clear document", exact: true })
    .click();
  await expect(page.getByLabel("Document text")).toHaveValue("");
  await accessible(page);
});

test("mobile reflow, keyboard navigation and engine failure state", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await accessible(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await chooseTool(page, "Understand a document");
  await expect(
    page.getByRole("heading", { name: "Plain words. A clearer next step." }),
  ).toBeFocused();
  await accessible(page);
  await page
    .getByLabel("Document text")
    .fill("A notice with important information to read.");
  await page.route("http://127.0.0.1:8000/api/document", (route) =>
    route.abort(),
  );
  await page.getByRole("button", { name: "Help me understand this" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "local engine could not respond",
  );
  await accessible(page);
  await page.setViewportSize({ width: 320, height: 700 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("sample opens real results, includes a money plan, and starts personal mode cleanly", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Explore a sample" }).click();
  await expect(
    page.getByRole("heading", { name: "A few doors worth opening." }),
  ).toBeVisible();
  await expect(page.locator(".sample-banner")).toContainText("made-up details");
  await expect(
    page.locator(".result-badge").filter({ hasText: "You may qualify" }),
  ).toHaveCount(2);
  await accessible(page);
  await chooseTool(page, "My money plan");
  await expect(page.getByLabel("Take-home income ($)")).toHaveValue("2100");
  await expect(page.locator(".strategy-card")).toHaveCount(2);
  await accessible(page);
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await accessible(page);
  await page.getByRole("button", { name: "Use my information" }).click();
  await expect(page.getByLabel("Where do you live?")).toHaveValue("");
  await expect(
    page.getByLabel("Monthly household income before taxes ($)"),
  ).toHaveValue("");
  await expect(page.locator(".sample-banner")).toHaveCount(0);
  await chooseTool(page, "My money plan");
  await expect(page.getByLabel("Take-home income ($)")).toHaveValue("");
  await expect(page.locator(".debt-form")).toHaveCount(0);
});

test("welcome keeps every tool reachable and supports mobile sample errors", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".welcome-actions .primary")).toHaveCount(1);
  await expect(page.locator(".tool-card")).toHaveCount(0);
  await page.locator(".welcome-tools summary").click();
  await accessible(page);
  await page.keyboard.press("Escape");
  await expect(page.locator(".welcome-tools")).not.toHaveAttribute("open", "");
  await chooseTool(page, "My money plan");
  await expect(
    page.getByRole("heading", { name: "A plan with room to breathe." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await chooseTool(page, "Overview");
  await page.route("http://127.0.0.1:8000/api/budget", (route) =>
    route.abort(),
  );
  await page.getByRole("button", { name: "Explore a sample" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "local engine could not respond",
  );
  await expect(page.locator(".sample-banner")).toHaveCount(0);
  await accessible(page);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
