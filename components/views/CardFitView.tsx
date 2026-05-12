import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { ExternalLink, Gift, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import type { CardFitBasis, CardFitExplanation, CardPerk, CardValue } from "@/lib/types";

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

function CardFitExplanationPanel({ card, explanation }: { card: CardValue; explanation: CardFitExplanation }) {
  const deltaLabel = getDeltaLabel(explanation);
  const breakdown = getExplanationBreakdown(explanation);
  const listedPerks = card.perks.filter((perk) => !perk.counted);

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
      {listedPerks.length > 0 && (
        <section className="card-fit-explanation-section">
          <h3>Listed perks not dollar-valued</h3>
          <PerkPreviewList perks={listedPerks} />
        </section>
      )}
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
                <span className="rounded-full border border-[var(--outline)] bg-white/70 px-2.5 py-1 text-[11px] font-black uppercase text-[var(--muted)]">
                  Legacy
                </span>
              )}
            </div>
            <p className="card-brand">{cardBrandLabel}</p>
          </div>
        </div>
        <p>{card.note}</p>
        {card.availabilityNote && (
          <p className="mt-2 rounded-2xl border border-[var(--outline)] bg-white/70 px-3 py-2 text-xs font-bold text-[var(--muted)]">
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
          {explanation && (
            <CardFitExplanationTrigger card={card} explanation={explanation} isBottomNavigation={isBottomNavigation} />
          )}
          <CardBenefitsTrigger card={card} isBottomNavigation={isBottomNavigation} />
        </div>
      </div>
    </article>
  );
}

function CardFitExplanationTrigger({
  card,
  explanation,
  isBottomNavigation
}: {
  card: CardValue;
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
            <CardFitExplanationPanel card={card} explanation={explanation} />
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
          <CardFitExplanationPanel card={card} explanation={explanation} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CardBenefitsTrigger({ card, isBottomNavigation }: { card: CardValue; isBottomNavigation: boolean }) {
  const trigger = (
    <Button className="rounded-full px-3 text-xs font-black" size="sm" type="button" variant="outline">
      <Gift aria-hidden="true" className="h-3.5 w-3.5" />
      Benefits
    </Button>
  );

  if (isBottomNavigation) {
    return (
      <Drawer>
        <DrawerTrigger asChild>{trigger}</DrawerTrigger>
        <DrawerContent className="card-fit-explanation-drawer">
          <DrawerHeader className="mobile-filter-header">
            <DrawerTitle>Benefits</DrawerTitle>
            <DrawerDescription className="sr-only">Card benefits and perk valuation details.</DrawerDescription>
            <DrawerHeaderClose className="mobile-filter-close" />
          </DrawerHeader>
          <div className="card-fit-explanation-drawer-body">
            <CardBenefitsPanel card={card} />
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
            <SheetTitle>Benefits</SheetTitle>
            <SheetDescription>What Netly counts, and what is listed without a dollar estimate.</SheetDescription>
          </SheetHeader>
          <CardBenefitsPanel card={card} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CardBenefitsPanel({ card }: { card: CardValue }) {
  const countedPerks = card.perks.filter((perk) => perk.counted);
  const listedPerks = card.perks.filter((perk) => !perk.counted);
  const sourceLinks = getCardSourceLinks(card);

  return (
    <div className="grid gap-5" aria-label={`${card.name} benefits`}>
      <section className="grid gap-3 rounded-[18px] border border-[var(--outline)] bg-white/80 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="m-0 text-xs font-black uppercase text-[var(--muted)]">Perk value policy</p>
            <h3 className="m-0 mt-1 [overflow-wrap:anywhere] text-xl font-black leading-tight text-[var(--ink)]">{card.name}</h3>
          </div>
          <span className="shrink-0 rounded-full bg-[var(--primary-soft)] px-3 py-1 text-xs font-black text-[var(--primary)]">
            {formatMoney(card.perksValue)}
          </span>
        </div>
        <p className="m-0 text-sm font-bold leading-relaxed text-[var(--muted)]">
          Netly only counts a perk when the cash value is clear from issuer information. Other visible benefits are listed without being added to the estimate.
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <BenefitMetric label="Rewards" value={formatMoney(card.grossRewards)} />
          <BenefitMetric label="Counted perks" value={formatMoney(card.perksValue)} />
          <BenefitMetric label="Annual fee" value={getAnnualFeeLabel(card.annualFee)} />
        </div>
      </section>

      {card.availabilityNote && (
        <div className="flex gap-3 rounded-[18px] border border-[var(--outline)] bg-white/70 p-3 text-sm font-bold text-[var(--muted)]">
          <Info aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" />
          <p className="m-0">{card.availabilityNote}</p>
        </div>
      )}

      <section className="grid gap-3">
        <h3 className="m-0 text-sm font-black text-[var(--ink)]">Counted annual perks</h3>
        {countedPerks.length > 0 ? (
          <PerkList perks={countedPerks} />
        ) : (
          <div className="rounded-[18px] border border-dashed border-[var(--outline)] bg-white/60 p-4 text-sm font-bold text-[var(--muted)]">
            No perks are counted in annual value for this card.
          </div>
        )}
      </section>

      {listedPerks.length > 0 && (
        <section className="grid gap-3">
          <h3 className="m-0 text-sm font-black text-[var(--ink)]">Listed benefits, not estimated</h3>
          <PerkList perks={listedPerks} />
        </section>
      )}

      <section className="grid gap-2">
        <h3 className="m-0 text-sm font-black text-[var(--ink)]">Sources</h3>
        <div className="grid gap-2">
          {sourceLinks.map((source) => (
            <a
              className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--outline)] bg-white/70 px-3 py-2 text-sm font-extrabold text-[var(--primary)] no-underline hover:bg-white"
              href={source.url}
              key={source.url}
              rel="noreferrer"
              target="_blank"
            >
              <span>{source.label}</span>
              <ExternalLink aria-hidden="true" className="h-4 w-4 shrink-0" />
            </a>
          ))}
        </div>
        <p className="m-0 text-xs font-bold text-[var(--muted)]">Last checked {card.lastVerified}.</p>
      </section>
    </div>
  );
}

function BenefitMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 rounded-2xl border border-[var(--outline)] bg-[var(--surface-2)] p-3">
      <span className="text-[11px] font-black uppercase text-[var(--muted)]">{label}</span>
      <strong className="text-sm font-black text-[var(--ink)]">{value}</strong>
    </div>
  );
}

function PerkList({ perks }: { perks: CardPerk[] }) {
  return (
    <div className="grid gap-2">
      {perks.map((perk) => (
        <article className="grid gap-2 rounded-[18px] border border-[var(--outline)] bg-white/80 p-4" key={perk.name}>
          <div className="flex items-start justify-between gap-3">
            <h4 className="m-0 min-w-0 text-sm font-black leading-snug text-[var(--ink)]">{perk.name}</h4>
            <span className={getPerkValueClassName(perk)}>
              {getPerkValueLabel(perk)}
            </span>
          </div>
          <p className="m-0 text-sm font-bold leading-relaxed text-[var(--muted)]">{perk.description}</p>
          <p className="m-0 text-xs font-bold leading-relaxed text-[var(--muted)]">{perk.valuationNote}</p>
        </article>
      ))}
    </div>
  );
}

function PerkPreviewList({ perks }: { perks: CardPerk[] }) {
  return (
    <div className="grid gap-2">
      {perks.slice(0, 3).map((perk) => (
        <div className="rounded-2xl border border-[var(--outline)] bg-white/80 px-3 py-2" key={perk.name}>
          <strong className="block text-sm text-[var(--ink)]">{perk.name}</strong>
          <span className="block text-xs font-bold text-[var(--muted)]">{getPerkValueLabel(perk)}</span>
        </div>
      ))}
      {perks.length > 3 && (
        <span className="text-xs font-bold text-[var(--muted)]">{perks.length - 3} more listed benefits.</span>
      )}
    </div>
  );
}

function getPerkValueLabel(perk: CardPerk) {
  if (perk.counted && typeof perk.estimatedAnnualValue === "number") {
    return `+${formatMoney(perk.estimatedAnnualValue)}`;
  }

  return perk.valueLabel ?? "Not counted";
}

function getPerkValueClassName(perk: CardPerk) {
  return clsx(
    "shrink-0 rounded-full px-2.5 py-1 text-right text-[11px] font-black",
    perk.counted
      ? "bg-[var(--primary-soft)] text-[var(--secondary)]"
      : "border border-[var(--outline)] bg-white/80 text-[var(--muted)]"
  );
}

function getCardSourceLinks(card: CardValue) {
  const links = [
    { label: "Issuer page", url: card.sourceUrl },
    ...(card.sourceLinks ?? [])
  ];
  const seen = new Set<string>();

  return links.filter((link) => {
    if (seen.has(link.url)) {
      return false;
    }

    seen.add(link.url);
    return true;
  });
}

function getCardFitSubtitle(cardFitSourceLabel: string) {
  return `Cards are ranked from ${cardFitSourceLabel}: rewards earned + counted perks - annual fee.`;
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
    { label: "Counted perks", value: explanation.perksDelta },
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
    `Counted perks ${formatMoney(card.perksValue)}`,
    `Annual fee ${getAnnualFeeLabel(card.annualFee)}`
  ];
}

function getAnnualFeeLabel(annualFee: number) {
  return annualFee > 0 ? `-${formatMoney(annualFee)}` : formatMoney(0);
}
