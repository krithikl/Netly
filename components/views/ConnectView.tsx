import type { ChangeEvent } from "react";
import { FlowStep } from "@/components/ui/FlowStep";
import { PanelTitle } from "@/components/ui/PanelTitle";

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
    setSyncResult("Opening sandbox bank authorization...");
    window.location.href = "/api/open-banking/start";
  };
  const handleConnectionResponseChange = (event: ChangeEvent<HTMLTextAreaElement>) => onConnectionResponseChange(event.target.value);
  const handleConnectionComplete = () => completeOpenBankingConnection(connectionResponse);

  return (
    <section className="view-stack">
      <section className="material-card">
        <PanelTitle title="Open banking connection" subtitle="Read-only PNZ sandbox flow" />
        <div className="flow">
          <FlowStep number="1" title="Create account access consent">
            Request read-only permissions for accounts, balances, and transactions.
          </FlowStep>
          <FlowStep number="2" title="Authorize user">
            Redirect through PNZ/OIDC using PAR where required by the standard.
          </FlowStep>
          <FlowStep number="3" title="Exchange code for token">
            Use private_key_jwt from the server. Never from browser JavaScript.
          </FlowStep>
          <FlowStep number="4" title="Sync transactions">
            Pull accounts, balances, transactions, then categorize and generate insights.
          </FlowStep>
        </div>
        <button
          className="primary-button"
          onClick={handleAuthorizationStart}
          type="button"
        >
          Open sandbox authorization
        </button>
        <p aria-live="polite" className="sync-result">
          {syncResult}
        </p>
        <div className="completion-box">
          <PanelTitle title="Finish developer portal redirect" subtitle="Response JWT will automatically populate and submit when you complete authorization." />
          <textarea
            onChange={handleConnectionResponseChange}
            placeholder="Paste response=eyJ... value here (or it will auto-populate)"
            value={connectionResponse}
          />
          <button className="tonal-action" disabled={!canCompleteConnection} onClick={handleConnectionComplete} type="button">
            Complete connection
          </button>
        </div>
      </section>
    </section>
  );
}
