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
  await mockDisconnectedAkahu(page);
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

test("Akahu freshness leaves refreshing state before bounded transaction timestamp polling completes", async ({ page }) => {
  await page.unroute("**/api/akahu/accounts?source=user");
  await page.unroute("**/api/akahu/transactions?source=user**");
  await page.unroute("**/api/akahu/refresh");

  let accountCalls = 0;
  let refreshCalls = 0;
  let transactionCalls = 0;

  await page.route("**/api/akahu/accounts?source=user", async (route) => {
    accountCalls += 1;
    const payload = accountCalls >= 3
      ? getConnectedAccountPayload({
          balanceRefreshedAt: "2026-05-23T10:14:00.000Z",
          transactionsRefreshedAt: "2026-05-23T10:18:00.000Z"
        })
      : accountCalls === 2
        ? getConnectedAccountPayload({
            balanceRefreshedAt: "2026-05-23T10:14:00.000Z",
            transactionsRefreshedAt: "2026-05-23T10:13:00.000Z"
          })
        : getConnectedAccountPayload({
            balanceRefreshedAt: "2026-05-23T10:13:00.000Z",
            transactionsRefreshedAt: "2026-05-23T10:13:00.000Z"
          });

    await route.fulfill({ contentType: "application/json", json: payload });
  });

  await page.route("**/api/akahu/refresh", async (route) => {
    refreshCalls += 1;
    await page.waitForTimeout(300);
    await route.fulfill({
      contentType: "application/json",
      json: {
        connected: true,
        notice: "Akahu refresh accepted.",
        requestedAt: "2026-05-23T10:14:05.000Z"
      }
    });
  });

  await page.route("**/api/akahu/transactions?source=user**", async (route) => {
    transactionCalls += 1;
    await route.fulfill({
      contentType: "application/json",
      json: {
        source: "akahu",
        connected: true,
        rawCount: 0,
        nextCursor: null,
        transactions: []
      }
    });
  });

  await page.goto("/settings");

  await expect(page.getByText("Refreshing", { exact: true })).toBeVisible({ timeout: 5000 });
  await expect(page.getByText("Current", { exact: true })).toBeVisible({ timeout: 5000 });
  await expect(page.getByText("Refreshing", { exact: true })).not.toBeVisible();
  await expect.poll(() => transactionCalls, { timeout: 8000 }).toBeGreaterThanOrEqual(2);

  expect(refreshCalls).toBe(1);
});

// Waits for the app shell to finish rendering before screenshots or probes run.
async function waitForStableApp(page: import("@playwright/test").Page) {
  await page.waitForLoadState("networkidle");
  await page.locator("body").waitFor({ state: "visible" });
  await page.waitForTimeout(300);
}

// Keeps visual tests independent from local Akahu credentials and network access.
async function mockDisconnectedAkahu(page: import("@playwright/test").Page) {
  await page.route("**/api/akahu/accounts?source=user", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        source: "akahu",
        connected: false,
        availableBalance: null,
        accounts: [],
        accountFreshness: [],
        balanceRefreshedAt: null,
        isStale: false,
        manualRefreshCooldownMs: 900000,
        primaryAccount: null,
        retrievedAt: null,
        transactionsRefreshedAt: null,
        notice: "No Akahu app token or user token is connected. Connect Akahu or switch to demo data."
      }
    });
  });

  await page.route("**/api/akahu/transactions?source=user**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        source: "akahu",
        connected: false,
        rawCount: 0,
        nextCursor: null,
        transactions: [],
        notice: "No Akahu app token or user token is connected. Connect Akahu or switch to demo data."
      }
    });
  });

  await page.route("**/api/akahu/refresh", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      status: 401,
      json: {
        source: "akahu",
        connected: false,
        notice: "No Akahu app token or user token is connected. Connect Akahu or switch to demo data."
      }
    });
  });
}

// Builds a connected Akahu account payload with explicit freshness timestamps.
function getConnectedAccountPayload({
  balanceRefreshedAt,
  transactionsRefreshedAt
}: {
  balanceRefreshedAt: string;
  transactionsRefreshedAt: string;
}) {
  return {
    source: "akahu",
    connected: true,
    availableBalance: 1234.56,
    accounts: [
      {
        id: "acc-main",
        name: "Everyday",
        formattedAccount: "00-0000-0000000-00",
        balance: 1234.56
      }
    ],
    accountFreshness: [
      {
        accountId: "acc-main",
        displayName: "Everyday",
        status: "ready",
        balanceRefreshedAt,
        transactionsRefreshedAt
      }
    ],
    balanceRefreshedAt,
    isStale: false,
    manualRefreshCooldownMs: 900000,
    primaryAccount: {
      id: "acc-main",
      name: "Everyday",
      formattedAccount: "00-0000-0000000-00",
      balance: 1234.56
    },
    retrievedAt: balanceRefreshedAt,
    transactionsRefreshedAt
  };
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
