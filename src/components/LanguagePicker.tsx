import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { Language } from '../i18n';
import { NORDIC_LANGUAGES } from '../utils/nordic';

interface LanguagePickerProps {
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  variant?: 'header' | 'footer' | 'compact' | 'settings';
  className?: string;
}

export function LanguagePicker({
  currentLanguage,
  onLanguageChange,
  variant = 'header',
  className = '',
}: LanguagePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const currentOption = NORDIC_LANGUAGES.find(l => l.code === currentLanguage) || NORDIC_LANGUAGES[0];

  const handleSelect = (lang: Language) => {
    onLanguageChange(lang);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label="Välj språk / Choose language"
        className={`inline-flex items-center gap-1.5 px-2 sm:px-2.5 h-8 sm:h-9 rounded-[var(--radius-button-sm,10px)] font-medium transition-all cursor-pointer select-none border border-[var(--border-subtle)] whitespace-nowrap shrink-0 ${
          variant === 'footer'
            ? 'text-xs text-[var(--text-secondary)] bg-[var(--surface-color)] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)]/30'
            : variant === 'compact'
            ? 'text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-black/5 dark:bg-white/5'
            : 'text-xs sm:text-sm text-[var(--text-secondary)] bg-[var(--surface-color)] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)]/30'
        }`}
      >
        <span className="text-sm select-none leading-none shrink-0" aria-hidden="true">{currentOption.flag}</span>
        <span className="font-bold text-xs uppercase tracking-wide text-[var(--text-primary)] shrink-0">
          {currentOption.shortCode || currentOption.code.toUpperCase()}
        </span>
        <ChevronDown
          size={12}
          className={`shrink-0 opacity-60 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className={`absolute z-50 w-48 rounded-[var(--radius-card-nested,12px)] bg-[var(--surface-color)] border border-[var(--border-subtle)] shadow-lg overflow-hidden py-1 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 right-0 ${
            variant === 'footer' ? 'bottom-full mb-1.5' : 'mt-1.5'
          }`}
        >
          <div className="py-0.5">
            {NORDIC_LANGUAGES.map((lang) => {
              const isSelected = lang.code === currentLanguage;
              return (
                <button
                  key={lang.code}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(lang.code)}
                  className={`w-full px-3 py-2 text-left text-xs sm:text-sm font-medium flex items-center justify-between gap-2.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer ${
                    isSelected
                      ? 'text-[var(--accent-color)] font-semibold bg-[var(--accent-color)]/5'
                      : 'text-[var(--text-primary)]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm sm:text-base leading-none select-none" aria-hidden="true">{lang.flag}</span>
                    <span className="truncate">{lang.nativeLabel}</span>
                  </div>
                  {isSelected && (
                    <Check size={14} className="shrink-0 text-[var(--accent-color)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
