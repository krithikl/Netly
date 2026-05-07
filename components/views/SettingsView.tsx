import { useState } from "react";
import { PanelTitle } from "@/components/ui/PanelTitle";
import { moneyfitPalette } from "@/lib/app/constants";

type SettingsViewProps = {
  categoryColors: Record<string, string>;
  defaultCategories: string[];
  deleteCategory: (category: string) => void;
  updateCategoryColor: (category: string, color: string) => void;
};

export function SettingsView({ categoryColors, defaultCategories, deleteCategory, updateCategoryColor }: SettingsViewProps) {
  const allCategories = defaultCategories.filter((cat) => cat !== "All categories");
  const [activeColorPicker, setActiveColorPicker] = useState<string | null>(null);

  const toggleColorPicker = (category: string) => {
    setActiveColorPicker((prev) => (prev === category ? null : category));
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
              onTogglePicker={() => toggleColorPicker(category)}
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
  onTogglePicker: () => void;
  onDelete: () => void;
  updateCategoryColor: (category: string, color: string) => void;
};

function CategoryColorRow({ category, currentColor, isActive, onTogglePicker, onDelete, updateCategoryColor }: CategoryColorRowProps) {
  return (
    <div className="info-row settings-category-item">
      <div className="settings-color-row settings-category-row">
        <div className="settings-color-label">
          <span className="legend-dot" style={{ background: currentColor }} />
          <strong>{category}</strong>
        </div>
        
        <div className="settings-category-actions">
          <button
            type="button"
            onClick={onTogglePicker}
            className={`settings-color-toggle ${isActive ? "active" : ""}`}
            style={{ background: currentColor }}
            aria-label="Choose color"
          />
          <button 
            type="button" 
            onClick={onDelete}
            className="settings-remove-button"
          >
            Remove
          </button>
        </div>
      </div>
      
      {isActive && (
        <div className="settings-color-popup">
          <p className="settings-color-popup-title">Select a color:</p>
          <div className="settings-color-popup-grid">
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
        </div>
      )}
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
  
  return (
    <button
      type="button"
      className={`settings-color-button large ${isSelected ? "selected" : ""}`}
      onClick={() => updateCategoryColor(category, color)}
      style={{ background: color }}
      aria-label={`Set color to ${color}`}
    />
  );
}
