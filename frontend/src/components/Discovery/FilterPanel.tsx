import React from 'react';
import { SortOption } from './types';

export const FilterPanel: React.FC<{
  categories: string[];
  selected: Set<string>;
  onToggleCategory: (cat: string) => void;
  sort: SortOption;
  onSortChange: (s: SortOption) => void;
}> = ({ categories, selected, onToggleCategory, sort, onSortChange }) => {
  return (
    <aside style={{padding: 12, borderRight: '1px solid #eee'}}>
      <div style={{marginBottom: 12}}>
        <strong>Categories</strong>
        <div style={{display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8}}>
          {categories.map((c) => {
            const checked = selected.has(c);
            return (
              <label key={c} style={{display: 'flex', alignItems: 'center', gap: 8}}>
                <input type="checkbox" checked={checked} onChange={() => onToggleCategory(c)} />
                <span>{c}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div style={{marginTop: 16}}>
        <strong>Sort</strong>
        <div style={{marginTop: 8}}>
          <select value={sort} onChange={(e) => onSortChange(e.target.value as SortOption)}>
            <option value="relevance">Relevance</option>
            <option value="newest">Newest</option>
            <option value="popular">Most Popular</option>
            <option value="duration">Shortest</option>
          </select>
        </div>
      </div>
    </aside>
  );
};

export default FilterPanel;
