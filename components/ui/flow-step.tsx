import type { ReactNode } from "react";

type FlowStepProps = {
  children: ReactNode;
  number: string;
  title: string;
};

export function FlowStep({ children, number, title }: FlowStepProps) {
  return (
    <div className="grid grid-cols-1 gap-3 rounded-[20px] border border-[var(--outline-soft)] bg-[var(--surface-2)] p-4 min-[769px]:grid-cols-[38px_minmax(0,1fr)]">
      <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--primary)] font-black text-[var(--accent-cream)]">
        {number}
      </span>
      <div>
        <strong>{title}</strong>
        <p className="text-[var(--muted)]">{children}</p>
      </div>
    </div>
  );
}
