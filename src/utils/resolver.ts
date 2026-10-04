import { Transaction, Config } from '../types';
import { getInstantBrandLogo, findKnownBrandDomain, getLogoUrl } from './logo';
import { resolveLucideIcon, ICON_MAP, getCategoryIconName, suggestIcon, isEmojiString } from './icons';
import { getEmojiSolidColor } from './ui';
import { ArrowUp, Receipt, PiggyBank } from 'lucide-react';

export interface EntityVisualResult {
  type: 'custom' | 'merchant' | 'category' | 'fallback';
  logoUrl?: string;
  iconKey?: string;
  iconComponent?: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  backgroundColor?: string;
  textColor?: string;
  source: 'manual' | 'user_preference' | 'brand_auto' | 'category' | 'fallback';
  merchantNormalized?: string;
}

// Normalize merchant name for robust matching (e.g. "Lidl Sverige AB" -> "lidl")
export function normalizeMerchant(name?: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\b(ab|sverige|sweden|group|holding|nordic|as|oy|aps|inc|llc|co)\b/g, '')
    .replace(/[^\w\säöå]/gi, '')
    .trim()
    .replace(/\s+/g, ' ');
}

// Clear legacy custom preferences & caches as requested
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('dejz_merchant_preferences');
    localStorage.removeItem('dejz_logo_visual_cache_v2');
  } catch {
    // Ignore storage errors
  }
}

// User saved merchant preferences (cleaned up for standard fintech behavior)
export function getMerchantPreference(_merchant?: string): { icon?: string; logo?: string } | null {
  return null;
}

export function saveMerchantPreference(merchant: string, preference: { icon?: string; logo?: string }) {
  if (!merchant) return;
  const key = normalizeMerchant(merchant);
  if (!key) return;
  try {
    const stored = localStorage.getItem('dejz_merchant_preferences');
    const prefs = stored ? JSON.parse(stored) : {};
    prefs[key] = { ...prefs[key], ...preference };
    localStorage.setItem('dejz_merchant_preferences', JSON.stringify(prefs));
  } catch (err) {
    console.error('Failed to save merchant preference', err);
  }
}

/**
 * Central Resolver for Transaction / Entity Visual Representation (Logo, Icon, Colors)
 * Priority order:
 * 1. Manual item override (explicit transaction.logo or transaction.icon)
 * 2. Saved user preference for normalized merchant
 * 3. Secure automated company logo (high-confidence brand dictionary)
 * 4. Category icon from category source of truth
 * 5. General fallback icon
 */
export function resolveEntityVisual(transaction: Transaction, config?: Config): EntityVisualResult {
  const merchantText = transaction.merchant || transaction.note || '';
  const categoryText = typeof transaction.category === 'object' ? (transaction.category as any)?.name : (transaction.category || '');
  
  // Find category in config for color/icon source of truth
  const searchCategory = categoryText.trim().toLowerCase();
  const category = config ? [...(config.categories || []), ...(config.incomeCategories || [])].find(
    c => c.name.trim().toLowerCase() === searchCategory
  ) : null;

  // Special savings pot case
  if (transaction.type === 'savings' || categoryText === 'Spargris') {
    return {
      type: 'fallback',
      iconComponent: PiggyBank,
      source: 'fallback',
      backgroundColor: category?.color || '#05B862',
      textColor: '#ffffff'
    };
  }

  // 1. Manual override for the specific item
  const explicitLogo = transaction.logo && transaction.logo !== 'none' ? transaction.logo : null;
  const explicitIcon = transaction.icon && transaction.icon !== 'none' && transaction.icon !== 'receipt' && transaction.icon !== '🧾' ? transaction.icon : null;

  if (explicitLogo) {
    if (explicitLogo.startsWith('http') || explicitLogo.startsWith('data:image') || explicitLogo.startsWith('/')) {
      return {
        type: 'custom',
        logoUrl: explicitLogo,
        source: 'manual'
      };
    }
    if (isEmojiString(explicitLogo) || ICON_MAP[resolveLucideIcon(explicitLogo)]) {
      const resolvedKey = resolveLucideIcon(explicitLogo);
      return {
        type: 'custom',
        iconKey: resolvedKey,
        iconComponent: ICON_MAP[resolvedKey] || Receipt,
        backgroundColor: category?.color || getEmojiSolidColor(explicitLogo),
        textColor: '#ffffff',
        source: 'manual'
      };
    }
  }

  if (explicitIcon) {
    const resolvedKey = resolveLucideIcon(explicitIcon);
    return {
      type: 'custom',
      iconKey: resolvedKey,
      iconComponent: ICON_MAP[resolvedKey] || Receipt,
      backgroundColor: category?.color || getEmojiSolidColor(explicitIcon),
      textColor: '#ffffff',
      source: 'manual'
    };
  }

  // 2. Saved user preference for the normalized merchant/company
  const userPref = getMerchantPreference(merchantText);
  if (userPref) {
    if (userPref.logo) {
      return {
        type: 'merchant',
        logoUrl: userPref.logo,
        source: 'user_preference',
        merchantNormalized: normalizeMerchant(merchantText)
      };
    }
    if (userPref.icon) {
      const resolvedKey = resolveLucideIcon(userPref.icon);
      return {
        type: 'merchant',
        iconKey: resolvedKey,
        iconComponent: ICON_MAP[resolvedKey] || Receipt,
        backgroundColor: category?.color || getEmojiSolidColor(userPref.icon),
        textColor: '#ffffff',
        source: 'user_preference',
        merchantNormalized: normalizeMerchant(merchantText)
      };
    }
  }

  // 3. Secure automated company logo (High-confidence brand lookup)
  const instantSvg = getInstantBrandLogo(merchantText, categoryText) || getInstantBrandLogo(transaction.merchant || '', categoryText);
  if (instantSvg) {
    return {
      type: 'merchant',
      logoUrl: instantSvg,
      source: 'brand_auto',
      merchantNormalized: normalizeMerchant(merchantText)
    };
  }

  const brandDomain = findKnownBrandDomain(merchantText, categoryText) || findKnownBrandDomain(transaction.merchant || '', categoryText);
  if (brandDomain) {
    const brandLogoUrl = `https://www.google.com/s2/favicons?domain=${brandDomain}&sz=128`;
    return {
      type: 'merchant',
      logoUrl: brandLogoUrl,
      source: 'brand_auto',
      merchantNormalized: normalizeMerchant(merchantText)
    };
  }

  // Also try fuzzy fallback brand lookup if merchant text is clean
  if (merchantText && merchantText.length >= 2) {
    const fuzzyLogo = getLogoUrl(merchantText, categoryText);
    // Only use fuzzy auto logo if it's high confidence (e.g. recognized domain)
    if (fuzzyLogo && !fuzzyLogo.includes('default')) {
      // Check if we have a known instant domain match
      const norm = normalizeMerchant(merchantText);
      if (norm.length > 2) {
        return {
          type: 'merchant',
          logoUrl: fuzzyLogo,
          source: 'brand_auto',
          merchantNormalized: norm
        };
      }
    }
  }

  // 4. Category icon from category source of truth
  const categoryIconName = category?.icon || getCategoryIconName(categoryText);
  if (categoryIconName) {
    const resolvedKey = resolveLucideIcon(categoryIconName);
    return {
      type: 'category',
      iconKey: resolvedKey,
      iconComponent: ICON_MAP[resolvedKey] || Receipt,
      backgroundColor: category?.color || getEmojiSolidColor(categoryIconName),
      textColor: '#ffffff',
      source: 'category'
    };
  }

  // Suggest icon based on merchant/note text if category icon missing
  const suggested = suggestIcon(merchantText);
  if (suggested && suggested !== 'receipt' && suggested !== '🧾') {
    const resolvedKey = resolveLucideIcon(suggested);
    return {
      type: 'category',
      iconKey: resolvedKey,
      iconComponent: ICON_MAP[resolvedKey] || Receipt,
      backgroundColor: category?.color || getEmojiSolidColor(suggested),
      textColor: '#ffffff',
      source: 'category'
    };
  }

  // 5. General fallback icon
  const DefaultIcon = transaction.type === 'income' ? ArrowUp : Receipt;
  return {
    type: 'fallback',
    iconComponent: DefaultIcon,
    backgroundColor: category?.color || '#6E6961',
    textColor: '#ffffff',
    source: 'fallback'
  };
}

/**
 * Resolves the automatic merchant logo URL for a merchant name if one exists with high confidence.
 * Returns undefined if no safe automatic merchant logo is recognized.
 */
export function getAutomaticMerchantLogo(merchantName?: string, categoryName?: string): string | undefined {
  if (!merchantName || merchantName.trim().length < 2) return undefined;
  const visual = resolveEntityVisual({
    id: 'temp',
    merchant: merchantName.trim(),
    note: '',
    category: categoryName || '',
    amount: 0,
    timestamp: Date.now(),
    type: 'expense',
    tags: []
  });
  if (visual.type === 'merchant' && visual.logoUrl) {
    return visual.logoUrl;
  }
  return undefined;
}

/**
 * Checks whether a given logo URL is an automatic corporate/merchant logo
 * (e.g. Google favicon, instant brand SVG, Clearbit, DuckDuckGo, logo.dev)
 * rather than a user's uploaded custom image.
 */
export function isAutomaticMerchantLogo(url?: string, merchantName?: string): boolean {
  if (!url || url === 'none') return false;

  // Instant brand vector SVG data URI
  if (url.startsWith('data:image/svg+xml')) return true;

  // Favicon providers and corporate logo APIs
  if (
    url.includes('google.com/s2/favicons') ||
    url.includes('logo.clearbit.com') ||
    url.includes('img.logo.dev') ||
    url.includes('icons.duckduckgo.com')
  ) {
    return true;
  }

  // Matches auto-resolved logo
  if (merchantName) {
    const autoLogo = getAutomaticMerchantLogo(merchantName);
    if (autoLogo && (url === autoLogo || url.includes(autoLogo) || autoLogo.includes(url))) {
      return true;
    }
    const instant = getInstantBrandLogo(merchantName);
    if (instant && url === instant) return true;
    const knownDomain = findKnownBrandDomain(merchantName);
    if (knownDomain && url.includes(knownDomain)) return true;
    const autoUrl = getLogoUrl(merchantName);
    if (autoUrl && url === autoUrl) return true;
  }

  return false;
}

