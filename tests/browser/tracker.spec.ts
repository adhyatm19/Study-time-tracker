import { test, expect, type Page } from "@playwright/test";
async function login(page: Page, email = "alice@example.test") {
  await page.goto("/auth/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill("password123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("button", { name: "Start focus" })).toBeEnabled({ timeout: 15000 });
}
test.beforeEach(async ({ request, page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("theme")) localStorage.setItem("theme", "dark");
  });
  await request.get("http://127.0.0.1:54329/reset");
});
test("timer survives navigation, refresh and modal cancellation; saves once", async ({ page }) => {
  await login(page);
  await page.getByLabel("What are you working on?").fill("Signals and systems");
  await page.getByRole("button", { name: "Start focus" }).click();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await page.waitForTimeout(1200);
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "History", exact: true })
    .click();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Continue studying" }).click();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  await page.getByLabel("Notes (optional)").fill("Chapter 4 exercises");
  await page.getByRole("button", { name: "Save session", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.getByRole("listitem").getByText("Chapter 4 exercises", { exact: true })).toBeVisible();
});
test("Pomodoro selection restores and a second tab cannot start another mode", async ({ page, context }) => {
  await login(page);
  await page.getByRole("button", { name: "pomodoro", exact: true }).click();
  await page.getByRole("button", { name: "Start focus" }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "pomodoro", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  const other = await context.newPage();
  await other.goto("/dashboard");
  await expect(other.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await expect(other.getByRole("button", { name: "stopwatch", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(other.getByRole("button", { name: "Resume", exact: true })).toBeVisible();
});
test("failed response can be retried without duplicating a saved session", async ({ page }) => {
  await login(page);
  await page.getByRole("button", { name: "Start focus" }).click();
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "Finish", exact: true }).click();
  let lost = false;
  await page.route("**/rest/v1/rpc/save_study_session", async (route) => {
    if (!lost) {
      lost = true;
      await route.fetch();
      await route.abort();
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Save session", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("button", { name: "Retry save" })).toBeEnabled();
  await page.getByRole("dialog").getByRole("button", { name: "Retry save" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "History", exact: true })
    .click();
  await expect(page.getByRole("list").getByRole("listitem")).toHaveCount(1);
});
test("tasks, goals, focus mode and mobile layout", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.getByLabel("New study task").fill("Read chapter 2");
  await page.getByRole("button", { name: "Add study task" }).click();
  await expect(page.getByText("Read chapter 2", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Study Read chapter 2", exact: true }).click();
  await expect(page.getByLabel("What are you working on?")).toHaveValue("Read chapter 2");
  await page.getByLabel("Target study minutes").fill("90");
  await page.getByRole("button", { name: "Save goal" }).click();
  await expect(page.getByText("of 1h 30m", { exact: false })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Target study minutes")).not.toBeVisible();
  await page.getByRole("button", { name: "Focus mode", exact: true }).click();
  await expect(page.getByRole("navigation", { name: "Mobile navigation" })).not.toBeVisible();
  await page.getByRole("button", { name: "Exit focus mode" }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "test-results/dashboard-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Toggle theme" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.screenshot({ path: "test-results/dashboard-mobile-light.png", fullPage: true });
});
test("desktop dashboard screenshot and account switch isolation", async ({ page }) => {
  await login(page);
  await page.getByLabel("What are you working on?").fill("Private work");
  await page.getByRole("button", { name: "Start focus" }).click();
  await page.getByRole("button", { name: "Account for Aadhya" }).click();
  await page.getByRole("button", { name: "Log out", exact: true }).click();
  await login(page, "bob@example.test");
  await expect(page.getByRole("button", { name: "Start focus" })).toBeVisible();
  await expect(page.getByLabel("What are you working on?")).toHaveValue("");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "test-results/dashboard-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Toggle theme" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.screenshot({ path: "test-results/dashboard-desktop-light.png", fullPage: true });
});
test("expired Pomodoro recovers one focus block and starts a break", async ({ page, context }) => {
  await login(page);
  await page.getByRole("button", { name: "pomodoro", exact: true }).click();
  await page.getByRole("button", { name: "Start focus" }).click();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
  await page.evaluate(() => {
    const key = "quiet-ledger:11111111-1111-4111-8111-111111111111:timer:v2";
    const state = JSON.parse(localStorage.getItem(key)!);
    state.focusMinutes = 1;
    state.startedAt = Date.now() - 65000;
    localStorage.setItem(key, JSON.stringify(state));
  });
  const other = await context.newPage();
  await Promise.all([page.reload(), other.goto("/dashboard")]);
  await expect(page.getByRole("button", { name: "End break" })).toBeVisible();
  await expect(other.getByRole("button", { name: "End break" })).toBeVisible();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "History", exact: true })
    .click();
  await expect(page.getByRole("listitem")).toHaveCount(1);
  await expect(page.getByRole("heading", { name: "Study history", exact: true })).toBeVisible();
  await expect(page.getByRole("listitem").getByText("1m 0s", { exact: false })).toBeVisible();
});
test("history supports edits, filtering, export, and deletion", async ({ page }) => {
  await login(page);
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "History", exact: true })
    .click();
  await page.getByRole("button", { name: "Add session", exact: true }).click();
  await page.getByRole("dialog").getByLabel("Subject", { exact: true }).fill("Linear algebra");
  await page.getByRole("dialog").getByLabel("Notes", { exact: true }).fill("Eigenvectors");
  await page.getByRole("dialog").getByRole("button", { name: "Save session", exact: true }).click();
  await expect(page.getByRole("listitem").getByText("Linear algebra", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /Edit Linear algebra/ }).click();
  await page.getByRole("dialog").getByLabel("Notes", { exact: true }).fill("Diagonalization");
  await page.getByRole("dialog").getByRole("button", { name: "Save session", exact: true }).click();
  await expect(page.getByRole("listitem").getByText("Diagonalization")).toBeVisible();
  await page.getByLabel("Subject or notes").fill("missing");
  await page.getByRole("button", { name: "Filter", exact: true }).click();
  await expect(page.getByText("No sessions match these filters.")).toBeVisible();
  await page.getByLabel("Subject or notes").fill("");
  await page.getByRole("button", { name: "Filter", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export CSV" }).click();
  expect((await download).suggestedFilename()).toContain("quiet-ledger-sessions");
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete session", exact: true }).click();
  await expect(page.getByText("Your saved sessions will appear here.")).toBeVisible();
});
test("analytics retains a short session, supports dark mode and table access", async ({ page }) => {
  await login(page);
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "History", exact: true })
    .click();
  await page.getByRole("button", { name: "Add session", exact: true }).click();
  await page.getByLabel("Active seconds").fill("120");
  await page.getByRole("dialog").getByRole("button", { name: "Save session", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Analytics", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Last 14 days", exact: true })).toBeVisible();
  await page.getByText("View data as a table").first().click();
  await expect(page.getByRole("cell", { name: "2m 0s", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Toggle theme" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "test-results/analytics-light.png", fullPage: true });
  await page.getByRole("button", { name: "Toggle theme" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "test-results/analytics-dark.png", fullPage: true });
});
test("failed analytics stays separate from a usable timer", async ({ page }) => {
  await page.route("**/rest/v1/rpc/get_study_summary", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ message: "Service unavailable" })
    })
  );
  await login(page);
  await expect(page.getByText("Study statistics could not be loaded.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Start focus" }).click();
  await expect(page.getByRole("button", { name: "Pause", exact: true })).toBeVisible();
});

test("unreadable timer offers backup and explicit reset without losing saved data", async ({ page }) => {
  await login(page);
  await page.evaluate(() =>
    localStorage.setItem("quiet-ledger:11111111-1111-4111-8111-111111111111:timer:v2", '{"broken":true}')
  );
  await page.reload();
  await expect(page.getByRole("button", { name: "Start focus" })).toBeDisabled();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Back up timer" }).click();
  expect((await download).suggestedFilename()).toContain("timer-backup");
  await page.getByRole("button", { name: "Reset unreadable timer", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Reset timer", exact: true }).click();
  await expect(page.getByRole("button", { name: "Start focus" })).toBeEnabled();
});
test("legacy tasks require explicit ownership before importing", async ({ page }) => {
  await login(page);
  await page.evaluate(() =>
    localStorage.setItem(
      "quiet-ledger:todos:v1",
      JSON.stringify([{ id: "legacy-1", title: "Older study task", completed: false }])
    )
  );
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Settings", exact: true })
    .click();
  await expect(page.getByRole("button", { name: "Recover tasks" })).toBeDisabled();
  await page.getByLabel("This browser’s older study data belongs to my account.").check();
  await page.getByRole("button", { name: "Recover tasks" }).click();
  await expect(page.getByText("Recovered into this account.", { exact: false })).toBeVisible();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Timer", exact: true })
    .click();
  await expect(page.getByText("Older study task", { exact: true })).toBeVisible();
});

test("landing page fits desktop and mobile in both themes", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "test-results/landing-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "test-results/landing-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Toggle theme" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: "test-results/landing-light.png", fullPage: true });
});
