import type { ChangeEvent } from "react";
import { FlowStep } from "@/components/ui/FlowStep";
import { PanelTitle } from "@/components/ui/PanelTitle";
import { Button } from "@/components/ui/button";

type ConnectViewProps = {
  connectionResponse: string;
  completeOpenBankingConnection: (responseValue?: string) => Promise<void>;
  onConnectionResponseChange: (value: string) => void;
  setSyncResult: (value: string) => void;
  syncResult: string;
};

export function ConnectView({
  connectionResponse,
  completeOpenBankingConnection,
  onConnectionResponseChange,
  setSyncResult,
  syncResult
}: ConnectViewProps) {
  const canCompleteConnection = connectionResponse.trim().length > 0;
  const handleAuthorizationStart = () => {
    setSyncResult("Opening Akahu authorization...");
    window.location.href = "/api/open-banking/start";
  };
  const handleConnectionResponseChange = (event: ChangeEvent<HTMLTextAreaElement>) => onConnectionResponseChange(event.target.value);
  const handleConnectionComplete = () => completeOpenBankingConnection(connectionResponse);

  return (
    <section className="view-stack">
      <section className="material-card">
        <PanelTitle title="Akahu connection" subtitle="Read-only account and transaction access" />
        <div className="flow">
          <FlowStep number="1" title="Authorize Akahu">
            Connect through Akahu OAuth, or use a Personal App user token while developing.
          </FlowStep>
          <FlowStep number="2" title="Read accounts">
            MoneyFit reads Akahu accounts directly, including balances and account metadata.
          </FlowStep>
          <FlowStep number="3" title="Read transactions">
            Settled and pending Akahu transactions are loaded from connected accounts.
          </FlowStep>
          <FlowStep number="4" title="Use enrichment">
            Merchant and category fields come from Akahu enrichment when available.
          </FlowStep>
        </div>
        <Button onClick={handleAuthorizationStart} type="button">
          Open Akahu authorization
        </Button>
        <p aria-live="polite" className="sync-result">
          {syncResult}
        </p>
        <div className="completion-box">
          <PanelTitle title="Development token" subtitle="For Personal Apps, paste the Akahu User Access Token from my.akahu.nz/developers." />
          <textarea
            onChange={handleConnectionResponseChange}
            placeholder="Paste Akahu User Access Token"
            value={connectionResponse}
          />
          <Button disabled={!canCompleteConnection} onClick={handleConnectionComplete} type="button" variant="secondary">
            Complete connection
          </Button>
        </div>
      </section>
    </section>
  );
}
