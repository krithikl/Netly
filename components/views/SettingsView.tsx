import { useState } from "react";
import { toast } from "sonner";
import { PanelTitle } from "@/components/ui/panel-title";
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
import type { PeriodOption } from "@/lib/types";

type SettingsViewProps = {
  categoryColors: Record<string, string>;
  dashboardPeriod: PeriodOption;
  defaultCategories: string[];
  deleteCategory: (category: string) => void;
  setDashboardPeriod: (period: PeriodOption) => void;
  updateCategoryColor: (category: string, color: string) => void;
};

// Settings screen for managing category colours and hiding unused categories.
export function SettingsView({
  categoryColors,
  dashboardPeriod,
  defaultCategories,
  deleteCategory,
  setDashboardPeriod,
  updateCategoryColor
}: SettingsViewProps) {
  const allCategories = defaultCategories.filter((cat) => cat !== "All categories");
  const [activeColorPicker, setActiveColorPicker] = useState<string | null>(null);

  const setColorPickerOpen = (category: string, isOpen: boolean) => {
    setActiveColorPicker(isOpen ? category : null);
  };

  return (
    <section className="view-stack">
      <section className="material-card">
        <PanelTitle title="Settings" subtitle="Manage your preferences" />
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

type CategoryColorRowProps = {
  category: string;
  currentColor: string;
  isActive: boolean;
  onColorPickerOpenChange: (isOpen: boolean) => void;
  onDelete: () => void;
  updateCategoryColor: (category: string, color: string) => void;
};

// One editable category row used by SettingsView.
function CategoryColorRow({
  category,
  currentColor,
  isActive,
  onColorPickerOpenChange,
  onDelete,
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
  updateCategoryColor: (category: string, color: string) => void;
};

function ColorOptionButton({ category, color, currentColor, updateCategoryColor }: ColorOptionButtonProps) {
  const isSelected = currentColor === color;
  const buttonClassName = cn(
    "h-8 w-8 rounded-full border-2 border-transparent p-0 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]",
    isSelected && "border-[var(--ink)]"
  );
  
  return (
    <button
      type="button"
      className={buttonClassName}
      onClick={() => updateCategoryColor(category, color)}
      style={{ background: color }}
      aria-label={`Set color to ${color}`}
    />
  );
}
