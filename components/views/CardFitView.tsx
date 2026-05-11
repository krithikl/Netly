import { useMemo, useState } from "react";
import clsx from "clsx";
import { PanelTitle } from "@/components/ui/panel-title";
import { SelectField, type SelectOption } from "@/components/ui/select-field";
import { formatMoney } from "@/lib/insights";
import type { CardFitBasis, CardValue } from "@/lib/types";

type CardFitViewProps = {
  cards: CardValue[];
  cardFitSourceLabel: string;
  cardFitWindowLabel: string;
  hasCardEligibleSpend: boolean;
  basis: CardFitBasis;
};

export function CardFitView({ basis, cardFitSourceLabel, cardFitWindowLabel, cards, hasCardEligibleSpend }: CardFitViewProps) {
  const subtitle = getCardFitSubtitle(cardFitSourceLabel);
  const [issuerFilter, setIssuerFilter] = useState(allIssuersFilter);
  const [typeFilter, setTypeFilter] = useState<CardTypeFilter>(allTypesFilter);
  const issuerOptions = useMemo(() => getIssuerOptions(cards), [cards]);
  const typeOptions = useMemo(() => getCardTypeOptions(), []);
  const filteredCards = useMemo(
    () => cards.filter((card) => matchesCardFilters(card, issuerFilter, typeFilter)),
    [cards, issuerFilter, typeFilter]
  );

  return (
    <section className="view-stack">
      <section className="material-card">
        <PanelTitle title="Card fit comparison" subtitle={subtitle} />
        <CardFitBasisSummary basis={basis} cardFitWindowLabel={cardFitWindowLabel} />
        <p className="card-fit-disclaimer">
          Rewards are estimated from card-eligible spend. Netly excludes income, transfers, fees, housing, upcoming payments, and needs-review rows.
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
            <CardOption card={card} index={index} key={card.name} />
          ))}
          {filteredCards.length === 0 && (
            <div className="empty-state">No cards match the current filters.</div>
          )}
        </div>
      </section>
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

function CardOption({ card, index }: { card: CardValue; index: number }) {
  const isWinner = index === 0;
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
            <h2>{card.name}</h2>
            <p className="card-brand">{cardBrandLabel}</p>
          </div>
        </div>
        <p>{card.note}</p>
        <small>
          {card.rewardProgram} · {card.earnDescription}
        </small>
        <div className="card-breakdown">
          {cardBreakdown.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
        <a className="card-link" href={card.sourceUrl} rel="noreferrer" target="_blank">
          View issuer page
        </a>
      </div>
      <div className="card-value-block">
        <span>Estimated annual net value</span>
        <strong>{formatMoney(card.annualValue)}</strong>
        <small>{eligibleSpendLabel}</small>
      </div>
    </article>
  );
}

function getCardFitSubtitle(cardFitSourceLabel: string) {
  return `Cards are ranked from ${cardFitSourceLabel}: rewards earned + estimated perks - annual fee.`;
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
    `Perks estimate ${formatMoney(card.perksValue)}`,
    `Annual fee ${getAnnualFeeLabel(card.annualFee)}`
  ];
}

function getAnnualFeeLabel(annualFee: number) {
  return annualFee > 0 ? `-${formatMoney(annualFee)}` : formatMoney(0);
}
