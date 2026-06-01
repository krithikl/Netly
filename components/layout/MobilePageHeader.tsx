import type { ReactNode } from "react";

type MobilePageHeaderProps = {
  actions?: ReactNode;
  children?: ReactNode;
  leading?: ReactNode;
  title: string;
};

// Mobile-only page title used when the bottom navigation replaces the desktop topbar.
export function MobilePageHeader({ actions, children, leading, title }: MobilePageHeaderProps) {
  const hasChrome = Boolean(leading || actions);

  return (
    <header className="mobile-page-header" aria-label={`${title} page header`}>
      {hasChrome && (
        <div className="mobile-page-header-chrome">
          <div className="mobile-page-header-leading">{leading}</div>
          <div className="mobile-page-header-actions">{actions}</div>
        </div>
      )}
      <h2>{title}</h2>
      {children}
    </header>
  );
}
