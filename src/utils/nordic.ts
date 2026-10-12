import { Language } from '../i18n';

export type NordicCountry = 'SE' | 'DK' | 'NO' | 'FI';
export type NordicCurrencyCode = 'SEK' | 'DKK' | 'NOK' | 'EUR';

export interface NordicRegionConfig {
  countryCode: NordicCountry;
  name: string;
  nativeName: string;
  flag: string;
  flagUrl: string;
  defaultLanguage: Language;
  defaultCurrencyCode: NordicCurrencyCode;
  currencySymbol: string;
  currencyName: string;
  locale: string;
  timezone: string;
}

export const NORDIC_REGIONS: Record<NordicCountry, NordicRegionConfig> = {
  SE: {
    countryCode: 'SE',
    name: 'Sverige',
    nativeName: 'Sverige',
    flag: '🇸🇪',
    flagUrl: 'https://flagcdn.com/w40/se.png',
    defaultLanguage: 'sv',
    defaultCurrencyCode: 'SEK',
    currencySymbol: 'kr',
    currencyName: 'Svenska kronor',
    locale: 'sv-SE',
    timezone: 'Europe/Stockholm',
  },
  DK: {
    countryCode: 'DK',
    name: 'Danmark',
    nativeName: 'Danmark',
    flag: '🇩🇰',
    flagUrl: 'https://flagcdn.com/w40/dk.png',
    defaultLanguage: 'da',
    defaultCurrencyCode: 'DKK',
    currencySymbol: 'kr',
    currencyName: 'Danske kroner',
    locale: 'da-DK',
    timezone: 'Europe/Copenhagen',
  },
  NO: {
    countryCode: 'NO',
    name: 'Norge',
    nativeName: 'Norge',
    flag: '🇳🇴',
    flagUrl: 'https://flagcdn.com/w40/no.png',
    defaultLanguage: 'no',
    defaultCurrencyCode: 'NOK',
    currencySymbol: 'kr',
    currencyName: 'Norske kroner',
    locale: 'nb-NO',
    timezone: 'Europe/Oslo',
  },
  FI: {
    countryCode: 'FI',
    name: 'Finland',
    nativeName: 'Suomi',
    flag: '🇫🇮',
    flagUrl: 'https://flagcdn.com/w40/fi.png',
    defaultLanguage: 'fi',
    defaultCurrencyCode: 'EUR',
    currencySymbol: '€',
    currencyName: 'Euro',
    locale: 'fi-FI',
    timezone: 'Europe/Helsinki',
  },
};

export const SUPPORTED_LANGUAGES: Language[] = ['sv', 'da', 'no', 'fi', 'en'];

export const NORDIC_LANGUAGES: { code: Language; label: string; nativeLabel: string; flag: string; flagUrl: string; countryCode: string }[] = [
  { code: 'sv', label: 'Svenska', nativeLabel: 'Svenska', flag: '🇸🇪', flagUrl: 'https://flagcdn.com/w40/se.png', countryCode: 'SE' },
  { code: 'da', label: 'Dansk', nativeLabel: 'Dansk', flag: '🇩🇰', flagUrl: 'https://flagcdn.com/w40/dk.png', countryCode: 'DK' },
  { code: 'no', label: 'Norsk (bokmål)', nativeLabel: 'Norsk (bokmål)', flag: '🇳🇴', flagUrl: 'https://flagcdn.com/w40/no.png', countryCode: 'NO' },
  { code: 'fi', label: 'Suomi', nativeLabel: 'Suomi', flag: '🇫🇮', flagUrl: 'https://flagcdn.com/w40/fi.png', countryCode: 'FI' },
];

/**
 * Normalizes input language string (e.g. 'nb', 'nb-NO', 'nn' -> 'no', 'sv-SE' -> 'sv').
 */
export function normalizeLanguage(lang?: string | null): Language {
  if (!lang) return 'sv';
  const clean = lang.trim().toLowerCase().split(/[-_]/)[0];
  if (clean === 'nb' || clean === 'nn' || clean === 'no') return 'no';
  if (clean === 'da') return 'da';
  if (clean === 'fi') return 'fi';
  if (clean === 'en') return 'en';
  if (clean === 'sv') return 'sv';
  return 'sv';
}

/**
 * Detects browser's preferred language using navigator.languages or navigator.language.
 * Prioritizes Nordic languages, falls back to 'sv'.
 */
export function detectBrowserLanguage(): Language {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return 'sv';
  }

  const browserLanguages = navigator.languages || [navigator.language || ''];
  for (const raw of browserLanguages) {
    if (!raw) continue;
    const lower = raw.toLowerCase();
    if (lower.startsWith('da')) return 'da';
    if (lower.startsWith('no') || lower.startsWith('nb') || lower.startsWith('nn')) return 'no';
    if (lower.startsWith('fi')) return 'fi';
    if (lower.startsWith('sv')) return 'sv';
    if (lower.startsWith('en')) return 'en';
  }

  return 'sv';
}

/**
 * Parses language prefix from a pathname.
 * E.g. '/no/' -> { lang: 'no', subpath: '/' }
 * E.g. '/da/budget' -> { lang: 'da', subpath: '/budget' }
 * E.g. '/budget' -> { lang: null, subpath: '/budget' }
 */
export function parseLanguageFromPath(pathname: string): { lang: Language | null; subpath: string } {
  if (!pathname || pathname === '/') {
    return { lang: null, subpath: '/' };
  }

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) {
    return { lang: null, subpath: '/' };
  }

  const first = segments[0].toLowerCase();
  const normalized = normalizeLanguage(first);

  // If first segment matches a supported language prefix
  if (SUPPORTED_LANGUAGES.includes(first as Language) || ['nb', 'nn'].includes(first)) {
    const remainingSegments = segments.slice(1);
    const subpath = remainingSegments.length > 0 ? `/${remainingSegments.join('/')}` : '/';
    return { lang: normalized, subpath };
  }

  return { lang: null, subpath: pathname };
}

/**
 * Builds localized URL path with language prefix.
 * E.g. buildLanguageUrl('no', '/budget') -> '/no/budget'
 * E.g. buildLanguageUrl('sv', '/') -> '/sv/'
 */
export function buildLanguageUrl(lang: Language, subpath: string = '/'): string {
  const normLang = normalizeLanguage(lang);
  const cleanSub = subpath === '/' ? '' : subpath.startsWith('/') ? subpath : `/${subpath}`;
  return `/${normLang}${cleanSub}`;
}

/**
 * Resolves regional defaults based on language or country code.
 */
export function getRegionDefaults(langOrCountry: string): NordicRegionConfig {
  const key = (langOrCountry || '').toUpperCase();
  if (key === 'DK' || key === 'DA') return NORDIC_REGIONS.DK;
  if (key === 'NO' || key === 'NB' || key === 'NN') return NORDIC_REGIONS.NO;
  if (key === 'FI') return NORDIC_REGIONS.FI;
  return NORDIC_REGIONS.SE;
}

/**
 * Resolves standard BCP 47 locale string for formatting (sv-SE, da-DK, nb-NO, fi-FI, en-US).
 */
export function getLocaleFromLanguage(lang: string, country?: string): string {
  const norm = normalizeLanguage(lang);
  if (country) {
    const c = country.toUpperCase();
    if (c === 'DK') return norm === 'en' ? 'en-DK' : 'da-DK';
    if (c === 'NO') return norm === 'en' ? 'en-NO' : 'nb-NO';
    if (c === 'FI') return norm === 'sv' ? 'sv-FI' : norm === 'en' ? 'en-FI' : 'fi-FI';
    if (c === 'SE') return norm === 'en' ? 'en-SE' : 'sv-SE';
  }

  switch (norm) {
    case 'da': return 'da-DK';
    case 'no': return 'nb-NO';
    case 'fi': return 'fi-FI';
    case 'en': return 'en-US';
    case 'sv':
    default:
      return 'sv-SE';
  }
}

/**
 * Resolves standard timezone identifier for country / language.
 */
export function getTimezoneFromCountry(country?: string, lang?: string): string {
  if (country) {
    const c = country.toUpperCase();
    if (c === 'DK') return 'Europe/Copenhagen';
    if (c === 'NO') return 'Europe/Oslo';
    if (c === 'FI') return 'Europe/Helsinki';
    if (c === 'SE') return 'Europe/Stockholm';
  }

  const norm = normalizeLanguage(lang);
  switch (norm) {
    case 'da': return 'Europe/Copenhagen';
    case 'no': return 'Europe/Oslo';
    case 'fi': return 'Europe/Helsinki';
    case 'sv':
    default:
      return 'Europe/Stockholm';
  }
}

export const NORDIC_COUNTRIES = [
  { code: 'SE' as NordicCountry, name: 'Sverige', flag: '🇸🇪', currencyCode: 'SEK' as NordicCurrencyCode, currencySymbol: 'kr', defaultLanguage: 'sv' as Language },
  { code: 'DK' as NordicCountry, name: 'Danmark', flag: '🇩🇰', currencyCode: 'DKK' as NordicCurrencyCode, currencySymbol: 'kr', defaultLanguage: 'da' as Language },
  { code: 'NO' as NordicCountry, name: 'Norge', flag: '🇳🇴', currencyCode: 'NOK' as NordicCurrencyCode, currencySymbol: 'kr', defaultLanguage: 'no' as Language },
  { code: 'FI' as NordicCountry, name: 'Finland (Suomi)', flag: '🇫🇮', currencyCode: 'EUR' as NordicCurrencyCode, currencySymbol: '€', defaultLanguage: 'fi' as Language },
];

/**
 * Returns a Date object representing the wall-clock time in the given IANA timezone.
 */
export function getNowInTimezone(timezone?: string): Date {
  if (!timezone) return new Date();
  try {
    const now = new Date();
    const str = now.toLocaleString('en-US', { timeZone: timezone });
    return new Date(str);
  } catch {
    return new Date();
  }
}

