import clsx from "clsx";
import type { ReactNode } from "react";

type InfoRowProps = {
  action?: ReactNode;
  color: string;
  meta: string;
  title: string;
  value: string;
  valueTone?: string;
  warning?: string;
};

export function InfoRow({ action, color, meta, title, value, valueTone, warning }: InfoRowProps) {
  const avatarStyle = getAvatarStyle(color);
  const valueClassName = clsx("row-value", valueTone);

  return (
    <article className="info-row">
      <span className="category-avatar" style={avatarStyle}>
        {title.slice(0, 1)}
      </span>
      <div>
        <strong>{title}</strong>
        <p>{meta}</p>
        {warning && <em>Review: {warning}</em>}
        {action && <div className="row-action">{action}</div>}
      </div>
      <span className={valueClassName}>{value}</span>
    </article>
  );
}

function getAvatarStyle(color: string) {
  return {
    background: color
  };
}
