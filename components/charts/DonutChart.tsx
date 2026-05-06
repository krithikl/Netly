import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { categoryColors } from "@/lib/mock-data";
import { formatMoney, sum } from "@/lib/insights";

type DonutChartProps = {
  categories: { category: string; amount: number }[];
  hoveredCategory: string | null;
  onHover: (category: string | null) => void;
  onSelect: (category: string | null) => void;
  selectedCategory: string | null;
};

export function DonutChart({ categories, hoveredCategory, onHover, onSelect, selectedCategory }: DonutChartProps) {
  const total = sum(categories.map((item) => item.amount));
  const activeCategory = hoveredCategory || selectedCategory;
  const activeItem = categories.find((item) => item.category === activeCategory);

  return (
    <div className="donut-wrap">
      <ResponsiveContainer className="donut" height="100%" width="100%">
        <PieChart>
          <Pie
            data={categories}
            dataKey="amount"
            innerRadius="58%"
            isAnimationActive
            nameKey="category"
            onClick={(_, index) => onSelect(getNextSelectedCategory(categories[index]?.category, selectedCategory))}
            onMouseEnter={(_, index) => onHover(categories[index]?.category || null)}
            onMouseLeave={() => onHover(null)}
            outerRadius="86%"
            paddingAngle={0}
            startAngle={90}
            endAngle={-270}
          >
            {categories.map((item) => (
              <Cell
                className="donut-cell"
                fill={getCategoryColor(item.category)}
                key={item.category}
                stroke={isActiveCategory(item.category, hoveredCategory, selectedCategory) ? "rgba(29, 27, 32, 0.22)" : "transparent"}
                strokeWidth={isActiveCategory(item.category, hoveredCategory, selectedCategory) ? 5 : 0}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      {activeItem && total > 0 && (
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

function getCategoryColor(category: string) {
  return categoryColors[category] || "#607d8b";
}

function getNextSelectedCategory(category: string | undefined, selectedCategory: string | null) {
  if (!category) {
    return null;
  }

  return selectedCategory === category ? null : category;
}

function isActiveCategory(category: string, hoveredCategory: string | null, selectedCategory: string | null) {
  return hoveredCategory === category || selectedCategory === category;
}
