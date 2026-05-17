"use client";

import clsx from "clsx";
import { CreditCard, Home, Link2, List, MoreHorizontal, PieChart, Settings } from "lucide-react";
import { useState } from "react";
import { navItems } from "@/lib/app/constants";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { DataMode, View } from "@/lib/app/types";

type AppSidebarProps = {
  activeView: View;
  changeDataMode: (mode: DataMode) => void;
  dataMode: DataMode;
  setActiveView: (view: View) => void;
};

// Primary navigation and demo/user data toggle used across all app views.
export function AppSidebar({
  activeView,
  changeDataMode,
  dataMode,
  setActiveView
}: AppSidebarProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const primaryMobileItems = navItems.filter((item) => item.view === "home" || item.view === "transactions" || item.view === "budgets");
  const moreMobileItems = navItems.filter((item) => item.view === "connect" || item.view === "cards" || item.view === "settings");
  const moreIsActive = moreMobileItems.some((item) => item.view === activeView);

  const handleViewChange = (view: View) => {
    setActiveView(view);
    setIsMoreOpen(false);
  };

  return (
    <aside className="sidebar" aria-label="Main navigation" data-testid="desktop-sidebar">
      <div className="brand">
        <div className="brand-mark">N</div>
        <div>
          <div className="brand-name">Netly</div>
          <div className="brand-subtitle">Open banking assistant</div>
        </div>
      </div>

      <nav className="nav">
        {navItems.map((item) => (
          <button
            className={getNavItemClassName(activeView, item.view)}
            data-testid={getNavTestId(item.view)}
            key={item.view}
            onClick={() => handleViewChange(item.view)}
            type="button"
          >
            <NavIcon view={item.view} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <section className="sidebar-source-card" aria-label="Data source">
          <span className="sidebar-label">Data source</span>
          <button className="source-switch" onClick={() => changeDataMode(getNextDataMode(dataMode))} type="button">
            <span>
              <strong>{getCurrentDataModeLabel(dataMode)}</strong>
              <small>{dataMode === "demo" ? "Connected" : "Active source"}</small>
            </span>
            <MoreHorizontal aria-hidden="true" size={18} strokeWidth={2.2} />
          </button>
        </section>

      </div>

      <nav className="mobile-nav" aria-label="Main mobile navigation" data-testid="bottom-nav">
        {primaryMobileItems.map((item) => (
          <button
            className={getNavItemClassName(activeView, item.view)}
            data-testid={getNavTestId(item.view)}
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
            <button className={clsx("nav-item", moreIsActive && "active")} data-testid="nav-more" type="button">
              <span className="nav-icon">
                <MoreHorizontal aria-hidden="true" size={18} strokeWidth={2.4} />
              </span>
              <span>More</span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="mobile-more-menu" data-testid="mobile-more-menu" side="top">
            {moreMobileItems.map((item) => (
              <button
                className={getNavItemClassName(activeView, item.view)}
                data-testid={getNavTestId(item.view)}
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
              <button className="source-switch" onClick={() => changeDataMode(getNextDataMode(dataMode))} type="button">
                <span>
                  <strong>{getCurrentDataModeLabel(dataMode)}</strong>
                  <small>Switch to {getDataModeLabel(getNextDataMode(dataMode))}</small>
                </span>
                <MoreHorizontal aria-hidden="true" size={18} strokeWidth={2.2} />
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </nav>
    </aside>
  );
}

function getNextDataMode(dataMode: DataMode) {
  return dataMode === "user" ? "demo" : "user";
}

function getCurrentDataModeLabel(dataMode: DataMode) {
  return dataMode === "user" ? "Akahu" : "Demo data";
}

function getDataModeLabel(mode: DataMode) {
  return mode === "user" ? "Akahu" : "Demo";
}

function getNavTestId(view: View) {
  if (view === "cards") {
    return "nav-card-fit";
  }

  return `nav-${view}`;
}

function getNavItemClassName(activeView: View, itemView: View) {
  return clsx("nav-item", activeView === itemView && "active");
}

// Maps each app view to its sidebar/bottom-nav icon.
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
