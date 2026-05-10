import clsx from "clsx";

type MetricProps = {
  label: string;
  note: string;
  tone: string;
  value: string;
};

export function Metric({ label, note, tone, value }: MetricProps) {
  return (
    <article className={clsx("metric", tone)}>
      <span className="metric-label">{label}</span>
      <strong>{value}</strong>
      <span className="metric-note">{note}</span>
    </article>
  );
}
