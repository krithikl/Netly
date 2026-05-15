import type { ChangeEvent } from "react";
import { FlowStep } from "@/components/ui/flow-step";
import { PanelTitle } from "@/components/ui/panel-title";
import { Button } from "@/components/ui/button";
import type { AkahuManualTokens } from "@/hooks/useAkahuConnection";

type ConnectViewProps = {
  completeAkahuConnection: (tokens?: AkahuManualTokens) => Promise<void>;
  manualTokens: AkahuManualTokens;
  onManualTokensChange: (tokens: AkahuManualTokens) => void;
  setSyncResult: (value: string) => void;
  syncResult: string;
};

// Akahu connection screen for starting OAuth or saving a returned user token.
export function ConnectView({
  completeAkahuConnection,
  manualTokens,
  onManualTokensChange,
  setSyncResult,
  syncResult
}: ConnectViewProps) {
  const canCompleteConnection = manualTokens.appToken.trim().length > 0 && manualTokens.userToken.trim().length > 0;
  const handleAuthorizationStart = () => {
    setSyncResult("Opening Akahu authorization...");
    window.location.href = "/api/akahu/start";
  };
  const handleAppTokenChange = (event: ChangeEvent<HTMLInputElement>) => {
    onManualTokensChange({
      ...manualTokens,
      appToken: event.target.value
    });
  };
  const handleUserTokenChange = (event: ChangeEvent<HTMLInputElement>) => {
    onManualTokensChange({
      ...manualTokens,
      userToken: event.target.value
    });
  };
  const handleConnectionComplete = () => completeAkahuConnection(manualTokens);

  return (
    <section className="view-stack">
      <section className="material-card">
        <PanelTitle title="Akahu connection" subtitle="Read-only account and transaction access" />
        <div className="flow">
          <FlowStep number="1" title="Authorize Akahu">
            Connect through Akahu OAuth, or use a Personal App user token while developing.
          </FlowStep>
          <FlowStep number="2" title="Read accounts">
            Netly reads Akahu accounts directly, including balances and account metadata.
          </FlowStep>
          <FlowStep number="3" title="Read transactions">
            Settled and pending Akahu transactions are loaded from connected accounts.
          </FlowStep>
          <FlowStep number="4" title="Use enrichment">
            Merchant and category fields come from Akahu enrichment when available.
          </FlowStep>
        </div>
        <Button className="connect-auth-button" onClick={handleAuthorizationStart} type="button">
          Open Akahu authorization
        </Button>
        <p aria-live="polite" className="sync-result">
          {syncResult}
        </p>
        <div className="completion-box">
          <PanelTitle title="Development tokens" subtitle="For Personal Apps, enter both Akahu tokens. Netly stores them in encrypted HTTP-only browser cookies, not environment files." />
          <div className="completion-token-fields">
            <label className="token-field">
              <span>AKAHU_APP_TOKEN</span>
              <input
                autoComplete="off"
                onChange={handleAppTokenChange}
                placeholder="Enter AKAHU_APP_TOKEN"
                spellCheck={false}
                type="password"
                value={manualTokens.appToken}
              />
            </label>
            <label className="token-field">
              <span>AKAHU_USER_TOKEN</span>
              <input
                autoComplete="off"
                onChange={handleUserTokenChange}
                placeholder="Enter AKAHU_USER_TOKEN"
                spellCheck={false}
                type="password"
                value={manualTokens.userToken}
              />
            </label>
          </div>
          <Button disabled={!canCompleteConnection} onClick={handleConnectionComplete} type="button" variant="secondary">
            Complete connection
          </Button>
        </div>
      </section>
    </section>
  );
}
