import { ArcElement, Chart as ChartJS, Tooltip } from "chart.js";
import type { ActiveElement, Chart, ChartData, ChartEvent, ChartOptions, TooltipModel } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { useCallback, useMemo, useState } from "react";
import clsx from "clsx";
import { formatMoney, sum } from "@/lib/insights";

ChartJS.register(ArcElement, Tooltip);

type ChartCategory = {
  category: string;
  amount: number;
};

type DonutChartProps = {
  categories: ChartCategory[];
  categoryColors: Record<string, string>;
  hoveredCategory: string | null;
  onHover: (category: string | null) => void;
  onSelect: (category: string | null) => void;
  selectedCategory: string | null;
};

type ExternalTooltipContext = {
  chart: Chart;
  tooltip: TooltipModel<"doughnut">;
};

type TooltipPlacement = "left" | "right" | "top";

export function DonutChart({ categories, categoryColors, hoveredCategory, onHover, onSelect, selectedCategory }: DonutChartProps) {
  const [tooltipPlacement, setTooltipPlacement] = useState<TooltipPlacement>("top");
  const total = sum(categories.map((item) => item.amount));
  const hoveredItem = categories.find((item) => item.category === hoveredCategory);
  const tooltipClassName = getTooltipClassName(tooltipPlacement);
  const chartData = useMemo(() => getChartData(categories, categoryColors), [categories, categoryColors]);

  const handleChartHover = useCallback((_event: ChartEvent, elements: ActiveElement[]) => {
    const category = getCategoryFromElements(categories, elements);
    onHover(category);
  }, [categories, onHover]);

  const handleChartClick = useCallback((_event: ChartEvent, elements: ActiveElement[]) => {
    const category = getCategoryFromElements(categories, elements);
    const nextCategory = getNextSelectedCategory(category, selectedCategory);
    onSelect(nextCategory);
  }, [categories, onSelect, selectedCategory]);

  const handleChartLeave = useCallback(() => onHover(null), [onHover]);

  const handleExternalTooltip = useCallback((context: ExternalTooltipContext) => {
    const nextPlacement = getTooltipPlacementFromModel(context.chart, context.tooltip);
    setTooltipPlacement((currentPlacement) => getNextTooltipPlacement(currentPlacement, nextPlacement));
  }, []);

  const chartOptions = useMemo(
    () => getChartOptions(handleChartHover, handleChartClick, handleExternalTooltip),
    [handleChartClick, handleChartHover, handleExternalTooltip]
  );

  return (
    <div className="donut-wrap">
      <div className="donut" onMouseLeave={handleChartLeave}>
        <Doughnut aria-label="Expense categories donut chart" data={chartData} options={chartOptions} role="img" />
      </div>
      {hoveredItem && total > 0 && (
        <div className={tooltipClassName} role="status">
          <strong>{hoveredItem.category}</strong>
          <span>{formatMoney(hoveredItem.amount)}</span>
          <small>{Math.round((hoveredItem.amount / total) * 100)}% of shown expenses</small>
        </div>
      )}
      <div className="donut-center">
        <span>Expenses</span>
        <strong>{formatMoney(total)}</strong>
      </div>
    </div>
  );
}

function getChartData(categories: ChartCategory[], categoryColors: Record<string, string>): ChartData<"doughnut"> {
  return {
    labels: categories.map((item) => item.category),
    datasets: [
      {
        backgroundColor: categories.map((item) => getCategoryColor(item.category, categoryColors)),
        borderWidth: 0,
        data: categories.map((item) => item.amount),
        hoverBorderWidth: 0,
        hoverOffset: 10,
        offset: categories.map(() => 0)
      }
    ]
  };
}

function getChartOptions(
  onHover: (event: ChartEvent, elements: ActiveElement[]) => void,
  onClick: (event: ChartEvent, elements: ActiveElement[]) => void,
  onExternalTooltip: (context: ExternalTooltipContext) => void
): ChartOptions<"doughnut"> {
  return {
    animation: {
      duration: 180,
      easing: "easeOutQuart"
    },
    cutout: "64%",
    layout: {
      padding: 12
    },
    maintainAspectRatio: false,
    onClick,
    onHover,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: false,
        external: onExternalTooltip
      }
    },
    rotation: -90,
    responsive: true
  };
}

function getCategoryColor(category: string, categoryColors: Record<string, string>) {
  return categoryColors[category] || "#607d8b";
}

function getCategoryFromElements(categories: ChartCategory[], elements: ActiveElement[]) {
  const index = elements[0]?.index;

  if (typeof index !== "number") {
    return null;
  }

  return categories[index]?.category || null;
}

function getNextSelectedCategory(category: string | null, selectedCategory: string | null) {
  if (!category) {
    return null;
  }

  return selectedCategory === category ? null : category;
}

function getTooltipClassName(placement: TooltipPlacement) {
  return clsx("chart-tooltip", placement);
}

function getTooltipPlacementFromModel(chart: Chart, tooltip: TooltipModel<"doughnut">): TooltipPlacement {
  if (tooltip.opacity === 0) {
    return "top";
  }

  const chartCenterX = chart.chartArea.left + chart.chartArea.width / 2;
  const chartCenterY = chart.chartArea.top + chart.chartArea.height / 2;
  const topThreshold = chartCenterY - chart.chartArea.height * 0.28;

  if (tooltip.caretY < topThreshold) {
    return "top";
  }

  return tooltip.caretX < chartCenterX ? "left" : "right";
}

function getNextTooltipPlacement(currentPlacement: TooltipPlacement, nextPlacement: TooltipPlacement) {
  return currentPlacement === nextPlacement ? currentPlacement : nextPlacement;
}
