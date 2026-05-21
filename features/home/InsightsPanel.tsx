import { CreditCard, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

type InsightsPanelProps = {
  insights: string[];
  onViewInsights: () => void;
};

const insightIcons = [TrendingUp, ShieldCheck, CreditCard, Sparkles];

// Home sidebar panel showing generated spend insights.
export function InsightsPanel({ insights, onViewInsights }: InsightsPanelProps) {
  return (
    <Card className="insights-panel grid content-start gap-[18px] max-[768px]:hidden">
      <CardHeader className="panel-heading-row">
        <CardTitle>Insights</CardTitle>
        <Sparkles aria-hidden="true" size={18} strokeWidth={2.2} />
      </CardHeader>
      <ul className="m-0 grid list-none gap-0 p-0">
        {insights.map((insight, index) => {
          const Icon = insightIcons[index % insightIcons.length];

          return (
            <li className="grid min-h-[72px] grid-cols-[46px_minmax(0,1fr)] items-center gap-3.5 rounded-[14px] border border-[var(--outline-soft)] bg-[var(--surface-2)] px-3.5 py-3 leading-[1.35]" key={insight}>
              <span className="grid h-[42px] w-[42px] place-items-center rounded-full bg-[var(--primary-soft)] text-[var(--accent-cream)]">
                <Icon aria-hidden="true" size={20} strokeWidth={2.3} />
              </span>
              <strong className="text-[0.9rem] leading-[1.42]">{insight}</strong>
            </li>
          );
        })}
      </ul>
      <Button className="text-link" onClick={onViewInsights} type="button" variant="ghost">
        View all insights
      </Button>
    </Card>
  );
}
