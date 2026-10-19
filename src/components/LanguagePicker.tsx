import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { Language } from '../i18n';
import { NORDIC_LANGUAGES } from '../utils/nordic';
import { LanguageFlag } from './LanguageFlag';

interface LanguagePickerProps {
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
  variant?: 'header' | 'footer' | 'compact' | 'settings' | 'pill' | 'pill-hero';
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
        className={`inline-flex items-center gap-1.5 transition-all duration-300 cursor-pointer select-none whitespace-nowrap shrink-0 ${
          variant === 'footer'
            ? 'px-2.5 h-8 sm:h-9 rounded-[var(--radius-button-sm,10px)] text-xs text-[var(--text-secondary)] bg-[var(--surface-color)] hover:text-[var(--text-primary)] border border-[var(--border-divider)] hover:border-[var(--text-primary)]/30 shadow-subtle'
            : variant === 'compact'
            ? 'px-3 h-9 rounded-full text-xs font-semibold text-[var(--text-primary)] bg-transparent hover:bg-black/[0.03] dark:hover:bg-white/[0.04] border-[1.5px] border-[var(--border-control,#737B8C)] hover:border-[var(--text-primary)] transition-all duration-200 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[var(--focus-color,#0B0B0F)]'
            : variant === 'pill-hero'
            ? 'px-2.5 h-9 rounded-full text-xs font-semibold text-white bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.12] active:scale-[0.97]'
            : variant === 'pill'
            ? 'px-2.5 h-9 rounded-full text-xs font-semibold text-[var(--text-primary)] bg-transparent hover:bg-black/[0.03] dark:hover:bg-white/[0.04] border-[1.5px] border-[var(--border-control,#737B8C)] hover:border-[var(--text-primary)] transition-all duration-200 active:scale-[0.97] focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-[var(--focus-color,#0B0B0F)]'
            : 'px-2 h-8 sm:h-9 rounded-[var(--radius-button-sm,10px)] text-xs sm:text-sm text-[var(--text-secondary)] bg-[var(--surface-color)] hover:text-[var(--text-primary)] border border-[var(--border-divider)] hover:border-[var(--text-primary)]/30 shadow-subtle'
        }`}
      >
        <LanguageFlag code={currentOption.code} size="md" />
        {variant === 'compact' && (
          <span className="text-xs font-semibold text-[var(--text-primary)] shrink-0">
            {currentOption.nativeLabel}
          </span>
        )}
        <ChevronDown
          size={13}
          className={`shrink-0 opacity-70 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className={`absolute z-50 w-48 rounded-[var(--radius-card-nested,12px)] bg-[var(--surface-color)] border border-[var(--border-divider)] shadow-modal overflow-hidden py-1 backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 right-0 ${
            variant === 'footer' || variant === 'pill-hero' ? 'bottom-full mb-1.5' : 'mt-1.5'
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
                  className={`w-full px-3 py-2 text-left text-xs sm:text-sm flex items-center justify-between gap-2.5 transition-colors cursor-pointer border-none ${
                    isSelected
                      ? 'text-[var(--text-primary)] font-semibold bg-black/[0.04] dark:bg-white/[0.08]'
                      : 'text-[var(--text-primary)] font-medium hover:bg-black/[0.02] dark:hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <LanguageFlag code={lang.code} size="md" />
                    <span className="truncate">{lang.nativeLabel}</span>
                  </div>
                  {isSelected && (
                    <Check size={14} className="shrink-0 text-[var(--text-primary)]" />
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
