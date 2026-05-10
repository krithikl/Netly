type PanelTitleProps = {
  subtitle: string;
  title: string;
};

export function PanelTitle({ subtitle, title }: PanelTitleProps) {
  return (
    <div className="title-block">
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  );
}
