"use client";

import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { ActiveView } from "@/components/views/ActiveView";
import { useNetlyApp } from "@/hooks/useNetlyApp";

// Main client shell: wires global app state into sidebar, topbar, and active page view.
export function AppShell() {
  const app = useNetlyApp();

  return (
    <div className="app-shell">
      <AppSidebar
        activeView={app.activeView}
        changeDataMode={app.changeDataMode}
        connectionCopy={app.connectionCopy}
        connectionTitle={app.connectionTitle}
        dataMode={app.dataMode}
        setActiveView={app.setActiveView}
      />

      <main className="main">
        <Topbar
          activeView={app.activeView}
          dataSourceLabel={app.dataSourceLabel}
          linkedAccountLabel={app.linkedAccountLabel}
          linkedUserName={app.linkedUserName}
          payday={app.payday}
          period={app.period}
          setPeriod={app.setPeriod}
          showPeriodControl={app.shouldShowPeriodControl}
        />

        {app.statusBannerMessage && (
          <div className="status-banner" role="status">
            <strong>{app.statusBannerTitle}</strong>
            <span>{app.statusBannerMessage}</span>
          </div>
        )}

        <ActiveView {...app.viewProps} />
      </main>
    </div>
  );
}
