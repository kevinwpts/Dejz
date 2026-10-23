import React, { useState, useRef, useEffect } from 'react';
import { Check } from 'lucide-react';
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
    <div className={`relative inline-flex items-center text-left ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Språk: ${currentOption.nativeLabel}`}
        title={currentOption.nativeLabel}
        className="w-9 h-9 rounded-full inline-flex items-center justify-center bg-transparent hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-all duration-200 cursor-pointer select-none shrink-0 active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-color,#0B0B0F)] border-none"
      >
        <LanguageFlag code={currentOption.code} size="md" />
      </button>

      {isOpen && (
        <div
          role="listbox"
          className={`absolute z-50 w-44 rounded-[var(--radius-card-nested,12px)] bg-[var(--surface-color)] shadow-modal overflow-hidden py-1 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100 right-0 ${
            variant === 'footer' || variant === 'pill-hero' ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
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
