
import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, X } from 'lucide-react';

interface SearchSuggestProps {
  label: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}

export const SearchSuggest: React.FC<SearchSuggestProps> = ({
  label,
  options,
  value,
  onChange,
  placeholder = "Search...",
  disabled = false,
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter options based on search term
  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sync search term with value when not searching
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm(value);
    }
  }, [value, isOpen]);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (opt: string) => {
    onChange(opt);
    setSearchTerm(opt);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  return (
    <div className="relative w-full" ref={containerRef}>
      <label className="block text-sm font-semibold text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      <div className={`relative group ${disabled ? 'opacity-50' : ''}`}>
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors">
          <Search size={16} />
        </div>
        
        <input
          type="text"
          disabled={disabled}
          value={isOpen ? searchTerm : value}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          } }
          onFocus={() => {
            setIsOpen(true);
            setSearchTerm(''); // Clear to show all options on focus
          }}
          placeholder={placeholder}
          className={`w-full pl-10 pr-10 py-2 border rounded-lg outline-none transition-all shadow-sm
            ${isOpen ? 'border-indigo-500 ring-2 ring-indigo-50' : 'border-gray-300 hover:border-gray-400'}
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white cursor-text'}
          `}
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && !disabled && (
            <button 
              type="button" 
              onClick={handleClear}
              className="p-1 text-gray-400 hover:text-red-500 transition-colors"
            >
              <X size={14} />
            </button>
          )}
          <div className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
            <ChevronDown size={18} />
          </div>
        </div>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-[60] w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto animate-fade-in">
          {filteredOptions.length > 0 ? (
            <div className="py-1">
              {filteredOptions.map((opt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center justify-between
                    ${value === opt ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-700 hover:bg-gray-50'}
                  `}
                >
                  {opt}
                  {value === opt && <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full"></div>}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500 text-sm italic">
              No matches found for "{searchTerm}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};
