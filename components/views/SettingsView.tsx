import { useState } from "react";
import { PanelTitle } from "@/components/ui/PanelTitle";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { moneyfitPalette } from "@/lib/app/constants";
import { cn } from "@/lib/utils";

type SettingsViewProps = {
  categoryColors: Record<string, string>;
  defaultCategories: string[];
  deleteCategory: (category: string) => void;
  updateCategoryColor: (category: string, color: string) => void;
};

export function SettingsView({ categoryColors, defaultCategories, deleteCategory, updateCategoryColor }: SettingsViewProps) {
  const allCategories = defaultCategories.filter((cat) => cat !== "All categories");
  const [activeColorPicker, setActiveColorPicker] = useState<string | null>(null);

  const setColorPickerOpen = (category: string, isOpen: boolean) => {
    setActiveColorPicker(isOpen ? category : null);
  };

  return (
    <section className="view-stack">
      <section className="material-card">
        <PanelTitle title="Settings" subtitle="Manage your preferences" />
        <p className="settings-description">
          Additional app settings and preferences will appear here.
        </p>
      </section>

      <section className="material-card">
        <div className="settings-categories-header">
          <div>
            <h3 className="settings-categories-title">Categories</h3>
            <p className="settings-categories-subtitle">Customize colors or remove unused categories.</p>
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

function CategoryColorRow({
  category,
  currentColor,
  isActive,
  onColorPickerOpenChange,
  onDelete,
  updateCategoryColor
}: CategoryColorRowProps) {
  const colorToggleClassName = cn(
    "h-7 w-7 rounded-full border-2 border-transparent p-0 shadow-sm transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
    isActive && "border-[var(--ink)]"
  );

  return (
    <div className="info-row settings-category-item">
      <div className="settings-color-row settings-category-row">
        <div className="settings-color-label">
          <span className="legend-dot" style={{ background: currentColor }} />
          <strong>{category}</strong>
        </div>
        
        <div className="settings-category-actions">
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
                {moneyfitPalette.map((color) => (
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
          <button 
            type="button" 
            onClick={onDelete}
            className="settings-remove-button"
          >
            Remove
          </button>
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
    "h-8 w-8 rounded-full border-2 border-transparent p-0 transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
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
