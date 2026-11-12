// Gissar kategori, betalsätt och logga när användaren själv skriver ett namn (t.ex. "Netflix", "A-kassa", "ICA").
import { SWEDISH_EXPENSE_PRESETS } from '../../../data/swedishExpensePresets';
import { getLogoUrl, getLearnedBrandCategory } from '../../logo';
import { getStoredPaymentMethods, normalizeCategoryToValid } from '../../cache/categories';
import { resolveMerchantAlias } from '../../cache/merchants';
import { EVERYDAY_MERCHANT_RULES, EXTENDED_FIXED_EXPENSE_RULES } from '../merchantRules';
import { MANUAL_KEYWORD_GROUPS } from './manualKeywordGroups';

/** Vad appen gissar om ett namn. */
export interface ManualCategoryGuess {
  category?: string;
  paymentMethod?: string;
  logo?: string;
}

type NameKind = 'fixed' | 'income' | 'transaction';

/** Inkomstregler i prioritetsordning (bidrag, pension, Swish, lön). */
const INCOME_NAME_RULES: Array<{ keywords: string[]; category: string; paymentMethod?: string }> = [
  {
    keywords: [
      'barnbidrag', 'försäkringskassan', 'forsakringskassan', 'fkassa', 'föräldrapenning',
      'foraldrapenning', 'sjukpenning', 'bostadsbidrag', 'aktivitetsstöd', 'aktivitetsersättning',
      'sjukersättning', 'underhållsstöd', 'csn', 'studiestöd', 'studiestod', 'studiemedel', 'bidrag',
      'a-kassa', 'a kassa', 'akassa', 'alfakassan', 'alfa-kassan', 'unionen', 'akademikernas', 'småa',
      'smaa', 'arbetslöshetsersättning', 'ersättning',
    ],
    category: 'Bidrag',
  },
  {
    keywords: ['pension', 'pensionsmyndigheten', 'alecta', 'amf', 'kåpan', 'min pension', 'tjänstepension', 'spv'],
    category: 'Pension',
  },
  { keywords: ['swish'], category: 'Swish', paymentMethod: 'Swish' },
  { keywords: ['lön', 'lon', 'salary', 'arvode', 'löneutbetalning', 'bonus', 'timlön'], category: 'Lön' },
];

/** Betalsätt-ord och vilket sparat betalsätt de ska matcha (annars standardnamnet). */
const PAYMENT_METHOD_ALIASES: Array<{
  matches: (lower: string) => boolean;
  findStored: (storedLower: string) => boolean;
  fallback: string;
}> = [
  {
    matches: (l) => l.includes('bankgiro') || l.includes('plusgiro'),
    findStored: (m) => m.includes('bankgiro') || m.includes('plusgiro'),
    fallback: 'Bankgiro / Plusgiro',
  },
  { matches: (l) => l.includes('autogiro'), findStored: (m) => m.includes('autogiro'), fallback: 'Autogiro' },
  { matches: (l) => l.includes('kort'), findStored: (m) => m.includes('kort'), fallback: 'Kort' },
  {
    matches: (l) => l.includes('e-faktura') || l.includes('efaktura'),
    findStored: (m) => m.includes('e-faktura'),
    fallback: 'E-faktura',
  },
  { matches: (l) => l.includes('faktura'), findStored: (m) => m === 'faktura', fallback: 'Faktura' },
  { matches: (l) => l.includes('swish'), findStored: (m) => m.includes('swish'), fallback: 'Swish' },
];

/**
 * Översätter ett betalsätt till ett som användaren har sparat (t.ex. "Bankgiro" → "Bankgiro / Plusgiro").
 * Okända betalsätt ges tillbaka som de är.
 */
export function normalizePaymentMethodName(rawMethod: string | undefined): string | undefined {
  if (!rawMethod) return undefined;
  const stored = getStoredPaymentMethods().map((m) => m.name);
  if (stored.includes(rawMethod)) return rawMethod;
  const lower = rawMethod.toLowerCase();
  const alias = PAYMENT_METHOD_ALIASES.find((a) => a.matches(lower));
  if (!alias) return rawMethod;
  return stored.find((m) => alias.findStored(m.toLowerCase())) || alias.fallback;
}

/**
 * Sant om nyckelordet finns i texten. Korta ord (högst 3 tecken, t.ex. "sl", "el", "dn")
 * måste stå som eget ord, och ord som slutar med mellanslag ("ica ") matchar bara hela ord.
 */
export function matchesKeywordSmart(text: string, kw: string): boolean {
  const cleanKw = kw.toLowerCase();
  const trimmedKw = cleanKw.trim();
  if (!trimmedKw) return false;
  if (cleanKw.endsWith(' ')) {
    const padded = ` ${text} `;
    return padded.includes(` ${trimmedKw} `) || text === trimmedKw || text.startsWith(cleanKw);
  }
  if (trimmedKw.length <= 3 && /^[a-zåäö0-9]+$/i.test(trimmedKw)) {
    const escaped = trimmedKw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(^|[^a-zåäö0-9])${escaped}($|[^a-zåäö0-9])`, 'i').test(text);
  }
  return text.includes(trimmedKw);
}

const matchesAny = (text: string, keywords: string[]) => keywords.some((kw) => matchesKeywordSmart(text, kw));

/** Inkomstnamn: bidrag, pension, Swish eller lön – annars null. */
function guessIncomeName(text: string, trimmed: string): ManualCategoryGuess | null {
  const rule = INCOME_NAME_RULES.find((r) => matchesAny(text, r.keywords));
  if (!rule) return null;
  const category = normalizeCategoryToValid(rule.category, 'income');
  return rule.paymentMethod
    ? { category, paymentMethod: rule.paymentMethod, logo: getLogoUrl(trimmed) }
    : { category, logo: getLogoUrl(trimmed) };
}

/** Kända abonnemang/räkningar (Netflix, Tibber, Hedvig …) och förval från listan med svenska utgifter. */
function guessFromFixedRulesAndPresets(text: string, trimmed: string): ManualCategoryGuess | null {
  const rule = EXTENDED_FIXED_EXPENSE_RULES.find((r) => matchesAny(text, r.keywords));
  if (rule) {
    return {
      category: normalizeCategoryToValid(rule.category, 'expense'),
      paymentMethod: normalizePaymentMethodName(rule.paymentMethod),
      logo: getLogoUrl(rule.fallbackName || trimmed),
    };
  }
  const preset = SWEDISH_EXPENSE_PRESETS.find((p) => {
    const presetNameLower = p.name.toLowerCase();
    return presetNameLower === text || (text.length >= 3 && matchesKeywordSmart(text, presetNameLower));
  });
  if (!preset) return null;
  return {
    category: normalizeCategoryToValid(preset.category, 'expense'),
    paymentMethod: normalizePaymentMethodName(preset.paymentMethod),
    logo: getLogoUrl(preset.name),
  };
}

/** Vardagsbutiker (ICA, Foodora, IKEA …) och kategorier som AI:n lärt sig tidigare. */
function guessEverydayMerchant(text: string, trimmed: string, kind: NameKind): ManualCategoryGuess | null {
  const paymentMethod = kind === 'transaction' ? 'Kort' : undefined;
  const merch = EVERYDAY_MERCHANT_RULES.find(
    (m) => m.cleanName.toLowerCase() === text || matchesAny(text, m.keywords)
  );
  if (merch) {
    return {
      category: normalizeCategoryToValid(merch.preferredCategories[0] || 'Övrigt', 'expense'),
      paymentMethod,
      logo: getLogoUrl(merch.cleanName),
    };
  }
  const learnedCategory = getLearnedBrandCategory(trimmed);
  if (!learnedCategory) return null;
  return {
    category: normalizeCategoryToValid(learnedCategory, 'expense'),
    paymentMethod,
    logo: getLogoUrl(trimmed, learnedCategory),
  };
}

/** Breda svenska nyckelord som sista utväg (hyra, el, gym, pizza …). */
function guessFromManualKeywords(text: string, trimmed: string, kind: NameKind): ManualCategoryGuess | null {
  const group = MANUAL_KEYWORD_GROUPS.find((g) => matchesAny(text, g.keywords));
  if (!group) return null;
  const method = kind === 'fixed' && group.paymentMethodWhenFixed ? group.paymentMethodWhenFixed : group.paymentMethod;
  return {
    category: normalizeCategoryToValid(group.category, 'expense'),
    paymentMethod: normalizePaymentMethodName(method),
    logo: getLogoUrl(trimmed),
  };
}

/**
 * Gissar kategori, betalsätt och logga när användaren själv skriver ett namn på en butik,
 * räkning eller inkomst (t.ex. "Riksbyggen", "Netflix", "A-kassa", "SATS", "ICA").
 * Ordning: användarens egna alias → inkomstregler → abonnemang/förval → butiker → nyckelord.
 * Ger null om inget passar.
 */
export function inferCategoryAndMethodFromName(rawName: string, kind: NameKind): ManualCategoryGuess | null {
  try {
    const trimmed = (rawName || '').trim();
    if (trimmed.length < 2) return null;
    const text = trimmed.toLowerCase();

    const alias = resolveMerchantAlias(trimmed);
    if (alias?.category) {
      return {
        category: normalizeCategoryToValid(alias.category, kind === 'income' ? 'income' : 'expense'),
        logo: getLogoUrl(alias.name || trimmed),
      };
    }
    if (kind === 'income') return guessIncomeName(text, trimmed);

    return (
      guessFromFixedRulesAndPresets(text, trimmed) ||
      guessEverydayMerchant(text, trimmed, kind) ||
      guessFromManualKeywords(text, trimmed, kind)
    );
  } catch {
    return null;
  }
}
