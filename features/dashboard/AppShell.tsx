"use client";

import { LoaderCircle } from "lucide-react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import { DashboardViewRouter } from "@/features/dashboard/DashboardViewRouter";
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

        <DashboardViewRouter {...app.viewProps} />
      </main>

      {app.isInitialTransactionImport && <InitialTransactionImportOverlay />}
    </div>
  );
}

function InitialTransactionImportOverlay() {
  return (
    <div className="initial-import-overlay" role="status" aria-live="polite">
      <section className="initial-import-card" aria-label="Loading transactions">
        <span className="initial-import-icon">
          <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin" />
        </span>
        <div>
          <strong>Loading your transactions</strong>
          <p>Netly is importing and encrypting your Akahu history. This is a one-off setup step after connecting.</p>
        </div>
      </section>
    </div>
  );
}
