import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerHeaderClose,
  DrawerTitle,
  DrawerTrigger
} from "@/components/ui/drawer";
import { PanelTitle } from "@/components/ui/panel-title";
import { SelectField, type SelectOption } from "@/components/ui/select-field";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
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

export function CardFitView({ basis, cardFitSourceLabel, cardFitWindowLabel, cards, explanation, hasCardEligibleSpend }: CardFitViewProps) {
  const subtitle = getCardFitSubtitle(cardFitSourceLabel);
  const [issuerFilter, setIssuerFilter] = useState(allIssuersFilter);
  const [typeFilter, setTypeFilter] = useState<CardTypeFilter>(allTypesFilter);
  const isBottomNavigation = useIsBottomNavigation();
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
            <CardOption
              card={card}
              explanation={hasCardEligibleSpend && index === 0 ? explanation : null}
              index={index}
              isBottomNavigation={isBottomNavigation}
              key={card.name}
            />
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

function CardFitExplanationPanel({ explanation }: { explanation: CardFitExplanation }) {
  const deltaLabel = getDeltaLabel(explanation);
  const breakdown = getExplanationBreakdown(explanation);

  return (
    <div className="card-fit-explanation" aria-label="Why this card wins">
      <section className="card-fit-explanation-summary">
        <span>Best fit</span>
        <strong>{explanation.recommendedCardName}</strong>
        <p>{deltaLabel}</p>
      </section>
      <section className="card-fit-explanation-section">
        <h3>Annual value difference</h3>
        <div className="card-fit-explanation-rows">
          {breakdown.map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong className={getSignedAmountClassName(item.value)}>{formatSignedMoney(item.value)}</strong>
            </div>
          ))}
        </div>
      </section>
      {explanation.drivers.length > 0 && (
        <section className="card-fit-explanation-section">
          <h3>Top eligible spend drivers</h3>
          <div className="card-fit-driver-rows">
            {explanation.drivers.map((driver) => (
              <div key={driver.category}>
                <span>
                  <strong>{driver.category}</strong>
                  {formatPercent(driver.shareOfEligibleSpend)}
                </span>
                <strong>{formatMoney(driver.estimatedRewardValue)}</strong>
                <small>{formatMoney(driver.annualSpend)} eligible spend</small>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function CardOption({
  card,
  explanation,
  index,
  isBottomNavigation
}: {
  card: CardValue;
  explanation: CardFitExplanation | null;
  index: number;
  isBottomNavigation: boolean;
}) {
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
        {explanation && (
          <CardFitExplanationTrigger explanation={explanation} isBottomNavigation={isBottomNavigation} />
        )}
      </div>
    </article>
  );
}

function CardFitExplanationTrigger({
  explanation,
  isBottomNavigation
}: {
  explanation: CardFitExplanation;
  isBottomNavigation: boolean;
}) {
  const trigger = (
    <button className="card-fit-explanation-trigger" type="button">
      Why this wins
    </button>
  );

  if (isBottomNavigation) {
    return (
      <Drawer>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="card-fit-explanation-drawer">
          <DrawerHeader className="mobile-filter-header">
            <DrawerTitle>Why this wins</DrawerTitle>
            <DrawerDescription className="sr-only">Card fit recommendation explanation.</DrawerDescription>
            <DrawerHeaderClose className="mobile-filter-close" />
          </DrawerHeader>
          <div className="card-fit-explanation-drawer-body">
            <CardFitExplanationPanel explanation={explanation} />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="card-fit-explanation-sheet overflow-hidden p-0">
        <div className="card-fit-explanation-sheet-body flex h-full flex-col overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Why this wins</SheetTitle>
            <SheetDescription>How Netly estimated the top card from your eligible spend.</SheetDescription>
          </SheetHeader>
          <CardFitExplanationPanel explanation={explanation} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function getCardFitSubtitle(cardFitSourceLabel: string) {
  return `Cards are ranked from ${cardFitSourceLabel}: rewards earned + estimated perks - annual fee.`;
}

function getDeltaLabel(explanation: CardFitExplanation) {
  if (explanation.annualDelta > 0) {
    return `About ${formatMoney(explanation.annualDelta)} per year more than ${explanation.comparisonCardName}.`;
  }

  return `This card is closest on estimated annual value compared with ${explanation.comparisonCardName}.`;
}

function getExplanationBreakdown(explanation: CardFitExplanation) {
  return [
    { label: "Rewards", value: explanation.grossRewardsDelta },
    { label: "Perks", value: explanation.perksDelta },
    { label: "Fee impact", value: explanation.annualFeeDelta }
  ];
}

function formatSignedMoney(amount: number) {
  if (amount > 0) {
    return `+${formatMoney(amount)}`;
  }

  return formatMoney(amount);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("en-NZ", {
    maximumFractionDigits: 0,
    style: "percent"
  }).format(value);
}

function getSignedAmountClassName(amount: number) {
  return clsx(amount > 0 && "positive", amount < 0 && "negative");
}

function useIsBottomNavigation() {
  const [isBottomNavigation, setIsBottomNavigation] = useState(() => getIsBottomNavigation());

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1024px)");
    const handleChange = () => setIsBottomNavigation(mediaQuery.matches);

    handleChange();
    mediaQuery.addEventListener("change", handleChange);

    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return isBottomNavigation;
}

function getIsBottomNavigation() {
  return typeof window === "undefined" ? false : window.matchMedia("(max-width: 1024px)").matches;
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
