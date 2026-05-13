import { useRef, type CSSProperties, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  CircleDollarSign,
  CreditCard,
  ExternalLink,
  Gift,
  Info,
  Percent,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  WalletCards
} from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerHeaderClose,
  DrawerTitle
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { formatMoney } from "@/lib/insights";
import type { CardFitBasis, CardPerk, CardValue } from "@/lib/types";

export type CardFitDetailPanelMode = "why-this-wins" | "benefits";

type CardFitDetailPanelProps = {
  basis: CardFitBasis;
  card: CardValue;
  isBottomNavigation: boolean;
  mode: CardFitDetailPanelMode;
  onClose: () => void;
  open: boolean;
  rank: number;
};

type BenefitRow = {
  description: string;
  icon: LucideIcon;
  note?: string;
  title: string;
};

const categoryDotColors = ["#6D5EF5", "#3FA26A", "#2563EB", "#F59E0B", "#D84C4C", "#00A3AD"];

// Slide-up/detail panel that explains a selected Card Fit result.
export function CardFitDetailPanel({
  basis,
  card,
  isBottomNavigation,
  mode,
  onClose,
  open,
  rank
}: CardFitDetailPanelProps) {
  const panel = getPanelChrome(mode);

  if (isBottomNavigation) {
    return (
      <Drawer onOpenChange={(nextOpen) => !nextOpen && onClose()} open={open} scrollLockTimeout={0}>
        <DrawerContent className="transaction-details-mobile-drawer overflow-hidden after:hidden after:content-none">
          <DrawerHeader className="mobile-filter-header">
            <DrawerTitle className="flex min-w-0 items-center gap-3">
              <PanelIcon icon={panel.icon} />
              <span className="truncate">{panel.title}</span>
            </DrawerTitle>
            <DrawerDescription className="sr-only">{panel.description}</DrawerDescription>
            <DrawerHeaderClose className="mobile-filter-close" />
          </DrawerHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(20px+env(safe-area-inset-bottom))]">
            <CardFitDetailContent basis={basis} card={card} mode={mode} rank={rank} />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <CardFitDetailSheet
      basis={basis}
      card={card}
      mode={mode}
      onClose={onClose}
      open={open}
      panel={panel}
      rank={rank}
    />
  );
}

function CardFitDetailSheet({
  basis,
  card,
  mode,
  onClose,
  open,
  panel,
  rank
}: {
  basis: CardFitBasis;
  card: CardValue;
  mode: CardFitDetailPanelMode;
  onClose: () => void;
  open: boolean;
  panel: ReturnType<typeof getPanelChrome>;
  rank: number;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const focusTitleOnOpen = (event: Event) => {
    event.preventDefault();
    titleRef.current?.focus();
  };

  return (
    <Sheet onOpenChange={(nextOpen) => !nextOpen && onClose()} open={open}>
      <SheetContent
        className="w-[min(560px,calc(100vw-36px))] overflow-hidden p-0"
        overlayClassName="transaction-details-overlay"
        onOpenAutoFocus={focusTitleOnOpen}
      >
        <div className="flex h-full flex-col overflow-y-auto px-6 pb-6 pt-5">
          <SheetHeader className="mb-5 flex items-center gap-3 pr-10">
            <PanelIcon icon={panel.icon} />
            <div className="min-w-0">
              <SheetTitle className="truncate" ref={titleRef} tabIndex={-1}>
                {panel.title}
              </SheetTitle>
              <SheetDescription className="sr-only">{panel.description}</SheetDescription>
            </div>
          </SheetHeader>
          <CardFitDetailContent basis={basis} card={card} mode={mode} rank={rank} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CardFitDetailContent({
  basis,
  card,
  mode,
  rank
}: {
  basis: CardFitBasis;
  card: CardValue;
  mode: CardFitDetailPanelMode;
  rank: number;
}) {
  if (mode === "benefits") {
    return <CardFitBenefitsContent card={card} />;
  }

  return <CardFitWhyContent basis={basis} card={card} rank={rank} />;
}

function CardFitWhyContent({ basis, card, rank }: { basis: CardFitBasis; card: CardValue; rank: number }) {
  return (
    <div className="grid gap-5">
      <section className="grid gap-2 rounded-2xl border border-[var(--outline)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]">
        <span className="text-xs font-black uppercase text-[var(--muted)]">{card.issuer}</span>
        <h3 className="m-0 text-xl font-black leading-tight text-[var(--ink)]">{card.name}</h3>
        <p className="text-sm font-semibold leading-relaxed text-[var(--muted)]">
          We compared this card against your eligible spend and estimated the annual value after rewards, counted perks, and annual fees.
        </p>
      </section>

      <CardFitValueBreakdown card={card} />
      <CardFitEligibleCategories basis={basis} card={card} />
      <WhyRankedSection card={card} rank={rank} />
      <InfoCallout>
        Values are estimates based on your eligible annual spend. Actual rewards may vary by issuer rules, merchant acceptance, exclusions, and reward programme changes.
      </InfoCallout>
    </div>
  );
}

function CardFitValueBreakdown({ card }: { card: CardValue }) {
  const rows = [
    { label: "Rewards earned", value: formatPositiveMoney(card.grossRewards) },
    { label: "Counted perks", value: formatPositiveMoney(card.perksValue) },
    { label: "Annual fee", value: getAnnualFeeBreakdownValue(card.annualFee) }
  ];

  return (
    <section className="grid gap-3">
      <h3 className="m-0 text-sm font-black text-[var(--ink)]">Value breakdown</h3>
      <div className="grid overflow-hidden rounded-2xl border border-[var(--outline)] bg-[var(--surface)]">
        {rows.map((row) => (
          <div className="flex items-center justify-between gap-4 border-b border-[var(--outline)] px-4 py-3 text-sm" key={row.label}>
            <span className="font-bold text-[var(--muted)]">{row.label}</span>
            <strong className="font-black text-[var(--ink)] tabular-nums">{row.value}</strong>
          </div>
        ))}
        <div className="flex items-center justify-between gap-4 bg-[var(--primary-soft)] px-4 py-4">
          <span className="text-sm font-black text-[var(--secondary)]">Total annual net value</span>
          <strong className="text-2xl font-black text-[var(--secondary)] tabular-nums">{formatMoney(card.annualValue)}</strong>
        </div>
      </div>
    </section>
  );
}

function CardFitEligibleCategories({ basis, card }: { basis: CardFitBasis; card: CardValue }) {
  return (
    <section className="grid gap-3">
      <div className="grid gap-1">
        <h3 className="m-0 text-sm font-black text-[var(--ink)]">Eligible categories</h3>
        <p className="text-sm font-semibold leading-relaxed text-[var(--muted)]">
          These are the spend categories counted toward this card&apos;s estimated rewards value.
        </p>
      </div>
      {basis.categories.length > 0 ? (
        <div className="grid gap-2">
          {basis.categories.map((item, index) => (
            <CategoryContributionRow card={card} index={index} item={item} key={item.category} />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[var(--outline)] bg-[var(--surface-2)] p-4 text-sm font-bold text-[var(--muted)]">
          No eligible spend categories were found for this card in the selected period.
        </div>
      )}
    </section>
  );
}

function CategoryContributionRow({
  card,
  index,
  item
}: {
  card: CardValue;
  index: number;
  item: CardFitBasis["categories"][number];
}) {
  const rewardValue = item.amount * card.cashbackRate;
  const contribution = card.cashbackRate > 0 ? `${formatPositiveMoney(rewardValue)} estimated value` : "Included";
  const dotStyle = { "--category-dot": categoryDotColors[index % categoryDotColors.length] } as CSSProperties;

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-xl border border-[var(--outline)] bg-[var(--surface)] p-3 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
      <span
        aria-hidden="true"
        className="mt-1 h-2.5 w-2.5 rounded-full bg-[var(--category-dot)] sm:mt-0"
        style={dotStyle}
      />
      <div className="min-w-0">
        <strong className="block truncate text-sm text-[var(--ink)]">{item.category}</strong>
        <span className="mt-1 block text-xs font-bold text-[var(--muted)]">{formatMoney(item.amount, true)} eligible spend</span>
      </div>
      <strong className="col-start-2 text-sm font-black text-[var(--secondary)] tabular-nums sm:col-start-auto sm:text-right">
        {contribution}
      </strong>
    </div>
  );
}

function WhyRankedSection({ card, rank }: { card: CardValue; rank: number }) {
  const heading = rank === 0 ? "Why it ranked first" : "Why it ranked here";
  const statements = getWhyRankedStatements(card, rank);

  return (
    <section className="grid gap-3">
      <h3 className="m-0 text-sm font-black text-[var(--ink)]">{heading}</h3>
      <div className="grid gap-2">
        {statements.map((statement) => (
          <div className="grid grid-cols-[34px_minmax(0,1fr)] gap-3 rounded-xl border border-[var(--outline)] bg-[var(--surface)] p-3" key={statement}>
            <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--primary-soft)] text-[var(--secondary)]">
              <BadgeCheck aria-hidden="true" className="h-4 w-4" />
            </span>
            <p className="self-center text-sm font-semibold leading-relaxed text-[var(--muted)]">{statement}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function CardFitBenefitsContent({ card }: { card: CardValue }) {
  const rows = getBenefitRows(card);

  return (
    <div className="grid gap-5">
      <section className="grid gap-2 rounded-2xl border border-[var(--outline)] bg-[var(--surface)] p-4 shadow-[var(--shadow-soft)]">
        <span className="text-xs font-black uppercase text-[var(--muted)]">{card.issuer}</span>
        <h3 className="m-0 text-xl font-black leading-tight text-[var(--ink)]">{card.name}</h3>
        <p className="text-sm font-semibold leading-relaxed text-[var(--muted)]">Key benefits and features listed for this card.</p>
        {card.availabilityNote && (
          <p className="rounded-xl border border-[var(--outline)] bg-[var(--surface-2)] px-3 py-2 text-xs font-bold leading-relaxed text-[var(--muted)]">
            {card.availabilityNote}
          </p>
        )}
      </section>

      <section className="grid gap-3">
        <h3 className="m-0 text-sm font-black text-[var(--ink)]">Benefits</h3>
        <div className="grid gap-2">
          {rows.map((row) => (
            <BenefitListRow row={row} key={`${row.title}:${row.description}`} />
          ))}
        </div>
      </section>

      <InfoCallout>
        <span>
          Benefit availability may vary. Check the issuer website for full terms, conditions, exclusions, and eligibility requirements.
        </span>
        <a
          className="inline-flex w-fit items-center gap-1.5 font-black text-[var(--secondary)] no-underline hover:text-[var(--primary-hover)]"
          href={card.sourceUrl}
          rel="noreferrer"
          target="_blank"
        >
          <span>Issuer page</span>
          <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
        </a>
      </InfoCallout>
    </div>
  );
}

function BenefitListRow({ row }: { row: BenefitRow }) {
  const Icon = row.icon;

  return (
    <article className="grid grid-cols-[42px_minmax(0,1fr)] gap-3 rounded-xl border border-[var(--outline)] bg-[var(--surface)] p-3">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-[var(--primary-soft)] text-[var(--secondary)]">
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <h4 className="m-0 text-sm font-black leading-snug text-[var(--ink)]">{row.title}</h4>
        <p className="mt-1 text-sm font-semibold leading-relaxed text-[var(--muted)]">{row.description}</p>
        {row.note && <p className="mt-2 text-xs font-bold leading-relaxed text-[var(--muted)]">{row.note}</p>}
      </div>
    </article>
  );
}

function InfoCallout({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-[32px_minmax(0,1fr)] gap-3 rounded-xl border border-[var(--primary-border)] bg-[var(--primary-soft)]/70 p-3 text-sm font-semibold leading-relaxed text-[var(--muted)]">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--surface)] text-[var(--secondary)]">
        <Info aria-hidden="true" className="h-4 w-4" />
      </span>
      <div className="grid gap-2">{children}</div>
    </div>
  );
}

function PanelIcon({ icon }: { icon: LucideIcon }) {
  const Icon = icon;

  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[var(--primary-soft)] text-[var(--secondary)]">
      <Icon aria-hidden="true" className="h-5 w-5" />
    </span>
  );
}

function getPanelChrome(mode: CardFitDetailPanelMode) {
  if (mode === "benefits") {
    return {
      description: "Card benefits and feature details.",
      icon: Gift,
      title: "Benefits"
    };
  }

  return {
    description: "How Netly estimated this card from eligible spend.",
    icon: TrendingUp,
    title: "Why this wins"
  };
}

function getWhyRankedStatements(card: CardValue, rank: number) {
  const statements = [
    card.cashbackRate > 0
      ? `Your eligible annual spend estimates ${formatMoney(card.grossRewards)} in ${card.rewardProgram}.`
      : "This card does not add a modelled rewards value from eligible spend.",
    card.annualFee > 0
      ? `The ${formatMoney(card.annualFee)} annual fee is deducted from the annual value estimate.`
      : "This card has no annual fee, so rewards are not reduced by a yearly card fee.",
    card.perksValue > 0
      ? `${formatMoney(card.perksValue)} of recurring perks are counted because their value is clear from card data.`
      : "No perks are added to the annual value unless their cash value is clear from card data."
  ];

  if (rank === 0) {
    return [
      ...statements,
      `It ranked first because its estimated annual net value is ${formatMoney(card.annualValue)} after rewards, counted perks, and fees.`
    ];
  }

  return [
    ...statements,
    `It ranked #${rank + 1} in the current results after rewards, counted perks, and fees are combined.`
  ];
}

function getBenefitRows(card: CardValue): BenefitRow[] {
  return [
    getRewardBenefit(card),
    getAnnualFeeBenefit(card),
    {
      description: getNetworkDescription(card),
      icon: CreditCard,
      title: `${card.network} card`
    },
    ...card.perks.map(getPerkBenefit)
  ];
}

function getRewardBenefit(card: CardValue): BenefitRow {
  if (card.cashbackRate <= 0) {
    return {
      description: card.earnDescription,
      icon: Percent,
      title: "No modelled rewards"
    };
  }

  return {
    description: card.earnDescription,
    icon: CircleDollarSign,
    title: `Earn ${card.rewardProgram}`
  };
}

function getAnnualFeeBenefit(card: CardValue): BenefitRow {
  if (card.annualFee <= 0) {
    return {
      description: "This card has no annual fee.",
      icon: WalletCards,
      title: "No annual fee"
    };
  }

  return {
    description: `${formatMoney(card.annualFee)} is deducted from Netly's estimated annual value.`,
    icon: WalletCards,
    title: "Annual fee"
  };
}

function getPerkBenefit(perk: CardPerk): BenefitRow {
  return {
    description: perk.description,
    icon: getPerkIcon(perk.name),
    note: [perk.valueLabel, perk.valuationNote].filter(Boolean).join(" "),
    title: perk.name
  };
}

function getPerkIcon(name: string): LucideIcon {
  const normalizedName = name.toLowerCase();

  if (normalizedName.includes("insurance") || normalizedName.includes("protection") || normalizedName.includes("cover")) {
    return ShieldCheck;
  }

  if (normalizedName.includes("travel") || normalizedName.includes("lounge") || normalizedName.includes("koru") || normalizedName.includes("airpoints")) {
    return Sparkles;
  }

  return Gift;
}

function getNetworkDescription(card: CardValue) {
  if (card.network === "American Express") {
    return "American Express acceptance can vary by merchant in New Zealand and overseas.";
  }

  return `Payment network for this card is ${card.network}. Merchant acceptance and issuer rules may vary.`;
}

function formatPositiveMoney(amount: number) {
  return amount > 0 ? `+${formatMoney(amount)}` : formatMoney(0);
}

function getAnnualFeeBreakdownValue(annualFee: number) {
  return annualFee > 0 ? `-${formatMoney(annualFee)}` : formatMoney(0);
}
