import { InfoRow } from "@/components/ui/info-row";
import { PanelTitle } from "@/components/ui/panel-title";
import { formatMoney } from "@/lib/insights";
import type { Budget, RecurringMerchant } from "@/lib/types";

type BudgetsViewProps = {
  budgets: Budget[];
  categories: { category: string; amount: number }[];
  categoryColors: Record<string, string>;
  onRecurringClick: (merchant: string) => void;
  recurring: RecurringMerchant[];
};

// Budget screen composed from category spend totals and recurring merchant insights.
export function BudgetsView({ budgets, categories, categoryColors, onRecurringClick, recurring }: BudgetsViewProps) {
  return (
    <section className="view-stack">
      <section className="material-card">
        <PanelTitle title="Budgets" subtitle="Spend is based on Akahu category data" />
        <div className="budget-grid">
          {budgets.map((budget) => (
            <BudgetCard budget={budget} categoryColor={categoryColors[budget.category] || "#D1D5DB"} key={budget.category} spent={getCategorySpend(categories, budget.category)} />
          ))}
        </div>
      </section>

      <section className="material-card">
        <PanelTitle title="Recurring payments" subtitle="Repeated merchants and average amounts" />
        <div className="stack-list mt-[18px]">
          {recurring.length > 0 ? (
            recurring.map((item) => (
              <InfoRow
                color={categoryColors[item.category] || "#607d8b"}
                key={item.merchant}
                meta={getRecurringMeta(item)}
                onClick={() => onRecurringClick(item.merchant)}
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

// Individual budget progress card rendered inside BudgetsView.
function BudgetCard({ budget, categoryColor, spent }: { budget: Budget; categoryColor: string; spent: number }) {
  const progress = Math.min((spent / budget.limit) * 100, 100);
  const avatarStyle = getBudgetAvatarStyle(categoryColor);
  const progressStyle = getBudgetProgressStyle(progress, categoryColor);

  return (
    <article className="grid gap-3.5 rounded-[22px] bg-[var(--surface-2)] p-4">
      <div className="flex items-center gap-3">
        <span className="category-avatar" style={avatarStyle}>
          {budget.category.slice(0, 1)}
        </span>
        <div>
          <strong>{budget.category}</strong>
          <p className="text-[13px] text-[var(--muted)]">
            {formatMoney(spent)} of {formatMoney(budget.limit)}
          </p>
        </div>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[rgba(29,27,32,0.08)]">
        <div className="h-full rounded-[inherit] animate-[grow-bar_520ms_ease_both]" style={progressStyle} />
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

function getBudgetAvatarStyle(categoryColor: string) {
  return {
    background: categoryColor
  };
}

function getBudgetProgressStyle(progress: number, categoryColor: string) {
  return {
    width: `${progress}%`,
    background: categoryColor
  };
}
