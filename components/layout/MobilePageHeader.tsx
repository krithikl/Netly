type MobilePageHeaderProps = {
  title: string;
};

// Mobile-only page title used when the bottom navigation replaces the desktop topbar.
export function MobilePageHeader({ title }: MobilePageHeaderProps) {
  return (
    <header className="mobile-page-header" aria-label={`${title} page header`}>
      <h2>{title}</h2>
    </header>
  );
}
