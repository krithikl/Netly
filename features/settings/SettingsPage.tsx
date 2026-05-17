import { useState } from "react";
import { toast } from "sonner";
import { MobilePageHeader } from "@/components/layout/MobilePageHeader";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { netlyPalette } from "@/lib/categories";
import { periods } from "@/lib/app/constants";
import { cn } from "@/lib/utils";
import type { DriveBackupState } from "@/hooks/useDriveBackup";
import type { AkahuDataFreshness, DataMode } from "@/lib/app/types";
import type { PeriodOption } from "@/lib/types";

type SettingsPageProps = {
  akahuDataFreshness: AkahuDataFreshness;
  cardFitAvailableCategories: string[];
  cardFitIncludedCategories: string[];
  categoryColors: Record<string, string>;
  dataMode: DataMode;
  dashboardPeriod: PeriodOption;
  defaultCategories: string[];
  deleteCategory: (category: string) => void;
  driveBackup: DriveBackupState;
  onConnectDriveBackup: () => Promise<void>;
  onDisconnectDriveBackup: () => void;
  onRestoreDriveBackup: () => Promise<void>;
  showDashboardPeriodSetting: boolean;
  setDashboardPeriod: (period: PeriodOption) => void;
  updateCardFitIncludedCategories: (categories: string[]) => void;
  updateCategoryColor: (category: string, color: string) => void;
};

// Settings screen for managing category colours and hiding unused categories.
export function SettingsPage({
  akahuDataFreshness,
  cardFitAvailableCategories,
  cardFitIncludedCategories,
  categoryColors,
  dataMode,
  dashboardPeriod,
  defaultCategories,
  deleteCategory,
  driveBackup,
  onConnectDriveBackup,
  onDisconnectDriveBackup,
  onRestoreDriveBackup,
  showDashboardPeriodSetting,
  setDashboardPeriod,
  updateCardFitIncludedCategories,
  updateCategoryColor
}: SettingsPageProps) {
  const allCategories = defaultCategories.filter((cat) => cat !== "All categories");
  const [activeColorPicker, setActiveColorPicker] = useState<string | null>(null);

  const setColorPickerOpen = (category: string, isOpen: boolean) => {
    setActiveColorPicker(isOpen ? category : null);
  };

  return (
    <section className="view-stack" data-testid="settings-page">
      <MobilePageHeader title="Settings" />
      {showDashboardPeriodSetting && (
        <section className="material-card">
          <div className="settings-period-control">
            <div>
              <h3>Default dashboard period</h3>
              <p>Used by Home and Budgets on mobile.</p>
            </div>
            <div className="settings-period-options" role="group" aria-label="Default dashboard period">
              {periods.map((period) => (
                <button
                  aria-pressed={period === dashboardPeriod}
                  className={period === dashboardPeriod ? "active" : undefined}
                  key={period}
                  onClick={() => setDashboardPeriod(period)}
                  type="button"
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="material-card">
        <AkahuFreshnessCard dataMode={dataMode} freshness={akahuDataFreshness} />
      </section>

      <section className="material-card">
        <CardFitCategorySettings
          availableCategories={cardFitAvailableCategories}
          includedCategories={cardFitIncludedCategories}
          onChange={updateCardFitIncludedCategories}
        />
      </section>

      <section className="material-card">
        <div className="settings-drive-card">
          <div>
            <h3>Google Drive backup</h3>
            <p>Archive every Akahu transaction when first seen, then back it up to Google Drive app data.</p>
          </div>
          <span className={`settings-drive-status ${driveBackup.status}`}>
            {getDriveBackupStatusLabel(driveBackup.status)}
          </span>
          {!driveBackup.clientConfigured && (
            <p className="settings-drive-warning">
              Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID. Add a Google OAuth client ID before connecting Drive backup.
            </p>
          )}
          <p className="settings-drive-message">
            Backups use Google's hidden app data folder. Netly does not request access to your other Drive files.
          </p>
          <p aria-live="polite" className="settings-drive-message">
            {driveBackup.message}
          </p>
          {driveBackup.lastSyncedAt && (
            <p className="settings-drive-meta">Last synced {formatDriveSyncTime(driveBackup.lastSyncedAt)}</p>
          )}
          <div className="settings-drive-actions">
            <Button disabled={driveBackup.status === "syncing"} onClick={() => void onConnectDriveBackup()} type="button">
              {driveBackup.status === "syncing" ? "Syncing..." : "Connect and back up"}
            </Button>
            <Button disabled={driveBackup.status === "syncing"} onClick={() => void onRestoreDriveBackup()} type="button" variant="outline">
              Restore from Drive
            </Button>
            <Button disabled={driveBackup.status === "syncing"} onClick={onDisconnectDriveBackup} type="button" variant="secondary">
              Disconnect
            </Button>
          </div>
        </div>
      </section>

      <section className="material-card">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="m-0 text-base font-semibold text-[var(--ink)]">Categories</h3>
            <p className="mt-1 text-[13px] text-[var(--muted)]">Customize colors or remove unused categories.</p>
          </div>
        </div>
        
        <div className="stack-list">
          {allCategories.map((category) => (
            <CategoryColorRow
              key={category}
              category={category}
              currentColor={categoryColors[category] || "#607d8b"}
              isActive={activeColorPicker === category}
              onColorPickerOpenChange={(isOpen) => setColorPickerOpen(category, isOpen)}
              onDelete={() => deleteCategory(category)}
              usedColors={getUsedCategoryColors(allCategories, category, categoryColors)}
              updateCategoryColor={(cat, color) => {
                updateCategoryColor(cat, color);
                setActiveColorPicker(null);
              }}
            />
          ))}
        </div>
      </section>
    </section>
  );
}

type CardFitCategorySettingsProps = {
  availableCategories: string[];
  includedCategories: string[];
  onChange: (categories: string[]) => void;
};

// Lets users decide which spending categories count toward Card Fit rewards.
function CardFitCategorySettings({ availableCategories, includedCategories, onChange }: CardFitCategorySettingsProps) {
  const includedSet = new Set(includedCategories);
  const toggleCategory = (category: string) => {
    const nextCategories = includedSet.has(category)
      ? includedCategories.filter((item) => item !== category)
      : [...includedCategories, category];

    onChange(nextCategories);
  };
  const selectAll = () => onChange(availableCategories);
  const clearAll = () => onChange([]);

  return (
    <div className="settings-card-fit">
      <div className="settings-section-heading">
        <div>
          <h3>Card Fit categories</h3>
          <p>Choose which categories count toward rewards estimates.</p>
        </div>
        <div className="settings-inline-actions">
          <Button onClick={selectAll} type="button" variant="outline" size="sm">
            Select all
          </Button>
          <Button onClick={clearAll} type="button" variant="outline" size="sm">
            Clear
          </Button>
        </div>
      </div>
      <div className="settings-category-toggle-grid">
        {availableCategories.map((category) => (
          <button
            aria-pressed={includedSet.has(category)}
            className={includedSet.has(category) ? "active" : undefined}
            key={category}
            onClick={() => toggleCategory(category)}
            type="button"
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
}

type AkahuFreshnessCardProps = {
  dataMode: DataMode;
  freshness: AkahuDataFreshness;
};

// Shows when Netly last retrieved data from Akahu and when Akahu refreshed it.
function AkahuFreshnessCard({ dataMode, freshness }: AkahuFreshnessCardProps) {
  const isDemoMode = dataMode === "demo";
  const statusLabel = isDemoMode ? "Demo" : getAkahuFreshnessStatusLabel(freshness);
  const statusClassName = isDemoMode ? "ready" : getAkahuFreshnessStatusClassName(freshness);

  return (
    <div className="settings-drive-card">
      <div>
        <h3>Akahu data freshness</h3>
        <p>{isDemoMode ? "Demo mode uses local sample data." : "Latest endpoint retrieval and Akahu account refresh timestamps."}</p>
      </div>
      <span className={`settings-drive-status ${statusClassName}`}>
        {statusLabel}
      </span>
      {!isDemoMode && (
        <>
          <div className="settings-freshness-grid" aria-live="polite">
            <FreshnessMetric label="Retrieved from Akahu" value={formatAkahuFreshnessTime(freshness.retrievedAt)} />
            <FreshnessMetric label="Balance data" value={formatAkahuFreshnessTime(freshness.balanceRefreshedAt)} />
            <FreshnessMetric label="Transactions checked" value={formatAkahuFreshnessTime(freshness.transactionsRefreshedAt)} />
          </div>
          {freshness.status === "failed" && freshness.error && (
            <p className="settings-drive-warning">{freshness.error}</p>
          )}
          {freshness.accounts.length > 1 && (
            <details className="settings-freshness-details">
              <summary>Account timestamps</summary>
              <div className="settings-freshness-account-list">
                {freshness.accounts.map((account) => (
                  <div key={account.accountId}>
                    <strong>{account.displayName}</strong>
                    <span>{account.status}</span>
                    <span>Balance {formatAkahuFreshnessTime(account.balanceRefreshedAt)}</span>
                    <span>Transactions {formatAkahuFreshnessTime(account.transactionsRefreshedAt)}</span>
                  </div>
                ))}
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}

type FreshnessMetricProps = {
  label: string;
  value: string;
};

// Renders one compact timestamp field in the Akahu freshness card.
function FreshnessMetric({ label, value }: FreshnessMetricProps) {
  return (
    <div className="settings-freshness-metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

// Converts freshness state into a short status chip label.
function getAkahuFreshnessStatusLabel(freshness: AkahuDataFreshness) {
  switch (freshness.status) {
    case "loading":
      return "Loading";
    case "refreshing":
      return "Refreshing";
    case "failed":
      return "Failed";
    case "refreshed":
      return freshness.isStale ? "Stale" : "Current";
    default:
      return "Not loaded";
  }
}

// Maps Akahu freshness state onto the existing Settings status chip tones.
function getAkahuFreshnessStatusClassName(freshness: AkahuDataFreshness) {
  if (freshness.status === "failed") {
    return "failed";
  }

  if (freshness.status === "loading" || freshness.status === "refreshing") {
    return "syncing";
  }

  return freshness.isStale ? "syncing" : "synced";
}

// Formats Akahu ISO timestamps for Settings without adding another date library.
function formatAkahuFreshnessTime(value: string | null) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-NZ", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

// Formats Drive status into short UI labels.
function getDriveBackupStatusLabel(status: DriveBackupState["status"]) {
  switch (status) {
    case "ready":
      return "Ready";
    case "syncing":
      return "Syncing";
    case "synced":
      return "Synced";
    case "failed":
      return "Failed";
    default:
      return "Disconnected";
  }
}

// Presents archive sync timestamps without adding another date library.
function formatDriveSyncTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-NZ", {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

type CategoryColorRowProps = {
  category: string;
  currentColor: string;
  isActive: boolean;
  onColorPickerOpenChange: (isOpen: boolean) => void;
  onDelete: () => void;
  usedColors: Set<string>;
  updateCategoryColor: (category: string, color: string) => void;
};

// One editable category row used by SettingsPage.
function CategoryColorRow({
  category,
  currentColor,
  isActive,
  onColorPickerOpenChange,
  onDelete,
  usedColors,
  updateCategoryColor
}: CategoryColorRowProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const colorToggleClassName = cn(
    "h-7 w-7 rounded-full border-2 border-transparent p-0 shadow-sm transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
    isActive && "border-[var(--ink)]"
  );
  const handleDelete = () => {
    onDelete();
    toast.success("Category removed");
    setDeleteDialogOpen(false);
  };

  return (
    <div className="info-row info-row-block relative">
      <div className="flex items-center justify-between border-b-0 p-0">
        <div className="flex items-center gap-4">
          <span className="legend-dot" style={{ background: currentColor }} />
          <strong>{category}</strong>
        </div>
        
        <div className="flex items-center gap-3">
          <Popover onOpenChange={onColorPickerOpenChange} open={isActive}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={colorToggleClassName}
                style={{ background: currentColor }}
                aria-label={`Choose color for ${category}`}
              />
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto p-4">
              <p className="mb-3 text-sm font-bold text-[var(--muted)]">Select a color</p>
              <div className="grid grid-cols-5 gap-2">
                {netlyPalette.map((color) => (
                  <ColorOptionButton
                    key={color}
                    category={category}
                    color={color}
                    currentColor={currentColor}
                    disabled={usedColors.has(color)}
                    updateCategoryColor={updateCategoryColor}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Dialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
            <DialogTrigger asChild>
              <button
                type="button"
                className="rounded-lg border-0 bg-transparent px-2 py-1 text-[13px] font-semibold text-[var(--danger)]"
              >
                Remove
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Remove {category}?</DialogTitle>
                <DialogDescription>
                  This hides the category from filters and settings on this device. Existing matching transactions will fall back to their source category.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <Button className="bg-[var(--danger)] hover:bg-[var(--danger)]" onClick={handleDelete} type="button" variant="default">
                  Remove category
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}

type ColorOptionButtonProps = {
  category: string;
  color: string;
  currentColor: string;
  disabled: boolean;
  updateCategoryColor: (category: string, color: string) => void;
};

function ColorOptionButton({ category, color, currentColor, disabled, updateCategoryColor }: ColorOptionButtonProps) {
  const isSelected = currentColor === color;
  const buttonClassName = cn(
    "h-8 w-8 rounded-full border-2 border-transparent p-0 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:scale-100",
    isSelected && "border-[var(--ink)]"
  );
  
  return (
    <button
      type="button"
      className={buttonClassName}
      disabled={disabled}
      onClick={() => updateCategoryColor(category, color)}
      style={{ background: color }}
      aria-label={`Set color to ${color}`}
    />
  );
}

function getUsedCategoryColors(categories: string[], currentCategory: string, categoryColors: Record<string, string>) {
  return new Set(
    categories
      .filter((category) => category !== currentCategory)
      .map((category) => categoryColors[category])
      .filter(Boolean)
  );
}
