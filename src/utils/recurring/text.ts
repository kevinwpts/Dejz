// Gemensamma ordlistor och texthjälpare för matchning av fasta utgifter/inkomster (lövmodul).
import type { TransactionItem } from '../../app/models';
import { extractMerchantKeyVariants } from '../appCache';

const EVERYDAY_GROCERY_OR_FOOD_KEYWORDS = [
  'ica maxi',
  'maxi ica',
  'ica kvantum',
  'ica supermarket',
  'ica nära',
  'ica nara',
  'stora coop',
  'coop ',
  'willys',
  'hemköp',
  'hemkop',
  'lidl',
  'city gross',
  'systembolaget',
  'mcdonalds',
  'max burgers',
  'max hamburger',
  'burger king',
  'espresso house',
  'pressbyrån',
  'pressbyran',
  '7-eleven',
  'foodora',
  'wolt',
];

export const GENERIC_WRAPPER_WORDS = new Set([
  'hyra',
  'boende',
  'lön',
  'lon',
  'ab',
  'aktiebolag',
  'sverige',
  'sweden',
  'se',
  'autogiro',
  'bankgiro',
  'plusgiro',
  'kort',
  'kortköp',
  'kortkop',
  'betalning',
  'månadsavgift',
  'manadsavgift',
  'abonnemang',
  'försäkring',
  'forsakring',
  'hemförsäkring',
  'hemforsakring',
  'bilförsäkring',
  'bilforsakring',
  'barnförsäkring',
  'barnforsakring',
  'olycksfallsförsäkring',
  'olycksfallsforsakring',
  'el',
  'bredband',
  'mobil',
  'plus',
  'premium',
  'standard',
  'familj',
  'individual',
  'swish',
  'klarna',
]);

const HYBRID_SUBSCRIPTION_AND_ONEOFF_KEYWORDS = [
  'apple',
  'itunes',
  'app store',
  'google',
  'youtube',
  'klarna',
  'qliro',
  'walley',
  'svea',
  'amazon',
  'paypal',
  'swish',
  'ica',
  'coop',
  'sj ',
  'sl ',
  'skånetrafiken',
  'skanetrafiken',
  'västtrafik',
  'vasttrafik',
  'easypark',
  'aimo',
  'parkster',
  'uber',
  'bolt',
  'foodora',
  'wolt',
];

/** Gemener utan accenter: "ÖRESUNDSKRAFT" och "Oresundskraft" blir lika. */
export function foldForMatching(value: string): string {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function extractSpecificBrandTokens(name: string): string[] {
  const variants = extractMerchantKeyVariants(name);
  const tokens = new Set<string>();

  for (const v of variants) {
    if (v.length >= 3 && !GENERIC_WRAPPER_WORDS.has(v)) {
      tokens.add(v);
    }
    const cleaned = v
      .replace(/[()[\]/.,:;-]+/g, ' ')
      .split(/\s+/)
      .map((w) => w.trim())
      .filter((w) => w.length >= 4 && !GENERIC_WRAPPER_WORDS.has(w));
    for (const word of cleaned) {
      tokens.add(word);
    }
  }

  return Array.from(tokens);
}

export function isEverydayGroceryPurchase(combinedNorm: string): boolean {
  const padded = ` ${combinedNorm} `;
  if (
    padded.includes(' ica ') &&
    !padded.includes('försäkring') &&
    !padded.includes('forsakring') &&
    !padded.includes('banken')
  ) {
    return true;
  }
  if (padded.includes(' coop ')) {
    return true;
  }
  return EVERYDAY_GROCERY_OR_FOOD_KEYWORDS.some((kw) => combinedNorm.includes(kw));
}

export function isHybridSubscriptionAndOneOffMerchant(tx: Partial<TransactionItem>): boolean {
  const combined = `${tx.title || ''} ${tx.rawDescription || ''} ${tx.counterpartyName || ''}`
    .toLowerCase()
    .trim();
  if (!combined) return false;
  return HYBRID_SUBSCRIPTION_AND_ONEOFF_KEYWORDS.some((kw) => combined.includes(kw));
}
