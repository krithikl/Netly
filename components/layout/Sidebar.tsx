"use client";

import clsx from "clsx";
import { CreditCard, Home, Link2, List, MoreHorizontal, PieChart, Settings } from "lucide-react";
import { useState } from "react";
import { navItems } from "@/lib/app/constants";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { DataMode, View } from "@/lib/app/types";

type SidebarProps = {
  activeView: View;
  changeDataMode: (mode: DataMode) => void;
  connectionCopy: string;
  connectionTitle: string;
  dataMode: DataMode;
  setActiveView: (view: View) => void;
};

export function Sidebar({ activeView, changeDataMode, connectionCopy, connectionTitle, dataMode, setActiveView }: SidebarProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const primaryMobileItems = navItems.filter((item) => item.view === "home" || item.view === "transactions" || item.view === "budgets");
  const moreMobileItems = navItems.filter((item) => !primaryMobileItems.includes(item));
  const moreIsActive = moreMobileItems.some((item) => item.view === activeView);

  const handleViewChange = (view: View) => {
    setActiveView(view);
    setIsMoreOpen(false);
  };

  return (
    <aside className="sidebar" aria-label="Main navigation">
      <div className="brand">
        <div className="brand-mark">M</div>
        <div>
          <div className="brand-name">Netly</div>
          <div className="brand-subtitle">Open banking assistant</div>
        </div>
      </div>

      <nav className="nav">
        {navItems.map((item) => (
          <button
            className={getNavItemClassName(activeView, item.view)}
            key={item.view}
            onClick={() => handleViewChange(item.view)}
            type="button"
          >
            <NavIcon view={item.view} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-source-control" aria-label="Data source">
        <span>Data source</span>
        <DataModeSwitch changeDataMode={changeDataMode} dataMode={dataMode} />
      </div>

      <div className="material-card connection-panel">
        <div className="status-dot" />
        <div>
          <div className="connection-title">{connectionTitle}</div>
          <div className="connection-copy">{connectionCopy}</div>
        </div>
      </div>

      <nav className="mobile-nav" aria-label="Main mobile navigation">
        {primaryMobileItems.map((item) => (
          <button
            className={getNavItemClassName(activeView, item.view)}
            key={item.view}
            onClick={() => handleViewChange(item.view)}
            type="button"
          >
            <NavIcon view={item.view} />
            <span>{item.label}</span>
          </button>
        ))}

        <Popover onOpenChange={setIsMoreOpen} open={isMoreOpen}>
          <PopoverTrigger asChild>
            <button className={clsx("nav-item", moreIsActive && "active")} type="button">
              <span className="nav-icon">
                <MoreHorizontal aria-hidden="true" size={18} strokeWidth={2.4} />
              </span>
              <span>More</span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="mobile-more-menu" side="top">
            {moreMobileItems.map((item) => (
              <button
                className={getNavItemClassName(activeView, item.view)}
                key={item.view}
                onClick={() => handleViewChange(item.view)}
                type="button"
              >
                <NavIcon view={item.view} />
                <span>{item.label}</span>
              </button>
            ))}
            <div className="mobile-more-source">
              <span>Data source</span>
              <DataModeSwitch changeDataMode={changeDataMode} dataMode={dataMode} />
            </div>
          </PopoverContent>
        </Popover>
      </nav>
    </aside>
  );
}

function DataModeSwitch({ changeDataMode, dataMode }: { changeDataMode: (mode: DataMode) => void; dataMode: DataMode }) {
  const nextMode = dataMode === "user" ? "demo" : "user";

  return (
    <button className="source-switch" onClick={() => changeDataMode(nextMode)} type="button">
      Switch to {getDataModeLabel(nextMode)}
    </button>
  );
}

function getDataModeLabel(mode: DataMode) {
  return mode === "user" ? "Akahu" : "Demo";
}

function getNavItemClassName(activeView: View, itemView: View) {
  return clsx("nav-item", activeView === itemView && "active");
}

function NavIcon({ view }: { view: View }) {
  const Icon = getIconForView(view);

  return (
    <span className="nav-icon">
      <Icon aria-hidden="true" size={18} strokeWidth={2.4} />
    </span>
  );
}

function getIconForView(view: View) {
  switch (view) {
    case "home":
      return Home;
    case "transactions":
      return List;
    case "budgets":
      return PieChart;
    case "cards":
      return CreditCard;
    case "connect":
      return Link2;
    case "settings":
      return Settings;
  }
}
