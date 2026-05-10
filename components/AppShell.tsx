"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { ActiveView } from "@/components/views/ActiveView";
import { useNetlyApp } from "@/hooks/useNetlyApp";

export function AppShell() {
  const app = useNetlyApp();

  return (
    <div className="app-shell">
      <Sidebar
        activeView={app.activeView}
        changeDataMode={app.changeDataMode}
        connectionCopy={app.connectionCopy}
        connectionTitle={app.connectionTitle}
        dataMode={app.dataMode}
        setActiveView={app.setActiveView}
      />

      <main className="main">
        <Topbar
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
