"use client";

import { LoaderCircle } from "lucide-react";
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

        {shell.statusBannerMessage && (
          <div className="status-banner" role="status">
            <strong>{shell.statusBannerTitle}</strong>
            <span>{shell.statusBannerMessage}</span>
          </div>
        )}

        <DashboardViewRouter {...app.viewProps} />
      </main>

      {shell.isInitialTransactionImport && <InitialTransactionImportOverlay />}
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
