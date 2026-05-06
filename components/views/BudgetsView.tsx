import { InfoRow } from "@/components/ui/InfoRow";
import { PanelTitle } from "@/components/ui/PanelTitle";
import { categoryColors } from "@/lib/mock-data";
import { formatMoney } from "@/lib/insights";
import type { Budget, RecurringMerchant } from "@/lib/types";

type BudgetsViewProps = {
  budgets: Budget[];
  categories: { category: string; amount: number }[];
  recurring: RecurringMerchant[];
};

export function BudgetsView({ budgets, categories, recurring }: BudgetsViewProps) {
  return (
    <section className="view-stack">
      <section className="material-card">
        <PanelTitle title="Budgets" subtitle="Spend is based on inferred categories" />
        <div className="budget-grid">
          {budgets.map((budget) => (
            <BudgetCard budget={budget} key={budget.category} spent={getCategorySpend(categories, budget.category)} />
          ))}
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
                meta={getRecurringMeta(item)}
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
  );
}

function BudgetCard({ budget, spent }: { budget: Budget; spent: number }) {
  const progress = Math.min((spent / budget.limit) * 100, 100);
  const avatarStyle = getBudgetAvatarStyle(budget);
  const progressStyle = getBudgetProgressStyle(progress, budget);

  return (
    <article className="budget-card">
      <div className="budget-card-top">
        <span className="category-avatar" style={avatarStyle}>
          {budget.category.slice(0, 1)}
        </span>
        <div>
          <strong>{budget.category}</strong>
          <p>
            {formatMoney(spent)} of {formatMoney(budget.limit)}
          </p>
        </div>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={progressStyle} />
      </div>
    </article>
  );
}

function getCategorySpend(categories: { category: string; amount: number }[], category: string) {
  return categories.find((item) => item.category === category)?.amount || 0;
}

function getRecurringMeta(item: RecurringMerchant) {
  return `${item.category} · ${item.count} payments detected over 90 days`;
}

function getBudgetAvatarStyle(budget: Budget) {
  return {
    background: budget.color
  };
}

function getBudgetProgressStyle(progress: number, budget: Budget) {
  return {
    width: `${progress}%`,
    background: budget.color
  };
}
