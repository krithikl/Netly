"use client";

import { ArcElement, Chart as ChartJS, Tooltip } from "chart.js";
import type { ActiveElement, ChartData, ChartEvent, ChartOptions, TooltipModel } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import type { CSSProperties } from "react";
import { useCallback, useMemo, useState } from "react";
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

type TooltipState = {
  amount: number;
  category: string;
  left: number;
  opacity: number;
  top: number;
};

type ExternalTooltipContext = {
  chart: {
    canvas: HTMLCanvasElement;
  };
  tooltip: TooltipModel<"doughnut">;
};

type DoughnutArcGeometry = {
  endAngle: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
  x: number;
  y: number;
};

type TooltipPoint = {
  left: number;
  top: number;
};

const initialTooltipState: TooltipState = {
  amount: 0,
  category: "",
  left: 0,
  opacity: 0,
  top: 0
};

export function DonutChart({ categories, categoryColors, hoveredCategory, onHover, onSelect, selectedCategory }: DonutChartProps) {
  const [tooltipState, setTooltipState] = useState<TooltipState>(initialTooltipState);
  const total = sum(categories.map((item) => item.amount));
  const chartData = useMemo(() => getChartData(categories, categoryColors), [categories, categoryColors]);
  const tooltipStyle = getTooltipStyle(tooltipState);

  const handleChartHover = useCallback((_event: ChartEvent, elements: ActiveElement[]) => {
    const category = getCategoryFromElements(categories, elements);
    onHover(category);
  }, [categories, onHover]);

  const handleChartClick = useCallback((_event: ChartEvent, elements: ActiveElement[]) => {
    const category = getCategoryFromElements(categories, elements);
    onSelect(getNextSelectedCategory(category, selectedCategory));
  }, [categories, onSelect, selectedCategory]);

  const handleChartLeave = useCallback(() => {
    onHover(null);
    setTooltipState((currentTooltip) => ({ ...currentTooltip, opacity: 0 }));
  }, [onHover]);

  const handleExternalTooltip = useCallback((context: ExternalTooltipContext) => {
    setTooltipState((currentTooltip) => {
      const nextTooltip = getExternalTooltipState(context.tooltip, currentTooltip);

      return getNextTooltipState(currentTooltip, nextTooltip);
    });
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
      {tooltipState.category && total > 0 && (
        <div className="chart-tooltip" role="status" style={tooltipStyle}>
          <strong>{tooltipState.category}</strong>
          <span>{formatMoney(tooltipState.amount)}</span>
          <small>{Math.round((tooltipState.amount / total) * 100)}% of shown expenses</small>
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

function getExternalTooltipState(tooltip: TooltipModel<"doughnut">, currentTooltip: TooltipState): TooltipState {
  const item = tooltip.dataPoints?.[0];

  if (!item || tooltip.opacity === 0) {
    return {
      ...currentTooltip,
      opacity: 0
    };
  }

  const point = getTooltipPoint(getTooltipItemElement(item), tooltip);

  return {
    amount: Number(item.parsed || 0),
    category: String(item.label || ""),
    left: point.left,
    opacity: tooltip.opacity,
    top: point.top
  };
}

function getTooltipItemElement(item: unknown) {
  if (!isRecord(item)) {
    return null;
  }

  return item.element;
}

function getTooltipPoint(element: unknown, tooltip: TooltipModel<"doughnut">): TooltipPoint {
  if (!isDoughnutArcGeometry(element)) {
    return {
      left: tooltip.caretX,
      top: tooltip.caretY
    };
  }

  const angle = (element.startAngle + element.endAngle) / 2;
  const radius = (element.innerRadius + element.outerRadius) / 2;

  return {
    left: element.x + Math.cos(angle) * radius,
    top: element.y + Math.sin(angle) * radius
  };
}

function isDoughnutArcGeometry(value: unknown): value is DoughnutArcGeometry {
  if (!isRecord(value)) {
    return false;
  }

  const geometryKeys: Array<keyof DoughnutArcGeometry> = ["endAngle", "innerRadius", "outerRadius", "startAngle", "x", "y"];

  return geometryKeys.every((key) => typeof value[key] === "number");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getNextTooltipState(currentTooltip: TooltipState, nextTooltip: TooltipState) {
  if (
    currentTooltip.amount === nextTooltip.amount &&
    currentTooltip.category === nextTooltip.category &&
    currentTooltip.left === nextTooltip.left &&
    currentTooltip.opacity === nextTooltip.opacity &&
    currentTooltip.top === nextTooltip.top
  ) {
    return currentTooltip;
  }

  return nextTooltip;
}

function getTooltipStyle(tooltip: TooltipState): CSSProperties {
  const isVisible = tooltip.opacity > 0;

  return {
    "--tooltip-scale": isVisible ? "1" : "0.96",
    "--tooltip-shift": isVisible ? "0px" : "6px",
    left: tooltip.left,
    opacity: tooltip.opacity,
    top: tooltip.top
  } as CSSProperties;
}
