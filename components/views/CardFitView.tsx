import clsx from "clsx";
import { PanelTitle } from "@/components/ui/PanelTitle";
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

  return (
    <section className="view-stack">
      <section className="material-card">
        <PanelTitle title="Card fit comparison" subtitle={subtitle} />
        <CardFitBasisSummary basis={basis} cardFitWindowLabel={cardFitWindowLabel} />
        {!hasCardEligibleSpend && (
          <div className="status-banner neutral" role="status">
            <strong>No card-eligible spend yet.</strong>
            <span>MoneyFit excludes income, transfers, fees, housing, upcoming payments, and needs-review rows from card rewards calculations.</span>
          </div>
        )}
        <div className="card-list">
          {cards.map((card, index) => (
            <CardOption card={card} index={index} key={card.name} />
          ))}
        </div>
      </section>
    </section>
  );
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
        <span>Annual spend</span>
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
  return `Cards are ranked from ${cardFitSourceLabel}: card-eligible spend + estimated perks - annual fee.`;
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
    `Gross rewards ${formatMoney(card.grossRewards)}`,
    `Perks estimate ${formatMoney(card.perksValue)}`,
    `Annual fee -${formatMoney(card.annualFee)}`
  ];
}
