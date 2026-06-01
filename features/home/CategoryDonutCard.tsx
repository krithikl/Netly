import { ArrowRight } from "lucide-react";
import { DonutChart } from "@/components/ui/donut-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/insights";

type CategoryDonutCardProps = {
  categories: { category: string; amount: number }[];
  categoryColors: Record<string, string>;
  chartTotal: number;
  hoveredCategory: string | null;
  onHover: (category: string | null) => void;
  onViewBreakdown: () => void;
};

// Dashboard card that wraps the category donut chart and hover/category summary.
export function CategoryDonutCard({
  categories,
  categoryColors,
  chartTotal,
  hoveredCategory,
  onHover,
  onViewBreakdown
}: CategoryDonutCardProps) {
  return (
    <Card className="chart-panel category-panel" data-testid="category-donut-card">
      <CardHeader>
        <CardTitle>Spending by category</CardTitle>
        <Button className="mobile-chart-action" onClick={onViewBreakdown} type="button" aria-label="View full breakdown" size="icon" variant="ghost">
          <ArrowRight aria-hidden="true" size={18} strokeWidth={2.4} />
        </Button>
      </CardHeader>
      <CardContent className="chart-layout">
        <div className="chart-visual">
          <DonutChart
            categories={categories}
            categoryColors={categoryColors}
            hoveredCategory={hoveredCategory}
            onHover={onHover}
          />
        </div>
        <CategoryLegend categories={categories} categoryColors={categoryColors} chartTotal={chartTotal} />
      </CardContent>
      <Button className="text-link chart-breakdown-link" onClick={onViewBreakdown} type="button" variant="ghost">
        View full breakdown
        <ArrowRight aria-hidden="true" size={16} strokeWidth={2.4} />
      </Button>
    </Card>
  );
}

type CategoryLegendProps = {
  categories: { category: string; amount: number }[];
  categoryColors: Record<string, string>;
  chartTotal: number;
};

function CategoryLegend({ categories, categoryColors, chartTotal }: CategoryLegendProps) {
  if (categories.length === 0) {
    return <div className="empty-state">No spending categories found for this period.</div>;
  }

  const visibleCategories = categories.slice(0, 3);

  return (
    <div className="legend-list">
      {visibleCategories.map((item) => (
        <div className="legend-row" key={item.category}>
          <span className="legend-dot" style={{ background: getCategoryColor(item.category, categoryColors) }} />
          <span className="legend-content">
            <span className="legend-topline">
              <span className="legend-name">{item.category}</span>
              <strong>{formatMoney(item.amount)}</strong>
            </span>
            <span className="legend-track" aria-hidden="true">
              <span
                className="legend-bar"
                style={{
                  background: getCategoryColor(item.category, categoryColors),
                  width: `${getLegendBarWidth(item.amount, chartTotal)}%`
                }}
              />
            </span>
          </span>
        </div>
      ))}
    </div>
  );
}

function getCategoryColor(category: string, categoryColors: Record<string, string>) {
  return categoryColors[category] || "#667085";
}

function getLegendBarWidth(amount: number, chartTotal: number) {
  return chartTotal > 0 ? Math.max(5, Math.round((amount / chartTotal) * 100)) : 0;
}
