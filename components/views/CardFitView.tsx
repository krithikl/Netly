import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { ExternalLink, Gift, TrendingUp } from "lucide-react";
import { CardFitDetailPanel, type CardFitDetailPanelMode } from "@/components/card-fit/CardFitDetailPanel";
import { Button } from "@/components/ui/button";
import { PanelTitle } from "@/components/ui/panel-title";
import { SelectField, type SelectOption } from "@/components/ui/select-field";
import { formatMoney } from "@/lib/insights";
import type { CardFitBasis, CardFitExplanation, CardValue } from "@/lib/types";

type CardFitViewProps = {
  cards: CardValue[];
  cardFitSourceLabel: string;
  cardFitWindowLabel: string;
  explanation: CardFitExplanation | null;
  hasCardEligibleSpend: boolean;
  basis: CardFitBasis;
};

type CardFitDetailSelection = {
  card: CardValue;
  mode: CardFitDetailPanelMode;
  rank: number;
};

// Card Fit screen for ranking card products against detected eligible spend.
export function CardFitView({ basis, cardFitSourceLabel, cardFitWindowLabel, cards, explanation: _explanation, hasCardEligibleSpend }: CardFitViewProps) {
  const subtitle = getCardFitSubtitle(cardFitSourceLabel);
  const [issuerFilter, setIssuerFilter] = useState(allIssuersFilter);
  const [typeFilter, setTypeFilter] = useState<CardTypeFilter>(allTypesFilter);
  const [selectedDetail, setSelectedDetail] = useState<CardFitDetailSelection | null>(null);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const isBottomNavigation = useIsBottomNavigation();
  const issuerOptions = useMemo(() => getIssuerOptions(cards), [cards]);
  const typeOptions = useMemo(() => getCardTypeOptions(), []);
  const filteredCards = useMemo(
    () => cards.filter((card) => matchesCardFilters(card, issuerFilter, typeFilter)),
    [cards, issuerFilter, typeFilter]
  );
  const openDetailPanel = (mode: CardFitDetailPanelMode, card: CardValue, rank: number) => {
    setSelectedDetail({ card, mode, rank });
    setIsDetailPanelOpen(true);
  };
  const closeDetailPanel = () => setIsDetailPanelOpen(false);

  useEffect(() => {
    if (!selectedDetail || filteredCards.some((card) => card.name === selectedDetail.card.name)) {
      return;
    }

    setIsDetailPanelOpen(false);
  }, [filteredCards, selectedDetail]);

  return (
    <section className="view-stack">
      <section className="material-card">
        <PanelTitle title="Card fit comparison" subtitle={subtitle} />
        <CardFitBasisSummary basis={basis} cardFitWindowLabel={cardFitWindowLabel} />
        <p className="card-fit-disclaimer">
          Rewards are estimated from card-eligible spend. Listed perks are not dollar-valued unless the value is clear from the issuer source.
        </p>
        <div className="card-fit-controls">
          <label>
            Bank or provider
            <SelectField onChange={setIssuerFilter} options={issuerOptions} value={issuerFilter} />
          </label>
          <label>
            Card type
            <SelectField onChange={(value) => setTypeFilter(value as CardTypeFilter)} options={typeOptions} value={typeFilter} />
          </label>
        </div>
        {!hasCardEligibleSpend && (
          <div className="status-banner neutral" role="status">
            <strong>No card-eligible spend yet.</strong>
            <span>Netly excludes income, transfers, fees, housing, upcoming payments, and needs-review rows from card rewards calculations.</span>
          </div>
        )}
        <div className="card-list">
          {filteredCards.map((card, index) => (
            <CardOption
              card={card}
              index={index}
              key={card.name}
              onOpenDetail={openDetailPanel}
            />
          ))}
          {filteredCards.length === 0 && (
            <div className="empty-state">No cards match the current filters.</div>
          )}
        </div>
      </section>
      {selectedDetail && (
        <CardFitDetailPanel
          basis={basis}
          card={selectedDetail.card}
          isBottomNavigation={isBottomNavigation}
          mode={selectedDetail.mode}
          onClose={closeDetailPanel}
          open={isDetailPanelOpen}
          rank={selectedDetail.rank}
        />
      )}
    </section>
  );
}

type CardTypeFilter = "All types" | "Credit" | "Debit";

const allIssuersFilter = "All providers";
const allTypesFilter: CardTypeFilter = "All types";

function getIssuerOptions(cards: CardValue[]): SelectOption[] {
  const issuers = [...new Set(cards.map((card) => card.issuer))].sort();
  return [allIssuersFilter, ...issuers].map((issuer) => ({
    label: issuer,
    value: issuer
  }));
}

function getCardTypeOptions(): SelectOption<CardTypeFilter>[] {
  const types: CardTypeFilter[] = [allTypesFilter, "Credit", "Debit"];

  return types.map((type) => ({
    label: type,
    value: type
  }));
}

function matchesCardFilters(card: CardValue, issuerFilter: string, typeFilter: CardTypeFilter) {
  return (issuerFilter === allIssuersFilter || card.issuer === issuerFilter)
    && (typeFilter === allTypesFilter || getCardType(card) === typeFilter);
}

function getCardType(card: CardValue): Exclude<CardTypeFilter, "All types"> {
  return card.tier === "Debit" ? "Debit" : "Credit";
}

// Explains the spend window and data basis used for the card ranking.
function CardFitBasisSummary({ basis, cardFitWindowLabel }: { basis: CardFitBasis; cardFitWindowLabel: string }) {
  return (
    <div className="card-fit-basis" aria-label="Card fit calculation basis">
      <div>
        <span>Spend window</span>
        <strong>{cardFitWindowLabel}</strong>
      </div>
      <div>
        <span>Eligible spend</span>
        <strong>{formatMoney(basis.eligibleSpend, true)}</strong>
      </div>
      <div>
        <span>Eligible annual spend</span>
        <strong>{formatMoney(basis.eligibleAnnualSpend)}</strong>
      </div>
      <div>
        <span>Rows used</span>
        <strong>
          {basis.eligibleTransactionCount}/{basis.transactionCount}
        </strong>
      </div>
    </div>
  );
}

// One ranked card result row/card rendered in the Card Fit list.
function CardOption({
  card,
  index,
  onOpenDetail
}: {
  card: CardValue;
  index: number;
  onOpenDetail: (mode: CardFitDetailPanelMode, card: CardValue, rank: number) => void;
}) {
  const isWinner = index === 0;
  const isUnavailable = card.availability === "unavailable";
  const cardOptionClassName = getCardOptionClassName(isWinner);
  const cardOptionStyle = getCardOptionStyle(card, isWinner);
  const rankLabel = `#${index + 1}`;
  const cardBrandLabel = getCardBrandLabel(card);
  const cardBreakdown = getCardBreakdown(card);
  const eligibleSpendLabel = `Based on ${formatMoney(card.eligibleAnnualSpend)} eligible annual spend`;

  return (
    <article className={cardOptionClassName} style={cardOptionStyle}>
      <div>
        <div className="card-heading">
          <span className="rank-pill" style={{ background: card.brandColor }}>
            {rankLabel}
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2>{card.name}</h2>
              {isUnavailable && (
                <span className="rounded-lg border border-[var(--outline)] bg-white/70 px-2.5 py-1 text-[11px] font-black uppercase text-[var(--muted)]">
                  Legacy
                </span>
              )}
            </div>
            <p className="card-brand">{cardBrandLabel}</p>
          </div>
        </div>
        <p>{card.note}</p>
        {card.availabilityNote && (
          <p className="mt-2 rounded-xl border border-[var(--outline)] bg-white/70 px-3 py-2 text-xs font-bold text-[var(--muted)]">
            {card.availabilityNote}
          </p>
        )}
        <small>
          {card.rewardProgram} · {card.earnDescription}
        </small>
        <div className="card-breakdown">
          {cardBreakdown.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <a
          className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-lg text-sm font-black text-[var(--primary)] no-underline transition-colors hover:text-[var(--primary-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          href={card.sourceUrl}
          rel="noreferrer"
          target="_blank"
        >
          <span>View issuer page</span>
          <ExternalLink aria-hidden="true" className="h-4 w-4" strokeWidth={2.6} />
        </a>
      </div>
      <div className="card-value-block">
        <span>Estimated annual net value</span>
        <strong>{formatMoney(card.annualValue)}</strong>
        <small>{eligibleSpendLabel}</small>
        <div className="mt-1 flex flex-wrap justify-end gap-2 max-lg:justify-start">
          <Button
            className="card-fit-explanation-trigger"
            onClick={() => onOpenDetail("why-this-wins", card, index)}
            size="sm"
            type="button"
            variant="outline"
          >
            <TrendingUp aria-hidden="true" className="h-3.5 w-3.5" />
            Why this wins
          </Button>
          <Button
            className="card-fit-benefits-trigger rounded-xl px-3 text-xs font-black"
            onClick={() => onOpenDetail("benefits", card, index)}
            size="sm"
            type="button"
            variant="outline"
          >
            <Gift aria-hidden="true" className="h-3.5 w-3.5" />
            Benefits
          </Button>
        </div>
      </div>
    </article>
  );
}

function getCardFitSubtitle(cardFitSourceLabel: string) {
  return `Cards are ranked from ${cardFitSourceLabel}: rewards earned + counted perks - annual fee.`;
}

function useIsBottomNavigation() {
  const [isBottomNavigation, setIsBottomNavigation] = useState(() => getIsBottomNavigation());

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1180px)");
    const handleChange = () => setIsBottomNavigation(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return isBottomNavigation;
}

function getIsBottomNavigation() {
  return typeof window === "undefined" ? false : window.matchMedia("(max-width: 1180px)").matches;
}

function getCardOptionClassName(isWinner: boolean) {
  return clsx("card-option", isWinner && "winner");
}

function getCardOptionStyle(card: CardValue, isWinner: boolean) {
  return {
    borderColor: isWinner ? card.brandColor : undefined
  };
}

function getCardBrandLabel(card: CardValue) {
  return `${card.issuer} · ${card.network} · ${card.tier}`;
}

function getCardBreakdown(card: CardValue) {
  return [
    `Rewards earned ${formatMoney(card.grossRewards)}`,
    `Counted perks ${formatMoney(card.perksValue)}`,
    `Annual fee ${getAnnualFeeLabel(card.annualFee)}`
  ];
}

function getAnnualFeeLabel(annualFee: number) {
  return annualFee > 0 ? `-${formatMoney(annualFee)}` : formatMoney(0);
}
