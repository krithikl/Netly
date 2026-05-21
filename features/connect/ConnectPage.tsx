import type { ChangeEvent, SubmitEvent } from "react";
import { CheckCircle2, LogOut } from "lucide-react";
import { MobilePageHeader } from "@/components/layout/MobilePageHeader";
import { FlowStep } from "@/components/ui/flow-step";
import { PanelTitle } from "@/components/ui/panel-title";
import { Button } from "@/components/ui/button";
import type { AkahuManualTokens } from "@/hooks/useAkahuConnection";

type ConnectPageProps = {
  completeAkahuConnection: (tokens?: AkahuManualTokens) => Promise<void>;
  disconnectAkahuConnection: () => Promise<void>;
  isAkahuConnected: boolean;
  isLoadingTransactions: boolean;
  linkedAccountCount: number;
  linkedAccountLabel: string;
  linkedUserName: string;
  manualTokens: AkahuManualTokens;
  onManualTokensChange: (tokens: AkahuManualTokens) => void;
  setSyncResult: (value: string) => void;
  syncResult: string;
};

export function ConnectPage({
  completeAkahuConnection,
  disconnectAkahuConnection,
  isAkahuConnected,
  isLoadingTransactions,
  linkedAccountCount,
  linkedAccountLabel,
  linkedUserName,
  manualTokens,
  onManualTokensChange,
  setSyncResult,
  syncResult
}: ConnectPageProps) {
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

  const handleConnectionComplete = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canCompleteConnection) {
      return;
    }

    void completeAkahuConnection(manualTokens);
  };

  return (
    <section className="view-stack" data-testid="connect-page">
      <MobilePageHeader title="Connect" />
      <section className="material-card" suppressHydrationWarning>
        <PanelTitle title="Akahu connection" subtitle="Read-only account and transaction access" />
        {isAkahuConnected ? (
          <div className="akahu-connected-card">
            <div className="akahu-connected-heading">
              <CheckCircle2 aria-hidden="true" className="h-5 w-5" />
              <div>
                <h3>Akahu connected</h3>
                <p>{getAkahuConnectionSummary(linkedAccountCount)}</p>
              </div>
            </div>
            <dl className="akahu-connected-details">
              {linkedUserName && (
                <div>
                  <dt>Account holder</dt>
                  <dd>{linkedUserName}</dd>
                </div>
              )}
              {linkedAccountLabel && (
                <div>
                  <dt>Primary account</dt>
                  <dd>{linkedAccountLabel}</dd>
                </div>
              )}
            </dl>
            {syncResult && (
              <p aria-live="polite" className="sync-result">
                {syncResult}
              </p>
            )}
            <Button disabled={isLoadingTransactions} onClick={() => void disconnectAkahuConnection()} type="button" variant="secondary">
              <LogOut aria-hidden="true" className="h-4 w-4" />
              Disconnect Akahu
            </Button>
          </div>
        ) : (
          <>
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
            <form
              className="completion-box"
              autoComplete="on"
              onSubmit={handleConnectionComplete}
            >
              <PanelTitle
                title="Development tokens"
                subtitle="For Personal Apps, enter both Akahu tokens. Netly stores them in encrypted HTTP-only browser cookies, not environment files."
              />
              <div className="completion-token-fields">
                <label className="token-field" htmlFor="akahu-app-token">
                  <span>AKAHU_APP_TOKEN</span>
                  <input
                    id="akahu-app-token"
                    name="username"
                    autoComplete="username"
                    onChange={handleAppTokenChange}
                    placeholder="Enter AKAHU_APP_TOKEN"
                    spellCheck={false}
                    type="text"
                    value={manualTokens.appToken}
                  />
                </label>
                <label className="token-field" htmlFor="akahu-user-token">
                  <span>AKAHU_USER_TOKEN</span>
                  <input
                    id="akahu-user-token"
                    name="password"
                    autoComplete="current-password"
                    onChange={handleUserTokenChange}
                    placeholder="Enter AKAHU_USER_TOKEN"
                    spellCheck={false}
                    type="password"
                    value={manualTokens.userToken}
                  />
                </label>
              </div>
              <Button disabled={!canCompleteConnection} type="submit" variant="secondary" >
                Complete connection
              </Button>
            </form>
          </>
        )}
      </section>
    </section>
  );
}

// Summarizes the current Akahu sharing scope without exposing extra profile data.
function getAkahuConnectionSummary(linkedAccountCount: number) {
  if (linkedAccountCount === 0) {
    return "Netly can read the accounts shared through this Akahu connection.";
  }

  return `${linkedAccountCount} linked account${linkedAccountCount === 1 ? "" : "s"} shared with Netly.`;
}
