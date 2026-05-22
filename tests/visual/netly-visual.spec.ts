import { expect, test } from "@playwright/test";

const routes = [
  { name: "home", path: "/" },
  { name: "transactions", path: "/transactions" },
  { name: "budgets", path: "/budgets" },
  { name: "card-fit", path: "/card-fit" },
  { name: "settings", path: "/settings" }
];

const styleProbeSelectors = [
  ".hero-card",
  ".nav-item.active",
  ".period-tab[data-state='active']",
  ".metric-grid",
  ".budget-desktop-grid",
  ".budget-recurring-panel",
  ".chart-layout",
  ".transaction-ledger-row"
];

const styleProbeProperties = [
  "backgroundColor",
  "borderColor",
  "borderRadius",
  "boxShadow",
  "color",
  "display",
  "gap",
  "gridTemplateColumns",
  "minHeight",
  "overflow",
  "padding"
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
});

for (const route of routes) {
  test(`${route.name} page matches visual baseline`, async ({ page }, testInfo) => {
    await page.goto(route.path);
    await waitForStableApp(page);

    await expect(page).toHaveScreenshot(`${route.name}-${testInfo.project.name}.png`, {
      fullPage: true,
      animations: "disabled",
      caret: "hide",
      maxDiffPixelRatio: 0.01
    });
  });
}

test("high-risk CSS selectors keep expected computed styles", async ({ page }, testInfo) => {
  await page.goto("/");
  await waitForStableApp(page);

  const homeProbe = await getComputedStyleProbe(page);

  await page.goto("/transactions");
  await waitForStableApp(page);

  const transactionProbe = await getComputedStyleProbe(page);

  await page.goto("/budgets");
  await waitForStableApp(page);

  const budgetProbe = await getComputedStyleProbe(page);

  const probe = {
    project: testInfo.project.name,
    home: homeProbe,
    transactions: transactionProbe,
    budgets: budgetProbe
  };

  expect(JSON.stringify(probe, null, 2)).toMatchSnapshot(`computed-styles-${testInfo.project.name}.json`);
});

// Waits for the app shell to finish rendering before screenshots or probes run.
async function waitForStableApp(page: import("@playwright/test").Page) {
  await page.waitForLoadState("networkidle");
  await page.locator("body").waitFor({ state: "visible" });
  await page.waitForTimeout(300);
}

// Captures a focused computed-style snapshot for selectors with known cascade risk.
async function getComputedStyleProbe(page: import("@playwright/test").Page) {
  return page.evaluate(
    ({ selectors, properties }) => {
      return Object.fromEntries(
        selectors.map((selector) => {
          const element = document.querySelector(selector);

          if (!element) {
            return [selector, null];
          }

          const styles = window.getComputedStyle(element);

          return [
            selector,
            Object.fromEntries(properties.map((property) => [property, styles[property as keyof CSSStyleDeclaration]]))
          ];
        })
      );
    },
    { selectors: styleProbeSelectors, properties: styleProbeProperties }
  );
}
