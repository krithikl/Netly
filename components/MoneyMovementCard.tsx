"use client";

import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export type MoneyMovementAmountTone = "expense" | "income" | "static";

export type MoneyMovementCardProps = {
  amount: string;
  amountDetail?: string;
  amountTone: MoneyMovementAmountTone;
  ariaExpanded?: boolean;
  ariaPressed?: boolean;
  avatarLabel?: string;
  category: string;
  categoryColor: string;
  className?: string;
  detail?: string;
  meta?: string;
  onClick?: () => void;
  selected?: boolean;
  showCategoryChip?: boolean;
  testId?: string;
  title: string;
};

// Shared money-movement row used for transaction, budget, and recurring-payment items.
export function MoneyMovementCard({
  amount,
  amountDetail,
  amountTone,
  ariaExpanded,
  ariaPressed,
  avatarLabel,
  category,
  categoryColor,
  className,
  detail,
  meta,
  onClick,
  selected = false,
  showCategoryChip = true,
  testId,
  title
}: MoneyMovementCardProps) {
  const cardClassName = cn("money-movement-card", amountDetail && "has-amount-detail", onClick && "clickable", selected && "selected", className);
  const colorStyle = { "--transaction-color": categoryColor } as CSSProperties;
  const initial = (avatarLabel || title).trim().slice(0, 1).toUpperCase();
  const hasMetaRow = showCategoryChip || Boolean(detail);
  const content = (
    <>
      <span className="letter-avatar money-movement-avatar" style={colorStyle}>
        {initial}
      </span>
      <span className="money-movement-copy">
        <strong>{title}</strong>
        {meta && <small>{meta}</small>}
        {hasMetaRow && (
          <span className="money-movement-meta-row">
            {showCategoryChip && (
              <span className="transaction-category-chip" style={colorStyle}>
                <span aria-hidden="true" />
                {category}
              </span>
            )}
            {detail && <small>{detail}</small>}
          </span>
        )}
      </span>
      <span className="money-movement-value">
        <strong className={cn("money-movement-amount", `amount-${amountTone}`)}>{amount}</strong>
        {amountDetail && <small>{amountDetail}</small>}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        aria-expanded={ariaExpanded}
        aria-pressed={ariaPressed}
        className={cardClassName}
        data-testid={testId}
        onClick={onClick}
        type="button"
      >
        {content}
      </button>
    );
  }

  return (
    <article className={cardClassName} data-testid={testId}>
      {content}
    </article>
  );
}
