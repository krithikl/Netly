"use client";

import { useCallback, useMemo } from "react";
import { Cell, Pie, PieChart, Sector, Tooltip } from "recharts";
import type { PieSectorDataItem, PieSectorShapeProps } from "recharts";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { formatMoney, sum } from "@/lib/insights";

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

type DonutDatum = ChartCategory & {
  color: string;
};

export function DonutChart({ categories, categoryColors, hoveredCategory, onHover, onSelect, selectedCategory }: DonutChartProps) {
  const data = useMemo(() => getChartData(categories, categoryColors), [categories, categoryColors]);
  const total = sum(categories.map((item) => item.amount));
  const activeIndex = getActiveIndex(data, hoveredCategory);
  const renderSlice = useCallback(
    (props: PieSectorShapeProps, index: number) => <AnimatedSector {...props} isActive={index === activeIndex} />,
    [activeIndex]
  );
  const handleSliceEnter = useCallback(
    (_entry: PieSectorDataItem, index: number) => onHover(data[index]?.category || null),
    [data, onHover]
  );
  const handleChartLeave = useCallback(() => onHover(null), [onHover]);
  const handleSliceClick = useCallback(
    (_entry: PieSectorDataItem, index: number) => {
      const category = data[index]?.category || null;
      onSelect(getNextSelectedCategory(category, selectedCategory));
    },
    [data, onSelect, selectedCategory]
  );

  return (
    <div className="donut-wrap" onMouseLeave={handleChartLeave}>
      <ChartContainer className="donut">
        <PieChart height={290} width={290}>
          <Tooltip content={<ChartTooltipContent total={total} />} cursor={false} />
          <Pie
            isAnimationActive={false}
            data={data}
            dataKey="amount"
            endAngle={-270}
            innerRadius="64%"
            nameKey="category"
            onClick={handleSliceClick}
            onMouseEnter={handleSliceEnter}
            outerRadius="92%"
            shape={renderSlice}
            startAngle={90}
            stroke="none"
          >
            {data.map((item) => (
              <Cell fill={item.color} key={item.category} />
            ))}
          </Pie>
        </PieChart>
      </ChartContainer>
      <div className="donut-center">
        <span>Expenses</span>
        <strong>{formatMoney(total)}</strong>
      </div>
    </div>
  );
}

function AnimatedSector({
  isActive,
  ...props
}: PieSectorShapeProps & {
  isActive: boolean;
}) {
  const centerX = Number(props.cx || 0);
  const centerY = Number(props.cy || 0);
  const activeTransform = `translate(${centerX}px, ${centerY}px) scale(1.045) translate(${-centerX}px, ${-centerY}px)`;
  const sectorStyle = {
    cursor: "pointer",
    filter: isActive ? "drop-shadow(0 8px 12px rgba(29, 27, 32, 0.18))" : "none",
    outline: "none",
    transform: isActive ? activeTransform : "none",
    transition: "transform 180ms ease, filter 180ms ease, opacity 180ms ease"
  };

  return <Sector {...props} style={sectorStyle} />;
}

function getChartData(categories: ChartCategory[], categoryColors: Record<string, string>): DonutDatum[] {
  return categories.map((item) => ({
    ...item,
    color: categoryColors[item.category] || "#607d8b"
  }));
}

function getActiveIndex(data: DonutDatum[], hoveredCategory: string | null) {
  if (!hoveredCategory) {
    return -1;
  }

  return data.findIndex((item) => item.category === hoveredCategory);
}

function getNextSelectedCategory(category: string | null, selectedCategory: string | null) {
  if (!category) {
    return null;
  }

  return selectedCategory === category ? null : category;
}
