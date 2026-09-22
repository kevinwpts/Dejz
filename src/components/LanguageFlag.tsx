import React from 'react';
import { Language, languageInfo } from '../i18n';

interface LanguageFlagProps {
  language: Language;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showCode?: boolean;
}

export const LanguageFlag: React.FC<LanguageFlagProps> = ({
  language,
  className = '',
  size = 'md',
  showCode = false,
}) => {
  const info = languageInfo[language] || languageInfo.sv;

  const sizeClasses = {
    sm: 'w-4 h-3',
    md: 'w-5 h-3.5',
    lg: 'w-6 h-4',
  }[size];

  return (
    <span className={`inline-flex items-center gap-1.5 shrink-0 ${className}`}>
      <img
        src={info.flagUrl}
        alt={info.label}
        className={`${sizeClasses} object-cover rounded-[3px] shadow-2xs shrink-0 border border-black/10 dark:border-white/20`}
        onError={(e) => {
          // Fallback if image blocked
          const target = e.currentTarget;
          target.style.display = 'none';
          if (target.nextElementSibling) {
            (target.nextElementSibling as HTMLElement).style.display = 'inline';
          }
        }}
      />
      <span className="hidden text-xs font-bold">{info.flag}</span>
      {showCode && (
        <span className="uppercase text-xs font-bold tracking-wider opacity-90">{info.countryCode}</span>
      )}
    </span>
  );
};
