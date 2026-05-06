import clsx from "clsx";
import { navItems } from "@/lib/app/constants";
import type { View } from "@/lib/app/types";

type SidebarProps = {
  activeView: View;
  connectionCopy: string;
  connectionTitle: string;
  setActiveView: (view: View) => void;
};

export function Sidebar({ activeView, connectionCopy, connectionTitle, setActiveView }: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="Main navigation">
      <div className="brand">
        <div className="brand-mark">M</div>
        <div>
          <div className="brand-name">MoneyFit</div>
          <div className="brand-subtitle">Open banking assistant</div>
        </div>
      </div>

      <nav className="nav">
        {navItems.map((item) => (
          <button
            className={getNavItemClassName(activeView, item.view)}
            key={item.view}
            onClick={() => setActiveView(item.view)}
            type="button"
          >
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="material-card connection-panel">
        <div className="status-dot" />
        <div>
          <div className="connection-title">{connectionTitle}</div>
          <div className="connection-copy">{connectionCopy}</div>
        </div>
      </div>
    </aside>
  );
}

function getNavItemClassName(activeView: View, itemView: View) {
  return clsx("nav-item", activeView === itemView && "active");
}
