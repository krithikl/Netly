"use client";

import { AppSidebar } from "@/components/layout/AppSidebar";
import { Topbar } from "@/components/layout/Topbar";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
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
        {!shell.isBottomNavigation && (
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
        )}

        <DashboardViewRouter {...app.viewProps} />
      </main>
      <InitialTransactionSyncAlert open={shell.isInitializingTransactionHistory} />
    </div>
  );
}

// Blocks first-run Akahu screens while the encrypted archive is being populated.
function InitialTransactionSyncAlert({ open }: { open: boolean }) {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="initial-transaction-sync-alert">
        <div className="initial-transaction-sync-spinner" aria-hidden="true" />
        <AlertDialogHeader>
          <AlertDialogTitle>Loading transactions</AlertDialogTitle>
          <AlertDialogDescription>
            Akahu is retrieving your transaction history. Please wait while Netly builds the encrypted local archive.
          </AlertDialogDescription>
        </AlertDialogHeader>
      </AlertDialogContent>
    </AlertDialog>
  );
}
