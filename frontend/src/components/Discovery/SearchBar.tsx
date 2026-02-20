import React, { useEffect, useState } from 'react';

export const SearchBar: React.FC<{
  onSearch: (q: string) => void;
  initial?: string;
}> = ({ onSearch, initial = '' }) => {
  const [value, setValue] = useState(initial);

  useEffect(() => {
    const t = setTimeout(() => onSearch(value.trim()), 300);
    return () => clearTimeout(t);
  }, [value, onSearch]);

  return (
    <div style={{display: 'flex', gap: 8, alignItems: 'center'}}>
      <input
        aria-label="Search courses"
        placeholder="Search courses, topics, or skills"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        style={{flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd'}}
      />
      {value && (
        <button onClick={() => setValue('')} style={{padding: '6px 10px'}}>Clear</button>
      )}
    </div>
  );
};

export default SearchBar;
