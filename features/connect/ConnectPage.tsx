import type { ChangeEvent, SubmitEvent } from "react";
import { CheckCircle2 } from "lucide-react";
import { MobilePageHeader } from "@/components/layout/MobilePageHeader";
import { FlowStep } from "@/components/ui/flow-step";
import { PanelTitle } from "@/components/ui/panel-title";
import { Button } from "@/components/ui/button";
import { DisconnectButton } from "@/components/ui/disconnect-button";
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
          <div className="mt-[18px] grid gap-4 rounded-[20px] border border-[var(--outline-soft)] bg-[var(--surface-2)] p-4">
            <div className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3">
              <CheckCircle2 aria-hidden="true" className="mt-0.5 h-5 w-5 text-[var(--success)]" />
              <div>
                <h3 className="m-0 text-base font-black text-[var(--ink)]">Akahu connected</h3>
                <p className="mt-1 mb-0 text-[0.86rem] leading-[1.45] text-[var(--muted)]">
                  {getAkahuConnectionSummary(linkedAccountCount)}
                </p>
              </div>
            </div>
            <dl className="m-0 grid gap-2.5">
              {linkedUserName && (
                <div className="grid gap-[3px]">
                  <dt className="text-[0.76rem] font-black text-[var(--muted)]">Account holder</dt>
                  <dd className="m-0 min-w-0 [overflow-wrap:anywhere] font-extrabold text-[var(--ink)]">{linkedUserName}</dd>
                </div>
              )}
              {linkedAccountLabel && (
                <div className="grid gap-[3px]">
                  <dt className="text-[0.76rem] font-black text-[var(--muted)]">Primary account</dt>
                  <dd className="m-0 min-w-0 [overflow-wrap:anywhere] font-extrabold text-[var(--ink)]">{linkedAccountLabel}</dd>
                </div>
              )}
            </dl>
            {syncResult && (
              <p aria-live="polite" className="text-[var(--muted)]">
                {syncResult}
              </p>
            )}
            <DisconnectButton className="w-fit" disabled={isLoadingTransactions} onClick={() => void disconnectAkahuConnection()}>
              Disconnect Akahu
            </DisconnectButton>
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
            <Button className="mt-[18px]" onClick={handleAuthorizationStart} type="button">
              Open Akahu authorization
            </Button>
            <p aria-live="polite" className="mt-3 min-h-6 text-[var(--muted)]">
              {syncResult}
            </p>
            <form
              className="mt-[18px] grid gap-3 rounded-[20px] border border-[var(--outline-soft)] bg-[var(--surface-2)] p-4"
              autoComplete="on"
              onSubmit={handleConnectionComplete}
            >
              <PanelTitle
                title="Development tokens"
                subtitle="For Personal Apps, enter both Akahu tokens. Netly stores them in encrypted HTTP-only browser cookies, not environment files."
              />
              <div className="grid gap-3">
                <label className="grid gap-[7px]" htmlFor="akahu-app-token">
                  <span className="text-[0.78rem] font-black text-[var(--muted)]">AKAHU_APP_TOKEN</span>
                  <input
                    className="w-full rounded-2xl border border-[var(--outline-soft)] bg-[var(--surface-2)] p-3 font-[inherit] text-[var(--ink)] placeholder:text-[var(--muted-2)]"
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
                <label className="grid gap-[7px]" htmlFor="akahu-user-token">
                  <span className="text-[0.78rem] font-black text-[var(--muted)]">AKAHU_USER_TOKEN</span>
                  <input
                    className="w-full rounded-2xl border border-[var(--outline-soft)] bg-[var(--surface-2)] p-3 font-[inherit] text-[var(--ink)] placeholder:text-[var(--muted-2)]"
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
