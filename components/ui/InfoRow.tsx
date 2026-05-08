import clsx from "clsx";
import type { KeyboardEvent, MouseEvent, ReactNode } from "react";

type InfoRowProps = {
  action?: ReactNode;
  color: string;
  detail?: string;
  meta: string;
  onClick?: () => void;
  title: string;
  value: string;
  valueTone?: string;
  warning?: string;
};

export function InfoRow({ action, color, detail, meta, onClick, title, value, valueTone, warning }: InfoRowProps) {
  const avatarStyle = getAvatarStyle(color);
  const valueClassName = clsx("row-value", valueTone);
  const infoRowClassName = clsx("info-row", onClick && "clickable");
  const stopActionEvent = (event: MouseEvent<HTMLDivElement> | KeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };
  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (!onClick || (event.key !== "Enter" && event.key !== " ")) {
      return;
    }

    event.preventDefault();
    onClick();
  };

  return (
    <article className={infoRowClassName} onClick={onClick} role={onClick ? "button" : undefined} tabIndex={onClick ? 0 : undefined}>
      <span className="category-avatar" style={avatarStyle}>
        {title.slice(0, 1)}
      </span>
      <div>
        <strong>{title}</strong>
        <p>{meta}</p>
        {detail && <p>{detail}</p>}
        {warning && <em>Review: {warning}</em>}
        {action && (
          <div className="row-action" onClick={stopActionEvent} onKeyDown={stopActionEvent}>
            {action}
          </div>
        )}
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
