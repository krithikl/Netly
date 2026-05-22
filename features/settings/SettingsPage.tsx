import { useState, type ReactNode } from "react";
import { Check, ChevronDown, ChevronRight, CloudDownload, CloudUpload, FolderClock, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { MobilePageHeader } from "@/components/layout/MobilePageHeader";
import { DisconnectButton } from "@/components/ui/disconnect-button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
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
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerHeaderClose,
  DrawerTitle
} from "@/components/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle
} from "@/components/ui/sheet";
import { SelectField, type SelectOption } from "@/components/ui/select-field";
import { useIsBottomNavigation } from "@/hooks/useIsBottomNavigation";
import { useCloseOnPageScroll } from "@/hooks/useCloseOnPageScroll";
import { netlyPalette } from "@/lib/categories";
import { categoriesMatch } from "@/lib/category-rules";
import { periods } from "@/lib/app/constants";
import { cn } from "@/lib/utils";
import type { DriveBackupState } from "@/hooks/useDriveBackup";
import type { DriveBackupEntry } from "@/lib/app/drive-backup";
import type { AkahuDataFreshness, DataMode, TransactionAccountOption } from "@/lib/app/types";
import type { PeriodOption } from "@/lib/types";

type SettingsPageProps = {
  accountOptions: TransactionAccountOption[];
  akahuDataFreshness: AkahuDataFreshness;
  cardFitAvailableCategories: string[];
  cardFitIncludedCategories: string[];
  categoryColors: Record<string, string>;
  dataMode: DataMode;
  dashboardPeriod: PeriodOption;
  defaultAccountId: string;
  defaultCategories: string[];
  deleteCategory: (category: string) => void;
  driveBackup: DriveBackupState;
  incomeIncludedCategories: string[];
  onConnectDriveBackup: () => Promise<void>;
  onCreateCategory: (category: string) => void;
  onDeleteDriveBackup: (fileId: string) => Promise<DriveBackupEntry[]>;
  onDisconnectDriveBackup: () => void;
  onRefreshDriveBackups: () => Promise<DriveBackupEntry[]>;
  onRestoreDriveBackup: (fileId: string) => Promise<void>;
  setDefaultAccountId: (accountId: string) => void;
  showDashboardPeriodSetting: boolean;
  setDashboardPeriod: (period: PeriodOption) => void;
  updateCardFitIncludedCategories: (categories: string[]) => void;
  updateCategoryColor: (category: string, color: string) => void;
  updateIncomeIncludedCategories: (categories: string[]) => void;
};

// Settings screen for managing category colours and hiding unused categories.
export function SettingsPage({
  accountOptions,
  akahuDataFreshness,
  cardFitAvailableCategories,
  cardFitIncludedCategories,
  categoryColors,
  dataMode,
  dashboardPeriod,
  defaultAccountId,
  defaultCategories,
  deleteCategory,
  driveBackup,
  incomeIncludedCategories,
  onConnectDriveBackup,
  onCreateCategory,
  onDeleteDriveBackup,
  onDisconnectDriveBackup,
  onRefreshDriveBackups,
  onRestoreDriveBackup,
  setDefaultAccountId,
  showDashboardPeriodSetting,
  setDashboardPeriod,
  updateCardFitIncludedCategories,
  updateCategoryColor,
  updateIncomeIncludedCategories
}: SettingsPageProps) {
  const allCategories = defaultCategories.filter((cat) => cat !== "All categories");
  const isBottomNavigation = useIsBottomNavigation();
  const [activeColorPicker, setActiveColorPicker] = useState<string | null>(null);
  const [categoriesPanelOpen, setCategoriesPanelOpen] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const normalizedNewCategory = normalizeCategoryName(newCategory);
  const duplicateCategory = getMatchingCategory(allCategories, normalizedNewCategory);
  const categoryErrorMessage = duplicateCategory ? `${duplicateCategory} already exists` : "";
  const canCreateCategory = normalizedNewCategory.length > 0 && !duplicateCategory;

  const setColorPickerOpen = (category: string, isOpen: boolean) => {
    setActiveColorPicker(isOpen ? category : null);
  };
  const handleCreateCategory = () => {
    if (!canCreateCategory) {
      return;
    }

    onCreateCategory(normalizedNewCategory);
    toast.success("Category added");
    setNewCategory("");
  };

  return (
    <section className="view-stack" data-testid="settings-page" suppressHydrationWarning>
      <MobilePageHeader title="Settings" />

      <SettingsSection title="Data backup" description="Create and restore encrypted Netly backups from Google Drive app data.">
        <DataBackupSettings
          driveBackup={driveBackup}
          onBackup={onConnectDriveBackup}
          onDeleteBackup={onDeleteDriveBackup}
          onDisconnect={onDisconnectDriveBackup}
          onRefreshBackups={onRefreshDriveBackups}
          onRestore={onRestoreDriveBackup}
        />
      </SettingsSection>

      <SettingsSection title="General settings" description="Defaults used when Netly opens.">
        {showDashboardPeriodSetting && (
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
        )}
        <AkahuFreshnessCard dataMode={dataMode} freshness={akahuDataFreshness} />
      </SettingsSection>

      <SettingsSection title="Transaction reporting" description="Choose what Netly includes in dashboard and summary totals.">
        <ReportingSettings
          accountOptions={accountOptions}
          defaultAccountId={defaultAccountId}
          onDefaultAccountChange={setDefaultAccountId}
        />
      </SettingsSection>

      <SettingsSection title="Categories" description="Add categories, customize colors, or remove unused categories.">
        {isBottomNavigation ? (
          <>
            <SettingsNavigationButton
              description={`${allCategories.length} categories`}
              onClick={() => setCategoriesPanelOpen(true)}
              title="Manage categories"
            />
            <Drawer onOpenChange={setCategoriesPanelOpen} open={categoriesPanelOpen}>
              <DrawerContent className="mobile-filter-drawer settings-categories-drawer">
                <DrawerHeader className="mobile-filter-header">
                  <DrawerTitle>Categories</DrawerTitle>
                  <DrawerDescription className="sr-only">Add categories, customize colors, or remove unused categories.</DrawerDescription>
                  <DrawerHeaderClose className="mobile-filter-close" />
                </DrawerHeader>
                <div className="settings-mobile-detail-body">
                  {getCategorySettingsContent()}
                </div>
              </DrawerContent>
            </Drawer>
            <CategorySelectionSettings
              availableCategories={allCategories}
              drawerDescription="Choose which positive transaction categories count toward dashboard and summary totals."
              includedCategories={incomeIncludedCategories}
              isMobile={isBottomNavigation}
              onChange={updateIncomeIncludedCategories}
              title="Income categories"
            />
            <CardFitCategorySettings
              availableCategories={cardFitAvailableCategories}
              includedCategories={cardFitIncludedCategories}
              isMobile={isBottomNavigation}
              onChange={updateCardFitIncludedCategories}
            />
          </>
        ) : (
          <>
            {getCategorySettingsContent()}
            <CategorySelectionSettings
              availableCategories={allCategories}
              drawerDescription="Choose which positive transaction categories count toward dashboard and summary totals."
              includedCategories={incomeIncludedCategories}
              isMobile={isBottomNavigation}
              onChange={updateIncomeIncludedCategories}
              title="Income categories"
            />
            <CardFitCategorySettings
              availableCategories={cardFitAvailableCategories}
              includedCategories={cardFitIncludedCategories}
              isMobile={isBottomNavigation}
              onChange={updateCardFitIncludedCategories}
            />
          </>
        )}
      </SettingsSection>
    </section>
  );

  function getCategorySettingsContent() {
    return (
      <>
        <div className="category-create-row settings-category-create-row">
          <label>
            New category
            <input onChange={(event) => setNewCategory(event.target.value)} placeholder="e.g. Kids, Pets, Coffee" value={newCategory} />
          </label>
          <Button disabled={!canCreateCategory} onClick={handleCreateCategory} type="button" variant="outline">
            <Plus aria-hidden="true" className="h-4 w-4" />
            Add category
          </Button>
          {categoryErrorMessage && (
            <p aria-live="polite" className="category-error-message">
              {categoryErrorMessage}
            </p>
          )}
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
      </>
    );
  }
}

type SettingsSectionProps = {
  children: ReactNode;
  description: string;
  title: string;
};

// Provides consistent Settings section framing without hiding feature state elsewhere.
function SettingsSection({ children, description, title }: SettingsSectionProps) {
  return (
    <section className="material-card settings-section">
      <div className="settings-section-heading">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      <div className="settings-section-body">
        {children}
      </div>
    </section>
  );
}

// Compact mobile row that opens a settings detail surface.
function SettingsNavigationButton({ description, onClick, title }: { description: string; onClick: () => void; title: string }) {
  return (
    <button
      className="grid min-h-[72px] w-full cursor-pointer grid-cols-[minmax(0,1fr)_auto] items-center gap-3.5 rounded-2xl border border-[var(--outline-soft)] bg-[var(--surface-2)] p-3.5 text-left font-[inherit] text-[var(--ink)]"
      onClick={onClick}
      type="button"
    >
      <span className="min-w-0">
        <strong className="block truncate text-base font-black text-[var(--ink)]">{title}</strong>
        <small className="mt-1 block truncate text-[0.82rem] font-bold text-[var(--muted)]">{description}</small>
      </span>
      <ChevronRight aria-hidden="true" className="h-5 w-5 text-[var(--accent-cream)]" />
    </button>
  );
}

type DataBackupSettingsProps = {
  driveBackup: DriveBackupState;
  onBackup: () => Promise<void>;
  onDeleteBackup: (fileId: string) => Promise<DriveBackupEntry[]>;
  onDisconnect: () => void;
  onRefreshBackups: () => Promise<DriveBackupEntry[]>;
  onRestore: (fileId: string) => Promise<void>;
};

const backupActionButtonClassName = "grid min-h-[82px] cursor-pointer place-items-center gap-2 rounded-[18px] border border-[var(--outline-soft)] bg-[var(--surface-2)] font-black text-[var(--ink)] transition-[transform,border-color,background] duration-[var(--motion-fast)] ease-[var(--motion-ease)] hover:border-[var(--primary-border)] hover:bg-[var(--surface-3)] focus-visible:border-[var(--primary-border)] focus-visible:bg-[var(--surface-3)] active:scale-[0.985] disabled:cursor-not-allowed disabled:opacity-[0.55] max-[768px]:min-h-[92px] max-[768px]:rounded-2xl max-[768px]:px-1.5 max-[768px]:py-2.5 max-[768px]:text-[0.82rem]";

// Manual Google Drive backup and restore controls for the hidden app data folder.
function DataBackupSettings({ driveBackup, onBackup, onDeleteBackup, onDisconnect, onRefreshBackups, onRestore }: DataBackupSettingsProps) {
  const [selectedBackupId, setSelectedBackupId] = useState("");
  const [backupToDelete, setBackupToDelete] = useState<DriveBackupEntry | null>(null);
  const [deletingBackupId, setDeletingBackupId] = useState("");
  const [restoringBackupId, setRestoringBackupId] = useState("");
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [backupPanelMode, setBackupPanelMode] = useState<"backups" | "restore" | null>(null);
  const isBottomNavigation = useIsBottomNavigation();
  const isBusy = driveBackup.status === "syncing" || driveBackup.isLoadingBackups;
  const canDisconnectDriveBackup = driveBackup.status === "ready"
    || driveBackup.status === "synced"
    || driveBackup.lastSyncedAt.length > 0
    || driveBackup.backups.length > 0;
  const isRestoringBackup = restoringBackupId.length > 0;
  const selectedBackup = driveBackup.backups.find((backup) => backup.id === selectedBackupId) || driveBackup.backups[0] || null;
  const openBackupPanel = (mode: "backups" | "restore") => {
    setBackupPanelMode(mode);
    void onRefreshBackups();
  };
  const createBackup = async () => {
    try {
      await onBackup();
      toast.success("Google Drive backup created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Google Drive backup failed.");
    }
  };
  const restoreSelectedBackup = async () => {
    if (!selectedBackup) {
      return;
    }

    const backup = selectedBackup;
    const toastId = toast.loading("Restoring Google Drive backup...");

    try {
      setRestoringBackupId(backup.id);
      await onRestore(backup.id);
      toast.success("Backup restored", { id: toastId });
      setRestoreDialogOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Google Drive restore failed.", { id: toastId });
    } finally {
      setRestoringBackupId("");
    }
  };
  const deleteBackup = async () => {
    if (!backupToDelete) {
      return;
    }

    try {
      setDeletingBackupId(backupToDelete.id);
      const nextBackups = await onDeleteBackup(backupToDelete.id);
      if (selectedBackupId === backupToDelete.id) {
        setSelectedBackupId(nextBackups[0]?.id || "");
      }
      toast.success("Backup deleted");
      setBackupToDelete(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Google Drive backup delete failed.");
    } finally {
      setDeletingBackupId("");
    }
  };

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 max-[768px]:grid-cols-1">
      <div>
        <h3 className="m-0 text-base font-black text-[var(--ink)]">Google Drive backup</h3>
        <p className="mt-1.5 text-[0.84rem] leading-[1.45] text-[var(--muted)]">Backups use Google's hidden app data folder. Netly cannot read your other Drive files.</p>
      </div>
      <span className={`settings-drive-status ${driveBackup.status} max-[768px]:w-fit`}>
        {getDriveBackupStatusLabel(driveBackup.status)}
      </span>
      {!driveBackup.clientConfigured && (
        <p className="col-span-full mt-1.5 text-[0.84rem] font-extrabold leading-[1.45] text-[var(--danger)]">
          Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID. Add a Google OAuth client ID before connecting Drive backup.
        </p>
      )}
      {driveBackup.message && (
        <p aria-live="polite" className="col-span-full mt-1.5 text-[0.84rem] leading-[1.45] text-[var(--muted)]">
          {driveBackup.message}
        </p>
      )}
      {driveBackup.lastSyncedAt && (
        <p className="col-span-full mt-1.5 text-[0.84rem] leading-[1.45] text-[var(--muted)]">Last backup {formatDriveSyncTime(driveBackup.lastSyncedAt)}</p>
      )}
      <div className="col-span-full grid grid-cols-3 gap-3 max-[768px]:gap-2">
        <button className={backupActionButtonClassName} disabled={isBusy} onClick={() => void createBackup()} type="button">
          <CloudUpload aria-hidden="true" className="h-5 w-5 text-[var(--accent-cream)]" />
          <span>Backup</span>
        </button>
        <button className={backupActionButtonClassName} disabled={isBusy} onClick={() => openBackupPanel("restore")} type="button">
          <CloudDownload aria-hidden="true" className="h-5 w-5 text-[var(--accent-cream)]" />
          <span>Restore</span>
        </button>
        <button className={backupActionButtonClassName} disabled={isBusy} onClick={() => openBackupPanel("backups")} type="button">
          <FolderClock aria-hidden="true" className="h-5 w-5 text-[var(--accent-cream)]" />
          <span>Backups</span>
        </button>
      </div>
      {canDisconnectDriveBackup && (
        <div className="col-span-full flex flex-wrap gap-2.5">
          <DisconnectButton disabled={isBusy} onClick={onDisconnect}>
            Disconnect Google Drive
          </DisconnectButton>
        </div>
      )}
      <BackupPanel
        backups={driveBackup.backups}
        deletingBackupId={deletingBackupId}
        isLoading={driveBackup.isLoadingBackups}
        isMobile={isBottomNavigation}
        mode={backupPanelMode}
        onDeleteBackup={setBackupToDelete}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setBackupPanelMode(null);
          }
        }}
        onRestoreBackup={(backupId) => {
          setSelectedBackupId(backupId);
          setRestoreDialogOpen(true);
        }}
      />
      <AlertDialog
        onOpenChange={(isOpen) => {
          if (!isOpen && !deletingBackupId) {
            setBackupToDelete(null);
          }
        }}
        open={backupToDelete !== null}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this backup?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes the backup from Google Drive app data. You will not be able to restore from this file again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {backupToDelete && (
            <div className="grid w-full gap-1 rounded-2xl border border-[var(--outline-soft)] bg-[var(--surface-2)] px-5 py-4 text-left text-[var(--ink)]">
              <strong className="block min-w-0 [overflow-wrap:anywhere]">{formatBackupTimestamp(backupToDelete.timestamp)}</strong>
              <span className="block min-w-0 text-[0.82rem] font-bold text-[var(--muted)] [overflow-wrap:anywhere]">{backupToDelete.name}</span>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(deletingBackupId)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[var(--danger)] text-white hover:bg-[var(--danger)]"
              disabled={Boolean(deletingBackupId)}
              onClick={(event) => {
                event.preventDefault();
                void deleteBackup();
              }}
            >
              {deletingBackupId ? (
                <>
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                  Deleting
                </>
              ) : (
                "Delete backup"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog
        onOpenChange={(isOpen) => {
          if (!isOpen && isRestoringBackup) {
            return;
          }

          setRestoreDialogOpen(isOpen);
        }}
        open={restoreDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore selected backup?</DialogTitle>
            <DialogDescription>
              Transactions from this backup will be merged into this device. Backed-up settings, categories, and colours will replace current local settings.
            </DialogDescription>
          </DialogHeader>
          {selectedBackup && (
            <div className="grid w-full gap-1 rounded-2xl border border-[var(--outline-soft)] bg-[var(--surface-2)] px-5 py-4 text-left text-[var(--ink)]">
              <strong className="block min-w-0 [overflow-wrap:anywhere]">{formatBackupTimestamp(selectedBackup.timestamp)}</strong>
              <span className="block min-w-0 text-[0.82rem] font-bold text-[var(--muted)] [overflow-wrap:anywhere]">{selectedBackup.name}</span>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button disabled={isRestoringBackup} type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <Button disabled={isBusy || isRestoringBackup || !selectedBackup} onClick={() => void restoreSelectedBackup()} type="button">
              {isRestoringBackup ? (
                <>
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                  Restoring
                </>
              ) : (
                "Restore backup"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type BackupPanelProps = {
  backups: DriveBackupState["backups"];
  deletingBackupId: string;
  isLoading: boolean;
  isMobile: boolean;
  mode: "backups" | "restore" | null;
  onDeleteBackup: (backup: DriveBackupEntry) => void;
  onOpenChange: (isOpen: boolean) => void;
  onRestoreBackup: (backupId: string) => void;
};

// Shows Drive backup history in a desktop sheet or mobile drawer.
function BackupPanel({ backups, deletingBackupId, isLoading, isMobile, mode, onDeleteBackup, onOpenChange, onRestoreBackup }: BackupPanelProps) {
  const open = mode !== null;
  const title = mode === "restore" ? "Restore a backup" : "Backups";
  const description = mode === "restore"
    ? "Choose the backup to merge into this device."
    : "Current Google Drive app data backups for this account.";
  const content = (
    <BackupPanelContent
      backups={backups}
      deletingBackupId={deletingBackupId}
      isLoading={isLoading}
      mode={mode || "backups"}
      onDeleteBackup={onDeleteBackup}
      onRestoreBackup={onRestoreBackup}
    />
  );

  if (isMobile) {
    return (
      <Drawer onOpenChange={onOpenChange} open={open}>
        <DrawerContent className="settings-backup-drawer">
          <DrawerHeader className="mobile-filter-header settings-backup-drawer-header">
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
            <DrawerHeaderClose className="mobile-filter-close" />
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="settings-backup-sheet">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        {content}
      </SheetContent>
    </Sheet>
  );
}

type BackupPanelContentProps = {
  backups: DriveBackupState["backups"];
  deletingBackupId: string;
  isLoading: boolean;
  mode: "backups" | "restore";
  onDeleteBackup: (backup: DriveBackupEntry) => void;
  onRestoreBackup: (backupId: string) => void;
};

// Renders backup rows for either history review or restore selection.
function BackupPanelContent({ backups, deletingBackupId, isLoading, mode, onDeleteBackup, onRestoreBackup }: BackupPanelContentProps) {
  if (isLoading) {
    return <div className="settings-backup-panel-empty">Checking Google Drive backups...</div>;
  }

  if (backups.length === 0) {
    return <div className="settings-backup-panel-empty">No backups found.</div>;
  }

  return (
    <BackupList
      backups={backups}
      deletingBackupId={deletingBackupId}
      mode={mode}
      onDeleteBackup={onDeleteBackup}
      onRestoreBackup={onRestoreBackup}
    />
  );
}

type BackupListProps = {
  backups: DriveBackupState["backups"];
  deletingBackupId: string;
  mode: "backups" | "restore";
  onDeleteBackup: (backup: DriveBackupEntry) => void;
  onRestoreBackup: (id: string) => void;
};

// Shows the currently available Drive backups with timestamp fallbacks called out.
function BackupList({ backups, deletingBackupId, mode, onDeleteBackup, onRestoreBackup }: BackupListProps) {
  return (
    <ul className="settings-backup-list" aria-label="Google Drive backups">
      {backups.map((backup) => {
        const rowContent = (
          <>
            <CloudDownload aria-hidden="true" className="h-5 w-5" />
            <span>
              <strong>{backup.metadataAvailable ? formatBackupTimestamp(backup.timestamp) : "Connect to network to see backup"}</strong>
              <small>{backup.name}</small>
            </span>
            {mode === "restore" && <em>Restore</em>}
            {mode === "backups" && (
              <button
                aria-label={`Delete ${backup.name}`}
                className="settings-backup-delete"
                disabled={deletingBackupId === backup.id}
                onClick={() => onDeleteBackup(backup)}
                type="button"
              >
                {deletingBackupId === backup.id ? (
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 aria-hidden="true" className="h-4 w-4" />
                )}
              </button>
            )}
          </>
        );

        return (
          <li key={backup.id}>
            {mode === "restore" ? (
              <button
                aria-label={`Restore ${formatBackupTimestamp(backup.timestamp)}`}
                className="settings-backup-list-item"
                onClick={() => onRestoreBackup(backup.id)}
                type="button"
              >
                {rowContent}
              </button>
            ) : (
              <div className="settings-backup-list-item">
                {rowContent}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

type ReportingSettingsProps = {
  accountOptions: TransactionAccountOption[];
  defaultAccountId: string;
  onDefaultAccountChange: (accountId: string) => void;
};

// Controls the account used by reporting summaries.
function ReportingSettings({
  accountOptions,
  defaultAccountId,
  onDefaultAccountChange
}: ReportingSettingsProps) {
  const accountExists = !defaultAccountId || accountOptions.some((account) => account.value === defaultAccountId);
  const allAccountsSelectValue = "__all_accounts__";
  const defaultAccountOptions: SelectOption[] = [
    { label: "All accounts", value: allAccountsSelectValue },
    ...accountOptions
  ];
  const changeDefaultAccount = (value: string) => {
    onDefaultAccountChange(value === allAccountsSelectValue ? "" : value);
  };

  return (
    <div className="settings-reporting-grid">
      <div className="settings-select-row">
        <span>
          <strong>Default account</strong>
          <small>Used by dashboard summaries and the default Transactions view.</small>
        </span>
        <SelectField
          ariaLabel="Default account"
          className="settings-select-trigger"
          onChange={changeDefaultAccount}
          options={defaultAccountOptions}
          value={defaultAccountId || allAccountsSelectValue}
        />
      </div>
      {!accountExists && (
        <p className="font-extrabold text-[var(--danger)]">The saved default account is not available in the current account list.</p>
      )}
    </div>
  );
}

type CategorySelectionSettingsProps = {
  availableCategories: string[];
  drawerDescription: string;
  includedCategories: string[];
  isMobile: boolean;
  onChange: (categories: string[]) => void;
  title: string;
};

// Shared category multi-select with mobile drawer and desktop dropdown modes.
function CategorySelectionSettings({
  availableCategories,
  drawerDescription,
  includedCategories,
  isMobile,
  onChange,
  title
}: CategorySelectionSettingsProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const includedSet = new Set(includedCategories);
  const toggleCategory = (category: string) => {
    const nextCategories = includedSet.has(category)
      ? includedCategories.filter((item) => item !== category)
      : [...includedCategories, category];

    onChange(nextCategories);
  };
  const summary = getCategorySelectionLabel(includedCategories, availableCategories, "All categories");

  if (isMobile) {
    return (
      <div className="settings-category-selection">
        <div>
          <h3>{title}</h3>
          <p>{drawerDescription}</p>
        </div>
        <SettingsNavigationButton description={summary} onClick={() => setMobileOpen(true)} title={title} />
        <Drawer onOpenChange={setMobileOpen} open={mobileOpen}>
          <DrawerContent className="mobile-filter-drawer settings-card-fit-drawer">
            <DrawerHeader className="mobile-filter-header">
              <DrawerTitle>{title}</DrawerTitle>
              <DrawerDescription className="sr-only">{drawerDescription}</DrawerDescription>
              <DrawerHeaderClose className="mobile-filter-close" />
            </DrawerHeader>
            <div className="settings-mobile-detail-body">
              <div className="mobile-filter-section">
                <div className="mobile-filter-chips category">
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
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    );
  }

  return (
    <div className="settings-card-fit settings-category-selection">
      <div>
        <h3>{title}</h3>
        <p>{drawerDescription}</p>
      </div>
      <CategoryMultiSelectDropdown
        label={summary}
        onToggle={toggleCategory}
        options={availableCategories}
        selectedValues={includedCategories}
      />
    </div>
  );
}

// Lets users decide which spending categories count toward Card Fit rewards.
function CardFitCategorySettings({ availableCategories, includedCategories, isMobile, onChange }: Omit<CategorySelectionSettingsProps, "drawerDescription" | "title">) {
  return (
    <CategorySelectionSettings
      availableCategories={availableCategories}
      drawerDescription="Choose which categories count toward rewards estimates."
      includedCategories={includedCategories}
      isMobile={isMobile}
      onChange={onChange}
      title="Card Fit categories"
    />
  );
}

// Dropdown multi-select used by desktop Settings category controls.
function CategoryMultiSelectDropdown({
  label,
  onToggle,
  options,
  selectedValues
}: {
  label: string;
  onToggle: (category: string) => void;
  options: string[];
  selectedValues: string[];
}) {
  const selectedSet = new Set(selectedValues);
  const [open, setOpen] = useState(false);
  useCloseOnPageScroll(open, () => setOpen(false));

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <button aria-haspopup="listbox" className="category-multi-select-trigger transaction-select-trigger" role="combobox" type="button">
          <span>{label}</span>
          <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="category-multi-select-content settings-category-multi-select-content">
        {options.map((option) => {
          const isActive = selectedSet.has(option);

          return (
            <button
              aria-pressed={isActive}
              className={isActive ? "active" : undefined}
              key={option}
              onClick={() => onToggle(option)}
              type="button"
            >
              <span className="category-multi-select-check">
                {isActive && <Check aria-hidden="true" className="h-4 w-4" />}
              </span>
              <span>{option}</span>
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

function getCategorySelectionLabel(selectedValues: string[], options: string[], allLabel: string) {
  if (selectedValues.length === 0) {
    return "No categories selected";
  }

  if (selectedValues.length === options.length) {
    return allLabel;
  }

  if (selectedValues.length === 1) {
    return selectedValues[0];
  }

  return `${selectedValues.length} selected`;
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
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3.5 max-[768px]:grid-cols-1">
      <div>
        <h3 className="m-0 text-base font-black text-[var(--ink)]">Akahu data freshness</h3>
        <p className="mt-1.5 text-[0.84rem] leading-[1.45] text-[var(--muted)]">{isDemoMode ? "Demo mode uses local sample data." : "Latest endpoint retrieval and Akahu account refresh timestamps."}</p>
      </div>
      <span className={`settings-drive-status ${statusClassName} max-[768px]:w-fit`}>
        {statusLabel}
      </span>
      {!isDemoMode && (
        <>
          <div className="col-span-full grid grid-cols-3 gap-2.5 max-[768px]:grid-cols-1" aria-live="polite">
            <FreshnessMetric label="Retrieved from Akahu" value={formatAkahuFreshnessTime(freshness.retrievedAt)} />
            <FreshnessMetric label="Balance data" value={formatAkahuFreshnessTime(freshness.balanceRefreshedAt)} />
            <FreshnessMetric label="Transactions checked" value={formatAkahuFreshnessTime(freshness.transactionsRefreshedAt)} />
          </div>
          {freshness.status === "failed" && freshness.error && (
            <p className="col-span-full mt-1.5 text-[0.84rem] font-extrabold leading-[1.45] text-[var(--danger)]">{freshness.error}</p>
          )}
          {freshness.accounts.length > 1 && (
            <details className="col-span-full text-[0.84rem] text-[var(--muted)]">
              <summary className="cursor-pointer font-black text-[var(--ink)]">Account timestamps</summary>
              <div className="mt-2.5 grid gap-2">
                {freshness.accounts.map((account) => (
                  <div className="rounded-[10px] border border-[var(--outline-soft)] bg-[var(--surface-2)] px-3 py-2.5" key={account.accountId}>
                    <strong className="mb-1 block text-[0.84rem] text-[var(--ink)]">{account.displayName}</strong>
                    <span className="block text-[0.74rem] font-extrabold text-[var(--muted)]">{account.status}</span>
                    <span className="block text-[0.74rem] font-extrabold text-[var(--muted)]">Balance {formatAkahuFreshnessTime(account.balanceRefreshedAt)}</span>
                    <span className="block text-[0.74rem] font-extrabold text-[var(--muted)]">Transactions {formatAkahuFreshnessTime(account.transactionsRefreshedAt)}</span>
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
    <div className="rounded-[10px] border border-[var(--outline-soft)] bg-[var(--surface-2)] px-3 py-2.5">
      <span className="block text-[0.74rem] font-extrabold text-[var(--muted)]">{label}</span>
      <strong className="mt-1 block text-[0.84rem] font-black text-[var(--ink)]">{value}</strong>
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

  return formatNzDateTime(date);
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

  return formatNzDateTime(date);
}

function formatBackupTimestamp(value: string) {
  if (!value) {
    return "Connect to network to see backup";
  }

  return formatDriveSyncTime(value);
}

// Formats timestamps as "18 May 2026, 1:49 pm" for NZ-facing settings UI.
function formatNzDateTime(date: Date) {
  const dateLabel = new Intl.DateTimeFormat("en-NZ", {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
  const timeLabel = new Intl.DateTimeFormat("en-NZ", {
    hour: "numeric",
    minute: "2-digit"
  }).format(date);

  return `${dateLabel}, ${timeLabel}`;
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

// Normalises category input before duplicate checks and creation.
function normalizeCategoryName(category: string) {
  return category.trim().replace(/\s+/g, " ");
}

// Finds an existing category while ignoring case and spacing differences.
function getMatchingCategory(categories: string[], category: string) {
  if (!category) {
    return "";
  }

  return categories.find((currentCategory) => categoriesMatch(currentCategory, category)) || "";
}
