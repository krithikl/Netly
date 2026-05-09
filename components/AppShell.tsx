"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { ActiveView } from "@/components/views/ActiveView";
import { useMoneyFitApp } from "@/hooks/useMoneyFitApp";

export function AppShell() {
  const app = useMoneyFitApp();

  return (
    <div className="app-shell">
      <Sidebar
        activeView={app.activeView}
        connectionCopy={app.connectionCopy}
        connectionTitle={app.connectionTitle}
        setActiveView={app.setActiveView}
      />

      <main className="main">
        <Topbar
          changeDataMode={app.changeDataMode}
          dataMode={app.dataMode}
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
