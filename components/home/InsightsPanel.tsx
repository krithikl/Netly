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
    <Card className="insights-panel">
      <CardHeader className="panel-heading-row">
        <CardTitle>Insights</CardTitle>
        <Sparkles aria-hidden="true" size={18} strokeWidth={2.2} />
      </CardHeader>
      <ul className="insight-list">
        {insights.map((insight, index) => {
          const Icon = insightIcons[index % insightIcons.length];

          return (
            <li key={insight}>
              <span className="insight-icon">
                <Icon aria-hidden="true" size={20} strokeWidth={2.3} />
              </span>
              <strong>{insight}</strong>
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
