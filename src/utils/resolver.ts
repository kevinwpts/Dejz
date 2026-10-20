import React from 'react';
import { Transaction, Config } from '../types';
import { findKnownBrandDomain, getLogoUrl, sanitizeLogoUrl, getDomainPrimaryLogoUrl } from './logo';
import { resolveLucideIcon, ICON_MAP, getCategoryIconName, suggestIcon, isEmojiString } from './icons';
import { getEmojiSolidColor } from './ui';
import { ArrowUp, Receipt, PiggyBank } from 'lucide-react';

export interface EntityVisualResult {
  type: 'custom' | 'merchant' | 'category' | 'fallback';
  logoUrl?: string;
  iconKey?: string;
  categoryIcon?: string;
  categoryName?: string;
  iconComponent?: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  backgroundColor?: string;
  textColor?: string;
  source: 'manual' | 'user_preference' | 'brand_auto' | 'category' | 'fallback' | 'neutral_placeholder';
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
 * 1. Manual item override (explicit transaction.logo URL or manual icon override)
 * 2. Automated company logo (high-confidence Swedish & international brand dictionary)
 * 3. Explicit / Category icon from category source of truth
 * 4. General fallback icon
 */
export function resolveEntityVisual(transaction: Transaction, config?: Config): EntityVisualResult {
  const merchantText = transaction.merchant || (transaction as any).name || transaction.note || '';
  const categoryText = typeof transaction.category === 'object' ? (transaction.category as any)?.name : (transaction.category || '');
  
  // Find category in config for color/icon source of truth
  const searchCategory = (categoryText || '').trim().toLowerCase();
  const category = config ? [...(config.categories || []), ...(config.incomeCategories || [])].find(
    c => c?.id === (transaction as any).categoryId ||
         c?.id === transaction.category ||
         (c?.name || '').trim().toLowerCase() === searchCategory ||
         (c?.id || '').trim().toLowerCase() === searchCategory
  ) : null;

  // Special savings pot case
  if (transaction.type === 'savings' || categoryText === 'Spargris') {
    return {
      type: 'fallback',
      iconComponent: PiggyBank,
      source: 'fallback',
      backgroundColor: category?.color || '#05B862',
      textColor: '#0B0B0F'
    };
  }

  const rawLogo = transaction.logo && transaction.logo !== 'none' && transaction.logo !== 'none-manual' ? transaction.logo : null;
  const explicitIcon = transaction.icon && transaction.icon !== 'none' && transaction.icon !== 'receipt' && transaction.icon !== '🧾' ? transaction.icon : null;

  // 1. Explicit logo URL or manual emoji/icon in transaction.logo
  if (rawLogo) {
    if (rawLogo.startsWith('http') || rawLogo.startsWith('data:image') || rawLogo.startsWith('/')) {
      const sanitized = sanitizeLogoUrl(rawLogo, merchantText, categoryText) || rawLogo;
      if (sanitized.includes('google.com/s2/favicons')) {
        const upgraded = getLogoUrl(merchantText, categoryText);
        if (upgraded && !upgraded.includes('google.com/s2/favicons')) {
          return {
            type: 'merchant',
            logoUrl: upgraded,
            source: 'brand_auto',
            merchantNormalized: normalizeMerchant(merchantText)
          };
        }
      }
      return {
        type: 'custom',
        logoUrl: sanitized,
        source: 'manual'
      };
    }
    if (isEmojiString(rawLogo) || ICON_MAP[resolveLucideIcon(rawLogo)]) {
      const resolvedKey = resolveLucideIcon(rawLogo);
      return {
        type: 'custom',
        iconKey: rawLogo,
        categoryIcon: rawLogo,
        iconComponent: ICON_MAP[resolvedKey] || Receipt,
        backgroundColor: category?.color || getEmojiSolidColor(rawLogo),
        textColor: '#0B0B0F',
        source: 'manual'
      };
    }
  }

  // 2. Automated company logo (Verified high-confidence brand lookup via curated dictionary)
  // Runs unless user explicitly chose 'none-manual' to hide brand logo
  if (transaction.logo !== 'none-manual' && merchantText && merchantText.trim().length >= 2) {
    const brandDomain = findKnownBrandDomain(merchantText, categoryText) || findKnownBrandDomain(transaction.merchant || '', categoryText);
    if (brandDomain) {
      const brandLogoUrl = getLogoUrl(merchantText, categoryText) || getDomainPrimaryLogoUrl(brandDomain);
      return {
        type: 'merchant',
        logoUrl: brandLogoUrl,
        source: 'brand_auto',
        merchantNormalized: normalizeMerchant(merchantText)
      };
    }
  }

  // 3. Explicit icon on transaction
  if (explicitIcon) {
    const resolvedKey = resolveLucideIcon(explicitIcon);
    return {
      type: 'custom',
      iconKey: explicitIcon,
      categoryIcon: explicitIcon,
      categoryName: category?.name || categoryText,
      iconComponent: ICON_MAP[resolvedKey] || Receipt,
      backgroundColor: category?.color || getEmojiSolidColor(explicitIcon),
      textColor: '#0B0B0F',
      source: 'manual'
    };
  }

  // If this is an empty/unmatched new transaction preview inside TransactionModal
  if (transaction.id === 'preview') {
    return {
      type: 'fallback',
      iconKey: 'receipt',
      iconComponent: Receipt,
      backgroundColor: 'var(--surface-muted)',
      textColor: 'var(--text-secondary)',
      source: 'neutral_placeholder'
    };
  }

  // 4. Category icon from category source of truth
  const categoryIconName = category?.icon || getCategoryIconName(categoryText);
  if (categoryIconName) {
    const resolvedKey = resolveLucideIcon(categoryIconName);
    return {
      type: 'category',
      iconKey: category?.icon || resolvedKey,
      categoryIcon: category?.icon || categoryIconName,
      categoryName: category?.name || categoryText,
      iconComponent: ICON_MAP[resolvedKey] || Receipt,
      backgroundColor: category?.color || getEmojiSolidColor(categoryIconName),
      textColor: '#0B0B0F',
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
      categoryIcon: suggested,
      categoryName: category?.name || categoryText || merchantText,
      iconComponent: ICON_MAP[resolvedKey] || Receipt,
      backgroundColor: category?.color || getEmojiSolidColor(suggested),
      textColor: '#0B0B0F',
      source: 'category'
    };
  }

  // 5. General fallback icon
  const DefaultIcon = transaction.type === 'income' ? ArrowUp : Receipt;
  return {
    type: 'fallback',
    iconComponent: DefaultIcon,
    backgroundColor: category?.color || '#6E6961',
    textColor: '#0B0B0F',
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
  if (!url || url === 'none' || url === 'none-manual') return false;

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

    const knownDomain = findKnownBrandDomain(merchantName);
    if (knownDomain && url.includes(knownDomain)) return true;
    const autoUrl = getLogoUrl(merchantName);
    if (autoUrl && url === autoUrl) return true;
  }

  return false;
}
