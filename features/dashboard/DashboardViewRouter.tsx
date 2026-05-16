import type { ComponentProps } from "react";
import { BudgetsPage } from "@/features/budgets/BudgetsPage";
import { CardFitPage } from "@/features/card-fit/CardFitPage";
import { ConnectPage } from "@/features/connect/ConnectPage";
import { HomePage } from "@/features/home/HomePage";
import { SettingsPage } from "@/features/settings/SettingsPage";
import { TransactionsPage } from "@/features/transactions/TransactionsPage";
import type { View } from "@/lib/app/types";

type DashboardViewRouterProps = {
  activeView: View;
  budgets: ComponentProps<typeof BudgetsPage>;
  cards: ComponentProps<typeof CardFitPage>;
  connect: ComponentProps<typeof ConnectPage>;
  home: ComponentProps<typeof HomePage>;
  settings: ComponentProps<typeof SettingsPage>;
  transactions: ComponentProps<typeof TransactionsPage>;
};

// Chooses the active dashboard page and passes only that page's props.
export function DashboardViewRouter(props: DashboardViewRouterProps) {
  switch (props.activeView) {
    case "transactions":
      return <TransactionsPage {...props.transactions} />;
    case "budgets":
      return <BudgetsPage {...props.budgets} />;
    case "cards":
      return <CardFitPage {...props.cards} />;
    case "connect":
      return <ConnectPage {...props.connect} />;
    case "settings":
      return <SettingsPage {...props.settings} />;
    default:
      return (
        <section className="view-stack">
          <HomePage {...props.home} />
        </section>
      );
  }
}
