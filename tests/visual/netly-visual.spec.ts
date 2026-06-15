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

test("expired Google Drive backup list redirects to OAuth and clears stale local connection", async ({ page }) => {
  let startCalls = 0;
  let pendingIntentWrite = "";
  let removedStoredConnection = false;
  let releaseStartRequest = () => {};
  const startRequestGate = new Promise<void>((resolve) => {
    releaseStartRequest = resolve;
  });

  await page.exposeFunction("recordDrivePendingIntentWrite", (value: string) => {
    pendingIntentWrite = value;
  });
  await page.exposeFunction("recordDriveConnectionRemoval", () => {
    removedStoredConnection = true;
  });
  await page.addInitScript(() => {
    const recorders = window as unknown as {
      recordDriveConnectionRemoval: () => void;
      recordDrivePendingIntentWrite: (value: string) => void;
    };
    const originalRemoveItem = Storage.prototype.removeItem;
    const originalSetItem = Storage.prototype.setItem;

    Storage.prototype.setItem = function setItemAndRecordDriveIntent(key, value) {
      if (this === window.localStorage && key === "netly_drive_backup_pending_intent") {
        recorders.recordDrivePendingIntentWrite(value);
      }

      return originalSetItem.call(this, key, value);
    };

    Storage.prototype.removeItem = function removeItemAndRecordDriveConnection(key) {
      if (this === window.localStorage && key === "netly_drive_backup_connection") {
        recorders.recordDriveConnectionRemoval();
      }

      return originalRemoveItem.call(this, key);
    };
  });
  await page.route("**/api/google-drive/status", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: { connected: true }
    });
  });
  await page.route("**/api/google-drive/backups", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      status: 401,
      json: {
        error: "Google Drive connection expired. Sign in again to continue.",
        requiresReauth: true
      }
    });
  });
  await page.route("**/api/google-drive/start", async (route) => {
    startCalls += 1;
    await startRequestGate;
    await route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Google OAuth</title>"
    });
  });

  await page.goto("/settings");
  await waitForStableApp(page);
  await page.evaluate(() => {
    window.localStorage.setItem("netly_drive_backup_connection", JSON.stringify({
      connected: true,
      lastSyncedAt: "2026-05-18T01:49:00.000Z"
    }));
  });

  await page.getByRole("button", { name: "Backups" }).click();

  await expect.poll(() => startCalls).toBe(1);
  await expect.poll(() => pendingIntentWrite).toBe("backups");
  await expect.poll(() => removedStoredConnection).toBe(true);
  releaseStartRequest();
});

test("Google Drive OAuth return reopens the backups panel without auto-uploading", async ({ page }) => {
  let backupListCalls = 0;

  await routeConnectedGoogleDrive(page, () => {
    backupListCalls += 1;
  });
  await addPendingDriveIntent(page, "backups");

  await page.goto("/settings?drive_connected=1");
  await waitForStableApp(page);

  await expect(page.getByRole("heading", { name: "Backups" })).toBeVisible();
  await expect(page.getByText("netly-backup-v2-20260518T014900Z.json")).toBeVisible();
  await expect.poll(() => backupListCalls).toBe(1);
  await expect.poll(() => page.evaluate(() => window.localStorage.getItem("netly_drive_backup_pending_intent"))).toBeNull();
});

test("Google Drive OAuth return reopens the restore panel without auto-restoring", async ({ page }) => {
  let backupListCalls = 0;

  await routeConnectedGoogleDrive(page, () => {
    backupListCalls += 1;
  });
  await addPendingDriveIntent(page, "restore");

  await page.goto("/settings?drive_connected=1");
  await waitForStableApp(page);

  await expect(page.getByRole("heading", { name: "Restore a backup" })).toBeVisible();
  await expect(page.getByText("netly-backup-v2-20260518T014900Z.json")).toBeVisible();
  await expect(page.getByRole("button", { name: /Restore 18 May 2026/ })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Restore selected backup?" })).toHaveCount(0);
  await expect.poll(() => backupListCalls).toBe(1);
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
  const selectedTransactionRowProbe = await page.getByTestId("budget-selected-transactions").locator(".money-movement-card").filter({ hasText: "food-1" }).evaluate((element) => {
    const amount = element.querySelector(".money-movement-amount");
    const cardRect = element.getBoundingClientRect();
    const amountRect = amount?.getBoundingClientRect();

    return {
      amountCenterDelta: amountRect ? Math.abs((amountRect.top + amountRect.height / 2) - (cardRect.top + cardRect.height / 2)) : -1
    };
  });
  expect(selectedTransactionRowProbe.amountCenterDelta).toBeLessThanOrEqual(2);
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

test("home dashboard period reset uses the current calendar month", async ({ page }, testInfo) => {
  await freezeBrowserDate(page, "2026-06-01T12:00:00");
  await routeHomePeriodResetAkahu(page);
  await page.goto("/");
  await waitForStableApp(page);

  const categoryCard = page.getByTestId("category-donut-card");
  const spentMetric = page.locator(".metric-grid > .material-card").filter({ hasText: "Spent" });
  await expect(categoryCard).toContainText("Groceries");
  await expect(categoryCard).not.toContainText("Food");
  await expect(spentMetric).toContainText("$12");
  await expect(spentMetric).toContainText("1 outgoing transaction");

  if (testInfo.project.name === "desktop") {
    const thirtyDaysTab = page.getByRole("tab", { name: "30 days" });
    await expect(thirtyDaysTab).toHaveCount(1);
    await thirtyDaysTab.click();

    await expect(categoryCard).toContainText("Food");
    await expect(spentMetric).toContainText("$52");
    await expect(spentMetric).toContainText("2 outgoing transactions");
  }
});

test("budget history opens historical period details with editable transactions", async ({ page }) => {
  await routeBudgetBreakdownAkahu(page);
  await page.goto("/");
  await waitForStableApp(page);
  await page.evaluate(() => {
    window.localStorage.setItem("netly_user_budgets", JSON.stringify({
      budgets: [
        {
          categoryNames: ["Food", "Transport", "Shopping", "Health"],
          cadence: "monthly",
          createdAt: "2026-05-01",
          id: "budget-spending-money",
          limit: 100,
          name: "Spending money",
          periodAnchorDate: "2026-05-01"
        }
      ],
      history: [
        {
          budgetId: "budget-spending-money",
          categoryNames: ["Food", "Transport", "Shopping", "Health"],
          cadence: "monthly",
          id: "budget-spending-money:2026-05-01:2026-05-31",
          limit: 100,
          name: "Spending money",
          periodEndDate: "2026-05-31",
          periodStartDate: "2026-05-01"
        },
        {
          budgetId: "budget-spending-money",
          categoryNames: ["Food", "Transport", "Shopping", "Health"],
          cadence: "monthly",
          id: "budget-spending-money:2026-04-01:2026-04-30",
          limit: 100,
          name: "Spending money",
          periodEndDate: "2026-04-30",
          periodStartDate: "2026-04-01"
        }
      ]
    }));
  });

  await page.getByRole("button", { name: /Budgets/ }).first().click();
  await expect(page.getByTestId("budgets-page")).toBeVisible();
  await page.getByLabel("View Spending money history").click();
  await expect(page.getByTestId("budget-history-page")).toBeVisible();
  const mayHistoryCard = page.locator(".budget-history-card").filter({ hasText: "May 2026" });
  const aprilHistoryCard = page.locator(".budget-history-card").filter({ hasText: "April 2026" });
  await expect(mayHistoryCard).toContainText("$35.00 overspent of $100.00");
  await expect(mayHistoryCard).toContainText("135%");
  await expect(aprilHistoryCard).toContainText("$40.00 left of $100.00");
  await expect(aprilHistoryCard).toContainText("60%");
  await expect(page.getByRole("progressbar", { name: "Spending money May 2026 budget progress" })).toHaveAttribute("aria-valuenow", "135");
  await expect(page.getByRole("progressbar", { name: "Spending money April 2026 budget progress" })).toHaveAttribute("aria-valuenow", "60");

  await mayHistoryCard.click();
  await expect(page.getByTestId("budget-history-detail-page")).toBeVisible();
  await expect(page.getByRole("button", { name: /Edit Spending money/ })).toHaveCount(0);
  await expect(page.locator(".budget-breakdown-item").filter({ hasText: "Food" })).toContainText("2 transactions");

  await page.locator(".budget-breakdown-item").filter({ hasText: "Food" }).getByTestId("budget-breakdown-row").click();
  await page.getByTestId("budget-selected-transactions").locator(".money-movement-card").filter({ hasText: "food-1" }).click();
  await expect(page.getByTestId("transaction-details-drawer")).toBeVisible();
  await expect(page.getByLabel("Set category for food-1")).toBeVisible();
});

test("demo budget history stays attached to the saved budget without adding a starter duplicate", async ({ page }, testInfo) => {
  await routeDemoBudgetHistoryAkahu(page);
  await page.addInitScript(() => {
    window.localStorage.setItem("netly_data_mode", "demo");
    window.localStorage.setItem("netly_user_budgets", JSON.stringify({
      budgets: [
        {
          categoryNames: ["Eating out", "Groceries", "Health", "Shopping", "Transport"],
          cadence: "monthly",
          createdAt: "2026-04-01",
          id: "saved-demo-spending",
          limit: 800,
          name: "Spending money",
          periodAnchorDate: "2026-04-01"
        }
      ],
      history: []
    }));
  });

  await page.goto("/budgets");
  await waitForStableApp(page);

  await expect(page.locator(".budget-progress-card")).toHaveCount(1);
  await expect(page.locator(".budget-progress-card").filter({ hasText: "Spending money" })).toBeVisible();
  expect(await page.evaluate(() => window.localStorage.getItem("netly_user_budgets")?.includes("demo-spending-money") || false)).toBe(false);

  await page.getByLabel("View Spending money history").click();
  await expect(page.getByTestId("budget-history-page")).toBeVisible();
  expect(await getGridColumnCount(page.locator(".budget-history-grid"))).toBe(testInfo.project.name === "mobile" ? 1 : 2);
  const aprilHistoryCard = page.locator(".budget-history-card").filter({ hasText: "April 2026" });
  await expect(aprilHistoryCard).toBeVisible();
  await expect(aprilHistoryCard).toContainText("$390.00 left of $800.00");
  await expect(aprilHistoryCard).toContainText("51%");
  await expect(aprilHistoryCard.getByRole("progressbar", { name: "Spending money April 2026 budget progress" })).toHaveAttribute("aria-valuenow", "51");
});

test("demo starter budget history spans every progress color band", async ({ page }) => {
  await routeDemoBudgetHistoryAkahu(page);
  await page.addInitScript(() => {
    window.localStorage.setItem("netly_data_mode", "demo");
  });

  await page.goto("/budgets");
  await waitForStableApp(page);

  await page.getByLabel("View Spending money history").click();
  await expect(page.getByTestId("budget-history-page")).toBeVisible();
  await expect(page.locator(".budget-history-card")).toHaveCount(10);
  await expectBudgetHistoryCard(page, "April 2026", "$200.00 left of $800.00", "75");
  await expectBudgetHistoryCard(page, "March 2026", "$80.00 left of $800.00", "90");
  await expectBudgetHistoryCard(page, "February 2026", "$200.00 overspent of $800.00", "125");
  await expectBudgetHistoryCard(page, "January 2026", "$600.00 overspent of $800.00", "175");
  await expectBudgetHistoryCard(page, "December 2025", "$1,000.00 overspent of $800.00", "225");
  await expectBudgetHistoryCard(page, "November 2025", "$1,400.00 overspent of $800.00", "275");
  await expectBudgetHistoryCard(page, "October 2025", "$1,800.00 overspent of $800.00", "325");
  await expectBudgetHistoryCard(page, "September 2025", "$2,200.00 overspent of $800.00", "375");
  await expectBudgetHistoryCard(page, "August 2025", "$2,600.00 overspent of $800.00", "425");
  await expectBudgetHistoryCard(page, "July 2025", "$3,000.00 overspent of $800.00", "475");
});

test("mobile transaction filter multi-selects stay inside dropdown menus", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Mobile drawer behavior is covered in the mobile project.");

  await routeBudgetBreakdownAkahu(page);
  await page.goto("/transactions");
  await waitForStableApp(page);

  await page.getByLabel("Transaction actions").click();
  await page.getByRole("button", { name: /^Filters/ }).click();
  await expect(page.locator(".mobile-filter-drawer")).toBeVisible();
  await expect(page.locator(".transaction-mobile-menu")).toHaveCount(0);
  expect(await getOverflowProbe(page.locator(".mobile-filter-drawer-body"))).toEqual({
    overflowY: "auto",
    scrolls: false
  });

  await page.getByTestId("transaction-account-filter-trigger").click();
  await expect(page.getByTestId("transaction-account-filter-options")).toBeVisible();
  await expect(page.getByTestId("transaction-account-filter-options")).toHaveCSS("overflow-y", "auto");
  await page.getByTestId("transaction-account-filter-options").locator("button").nth(1).click();
  await expect(page.getByTestId("transaction-account-filter-trigger")).not.toContainText("All accounts");

  await page.getByTestId("transaction-category-filter-trigger").click();
  await expect(page.getByTestId("transaction-category-filter-options")).toBeVisible();
  await expect(page.getByTestId("transaction-category-filter-options")).toHaveCSS("overflow-y", "auto");
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
  await expect(page.getByTestId("budget-category-multi-select-content")).toHaveCSS("overflow-y", "auto");
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

test("Akahu startup fetches transactions while account freshness is still loading", async ({ page }) => {
  await page.unroute("**/api/akahu/accounts?source=user");
  await page.unroute("**/api/akahu/transactions?source=user**");
  await page.unroute("**/api/akahu/refresh");

  let accountCalls = 0;
  let releaseAccountSnapshot: (() => void) | null = null;
  let transactionCalls = 0;
  const recentTimestamp = new Date().toISOString();

  await page.route("**/api/akahu/accounts?source=user", async (route) => {
    accountCalls += 1;
    await new Promise<void>((resolve) => {
      releaseAccountSnapshot = resolve;
    });
    await route.fulfill({
      contentType: "application/json",
      json: getConnectedAccountPayload({
        balanceRefreshedAt: recentTimestamp,
        isStale: false,
        transactionsRefreshedAt: recentTimestamp
      })
    });
  });

  await page.route("**/api/akahu/transactions?source=user**", async (route) => {
    transactionCalls += 1;
    await route.fulfill({
      contentType: "application/json",
      json: {
        source: "akahu",
        connected: true,
        rawCount: 1,
        nextCursor: null,
          transactions: [
          getBudgetTransaction("fast-startup-transaction", "Food", -12.34, "2026-06-01")
        ]
      }
    });
  });

  await page.route("**/api/akahu/refresh", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        connected: true,
        notice: "Akahu refresh accepted.",
        requestedAt: new Date().toISOString()
      }
    });
  });

  await page.goto("/transactions");

  await expect.poll(() => transactionCalls, { timeout: 5000 }).toBe(1);
  expect(accountCalls).toBe(1);
  await expect(page.getByText("fast-startup-transaction")).toBeVisible({ timeout: 5000 });
  const releaseSnapshot = releaseAccountSnapshot as (() => void) | null;
  if (!releaseSnapshot) {
    throw new Error("Blocked Akahu account snapshot request was not waiting.");
  }
  releaseSnapshot();
  await page.waitForLoadState("networkidle");
});

test("Transactions refresh shows loading instead of empty state until rows arrive", async ({ page }) => {
  await page.unroute("**/api/akahu/accounts?source=user");
  await page.unroute("**/api/akahu/transactions?source=user**");
  await page.unroute("**/api/akahu/refresh");

  const recentTimestamp = new Date().toISOString();
  const accountSnapshot = getConnectedAccountPayload({
    balanceRefreshedAt: recentTimestamp,
    isStale: false,
    transactionsRefreshedAt: recentTimestamp
  });
  let releaseTransactions: (() => void) | null = null;
  const transactionGate = new Promise<void>((resolve) => {
    releaseTransactions = resolve;
  });

  await page.route("**/api/akahu/accounts?source=user", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: accountSnapshot
    });
  });

  await page.route("**/api/akahu/transactions?source=user**", async (route) => {
    await transactionGate;
    await route.fulfill({
      contentType: "application/json",
      json: {
        source: "akahu",
        connected: true,
        rawCount: 1,
        nextCursor: null,
        transactions: [
          getBudgetTransaction("delayed-refresh-transaction", "Food", -12.34, "2026-06-01")
        ]
      }
    });
  });

  await page.route("**/api/akahu/refresh", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        connected: true,
        requestedAt: recentTimestamp
      }
    });
  });

  await seedArchivedAccountSnapshot(page, accountSnapshot);
  await page.goto("/transactions");

  await expect(page.getByTestId("transactions-page")).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole("status").filter({ hasText: "Loading transactions and encrypted archive" })).toBeVisible({ timeout: 5000 });
  await expect(page.getByText("No transactions found for this period.")).toHaveCount(0);
  await expect(page.getByText("No transactions match the current filters.")).toHaveCount(0);

  const releaseDelayedTransactions = releaseTransactions as (() => void) | null;
  if (!releaseDelayedTransactions) {
    throw new Error("Blocked transaction request was not waiting.");
  }

  releaseDelayedTransactions();
  await expect(page.getByText("delayed-refresh-transaction")).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole("status").filter({ hasText: "Loading transactions and encrypted archive" })).toHaveCount(0);
});

test("Transactions month scroll loads every cursor page for the selected month", async ({ page }) => {
  await page.unroute("**/api/akahu/accounts?source=user");
  await page.unroute("**/api/akahu/transactions?source=user**");
  await page.unroute("**/api/akahu/refresh");
  await clearTransactionArchive(page);
  await freezeBrowserDate(page, "2026-06-24T12:00:00");

  const recentTimestamp = new Date().toISOString();
  const mayFirstPage = getTransactionScrollPage("month-scroll-page-1", 100);
  const maySecondPage = getTransactionScrollPage("month-scroll-page-2", 80);
  const mayFinalPage = getTransactionScrollPage("month-scroll-page-3", 20);
  const requestedCursors: string[] = [];

  await page.route("**/api/akahu/accounts?source=user", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: getConnectedAccountPayload({
        balanceRefreshedAt: recentTimestamp,
        isStale: false,
        transactionsRefreshedAt: recentTimestamp
      })
    });
  });

  await page.route("**/api/akahu/transactions?source=user**", async (route) => {
    const url = new URL(route.request().url());
    const cursor = url.searchParams.get("cursor") || "";
    const isMayRangeRequest = url.searchParams.get("from") === "2026-05-01" && url.searchParams.get("to") === "2026-05-31";

    if (cursor) {
      requestedCursors.push(cursor);
      expect(isMayRangeRequest).toBe(true);
    }

    if (url.searchParams.get("load") === "all") {
      await route.fulfill({
        contentType: "application/json",
        json: {
          source: "akahu",
          connected: true,
          rawCount: 2,
          nextCursor: null,
          transactions: [
            getBudgetTransaction("startup-june-transaction", "Food", -10, "2026-06-12"),
            getBudgetTransaction("startup-may-anchor", "Food", -10, "2026-05-12")
          ]
        }
      });
      return;
    }

    const pagePayload = cursor === "may-cursor-2"
      ? { nextCursor: "may-cursor-3", transactions: maySecondPage }
      : cursor === "may-cursor-3"
        ? { nextCursor: null, transactions: mayFinalPage }
        : { nextCursor: "may-cursor-2", transactions: mayFirstPage };

    await route.fulfill({
      contentType: "application/json",
      json: {
        source: "akahu",
        connected: true,
        rawCount: pagePayload.transactions.length,
        nextCursor: pagePayload.nextCursor,
        transactions: pagePayload.transactions
      }
    });
  });

  await page.route("**/api/akahu/refresh", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        connected: true,
        requestedAt: recentTimestamp
      }
    });
  });

  await page.goto("/transactions");
  await waitForStableApp(page);
  await page.locator(".transaction-month-rail button").filter({ hasText: "May" }).click();
  await expect(page.getByText("month-scroll-page-1-001")).toBeVisible({ timeout: 10000 });

  for (let attempt = 0; attempt < 12; attempt += 1) {
    if (await page.getByText("month-scroll-page-3-020").isVisible().catch(() => false)) {
      break;
    }

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);
  }

  await expect(page.getByText("month-scroll-page-3-020")).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole("status").filter({ hasText: "Loading more transactions" })).toHaveCount(0);
  await expect.poll(() => requestedCursors).toEqual(["may-cursor-2", "may-cursor-3"]);
});

test("Transactions refresh keeps loading when archive rows are outside the active range", async ({ page }) => {
  await page.unroute("**/api/akahu/accounts?source=user");
  await page.unroute("**/api/akahu/transactions?source=user**");
  await page.unroute("**/api/akahu/refresh");
  await clearTransactionArchive(page);
  await freezeBrowserDate(page, "2026-06-01T12:00:00");

  const recentTimestamp = new Date().toISOString();
  const accountSnapshot = getConnectedAccountPayload({
    balanceRefreshedAt: recentTimestamp,
    isStale: false,
    transactionsRefreshedAt: recentTimestamp
  });

  await page.route("**/api/akahu/accounts?source=user", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: accountSnapshot
    });
  });

  await page.route("**/api/akahu/transactions?source=user**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        source: "akahu",
        connected: true,
        rawCount: 1,
        nextCursor: null,
        transactions: [
          getBudgetTransaction("archived-april-transaction", "Food", -12.34, "2026-04-01")
        ]
      }
    });
  });

  await page.route("**/api/akahu/refresh", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        connected: true,
        requestedAt: recentTimestamp
      }
    });
  });

  await page.goto("/transactions");
  await expect(page.getByRole("status").filter({ hasText: "Loading transactions and encrypted archive" })).toHaveCount(0, { timeout: 10000 });
  await expect(page.getByText("archived-april-transaction")).toHaveCount(0);
  await preserveArchiveKeyOnFutureNavigations(page);
  await page.unroute("**/api/akahu/transactions?source=user**");

  let releaseTransactions: (() => void) | null = null;
  const transactionGate = new Promise<void>((resolve) => {
    releaseTransactions = resolve;
  });

  await page.route("**/api/akahu/transactions?source=user**", async (route) => {
    await transactionGate;
    await route.fulfill({
      contentType: "application/json",
      json: {
        source: "akahu",
        connected: true,
        rawCount: 1,
        nextCursor: null,
        transactions: [
          getBudgetTransaction("delayed-june-transaction", "Food", -23.45, "2026-06-01")
        ]
      }
    });
  });

  await page.reload();
  await expect(page.getByRole("status").filter({ hasText: "Loading transactions and encrypted archive" })).toBeVisible({ timeout: 5000 });
  await expect(page.getByText("No transactions found for this period.")).toHaveCount(0);
  await expect(page.getByText("No transactions match the current filters.")).toHaveCount(0);

  const releaseDelayedTransactions = releaseTransactions as (() => void) | null;
  if (!releaseDelayedTransactions) {
    throw new Error("Blocked transaction request was not waiting.");
  }

  releaseDelayedTransactions();
  await expect(page.getByText("delayed-june-transaction")).toBeVisible({ timeout: 10000 });
  await expect(page.getByRole("status").filter({ hasText: "Loading transactions and encrypted archive" })).toHaveCount(0);
});

test("Transactions refresh excludes previous-month overlap rows on the first of the month", async ({ page }) => {
  await page.unroute("**/api/akahu/accounts?source=user");
  await page.unroute("**/api/akahu/transactions?source=user**");
  await page.unroute("**/api/akahu/refresh");
  await clearTransactionArchive(page);
  await freezeBrowserDate(page, "2026-06-01T12:00:00");

  const recentTimestamp = new Date().toISOString();
  const accountSnapshot = getConnectedAccountPayload({
    balanceRefreshedAt: recentTimestamp,
    isStale: false,
    transactionsRefreshedAt: recentTimestamp
  });

  await page.route("**/api/akahu/accounts?source=user", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: accountSnapshot
    });
  });

  await page.route("**/api/akahu/transactions?source=user**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        source: "akahu",
        connected: true,
        rawCount: 1,
        nextCursor: null,
        transactions: [
          getBudgetTransaction("may-31-overlap-transaction", "Food", -31, "2026-05-31")
        ]
      }
    });
  });

  await page.route("**/api/akahu/refresh", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        connected: true,
        requestedAt: recentTimestamp
      }
    });
  });

  await page.goto("/transactions");
  await expect(page.getByRole("status").filter({ hasText: "Loading transactions and encrypted archive" })).toHaveCount(0, { timeout: 10000 });
  await expect(page.getByText("may-31-overlap-transaction")).toHaveCount(0);
  await preserveArchiveKeyOnFutureNavigations(page);
  await page.unroute("**/api/akahu/transactions?source=user**");

  await page.route("**/api/akahu/transactions?source=user**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        source: "akahu",
        connected: true,
        rawCount: 2,
        nextCursor: null,
        transactions: [
          getBudgetTransaction("may-31-overlap-transaction", "Food", -31, "2026-05-31"),
          getBudgetTransaction("june-1-transaction", "Food", -10, "2026-06-01")
        ]
      }
    });
  });

  await page.reload();
  await expect(page.getByText("june-1-transaction")).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("may-31-overlap-transaction")).toHaveCount(0);
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

// Seeds only account metadata so the page proves it does not treat balance hydration as transaction hydration.
async function seedArchivedAccountSnapshot(page: import("@playwright/test").Page, accountPayload: ReturnType<typeof getConnectedAccountPayload>) {
  await page.goto("/robots.txt");
  await page.evaluate(async (accountSnapshot) => {
    window.localStorage.setItem("netly_data_mode", "user");

    await new Promise<void>((resolve, reject) => {
      const request = window.indexedDB.open("netly-transaction-archive", 1);

      request.onupgradeneeded = () => {
        const database = request.result;

        if (!database.objectStoreNames.contains("transaction-records")) {
          database.createObjectStore("transaction-records", { keyPath: "id" });
        }

        if (!database.objectStoreNames.contains("archive-metadata")) {
          database.createObjectStore("archive-metadata");
        }
      };
      request.onerror = () => reject(request.error || new Error("Could not open transaction archive."));
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction(["archive-metadata"], "readwrite");

        transaction.objectStore("archive-metadata").put({
          accountSnapshot,
          deviceId: "visual-refresh-device",
          lastDriveSyncAt: "",
          lastIncrementalTransactionSyncAt: "",
          lastLocalUpdateAt: accountSnapshot.retrievedAt || "",
          schemaVersion: 1
        }, "metadata");
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error || new Error("Could not seed account archive."));
        transaction.onabort = () => reject(transaction.error || new Error("Account archive seed aborted."));
      };
    });
  }, {
    accountFreshness: accountPayload.accountFreshness,
    accounts: accountPayload.accounts,
    availableBalance: accountPayload.availableBalance,
    balanceRefreshedAt: accountPayload.balanceRefreshedAt,
    isStale: accountPayload.isStale,
    primaryAccount: accountPayload.primaryAccount,
    retrievedAt: accountPayload.retrievedAt,
    transactionsRefreshedAt: accountPayload.transactionsRefreshedAt
  });
}

// Clears encrypted archive state so tests can seed deterministic local history.
async function clearTransactionArchive(page: import("@playwright/test").Page) {
  await page.goto("/robots.txt");
  await page.evaluate(async () => {
    window.localStorage.removeItem("netly_transaction_archive_key_v1");
    window.localStorage.removeItem("netly_transaction_archive_device_id");

    await new Promise<void>((resolve, reject) => {
      const request = window.indexedDB.deleteDatabase("netly-transaction-archive");

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error || new Error("Could not clear transaction archive."));
      request.onblocked = () => reject(new Error("Could not clear transaction archive because it is blocked."));
    });
  });
}

// Keeps the test archive decryptable across reloads despite the suite storage-clear init script.
async function preserveArchiveKeyOnFutureNavigations(page: import("@playwright/test").Page) {
  const archiveKey = await page.evaluate(() => window.localStorage.getItem("netly_transaction_archive_key_v1"));

  if (!archiveKey) {
    throw new Error("Expected seeded transaction archive key to exist before reload.");
  }

  await page.addInitScript((key) => {
    const originalClear = Storage.prototype.clear;

    Storage.prototype.clear = function clearAndRestoreArchiveKey() {
      originalClear.call(this);

      if (this === window.localStorage) {
        this.setItem("netly_transaction_archive_key_v1", key);
      }
    };

    window.localStorage.setItem("netly_transaction_archive_key_v1", key);
  }, archiveKey);
}

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

// Serves a connected Drive backup list without contacting Google.
async function routeConnectedGoogleDrive(page: import("@playwright/test").Page, onBackupList?: () => void) {
  await page.route("**/api/google-drive/status", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: { connected: true }
    });
  });

  await page.route("**/api/google-drive/backups", async (route) => {
    onBackupList?.();
    await route.fulfill({
      contentType: "application/json",
      json: {
        backups: [
          {
            createdTime: "2026-05-18T01:49:00.000Z",
            id: "drive-backup-1",
            metadataAvailable: true,
            modifiedTime: "2026-05-18T01:49:00.000Z",
            name: "netly-backup-v2-20260518T014900Z.json",
            timestamp: "2026-05-18T01:49:00.000Z"
          }
        ]
      }
    });
  });
}

// Preserves the one-shot Drive intent despite the suite-level storage clear.
async function addPendingDriveIntent(page: import("@playwright/test").Page, intent: "backups" | "restore") {
  await page.addInitScript((pendingIntent) => {
    const originalClear = Storage.prototype.clear;

    Storage.prototype.clear = function clearAndRestoreDriveIntent() {
      originalClear.call(this);

      if (this === window.localStorage) {
        window.localStorage.setItem("netly_drive_backup_pending_intent", pendingIntent);
      }
    };

    window.localStorage.setItem("netly_drive_backup_pending_intent", pendingIntent);
  }, intent);
}

// Serves deterministic user-mode transactions so the budget detail can show real counts.
async function routeBudgetBreakdownAkahu(page: import("@playwright/test").Page) {
  await freezeBrowserDate(page, "2026-05-24T12:00:00");
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
        rawCount: 8,
        nextCursor: null,
        transactions: [
          getBudgetTransaction("food-1", "Food", -40),
          getBudgetTransaction("food-2", "Food", -35),
          getBudgetTransaction("transport-1", "Transport", -25),
          getBudgetTransaction("shopping-1", "Shopping", -20),
          getBudgetTransaction("health-1", "Health", -15),
          getBudgetTransaction("april-food-1", "Food", -40, "2026-04-12"),
          getBudgetTransaction("april-transport-1", "Transport", -20, "2026-04-18"),
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

// Serves transactions around a month boundary so Home proves it resets against today's date.
async function routeHomePeriodResetAkahu(page: import("@playwright/test").Page) {
  await page.unroute("**/api/akahu/accounts?source=user");
  await page.unroute("**/api/akahu/transactions?source=user**");
  await page.unroute("**/api/akahu/refresh");

  await page.route("**/api/akahu/accounts?source=user", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: getConnectedAccountPayload({
        balanceRefreshedAt: "2026-06-01T10:14:00.000Z",
        isStale: false,
        transactionsRefreshedAt: "2026-06-01T10:14:00.000Z"
      })
    });
  });

  await page.route("**/api/akahu/transactions?source=user**", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        source: "akahu",
        connected: true,
        rawCount: 4,
        nextCursor: null,
        transactions: [
          getBudgetTransaction("may-food", "Food", -40, "2026-05-31"),
          getBudgetTransaction("old-transport", "Transport", -25, "2026-05-01"),
          getBudgetTransaction("june-groceries", "Groceries", -12, "2026-06-01"),
          getBudgetTransaction("june-income", "Salary", 100, "2026-06-01")
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
        requestedAt: "2026-06-01T10:14:05.000Z"
      }
    });
  });
}

// Serves deterministic demo-mode transactions for budget seed-history checks.
async function routeDemoBudgetHistoryAkahu(page: import("@playwright/test").Page) {
  await freezeBrowserDate(page, "2026-05-24T12:00:00");
  await page.route("**/api/akahu/accounts?source=demo", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        ...getConnectedAccountPayload({
          balanceRefreshedAt: "2026-05-24T10:14:00.000Z",
          isStale: false,
          transactionsRefreshedAt: "2026-05-24T10:14:00.000Z"
        }),
        source: "demo"
      }
    });
  });

  await page.route("**/api/akahu/transactions?source=demo**", async (route) => {
    const demoTransactions = [
      getBudgetTransaction("demo-grocery-april-1", "Groceries", -110, "2026-04-11"),
      getBudgetTransaction("demo-grocery-april-2", "Groceries", -90, "2026-04-18"),
      getBudgetTransaction("demo-transport-april", "Transport", -45, "2026-04-20"),
      getBudgetTransaction("demo-eating-april", "Eating out", -70, "2026-04-23"),
      getBudgetTransaction("demo-health-april", "Health", -35, "2026-04-24"),
      getBudgetTransaction("demo-shopping-april", "Shopping", -60, "2026-04-28"),
      getBudgetTransaction("demo-grocery-may", "Groceries", -80, "2026-05-11"),
      getBudgetTransaction("demo-shopping-may", "Shopping", -45, "2026-05-13"),
      ...getBudgetHistoryDemoTransactions()
    ];

    await route.fulfill({
      contentType: "application/json",
      json: {
        source: "demo",
        connected: true,
        rawCount: demoTransactions.length,
        nextCursor: null,
        transactions: demoTransactions,
        notice: "Showing Akahu-shaped demo transactions."
      }
    });
  });
}

// Serves two demo history cards in each 100% progress band up to 500%.
function getBudgetHistoryDemoTransactions() {
  return [
    getBudgetTransaction("demo-budget-april-2026", "Budget demo", -600, "2026-04-15"),
    getBudgetTransaction("demo-budget-march-2026", "Budget demo", -720, "2026-03-15"),
    getBudgetTransaction("demo-budget-february-2026", "Budget demo", -1000, "2026-02-15"),
    getBudgetTransaction("demo-budget-january-2026", "Budget demo", -1400, "2026-01-15"),
    getBudgetTransaction("demo-budget-december-2025", "Budget demo", -1800, "2025-12-15"),
    getBudgetTransaction("demo-budget-november-2025", "Budget demo", -2200, "2025-11-15"),
    getBudgetTransaction("demo-budget-october-2025", "Budget demo", -2600, "2025-10-15"),
    getBudgetTransaction("demo-budget-september-2025", "Budget demo", -3000, "2025-09-15"),
    getBudgetTransaction("demo-budget-august-2025", "Budget demo", -3400, "2025-08-15"),
    getBudgetTransaction("demo-budget-july-2025", "Budget demo", -3800, "2025-07-15")
  ];
}

// Creates a minimal Akahu-shaped transaction for budget UI tests.
function getBudgetTransaction(id: string, category: string, amount: number, date = "2026-05-12") {
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
    date,
    description: id,
    netly: {
      accountName: "Everyday"
    }
  };
}

// Creates deterministic May transaction pages large enough to exercise local reveal and remote cursor loading.
function getTransactionScrollPage(prefix: string, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const transactionNumber = index + 1;
    const day = String((index % 28) + 1).padStart(2, "0");

    return getBudgetTransaction(
      `${prefix}-${String(transactionNumber).padStart(3, "0")}`,
      "Food",
      -transactionNumber,
      `2026-05-${day}`
    );
  });
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

// Checks a seeded budget history card's text and accessible progress value.
async function expectBudgetHistoryCard(page: import("@playwright/test").Page, period: string, status: string, percent: string) {
  const historyCard = page.locator(".budget-history-card").filter({ hasText: period });

  await expect(historyCard).toBeVisible();
  await expect(historyCard).toContainText(status);
  await expect(historyCard).toContainText(`${percent}%`);
  await expect(historyCard.getByRole("progressbar", { name: `Spending money ${period} budget progress` })).toHaveAttribute("aria-valuenow", percent);
}

// Counts explicit CSS grid tracks for responsive layout assertions.
async function getGridColumnCount(locator: import("@playwright/test").Locator) {
  return locator.evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean).length);
}

// Freezes browser time for period-window tests that would otherwise depend on the runner date.
async function freezeBrowserDate(page: import("@playwright/test").Page, isoDate: string) {
  await page.addInitScript((fixedIsoDate: string) => {
    const RealDate = Date;
    const fixedTime = new RealDate(fixedIsoDate).getTime();

    class MockDate extends RealDate {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(fixedTime);
          return;
        }

        if (args.length === 1) {
          super(args[0]);
          return;
        }

        super(args[0], args[1], args[2] ?? 1, args[3] ?? 0, args[4] ?? 0, args[5] ?? 0, args[6] ?? 0);
      }

      static now() {
        return fixedTime;
      }
    }

    globalThis.Date = MockDate as unknown as DateConstructor;
  }, isoDate);
}
