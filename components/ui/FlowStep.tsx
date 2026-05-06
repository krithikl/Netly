import type { ReactNode } from "react";

type FlowStepProps = {
  children: ReactNode;
  number: string;
  title: string;
};

export function FlowStep({ children, number, title }: FlowStepProps) {
  return (
    <div className="flow-step">
      <span>{number}</span>
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
      </div>
    </div>
  );
}
