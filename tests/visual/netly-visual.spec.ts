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
  ".money-movement-card"
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

test("budget card opens category spending breakdown with donut chart", async ({ page }) => {
  await routeBudgetBreakdownAkahu(page);
  await page.goto("/");
  await waitForStableApp(page);
  await page.evaluate(() => {
    window.localStorage.setItem("netly_user_budgets", JSON.stringify([
      {
        categoryNames: ["Food", "Transport", "Gifts", "Shopping", "Health"],
        cadence: "monthly",
        id: "budget-spending-money",
        limit: 800,
        name: "Spending money",
        periodAnchorDate: "2026-05-01"
      }
    ]));
  });

  await page.getByRole("button", { name: /Budgets/ }).first().click();
  await expect(page.getByTestId("budgets-page")).toBeVisible();

  const budgetCard = page.locator(".budget-progress-card").filter({ hasText: "Spending money" });
  await expect(budgetCard).not.toContainText("Food");
  await expect.poll(async () => budgetCard.evaluate((element) => element.getBoundingClientRect().width)).toBeLessThanOrEqual(430);
  await expect.poll(async () => budgetCard.locator(".budget-progress-top").evaluate((element) => getComputedStyle(element).backgroundImage)).toBe("none");

  await budgetCard.click();

  await expect(page.getByTestId("budget-detail-page")).toBeVisible();
  await expect(page.getByRole("img", { name: "Spending money category spending donut chart" })).toBeVisible();
  const layoutProbe = await page.evaluate(() => {
    const detail = document.querySelector(".budget-detail-view");
    const hero = document.querySelector(".budget-detail-hero");
    const mobileHeader = document.querySelector(".budget-detail-view .mobile-page-header");
    const mobileTitle = mobileHeader?.querySelector("h2");

    return {
      detailWidth: detail?.getBoundingClientRect().width || 0,
      heroBackgroundImage: hero ? getComputedStyle(hero).backgroundImage : "",
      mobileHeaderBackgroundImage: mobileHeader ? getComputedStyle(mobileHeader).backgroundImage : "",
      mobileHeaderDisplay: mobileHeader ? getComputedStyle(mobileHeader).display : "none",
      mobileTitleClipped: mobileTitle
        ? isClippingOverflow(getComputedStyle(mobileTitle)) && (
            mobileTitle.scrollWidth > mobileTitle.clientWidth + 1
            || mobileTitle.scrollHeight > mobileTitle.clientHeight + 1
          )
        : false,
      viewportWidth: window.innerWidth
    };

    function isClippingOverflow(style: CSSStyleDeclaration) {
      return style.overflowX !== "visible" || style.overflowY !== "visible" || style.whiteSpace === "nowrap";
    }
  });

  expect(layoutProbe.heroBackgroundImage).toBe("none");

  if (layoutProbe.mobileHeaderDisplay !== "none") {
    expect(layoutProbe.mobileHeaderBackgroundImage).toBe("none");
    expect(layoutProbe.mobileTitleClipped).toBe(false);
  }

  if (layoutProbe.viewportWidth >= 1181) {
    expect(layoutProbe.detailWidth).toBeLessThan(layoutProbe.viewportWidth);
    expect(layoutProbe.detailWidth).toBeLessThanOrEqual(1040);
  }

  const foodBreakdown = page.locator(".budget-breakdown-item").filter({ hasText: "Food" });
  await expect(foodBreakdown).toContainText("2 transactions");
  await expect(page.locator(".budget-breakdown-item").filter({ hasText: "Transport" })).toContainText("1 transaction");
  await expect(page.locator(".budget-breakdown-item").filter({ hasText: "Gifts" })).toHaveCount(0);
  await expect(foodBreakdown.locator(".budget-breakdown-chevron")).toHaveCount(0);
  await expect(foodBreakdown.locator(".transaction-category-chip")).toHaveCount(0);
  const budgetRowProbe = await foodBreakdown.getByTestId("budget-breakdown-row").evaluate((element) => {
    const amount = element.querySelector(".money-movement-amount");
    const amountDetail = element.querySelector(".money-movement-value small");
    const avatar = element.querySelector(".letter-avatar");
    const title = element.querySelector(".money-movement-copy strong");
    const meta = element.querySelector(".money-movement-copy > small");
    const rowStyle = getComputedStyle(element);
    const amountStyle = amount ? getComputedStyle(amount) : null;
    const avatarStyle = avatar ? getComputedStyle(avatar) : null;
    const titleRect = title?.getBoundingClientRect();
    const metaRect = meta?.getBoundingClientRect();
    const amountRect = amount?.getBoundingClientRect();
    const amountDetailRect = amountDetail?.getBoundingClientRect();

    return {
      amountFontSize: amountStyle?.fontSize || "",
      amountFontWeight: amountStyle?.fontWeight || "",
      amountDetail: amountDetail?.textContent || "",
      avatarBorderRadius: avatarStyle?.borderRadius || "",
      avatarHeight: avatarStyle?.height || "",
      avatarWidth: avatarStyle?.width || "",
      paddingInlineEnd: rowStyle.paddingInlineEnd,
      titleAmountTopDelta: titleRect && amountRect ? Math.abs(titleRect.top - amountRect.top) : -1,
      metaDetailTopDelta: metaRect && amountDetailRect ? Math.abs(metaRect.top - amountDetailRect.top) : -1,
      amountDetailRightDelta: amountRect && amountDetailRect ? Math.abs(amountRect.right - amountDetailRect.right) : -1,
      viewportWidth: window.innerWidth
    };
  });

  expect(budgetRowProbe.amountDetail).toBe("2 transactions");
  expect(budgetRowProbe.titleAmountTopDelta).toBeLessThanOrEqual(2);
  expect(budgetRowProbe.metaDetailTopDelta).toBeLessThanOrEqual(2);
  expect(budgetRowProbe.amountDetailRightDelta).toBeLessThanOrEqual(2);

  if (budgetRowProbe.viewportWidth <= 768) {
    expect(budgetRowProbe.paddingInlineEnd).toBe("12px");
    expect(budgetRowProbe.amountFontSize).toBe("18.88px");
    expect(budgetRowProbe.amountFontWeight).toBe("950");
    expect(budgetRowProbe.avatarWidth).toBe("38px");
    expect(budgetRowProbe.avatarHeight).toBe("38px");
    expect(budgetRowProbe.avatarBorderRadius).toBe("14px");
  }

  const chartDocumentTopBeforeExpansion = await getDocumentTop(page.locator(".budget-breakdown-chart"));
  await foodBreakdown.getByTestId("budget-breakdown-row").click();
  await expect(foodBreakdown.getByTestId("budget-breakdown-row")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("budget-selected-category-indicator")).toHaveCount(0);
  await expect(page.locator(".budget-breakdown-item").filter({ hasText: "Transport" })).toContainText("1 transaction");
  await expect(page.locator(".budget-breakdown-dropdown")).toHaveCount(0);
  await expect(page.locator("[data-testid='budget-category-transaction-expansion'][data-state='open']")).toBeVisible();
  await expect(page.getByTestId("budget-selected-transactions")).toContainText("food-1");
  await expect(page.getByTestId("budget-selected-transactions")).toContainText("food-2");
  await expect(page.getByTestId("budget-selected-transactions").locator(".money-movement-card")).toHaveCount(2);
  await expect.poll(() => getDocumentTop(page.locator(".budget-breakdown-chart"))).toBeCloseTo(chartDocumentTopBeforeExpansion, 1);

  await page.getByTestId("budget-selected-transactions").locator(".money-movement-card").filter({ hasText: "food-1" }).click();
  await expect(page.getByTestId("transaction-details-drawer")).toBeVisible();
  await expect(page.getByTestId("transaction-details-drawer")).toContainText("food-1");
  await expect(page.getByLabel("Set category for food-1")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("transaction-details-drawer")).toBeHidden();

  await foodBreakdown.getByTestId("budget-breakdown-row").click();
  await expect(page.locator(".budget-breakdown-item").filter({ hasText: "Transport" })).toContainText("1 transaction");

  await page.getByRole("button", { name: /Back to budgets/ }).click();
  await expect(page.getByTestId("budgets-page")).toBeVisible();
});

test("mobile transaction filter multi-selects stay inside dropdown menus", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile drawer behavior is covered in the mobile project.");

  await routeBudgetBreakdownAkahu(page);
  await page.goto("/transactions");
  await waitForStableApp(page);

  await page.getByLabel("Transaction actions").click();
  await page.getByRole("button", { name: /^Filters/ }).click();
  await expect(page.locator(".mobile-filter-drawer")).toBeVisible();
  expect(await getOverflowProbe(page.locator(".mobile-filter-drawer-body"))).toEqual({
    overflowY: "visible",
    scrolls: false
  });

  await page.getByTestId("transaction-account-filter-trigger").click();
  await expect(page.getByTestId("transaction-account-filter-options")).toBeVisible();
  await page.getByTestId("transaction-account-filter-options").locator("button").nth(1).click();
  await expect(page.getByTestId("transaction-account-filter-trigger")).not.toContainText("All accounts");

  await page.getByTestId("transaction-category-filter-trigger").click();
  await expect(page.getByTestId("transaction-category-filter-options")).toBeVisible();
  await page.getByTestId("transaction-category-filter-options").getByRole("button", { name: "Food" }).click();
  await expect(page.getByTestId("transaction-category-filter-trigger")).toContainText("Food");

  await page.keyboard.press("Escape");
  await expect(page.getByTestId("transaction-category-filter-options")).toBeHidden();
  await page.getByRole("button", { name: "Close" }).click();
  await page.getByLabel("Transaction actions").click();
  await expect(page.getByRole("button", { name: "Filters (2)" })).toBeVisible();
});

test("mobile budget editor uses a compact category dropdown", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile drawer behavior is covered in the mobile project.");

  await routeBudgetBreakdownAkahu(page);
  await page.goto("/budgets");
  await waitForStableApp(page);

  await page.getByRole("button", { name: "Add budget" }).click();
  await expect(page.locator(".budget-editor-drawer")).toBeVisible();
  expect((await getOverflowProbe(page.locator(".budget-editor-drawer"))).overflowY).toBe("visible");

  await expect(page.getByTestId("budget-category-multi-select-trigger")).toContainText("No categories selected");
  await page.getByTestId("budget-category-multi-select-trigger").click();
  await expect(page.getByTestId("budget-category-multi-select-content")).toBeVisible();
  await page.getByTestId("budget-category-multi-select-content").getByRole("button", { name: "Food" }).click();
  await expect(page.getByTestId("budget-category-multi-select-trigger")).toContainText("Food");

  await page.getByRole("button", { name: "Save budget" }).click();
  await expect(page.locator(".budget-progress-card").filter({ hasText: "Spending money" })).toBeVisible();
});

test("mobile settings category selectors use dropdown multi-selects", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile Settings category controls are covered in the mobile project.");

  await routeBudgetBreakdownAkahu(page);
  await page.goto("/settings");
  await waitForStableApp(page);

  await page.getByLabel("Income categories").click();
  await expect(page.getByTestId("settings-income-category-options")).toBeVisible();
  await page.getByTestId("settings-income-category-options").getByRole("button", { name: "Food" }).click();
  await expect(page.getByLabel("Income categories")).not.toContainText("All categories");
  await expect(page.locator(".settings-card-fit-drawer")).toHaveCount(0);

  await page.keyboard.press("Escape");
  await page.getByLabel("Card Fit categories").click();
  await expect(page.getByTestId("settings-card-fit-category-options")).toBeVisible();
});

test("Akahu freshness stays refreshing until balance and transaction timestamps advance", async ({ page }) => {
  await page.unroute("**/api/akahu/accounts?source=user");
  await page.unroute("**/api/akahu/transactions?source=user**");
  await page.unroute("**/api/akahu/refresh");

  let accountCalls = 0;
  let releaseFinalAccountSnapshot: (() => void) | null = null;
  let refreshCalls = 0;
  let transactionCalls = 0;

  await page.route("**/api/akahu/accounts?source=user", async (route) => {
    accountCalls += 1;

    if (accountCalls >= 3) {
      await new Promise<void>((resolve) => {
        releaseFinalAccountSnapshot = resolve;
      });
      await route.fulfill({
        contentType: "application/json",
        json: getConnectedAccountPayload({
          balanceRefreshedAt: "2020-01-01T10:14:00.000Z",
          isStale: false,
          transactionsRefreshedAt: "2020-01-01T10:18:00.000Z"
        })
      });
      return;
    }

    const payload = accountCalls === 2
      ? getConnectedAccountPayload({
          balanceRefreshedAt: "2020-01-01T10:14:00.000Z",
          isStale: true,
          transactionsRefreshedAt: "2020-01-01T10:13:00.000Z"
        })
      : getConnectedAccountPayload({
          balanceRefreshedAt: "2020-01-01T10:13:00.000Z",
          isStale: true,
          transactionsRefreshedAt: "2020-01-01T10:13:00.000Z"
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
  await expect.poll(() => accountCalls, { timeout: 8000 }).toBe(3);
  await expect.poll(() => transactionCalls, { timeout: 8000 }).toBe(1);
  await expect(page.getByText("Current", { exact: true })).not.toBeVisible();
  const releaseFinalSnapshot = releaseFinalAccountSnapshot as (() => void) | null;
  if (!releaseFinalSnapshot) {
    throw new Error("Final Akahu account snapshot request was not waiting.");
  }
  releaseFinalSnapshot();
  await expect(page.getByText("Current", { exact: true })).toBeVisible({ timeout: 5000 });
  await expect(page.getByText("Refreshing", { exact: true })).not.toBeVisible();
  await expect.poll(() => transactionCalls, { timeout: 8000 }).toBeGreaterThanOrEqual(2);

  expect(refreshCalls).toBe(1);
});

test("Akahu freshness skips refresh when timestamps are still fresh", async ({ page }) => {
  await page.unroute("**/api/akahu/accounts?source=user");
  await page.unroute("**/api/akahu/transactions?source=user**");
  await page.unroute("**/api/akahu/refresh");

  let accountCalls = 0;
  let refreshCalls = 0;
  let transactionCalls = 0;
  const recentTimestamp = new Date().toISOString();

  await page.route("**/api/akahu/accounts?source=user", async (route) => {
    accountCalls += 1;
    await route.fulfill({
      contentType: "application/json",
      json: getConnectedAccountPayload({
        balanceRefreshedAt: recentTimestamp,
        isStale: false,
        transactionsRefreshedAt: recentTimestamp
      })
    });
  });

  await page.route("**/api/akahu/refresh", async (route) => {
    refreshCalls += 1;
    await route.fulfill({
      contentType: "application/json",
      json: {
        connected: true,
        notice: "Akahu refresh accepted.",
        requestedAt: new Date().toISOString()
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

  await expect(page.getByText("Current", { exact: true })).toBeVisible({ timeout: 5000 });
  await expect(page.getByText("Refreshing", { exact: true })).not.toBeVisible();
  expect(accountCalls).toBe(1);
  expect(refreshCalls).toBe(0);
  expect(transactionCalls).toBe(1);
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

// Serves deterministic user-mode transactions so the budget detail can show real counts.
async function routeBudgetBreakdownAkahu(page: import("@playwright/test").Page) {
  await page.unroute("**/api/akahu/accounts?source=user");
  await page.unroute("**/api/akahu/transactions?source=user**");
  await page.unroute("**/api/akahu/refresh");

  await page.route("**/api/akahu/accounts?source=user", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: getConnectedAccountPayload({
        balanceRefreshedAt: "2026-05-24T10:14:00.000Z",
        isStale: false,
        transactionsRefreshedAt: "2026-05-24T10:14:00.000Z"
      })
    });
  });

  await page.route("**/api/akahu/transactions?source=user**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        source: "akahu",
        connected: true,
        rawCount: 6,
        nextCursor: null,
        transactions: [
          getBudgetTransaction("food-1", "Food", -40),
          getBudgetTransaction("food-2", "Food", -35),
          getBudgetTransaction("transport-1", "Transport", -25),
          getBudgetTransaction("shopping-1", "Shopping", -20),
          getBudgetTransaction("health-1", "Health", -15),
          getBudgetTransaction("income-1", "Food", 100)
        ]
      }
    });
  });

  await page.route("**/api/akahu/refresh", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      status: 200,
      json: {
        connected: true,
        notice: "Akahu refresh accepted.",
        requestedAt: "2026-05-24T10:14:05.000Z"
      }
    });
  });
}

// Creates a minimal Akahu-shaped transaction for budget UI tests.
function getBudgetTransaction(id: string, category: string, amount: number) {
  return {
    _id: id,
    _account: "acc-main",
    amount,
    category: {
      groups: {
        personal_finance: {
          name: category
        }
      },
      name: category
    },
    date: "2026-05-12",
    description: id,
    netly: {
      accountName: "Everyday"
    }
  };
}

// Builds a connected Akahu account payload with explicit freshness timestamps.
function getConnectedAccountPayload({
  balanceRefreshedAt,
  isStale = false,
  transactionsRefreshedAt
}: {
  balanceRefreshedAt: string;
  isStale?: boolean;
  transactionsRefreshedAt: string;
}) {
  return {
    source: "akahu",
    connected: true,
    availableBalance: 1234.56,
    accounts: [
      {
        accountId: "acc-main",
        accountSubType: "checking",
        accountType: "bank",
        id: "acc-main",
        currency: "NZD",
        displayName: "Everyday",
        identification: "00-0000-0000000-00",
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
    isStale,
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

// Reports whether a drawer body is acting as the scroll container.
async function getOverflowProbe(locator: import("@playwright/test").Locator) {
  return locator.evaluate((element) => {
    const style = window.getComputedStyle(element);

    return {
      overflowY: style.overflowY,
      scrolls: element.scrollHeight > element.clientHeight + 1
    };
  });
}

// Measures layout position independent of viewport scroll anchoring.
async function getDocumentTop(locator: import("@playwright/test").Locator) {
  return locator.evaluate((element) => element.getBoundingClientRect().top + window.scrollY);
}
