import React from 'react';
import { Language, languageInfo } from '../i18n';
import { normalizeLanguage } from '../utils/nordic';

interface LanguageFlagProps {
  language?: Language | string;
  code?: Language | string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showCode?: boolean;
}

const renderSvgFlag = (lang: Language) => {
  switch (lang) {
    case 'sv':
      return (
        <svg viewBox="0 0 16 12" className="w-full h-full block" aria-hidden="true">
          <rect width="16" height="12" fill="#006AA7" />
          <rect x="5" y="0" width="2.2" height="12" fill="#FECC02" />
          <rect x="0" y="4.9" width="16" height="2.2" fill="#FECC02" />
        </svg>
      );
    case 'da':
      return (
        <svg viewBox="0 0 16 12" className="w-full h-full block" aria-hidden="true">
          <rect width="16" height="12" fill="#C8102E" />
          <rect x="5" y="0" width="2.1" height="12" fill="#FFFFFF" />
          <rect x="0" y="4.95" width="16" height="2.1" fill="#FFFFFF" />
        </svg>
      );
    case 'no':
      return (
        <svg viewBox="0 0 22 16" className="w-full h-full block" aria-hidden="true">
          <rect width="22" height="16" fill="#BA0C2F" />
          <rect x="6" y="0" width="4" height="16" fill="#FFFFFF" />
          <rect x="0" y="6" width="22" height="4" fill="#FFFFFF" />
          <rect x="7" y="0" width="2" height="16" fill="#00205B" />
          <rect x="0" y="7" width="22" height="2" fill="#00205B" />
        </svg>
      );
    case 'fi':
      return (
        <svg viewBox="0 0 18 12" className="w-full h-full block" aria-hidden="true">
          <rect width="18" height="12" fill="#FFFFFF" />
          <rect x="5" y="0" width="3" height="12" fill="#003580" />
          <rect x="0" y="4.5" width="18" height="3" fill="#003580" />
        </svg>
      );
    case 'en':
      return (
        <svg viewBox="0 0 60 40" className="w-full h-full block" aria-hidden="true">
          <rect width="60" height="40" fill="#012169" />
          <path d="M0,0 L60,40 M60,0 L0,40" stroke="#FFFFFF" strokeWidth="8" />
          <path d="M0,0 L60,40 M60,0 L0,40" stroke="#C8102E" strokeWidth="4.5" />
          <path d="M30,0 V40 M0,20 H60" stroke="#FFFFFF" strokeWidth="12" />
          <path d="M30,0 V40 M0,20 H60" stroke="#C8102E" strokeWidth="7" />
        </svg>
      );
    default:
      return null;
  }
};

export const LanguageFlag: React.FC<LanguageFlagProps> = ({
  language,
  code,
  className = '',
  size = 'md',
  showCode = false,
}) => {
  const langKey = normalizeLanguage((language || code || 'sv') as string);
  const info = languageInfo[langKey] || languageInfo.sv;

  const sizeClasses = {
    sm: 'w-4 h-3',
    md: 'w-5 h-3.5',
    lg: 'w-6 h-4',
  }[size];

  return (
    <span className={`inline-flex items-center gap-1.5 shrink-0 ${className}`}>
      <span
        role="img"
        aria-label={info.label}
        className={`${sizeClasses} inline-flex overflow-hidden rounded-[3px] shadow-2xs shrink-0 ring-1 ring-black/10 dark:ring-white/15`}
      >
        {renderSvgFlag(langKey)}
      </span>
      {showCode && (
        <span className="text-micro-label font-bold tracking-wider opacity-90">{info.countryCode}</span>
      )}
    </span>
  );
};
