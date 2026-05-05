"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { budgets, cardProducts, categoryColors, currentBalance, payday, transactions as fallbackTransactions } from "@/lib/mock-data";
import {
  annualCardValues,
  debitTransactions,
  detectRecurring,
  formatMoney,
  generateInsights,
  safeToSpend,
  spendByCategory,
  sum
} from "@/lib/insights";
import { filterTransactionsByPeriod } from "@/lib/periods";
import type { PeriodOption, Transaction } from "@/lib/types";

type View = "home" | "transactions" | "budgets" | "cards" | "connect";

const navItems: { label: string; view: View; icon: string }[] = [
  { label: "Home", view: "home", icon: "⌂" },
  { label: "Transactions", view: "transactions", icon: "≡" },
  { label: "Budgets", view: "budgets", icon: "◷" },
  { label: "Card fit", view: "cards", icon: "◇" },
  { label: "Connect", view: "connect", icon: "↗" }
];

const periods: PeriodOption[] = ["This month", "30 days", "90 days", "All"];

export default function Home() {
  const [activeView, setActiveView] = useState<View>("home");
  const [period, setPeriod] = useState<PeriodOption>(periods[0]);
  const [query, setQuery] = useState("");
  const [transactionFilter, setTransactionFilter] = useState<"All" | "Expenses" | "Income" | "Upcoming">("All");
  const [selectedHomeCategory, setSelectedHomeCategory] = useState<string | null>(null);
  const [transactionCategory, setTransactionCategory] = useState("All categories");
  const [transactionSort, setTransactionSort] = useState<"Newest" | "Oldest" | "Amount high" | "Amount low">("Newest");
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>(fallbackTransactions);
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, string>>({});
  const [dataSource, setDataSource] = useState<"mock" | "pnz-sandbox">("mock");
  const [connectionResponse, setConnectionResponse] = useState("");
  const [syncResult, setSyncResult] = useState("");
  const hasAutoCompletedRef = useRef(false);

  async function refreshTransactions() {
    const response = await fetch("/api/open-banking/transactions");
    const payload = (await response.json()) as {
      source: "mock" | "pnz-sandbox";
      transactions: Transaction[];
    };

    setTransactions(payload.transactions);
    setDataSource(payload.source);
  }

  async function completeOpenBankingConnection(responseValue?: string) {
    const response = await fetch("/api/open-banking/complete", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({ response: responseValue || connectionResponse })
    });
    const payload = (await response.json()) as { error?: string; message?: string };

    setSyncResult(
      !response.ok
        ? payload.error || "Could not complete authorization."
        : payload.message || "Connected."
    );

    if (response.ok) {
      setConnectionResponse("");
      await refreshTransactions();
    }
  }

  useEffect(() => {
    const stored = window.localStorage.getItem("moneyfit_category_overrides");
    if (stored) {
      setCategoryOverrides(JSON.parse(stored) as Record<string, string>);
    }

    // Check for authorization response in cookie and auto-populate
    const authResponseCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("moneyfit_ob_response="));
    
    if (authResponseCookie) {
      const response = authResponseCookie.split("=")[1];
      if (response) {
        setConnectionResponse(decodeURIComponent(response));
        // Clear the cookie after reading it
        document.cookie = "moneyfit_ob_response=; path=/; max-age=0";
      }
    }

    refreshTransactions().catch(() => {
      setTransactions(fallbackTransactions);
      setDataSource("mock");
    });
  }, []);

  // Auto-complete connection when response is populated
  useEffect(() => {
    if (connectionResponse.trim() && !hasAutoCompletedRef.current) {
      hasAutoCompletedRef.current = true;
      setSyncResult("Completing sandbox authorization...");
      completeOpenBankingConnection(connectionResponse);
    }
  }, [connectionResponse]);

  const workingTransactions = useMemo(
    () =>
      transactions.map((txn) => {
        const override = categoryOverrides[txn.id];

        return override
          ? {
              ...txn,
              category: override,
              confidence: 1,
              needsReview: false,
              note: "Manually categorized"
            }
          : txn;
      }),
    [transactions, categoryOverrides]
  );

  function updateTransactionCategory(transactionId: string, category: string) {
    const next = {
      ...categoryOverrides,
      [transactionId]: category
    };

    setCategoryOverrides(next);
    window.localStorage.setItem("moneyfit_category_overrides", JSON.stringify(next));
  }

  const periodTransactions = useMemo(() => filterTransactionsByPeriod(workingTransactions, period), [workingTransactions, period]);
  const recurringTransactions = useMemo(() => filterTransactionsByPeriod(workingTransactions, "90 days"), [workingTransactions]);
  const shouldShowPeriodControl = activeView === "home" || activeView === "transactions" || activeView === "budgets";
  const categories = useMemo(() => spendByCategory(periodTransactions), [periodTransactions]);
  const recurring = useMemo(() => detectRecurring(recurringTransactions), [recurringTransactions]);
  const cards = useMemo(() => annualCardValues(workingTransactions, cardProducts), [workingTransactions]);
  const insights = useMemo(() => generateInsights(periodTransactions, cardProducts, currentBalance), [periodTransactions]);
  const expenses = useMemo(() => debitTransactions(periodTransactions), [periodTransactions]);
  const monthlySpend = useMemo(() => sum(expenses.map((txn) => Math.abs(txn.amount))), [expenses]);
  const income = useMemo(
    () => sum(periodTransactions.filter((txn) => txn.amount > 0).map((txn) => txn.amount)),
    [periodTransactions]
  );
  const upcoming = periodTransactions.filter((txn) => txn.status === "Upcoming");

  const reviewCount = periodTransactions.filter((txn) => txn.needsReview).length;
  const chartCategories = categories.filter((item) => item.category !== "Income").slice(0, 8);
  const transactionCategoryOptions = ["All categories", ...categories.map((item) => item.category).sort()];

  const homeTransactions = periodTransactions.filter((txn) => {
    const matchesQuery = `${txn.merchant} ${txn.category} ${txn.account} ${txn.rawDescription}`.toLowerCase().includes(query.trim().toLowerCase());
    const matchesCategory = !selectedHomeCategory || txn.category === selectedHomeCategory;
    return matchesQuery && matchesCategory;
  });

  const visibleTransactions = periodTransactions
    .filter((txn) => {
      const matchesQuery = `${txn.merchant} ${txn.category} ${txn.account} ${txn.rawDescription}`.toLowerCase().includes(query.trim().toLowerCase());
      const matchesCategory = transactionCategory === "All categories" || txn.category === transactionCategory;
      const matchesFilter =
        transactionFilter === "All" ||
        (transactionFilter === "Expenses" && txn.amount < 0 && txn.status !== "Upcoming") ||
        (transactionFilter === "Income" && txn.amount > 0) ||
        (transactionFilter === "Upcoming" && txn.status === "Upcoming");

      return matchesQuery && matchesCategory && matchesFilter;
    })
    .sort((a, b) => {
      if (transactionSort === "Newest") {
        return b.date.localeCompare(a.date);
      }
      if (transactionSort === "Oldest") {
        return a.date.localeCompare(b.date);
      }
      if (transactionSort === "Amount high") {
        return Math.abs(b.amount) - Math.abs(a.amount);
      }
      return Math.abs(a.amount) - Math.abs(b.amount);
    });

  const transactionPreview = homeTransactions.filter((txn) => {
    const matchesFilter =
      transactionFilter === "All" ||
      (transactionFilter === "Expenses" && txn.amount < 0 && txn.status !== "Upcoming") ||
      (transactionFilter === "Income" && txn.amount > 0) ||
      (transactionFilter === "Upcoming" && txn.status === "Upcoming");

    return matchesFilter;
  });

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Main navigation">
        <div className="brand">
          <div className="brand-mark">M</div>
          <div>
            <div className="brand-name">MoneyFit</div>
            <div className="brand-subtitle">Open banking assistant</div>
          </div>
        </div>

        <nav className="nav">
          {navItems.map((item) => (
            <button
              className={`nav-item ${activeView === item.view ? "active" : ""}`}
              key={item.view}
              onClick={() => setActiveView(item.view)}
              type="button"
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="material-card connection-panel">
          <div className="status-dot" />
          <div>
            <div className="connection-title">{dataSource === "pnz-sandbox" ? "PNZ sandbox connected" : "Sandbox ready"}</div>
            <div className="connection-copy">
              {dataSource === "pnz-sandbox" ? "Transactions are loading from PNZ." : "Showing mock transactions until authorized."}
            </div>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <p className="eyebrow">Payday {payday}</p>
            <h1>Good evening, here is your money picture.</h1>
            <p className="header-note">
              Data source: {dataSource === "pnz-sandbox" ? "Payments NZ sandbox" : "mock transactions"}
            </p>
          </div>
          {shouldShowPeriodControl && (
            <div className="period-control" aria-label="Selected period">
              {periods.map((option) => (
                <button
                  className={`period ${period === option ? "active" : ""}`}
                  key={option}
                  onClick={() => setPeriod(option)}
                  type="button"
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </header>

        {activeView === "home" && (
          <section className="view-stack">
            <div className="hero-card">
              <div>
                <span className="eyebrow">Available balance</span>
                <strong>{formatMoney(currentBalance, true)}</strong>
                <p>{formatMoney(safeToSpend(periodTransactions, currentBalance))} looks safe after upcoming bills and buffer.</p>
              </div>
              <div className="hero-actions">
                <button className="tonal-button" onClick={() => setActiveView("connect")} type="button">
                  Connect bank
                </button>
                <button className="primary-button" onClick={() => setActiveView("transactions")} type="button">
                  Review spend
                </button>
              </div>
            </div>

            <div className="metric-grid">
              <Metric label="Spent" tone="red" value={formatMoney(monthlySpend)} note={`${expenses.length} outgoing transactions`} />
              <Metric label="Income" tone="green" value={formatMoney(income)} note="Salary and credits detected" />
              <Metric label="Upcoming" tone="amber" value={formatMoney(sum(upcoming.map((txn) => Math.abs(txn.amount))))} note={`${upcoming.length} scheduled items`} />
              <Metric label="Needs review" tone="blue" value={reviewCount.toString()} note="Low-confidence matches" />
            </div>

            <div className="dashboard-grid">
              <section className="material-card chart-panel">
                <PanelTitle title="Inferred categories" subtitle="Tap a slice to filter transactions" />
                <div className="chart-layout">
                  <DonutChart
                    categories={chartCategories}
                    hoveredCategory={hoveredCategory}
                    onHover={setHoveredCategory}
                    selectedCategory={selectedHomeCategory}
                    onSelect={setSelectedHomeCategory}
                  />
                  <div className="legend-list">
                    {chartCategories.map((item) => (
                      <button
                        className={`legend-row ${selectedHomeCategory === item.category ? "selected" : ""} ${hoveredCategory === item.category ? "hovered" : ""}`}
                        key={item.category}
                        onMouseEnter={() => setHoveredCategory(item.category)}
                        onMouseLeave={() => setHoveredCategory(null)}
                        onFocus={() => setHoveredCategory(item.category)}
                        onBlur={() => setHoveredCategory(null)}
                        onClick={() => setSelectedHomeCategory(selectedHomeCategory === item.category ? null : item.category)}
                        type="button"
                      >
                        <span className="legend-dot" style={{ background: categoryColors[item.category] || "#607d8b" }} />
                        <span>{item.category}</span>
                        <strong>{formatMoney(item.amount)}</strong>
                      </button>
                    ))}
                  </div>
                </div>
              </section>

              <section className="material-card">
                <PanelTitle title="Insights" subtitle="Generated from transaction patterns" />
                <ul className="insight-list">
                  {insights.map((insight) => (
                    <li key={insight}>{insight}</li>
                  ))}
                </ul>
              </section>
            </div>

            <section className="material-card">
              <PanelTitle title="Recent activity" subtitle="Filtered by chart selection" />
              <div className="stable-list-panel">
                <TransactionList transactions={transactionPreview.slice(0, 8)} />
              </div>
            </section>
          </section>
        )}

        {activeView === "transactions" && (
          <section className="view-stack">
            <section className="material-card">
              <div className="panel-header">
                <PanelTitle title="Transactions" subtitle="Bank descriptions are categorized with confidence scoring" />
                <input
                  className="search"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search merchant, bank text, category"
                  type="search"
                  value={query}
                />
              </div>
              <div className="filter-tabs">
                {(["All", "Expenses", "Income", "Upcoming"] as const).map((item) => (
                  <button
                    className={transactionFilter === item ? "active" : ""}
                    key={item}
                    onClick={() => setTransactionFilter(item)}
                    type="button"
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="transaction-controls">
                <label>
                  Category
                  <select value={transactionCategory} onChange={(event) => setTransactionCategory(event.target.value)}>
                    {transactionCategoryOptions.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Sort
                  <select value={transactionSort} onChange={(event) => setTransactionSort(event.target.value as typeof transactionSort)}>
                    {(["Newest", "Oldest", "Amount high", "Amount low"] as const).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <TransactionList
                editable
                categoryOptions={transactionCategoryOptions.filter((category) => category !== "All categories")}
                onCategoryChange={updateTransactionCategory}
                transactions={visibleTransactions}
              />
            </section>
          </section>
        )}

        {activeView === "budgets" && (
          <section className="view-stack">
            <section className="material-card">
                <PanelTitle title="Budgets" subtitle="Spend is based on inferred categories" />
              <div className="budget-grid">
                {budgets.map((budget) => {
                  const spent = categories.find((item) => item.category === budget.category)?.amount || 0;
                  const progress = Math.min((spent / budget.limit) * 100, 100);

                  return (
                    <article className="budget-card" key={budget.category}>
                      <div className="budget-card-top">
                        <span className="category-avatar" style={{ background: budget.color }}>
                          {budget.category.slice(0, 1)}
                        </span>
                        <div>
                          <strong>{budget.category}</strong>
                          <p>{formatMoney(spent)} of {formatMoney(budget.limit)}</p>
                        </div>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${progress}%`, background: budget.color }} />
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="material-card">
              <PanelTitle title="Recurring payments" subtitle="Repeated merchants and average amounts" />
              <div className="stack-list">
                {recurring.length > 0 ? (
                  recurring.map((item) => (
                    <InfoRow
                      color={categoryColors[item.category] || "#607d8b"}
                      key={item.merchant}
                      meta={`${item.category} · ${item.count} payments detected over 90 days`}
                      title={item.merchant}
                      value={formatMoney(item.average, true)}
                    />
                  ))
                ) : (
                  <div className="empty-state">No repeated merchants found in the last 90 days.</div>
                )}
              </div>
            </section>
          </section>
        )}

        {activeView === "cards" && (
          <section className="view-stack">
            <section className="material-card">
              <PanelTitle
                title="Card fit comparison"
                subtitle="Cards are ranked using all available mock spend: gross rewards + estimated perks - annual fee."
              />
              <div className="card-list">
                {cards.map((card, index) => (
                  <article
                    className={`card-option ${index === 0 ? "winner" : ""}`}
                    key={card.name}
                    style={{ borderColor: index === 0 ? card.brandColor : undefined }}
                  >
                    <div>
                      <div className="card-heading">
                        <span className="rank-pill" style={{ background: card.brandColor }}>
                          #{index + 1}
                        </span>
                        <div>
                          <h2>{card.name}</h2>
                          <p className="card-brand">
                            {card.issuer} · {card.network} · {card.tier}
                          </p>
                        </div>
                      </div>
                      <p>{card.note}</p>
                      <small>
                        {card.rewardProgram} · {card.earnDescription}
                      </small>
                      <div className="card-breakdown">
                        <span>Gross rewards {formatMoney(card.grossRewards)}</span>
                        <span>Perks estimate {formatMoney(card.perksValue)}</span>
                        <span>Annual fee -{formatMoney(card.annualFee)}</span>
                      </div>
                      <a className="card-link" href={card.sourceUrl} rel="noreferrer" target="_blank">
                        View issuer page
                      </a>
                    </div>
                    <div className="card-value-block">
                      <span>Estimated annual net value</span>
                      <strong>{formatMoney(card.annualValue)}</strong>
                      <small>Based on {formatMoney(card.eligibleAnnualSpend)} eligible annual spend</small>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </section>
        )}

        {activeView === "connect" && (
          <section className="view-stack">
            <section className="material-card">
              <PanelTitle title="Open banking connection" subtitle="Read-only PNZ sandbox flow" />
              <div className="flow">
                <FlowStep number="1" title="Create account access consent">
                  Request read-only permissions for accounts, balances, and transactions.
                </FlowStep>
                <FlowStep number="2" title="Authorize user">
                  Redirect through PNZ/OIDC using PAR where required by the standard.
                </FlowStep>
                <FlowStep number="3" title="Exchange code for token">
                  Use private_key_jwt from the server. Never from browser JavaScript.
                </FlowStep>
                <FlowStep number="4" title="Sync transactions">
                  Pull accounts, balances, transactions, then categorize and generate insights.
                </FlowStep>
              </div>
              <button
                className="primary-button"
                onClick={() => {
                  setSyncResult("Opening sandbox bank authorization...");
                  window.location.href = "/api/open-banking/start";
                }}
                type="button"
              >
                Open sandbox authorization
              </button>
              <p aria-live="polite" className="sync-result">
                {syncResult}
              </p>
              <div className="completion-box">
                <PanelTitle title="Finish developer portal redirect" subtitle="Response JWT will automatically populate and submit when you complete authorization." />
                <textarea
                  onChange={(event) => {
                    setConnectionResponse(event.target.value);
                    hasAutoCompletedRef.current = false; // Reset auto-complete flag on manual input
                  }}
                  placeholder="Paste response=eyJ... value here (or it will auto-populate)"
                  value={connectionResponse}
                />
                <button className="tonal-action" disabled={!connectionResponse.trim()} onClick={() => completeOpenBankingConnection(connectionResponse)} type="button">
                  Complete connection
                </button>
              </div>
            </section>
          </section>
        )}
      </main>
    </div>
  );
}

function Metric({ label, note, tone, value }: { label: string; note: string; tone: string; value: string }) {
  return (
    <article className={`metric ${tone}`}>
      <span className="metric-label">{label}</span>
      <strong>{value}</strong>
      <span className="metric-note">{note}</span>
    </article>
  );
}

function PanelTitle({ subtitle, title }: { subtitle: string; title: string }) {
  return (
    <div className="title-block">
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  );
}

function DonutChart({
  categories,
  hoveredCategory,
  onHover,
  onSelect,
  selectedCategory
}: {
  categories: { category: string; amount: number }[];
  hoveredCategory: string | null;
  onHover: (category: string | null) => void;
  onSelect: (category: string | null) => void;
  selectedCategory: string | null;
}) {
  const total = sum(categories.map((item) => item.amount));
  const radius = 78;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  const activeCategory = hoveredCategory || selectedCategory;
  const activeItem = categories.find((item) => item.category === activeCategory);

  return (
    <div className="donut-wrap">
      <svg aria-label="Expense category donut chart" className="donut" viewBox="0 0 220 220" role="img">
        <circle className="donut-base" cx="110" cy="110" r={radius} />
        {categories.map((item) => {
          const dash = (item.amount / total) * circumference;
          const currentOffset = offset;
          offset += dash;

          return (
            <circle
              className={`donut-slice ${selectedCategory === item.category ? "selected" : ""}`}
              cx="110"
              cy="110"
              key={item.category}
              onMouseEnter={() => onHover(item.category)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(item.category)}
              onBlur={() => onHover(null)}
              onClick={() => onSelect(selectedCategory === item.category ? null : item.category)}
              r={radius}
              stroke={categoryColors[item.category] || "#607d8b"}
              strokeDasharray={`${dash} ${circumference - dash}`}
              strokeDashoffset={-currentOffset}
              tabIndex={0}
            />
          );
        })}
      </svg>
      {activeItem && (
        <div className="chart-tooltip" role="status">
          <strong>{activeItem.category}</strong>
          <span>{formatMoney(activeItem.amount)}</span>
          <small>{Math.round((activeItem.amount / total) * 100)}% of shown expenses</small>
        </div>
      )}
      <div className="donut-center">
        <span>Expenses</span>
        <strong>{formatMoney(total)}</strong>
      </div>
    </div>
  );
}

function TransactionList({
  categoryOptions = [],
  editable = false,
  onCategoryChange,
  transactions: visible
}: {
  categoryOptions?: string[];
  editable?: boolean;
  onCategoryChange?: (transactionId: string, category: string) => void;
  transactions: Transaction[];
}) {
  return (
    <div className="stack-list">
      {visible.map((txn) => (
        <InfoRow
          action={
            editable ? (
              <select
                aria-label={`Set category for ${txn.merchant}`}
                className="row-category-select"
                onChange={(event) => onCategoryChange?.(txn.id, event.target.value)}
                value={txn.category}
              >
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            ) : undefined
          }
          color={categoryColors[txn.category] || "#607d8b"}
          key={txn.id}
          meta={`${txn.date} · ${txn.category} · ${txn.account} · ${txn.status} · ${Math.round(txn.confidence * 100)}% confidence`}
          title={txn.merchant}
          value={formatMoney(txn.amount, true)}
          valueTone={txn.amount < 0 ? "negative" : "positive"}
          warning={txn.needsReview ? txn.rawDescription : undefined}
        />
      ))}
    </div>
  );
}

function InfoRow({
  action,
  color,
  meta,
  title,
  value,
  valueTone,
  warning
}: {
  action?: React.ReactNode;
  color: string;
  meta: string;
  title: string;
  value: string;
  valueTone?: string;
  warning?: string;
}) {
  return (
    <article className="info-row">
      <span className="category-avatar" style={{ background: color }}>
        {title.slice(0, 1)}
      </span>
      <div>
        <strong>{title}</strong>
        <p>{meta}</p>
        {warning && <em>Review: {warning}</em>}
        {action && <div className="row-action">{action}</div>}
      </div>
      <span className={`row-value ${valueTone || ""}`}>{value}</span>
    </article>
  );
}

function FlowStep({
  children,
  number,
  title
}: {
  children: React.ReactNode;
  number: string;
  title: string;
}) {
  return (
    <div className="flow-step">
      <span>{number}</span>
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </div>
  );
}
