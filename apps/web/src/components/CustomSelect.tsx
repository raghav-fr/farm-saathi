import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface SelectOption {
  value: string;
  label: string;
}

interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export function CustomSelect({ options, value, onChange, placeholder = "Select...", className = "", required }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        className="w-full input-field flex items-center justify-between bg-white/5 dark:bg-black/20 text-left hover:bg-white/10 transition-colors focus:ring-2 focus:ring-green-500/30 outline-none"
        onClick={() => setIsOpen(!isOpen)}
        style={{ padding: "0.75rem 1rem", minHeight: "42px" }}
      >
        <span className={!selectedOption ? "text-gray-500 font-medium" : "font-semibold"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown 
          size={16} 
          className={`transition-transform duration-200 text-gray-500 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Hidden input for HTML form validation if required */}
      {required && (
        <input 
          type="text" 
          tabIndex={-1} 
          required={required} 
          value={value} 
          onChange={() => {}} 
          className="absolute opacity-0 w-0 h-0 pointer-events-none" 
        />
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-2 glass-card overflow-hidden shadow-xl"
            style={{ 
              maxHeight: '250px', 
              overflowY: 'auto',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '4px'
            }}
          >
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between rounded-lg transition-colors ${
                    isSelected 
                      ? 'bg-green-500/10 text-green-700 dark:text-green-400 font-bold' 
                      : 'hover:bg-black/5 dark:hover:bg-white/5 font-medium'
                  }`}
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                >
                  {option.label}
                  {isSelected && <Check size={14} />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
