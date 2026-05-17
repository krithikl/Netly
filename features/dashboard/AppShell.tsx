"use client";

import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { DashboardViewRouter } from "@/features/dashboard/DashboardViewRouter";
import { useNetlyApp } from "@/hooks/useNetlyApp";

// Main client shell: wires global app state into sidebar, topbar, and active page view.
export function AppShell() {
  const app = useNetlyApp();
  const { shell } = app;

  return (
    <div className="app-shell" data-testid="app-shell">
      <AppSidebar
        activeView={shell.activeView}
        changeDataMode={shell.changeDataMode}
        dataMode={shell.dataMode}
        setActiveView={shell.setActiveView}
      />

      <main className="main">
        <Topbar
          activeView={shell.activeView}
          dataSourceLabel={shell.dataSourceLabel}
          linkedAccountLabel={shell.linkedAccountLabel}
          linkedUserName={shell.linkedUserName}
          payday={shell.payday}
          period={shell.period}
          setPeriod={shell.setPeriod}
          showPeriodControl={shell.shouldShowPeriodControl}
        />

        <DashboardViewRouter {...app.viewProps} />
      </main>
    </div>
  );
}
