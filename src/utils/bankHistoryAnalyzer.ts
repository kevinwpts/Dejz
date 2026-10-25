import { BankTransactionItem } from '../services/bankService';
import { SWEDISH_EXPENSE_PRESETS, SwedishExpensePreset } from '../data/swedishExpensePresets';
import { FixedExpense, Frequency, Income, PaydayType, WeekendAdjustment } from '../types';
import { getLogoUrl } from './logo';
import { getPeriodBoundaries } from './date';

export interface AnalyzedBankOnboardingData {
  detectedFixedExpenses: Array<Omit<FixedExpense, 'id'> & { detectedOccurrences: number; lastDate?: string }>;
  detectedIncomes: Array<Omit<Income, 'id'>>;
  suggestedPayday: number | null;
  calculatedSpentSincePayday: number;
  analyzedTransactionCount: number;
}

interface KeywordRule {
  keywords: string[];
  presetId?: string;
  fallbackName: string;
  category: string;
  paymentMethod: string;
}

const EXTENDED_FIXED_EXPENSE_RULES: KeywordRule[] = [
  // Streaming & Media
  { keywords: ['spotify'], presetId: 'spotify-individual', fallbackName: 'Spotify', category: 'Streaming', paymentMethod: 'Kort' },
  { keywords: ['netflix'], presetId: 'netflix-standard', fallbackName: 'Netflix', category: 'Streaming', paymentMethod: 'Kort' },
  { keywords: ['youtube', 'google *youtube', 'google*youtube'], presetId: 'youtube-premium', fallbackName: 'YouTube Premium', category: 'Streaming', paymentMethod: 'Kort' },
  { keywords: ['disney+', 'disney plus', 'disneyplus'], presetId: 'disney-plus', fallbackName: 'Disney+', category: 'Streaming', paymentMethod: 'Kort' },
  { keywords: ['hbo', 'max.com', 'hbomax', 'warnermedia'], presetId: 'max-hbo', fallbackName: 'Max (HBO)', category: 'Streaming', paymentMethod: 'Kort' },
  { keywords: ['viaplay'], presetId: 'viaplay-film-serier', fallbackName: 'Viaplay', category: 'Streaming', paymentMethod: 'Kort' },
  { keywords: ['tv4 play', 'tv4play', 'tv4 ab'], presetId: 'tv4-play-plus', fallbackName: 'TV4 Play Plus', category: 'Streaming', paymentMethod: 'Kort' },
  { keywords: ['prime video', 'amazon prime'], presetId: 'prime-video', fallbackName: 'Amazon Prime', category: 'Streaming', paymentMethod: 'Kort' },
  { keywords: ['skyshowtime'], presetId: 'skyshowtime', fallbackName: 'SkyShowtime', category: 'Streaming', paymentMethod: 'Kort' },
  { keywords: ['discovery+', 'discovery plus'], presetId: 'discovery-plus', fallbackName: 'Discovery+', category: 'Streaming', paymentMethod: 'Kort' },
  { keywords: ['storytel'], presetId: 'storytel-ljudbok', fallbackName: 'Storytel', category: 'Streaming', paymentMethod: 'Kort' },
  { keywords: ['bookbeat'], presetId: 'bookbeat', fallbackName: 'BookBeat', category: 'Streaming', paymentMethod: 'Kort' },
  { keywords: ['nextory'], presetId: 'nextory', fallbackName: 'Nextory', category: 'Streaming', paymentMethod: 'Kort' },
  { keywords: ['podme'], presetId: 'podme', fallbackName: 'PodMe Premium', category: 'Streaming', paymentMethod: 'Kort' },
  { keywords: ['audible'], presetId: 'audible', fallbackName: 'Audible', category: 'Streaming', paymentMethod: 'Kort' },
  { keywords: ['tidal'], presetId: 'tidal', fallbackName: 'Tidal', category: 'Streaming', paymentMethod: 'Kort' },

  // Boende, El & Larm
  { keywords: ['hyra', 'bostadsrätt', 'bostadsratt', 'brf ', 'hsb ', 'riksbyggen', 'sbc ', 'heimstaden', 'rikky', 'wallenstam', 'willhem', 'akelius', 'stena fastighet', 'balder', 'familjebostäder', 'poseidon', 'stockholmshem', 'svenska bostäder', 'mimer', 'gavlegårdarna', ' Uppsalahem', 'botkyrkabyggen', 'huge bostäder'], presetId: 'hyra-bostad', fallbackName: 'Hyra / Månadsavgift', category: 'Boende', paymentMethod: 'Bankgiro' },
  { keywords: ['bolån', 'bolan', 'bostadslån', 'hypotek', 'sbab', 'landshypotek', 'stabelo', 'amortering'], presetId: 'bostadslan-ranta', fallbackName: 'Bolån & Ränta', category: 'Boende', paymentMethod: 'Autogiro' },
  { keywords: ['tibber'], presetId: 'tibber-el', fallbackName: 'Tibber El', category: 'Boende', paymentMethod: 'Autogiro' },
  { keywords: ['vattenfall'], presetId: 'vattenfall-el', fallbackName: 'Vattenfall', category: 'Boende', paymentMethod: 'Autogiro' },
  { keywords: ['fortum'], presetId: 'fortum-el', fallbackName: 'Fortum', category: 'Boende', paymentMethod: 'Autogiro' },
  { keywords: ['ellevio', 'e.on', 'eon energi', 'göteborg energi', 'goteborg energi', 'skånska energi', 'kraftringen', 'jämtkraft', 'mälarenergi', 'tekniska verken', 'greenely', ' Bixia', 'godel'], presetId: 'elavtal', fallbackName: 'Elräkning & Nät', category: 'Boende', paymentMethod: 'Autogiro' },
  { keywords: ['verisure'], presetId: 'larm-verisure', fallbackName: 'Verisure Larm', category: 'Boende', paymentMethod: 'Autogiro' },
  { keywords: ['sector alarm'], presetId: 'larm-sector-alarm', fallbackName: 'Sector Alarm', category: 'Boende', paymentMethod: 'Autogiro' },

  // Försäkringar
  { keywords: ['hedvig'], presetId: 'hedvig-hemforsakring', fallbackName: 'Hedvig Försäkring', category: 'Försäkringar', paymentMethod: 'Kort' },
  { keywords: ['länsförsäkringar', 'lansforsakringar', 'lf försäkring'], presetId: 'lansforsakringar-hem', fallbackName: 'Länsförsäkringar', category: 'Försäkringar', paymentMethod: 'Autogiro' },
  { keywords: ['trygg-hansa', 'trygghansa'], presetId: 'trygghansa-hem', fallbackName: 'Trygg-Hansa', category: 'Försäkringar', paymentMethod: 'Autogiro' },
  { keywords: ['if skadeförsäkring', 'if skadeforsakring', 'if försäkring'], presetId: 'if-hemforsakring', fallbackName: 'If Försäkring', category: 'Försäkringar', paymentMethod: 'Autogiro' },
  { keywords: ['folksam'], presetId: 'folksam-hem', fallbackName: 'Folksam', category: 'Försäkringar', paymentMethod: 'Autogiro' },
  { keywords: ['agria'], presetId: 'djurforsakring-agria', fallbackName: 'Agria Djurförsäkring', category: 'Försäkringar', paymentMethod: 'Autogiro' },
  { keywords: ['lassie'], presetId: 'lassie-djurforsakring', fallbackName: 'Lassie Djurförsäkring', category: 'Försäkringar', paymentMethod: 'Kort' },
  { keywords: ['ica försäkring', 'ica forsakring', 'moderna försäkringar', 'gjensidige', 'dina försäkringar', 'watercircles', 'svedea', 'bliwa'], presetId: 'hemforsakring', fallbackName: 'Försäkring', category: 'Försäkringar', paymentMethod: 'Autogiro' },

  // Mobil & Bredband
  { keywords: ['tele2'], presetId: 'tele2-mobil', fallbackName: 'Tele2', category: 'Abonnemang', paymentMethod: 'Autogiro' },
  { keywords: ['telia'], presetId: 'telia-mobil', fallbackName: 'Telia', category: 'Abonnemang', paymentMethod: 'Autogiro' },
  { keywords: ['telenor'], presetId: 'telenor-mobil', fallbackName: 'Telenor', category: 'Abonnemang', paymentMethod: 'Autogiro' },
  { keywords: ['hi3g', 'tre sverige', '3 sverige'], presetId: 'tre-mobil', fallbackName: 'Tre (3)', category: 'Abonnemang', paymentMethod: 'Autogiro' },
  { keywords: ['vimla'], presetId: 'vimla-mobil', fallbackName: 'Vimla', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['hallon'], presetId: 'hallon-mobil', fallbackName: 'Hallon', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['bahnhof'], presetId: 'bahnhoff-bredband', fallbackName: 'Bahnhof', category: 'Abonnemang', paymentMethod: 'Autogiro' },
  { keywords: ['halebop'], presetId: 'halebop-mobil', fallbackName: 'Halebop', category: 'Abonnemang', paymentMethod: 'Autogiro' },
  { keywords: ['fello'], presetId: 'fello-mobil', fallbackName: 'Fello', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['comviq'], presetId: 'comviq-mobil', fallbackName: 'Comviq', category: 'Abonnemang', paymentMethod: 'Autogiro' },
  { keywords: ['ownit'], presetId: 'ownit-bredband', fallbackName: 'Ownit', category: 'Abonnemang', paymentMethod: 'Autogiro' },
  { keywords: ['bredband2'], presetId: 'bredband2', fallbackName: 'Bredband2', category: 'Abonnemang', paymentMethod: 'Autogiro' },

  // Träning & Hälsa
  { keywords: ['sats'], presetId: 'sats-gym', fallbackName: 'SATS', category: 'Hälsa', paymentMethod: 'Autogiro' },
  { keywords: ['nordic wellness'], presetId: 'nordic-wellness', fallbackName: 'Nordic Wellness', category: 'Hälsa', paymentMethod: 'Autogiro' },
  { keywords: ['fitness24seven', 'fitness 24 seven'], presetId: 'fitness24seven', fallbackName: 'Fitness24Seven', category: 'Hälsa', paymentMethod: 'Autogiro' },
  { keywords: ['friskis'], presetId: 'friskis-svettis', fallbackName: 'Friskis & Svettis', category: 'Hälsa', paymentMethod: 'Autogiro' },
  { keywords: ['actic'], presetId: 'actic-gym', fallbackName: 'Actic', category: 'Hälsa', paymentMethod: 'Autogiro' },
  { keywords: ['stc training', 'stc gym'], presetId: 'stc-training', fallbackName: 'STC', category: 'Hälsa', paymentMethod: 'Autogiro' },
  { keywords: ['strava'], presetId: 'strava-premium', fallbackName: 'Strava', category: 'Hälsa', paymentMethod: 'Kort' },
  { keywords: ['whoop'], presetId: 'whoop-membership', fallbackName: 'WHOOP', category: 'Hälsa', paymentMethod: 'Kort' },

  // Transport & Fordon
  { keywords: ['storstockholms lokaltrafik', 'ab sl'], presetId: 'sl-manadskort', fallbackName: 'SL Månadskort', category: 'Transport', paymentMethod: 'Kort' },
  { keywords: ['västtrafik', 'vasttrafik'], presetId: 'vasttrafik-period', fallbackName: 'Västtrafik', category: 'Transport', paymentMethod: 'Kort' },
  { keywords: ['skånetrafiken', 'skanetrafiken'], presetId: 'skanetrafiken-period', fallbackName: 'Skånetrafiken', category: 'Transport', paymentMethod: 'Kort' },
  { keywords: ['transportstyrelsen', 'trängselskatt', 'trangselskatt', 'epass24'], presetId: 'trangselskatt-infrastruktur', fallbackName: 'Trängselskatt / Fordon', category: 'Transport', paymentMethod: 'Autogiro' },
  { keywords: ['volvofinans', 'ziklo bank', 'vw finans', 'volkswagen finans', 'santander consumer', 'dnb finans', 'toyota financial'], presetId: 'bil-leasing', fallbackName: 'Billeasing / Billån', category: 'Transport', paymentMethod: 'Autogiro' },

  // Fack, A-kassa & CSN
  { keywords: ['csn', 'centrala studiestödsnämnden'], presetId: 'csn-aterbetalning', fallbackName: 'CSN Lån', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['unionen'], presetId: 'akassa-unionen', fallbackName: 'Unionen A-kassa/Fack', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['sveriges ingenjörer', 'akademikernas a-kassa', 'akademikernas erkända'], presetId: 'akassa-sveriges-ingenjorer', fallbackName: 'A-kassa / Fackförbund', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['kommunal'], presetId: 'akassa-kommunal', fallbackName: 'Kommunal', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['vision'], presetId: 'akassa-vision', fallbackName: 'Vision', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['alfa-kassan', 'alfakassan'], presetId: 'akassa-alfakassan', fallbackName: 'Alfa-kassan', category: 'Räkningar', paymentMethod: 'Autogiro' },

  // Tech, Moln, AI & Tidningar
  { keywords: ['apple.com/bill', 'itunes.com/bill'], presetId: 'icloud-storage', fallbackName: 'Apple / iCloud', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['openai', 'chatgpt'], presetId: 'chatgpt-plus', fallbackName: 'ChatGPT Plus', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['google one', 'google*storage'], presetId: 'google-one-100gb', fallbackName: 'Google One', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['microsoft*365', 'microsoft*office', 'msbill.info'], presetId: 'microsoft-365', fallbackName: 'Microsoft 365', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['anthropic', 'claude.ai'], presetId: 'claude-pro', fallbackName: 'Claude Pro', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['adobe'], presetId: 'adobe-photography', fallbackName: 'Adobe', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['1password'], presetId: '1password', fallbackName: '1Password', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['nordvpn'], presetId: 'nordvpn', fallbackName: 'NordVPN', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['playstation', 'sony interactive'], presetId: 'playstation-plus', fallbackName: 'PlayStation', category: 'Nöjen', paymentMethod: 'Kort' },
  { keywords: ['xbox', 'microsoft*xbox'], presetId: 'xbox-game-pass', fallbackName: 'Xbox Game Pass', category: 'Nöjen', paymentMethod: 'Kort' },
  { keywords: ['nintendo'], presetId: 'nintendo-switch-online', fallbackName: 'Nintendo', category: 'Nöjen', paymentMethod: 'Kort' },
  { keywords: ['discord'], presetId: 'discord-nitro', fallbackName: 'Discord Nitro', category: 'Nöjen', paymentMethod: 'Kort' },
  { keywords: ['aftonbladet'], presetId: 'aftonbladet-plus', fallbackName: 'Aftonbladet Plus', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['expressen'], presetId: 'expressen-premium', fallbackName: 'Expressen Premium', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['dagens nyheter', 'dn.se'], presetId: 'dagens-nyheter', fallbackName: 'Dagens Nyheter', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['svenska dagbladet', 'svd.se'], presetId: 'svenska-dagbladet', fallbackName: 'Svenska Dagbladet', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['dagens industri', 'di.se'], presetId: 'dagens-industri', fallbackName: 'Dagens Industri', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['readly'], presetId: 'readly-tidningar', fallbackName: 'Readly', category: 'Abonnemang', paymentMethod: 'Kort' },
];

// Merchants that are everyday variable purchases and should NEVER be auto-classified as fixed monthly expenses
const VARIABLE_SPENDING_EXCLUSIONS = [
  'ica ',
  'ica kvantum',
  'ica nära',
  'ica supermarket',
  'ica maxi',
  'coop ',
  'stora coop',
  'willys',
  'hemköp',
  'hemkop',
  'lidl',
  'city gross',
  'systembolaget',
  'apotea',
  'apoteket',
  'kronans apotek',
  'hjärtat',
  'mcdonalds',
  'max burgers',
  'burger king',
  'espresso house',
  'waynes coffee',
  'pressbyrån',
  'pressbyran',
  '7-eleven',
  'foodora',
  'wolt',
  'uber eats',
  'uber *trip',
  'bolt.eu',
  'voi ',
  'tier ',
  'lime ',
  'ryde ',
  'circle k',
  'okq8',
  'preem',
  'st1 ',
  'ingo ',
  'clas ohlson',
  'kjell & co',
  'biltema',
  'jula ',
  'rusta ',
  'ikea ',
  'h&m ',
  'zara ',
  'åhlens',
  'ahlens',
  'normal ',
  'elgiganten',
  'netonnet',
  'webhallen',
];

function normalizeMerchantKey(rawText: string): string {
  return rawText
    .toLowerCase()
    .replace(/\b(ab|aktiebolag|sverige|sweden|se|stockholm|göteborg|malmö|autogiro|betalning|kortköp|kortkop|bg|pg)\b/g, ' ')
    .replace(/[0-9*#/_.,:-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanDisplayMerchantName(rawText: string): string {
  const cleaned = rawText
    .replace(/^(AUTOGIRO|BG|PG|KORTKÖP|KORTKOP|BETALNING)\s+/i, '')
    .replace(/\s+\d{4,}.*$/, '')
    .trim();
  if (!cleaned) return 'Fast utgift';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function getDayOfMonthFromIso(dateStr: string | null | undefined, fallbackDay = 27): number {
  if (!dateStr) return fallbackDay;
  const parts = dateStr.split('-');
  if (parts.length >= 3) {
    const day = parseInt(parts[2], 10);
    if (day >= 1 && day <= 31) return day;
  }
  return fallbackDay;
}

function getYearMonthKey(dateStr: string | null | undefined): string {
  if (!dateStr) return 'unknown';
  return dateStr.slice(0, 7); // YYYY-MM
}

export function analyzeBankTransactionsForOnboarding(
  transactions: BankTransactionItem[],
  currentPayday = 25,
  paydayBeforeWeekend = true
): AnalyzedBankOnboardingData {
  if (!Array.isArray(transactions) || transactions.length === 0) {
    return {
      detectedFixedExpenses: [],
      detectedIncomes: [],
      suggestedPayday: null,
      calculatedSpentSincePayday: 0,
      analyzedTransactionCount: 0,
    };
  }

  // Sort newest first
  const sorted = [...transactions].sort((a, b) => {
    const dA = a.booking_date || a.transaction_date || a.value_date || '';
    const dB = b.booking_date || b.transaction_date || b.value_date || '';
    return dB.localeCompare(dA);
  });

  const outflows = sorted.filter((t) => Number(t.amount) < 0);
  const inflows = sorted.filter((t) => Number(t.amount) > 0);

  const detectedFixedMap = new Map<
    string,
    Omit<FixedExpense, 'id'> & { detectedOccurrences: number; lastDate?: string; matchedTxIds: Set<string> }
  >();
  const fixedTransactionIds = new Set<string>();

  // 1. Layer 1: Match against known Swedish fixed expense & subscription rules
  for (const tx of outflows) {
    const absAmount = Math.round(Math.abs(Number(tx.amount)));
    if (absAmount <= 0 || absAmount > 60000) continue;

    const combinedText = `${tx.description || ''} ${tx.counterparty_name || ''}`.toLowerCase();

    // Skip if it's an everyday grocery/restaurant merchant
    if (VARIABLE_SPENDING_EXCLUSIONS.some((ex) => combinedText.includes(ex))) {
      continue;
    }

    let matchedRule: KeywordRule | null = null;
    for (const rule of EXTENDED_FIXED_EXPENSE_RULES) {
      if (rule.keywords.some((kw) => combinedText.includes(kw.toLowerCase()))) {
        matchedRule = rule;
        break;
      }
    }

    if (matchedRule) {
      const preset: SwedishExpensePreset | undefined = matchedRule.presetId
        ? SWEDISH_EXPENSE_PRESETS.find((p) => p.id === matchedRule!.presetId)
        : undefined;

      const key = matchedRule.presetId || matchedRule.fallbackName.toLowerCase();
      const txDate = tx.booking_date || tx.transaction_date || tx.value_date || undefined;
      const deductionDay = getDayOfMonthFromIso(txDate, preset?.deductionDay || 27);
      const displayName = preset?.name || matchedRule.fallbackName;
      const category = preset?.category || matchedRule.category;
      const paymentMethod = preset?.paymentMethod || matchedRule.paymentMethod;

      fixedTransactionIds.add(tx.id);

      const existing = detectedFixedMap.get(key);
      if (!existing) {
        detectedFixedMap.set(key, {
          name: displayName,
          amount: absAmount,
          category,
          frequency: Frequency.MONTHLY,
          deductionDay,
          paymentMethod,
          logo: getLogoUrl(displayName, category),
          detectedOccurrences: 1,
          lastDate: txDate,
          matchedTxIds: new Set([tx.id]),
        });
      } else {
        existing.detectedOccurrences += 1;
        existing.matchedTxIds.add(tx.id);
      }
    }
  }

  // 2. Layer 2: Detect recurring monthly charges across multiple months (for custom landlords, BRFs, child care, etc.)
  const merchantGroups = new Map<string, BankTransactionItem[]>();
  for (const tx of outflows) {
    if (fixedTransactionIds.has(tx.id)) continue;

    const absAmount = Math.round(Math.abs(Number(tx.amount)));
    if (absAmount < 25 || absAmount > 50000) continue;

    const combinedText = `${tx.description || ''} ${tx.counterparty_name || ''}`.toLowerCase();
    if (VARIABLE_SPENDING_EXCLUSIONS.some((ex) => combinedText.includes(ex))) {
      continue;
    }
    // Skip Swish to private individuals or generic internal transfers unless explicitly autogiro/avgift
    if (
      (combinedText.includes('swish') || combinedText.includes('överföring') || combinedText.includes('overforing')) &&
      !combinedText.includes('autogiro')
    ) {
      continue;
    }

    const normKey = normalizeMerchantKey(tx.counterparty_name || tx.description || '');
    if (!normKey || normKey.length < 3) continue;

    const list = merchantGroups.get(normKey) || [];
    list.push(tx);
    merchantGroups.set(normKey, list);
  }

  for (const [normKey, groupTxs] of merchantGroups.entries()) {
    const distinctMonths = new Set(
      groupTxs.map((t) => getYearMonthKey(t.booking_date || t.transaction_date || t.value_date))
    );
    distinctMonths.delete('unknown');

    const latestTx = groupTxs[0];
    const latestAmount = Math.round(Math.abs(Number(latestTx.amount)));
    const combinedText = `${latestTx.description || ''} ${latestTx.counterparty_name || ''}`.toLowerCase();

    const hasExplicitFixedKeyword =
      combinedText.includes('autogiro') ||
      combinedText.includes('bankgiro') ||
      combinedText.includes('plusgiro') ||
      combinedText.includes('månadsavgift') ||
      combinedText.includes('manadsavgift') ||
      combinedText.includes('årsavgift') ||
      combinedText.includes('abonnemang') ||
      combinedText.includes('medlemsavgift') ||
      combinedText.includes('förskola') ||
      combinedText.includes('forskola');

    // Check amount consistency across months (within ±25% of latest amount)
    const consistentCount = groupTxs.filter((t) => {
      const amt = Math.abs(Number(t.amount));
      const ratio = amt / (latestAmount || 1);
      return ratio >= 0.75 && ratio <= 1.25;
    }).length;

    const isRecurringMonthly =
      (distinctMonths.size >= 2 && consistentCount >= 2 && groupTxs.length <= distinctMonths.size * 2) ||
      (hasExplicitFixedKeyword && latestAmount >= 49);

    if (isRecurringMonthly) {
      const displayName = cleanDisplayMerchantName(
        latestTx.counterparty_name || latestTx.description || normKey
      );
      const txDate =
        latestTx.booking_date || latestTx.transaction_date || latestTx.value_date || undefined;
      const deductionDay = getDayOfMonthFromIso(txDate, 27);

      let category = 'Räkningar';
      if (latestAmount >= 3500 && deductionDay >= 24) {
        category = 'Boende';
      } else if (latestAmount <= 350) {
        category = 'Abonnemang';
      }

      const matchedIds = new Set<string>();
      for (const t of groupTxs) {
        fixedTransactionIds.add(t.id);
        matchedIds.add(t.id);
      }

      detectedFixedMap.set(`recurring_${normKey}`, {
        name: displayName,
        amount: latestAmount,
        category,
        frequency: Frequency.MONTHLY,
        deductionDay,
        paymentMethod: hasExplicitFixedKeyword ? 'Autogiro' : 'Kort',
        logo: getLogoUrl(displayName, category),
        detectedOccurrences: distinctMonths.size || groupTxs.length,
        lastDate: txDate,
        matchedTxIds: matchedIds,
      });
    }
  }

  // 3. Detect Monthly Salary / Incomes & Payday
  const detectedIncomes: Array<Omit<Income, 'id'>> = [];
  let suggestedPayday: number | null = null;

  const salaryCandidates = inflows.filter((tx) => {
    const amt = Number(tx.amount);
    if (amt < 2500) return false;
    const text = `${tx.description || ''} ${tx.counterparty_name || ''}`.toLowerCase();
    // Skip internal transfers
    if (text.includes('överföring') || text.includes('overforing') || text.includes('egna konton')) {
      return false;
    }
    const isSalaryKeyword =
      text.includes('lön') ||
      text.includes('lon ') ||
      text.includes('salary') ||
      text.includes('utbetalning') ||
      text.includes('försäkringskassan') ||
      text.includes('forsakringskassan') ||
      text.includes('csn') ||
      text.includes('pension') ||
      text.includes('barnbidrag');
    return isSalaryKeyword || amt >= 12000;
  });

  if (salaryCandidates.length > 0) {
    const primarySalary = salaryCandidates[0];
    const salaryAmount = Math.round(Number(primarySalary.amount));
    const salaryDate =
      primarySalary.booking_date ||
      primarySalary.transaction_date ||
      primarySalary.value_date;
    const dayOfMonth = getDayOfMonthFromIso(salaryDate, 25);

    if (dayOfMonth >= 22 && dayOfMonth <= 26) {
      suggestedPayday = 25;
    } else if (dayOfMonth === 27) {
      suggestedPayday = 27;
    } else {
      suggestedPayday = dayOfMonth;
    }

    const rawText = `${primarySalary.description || ''} ${primarySalary.counterparty_name || ''}`.toLowerCase();
    let incomeName = 'Lön';
    let incomeCategory = 'Lön';
    if (rawText.includes('csn')) {
      incomeName = 'CSN';
      incomeCategory = 'CSN';
    } else if (rawText.includes('försäkringskassan') || rawText.includes('forsakringskassan')) {
      incomeName = 'Försäkringskassan';
      incomeCategory = 'Bidrag';
    } else if (rawText.includes('pension')) {
      incomeName = 'Pension';
      incomeCategory = 'Pension';
    } else if (primarySalary.counterparty_name) {
      incomeName = `Lön (${cleanDisplayMerchantName(primarySalary.counterparty_name)})`;
    }

    detectedIncomes.push({
      name: incomeName,
      amount: salaryAmount,
      category: incomeCategory,
      deductionDay: suggestedPayday || 25,
      icon: 'Wallet',
    });
  }

  // 4. Calculate variable spending since the start of the current pay period (excluding fixed expenses!)
  const effectivePayday = suggestedPayday || currentPayday || 25;
  const paydayType =
    effectivePayday === 25
      ? PaydayType.TWENTY_FIFTH
      : effectivePayday === 1
      ? PaydayType.FIRST_DAY
      : PaydayType.CUSTOM;
  const adjustment = paydayBeforeWeekend
    ? WeekendAdjustment.BEFORE
    : WeekendAdjustment.NONE;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const { start } = getPeriodBoundaries(today, paydayType, effectivePayday, adjustment);
  const periodStartIso = start.toISOString().split('T')[0];

  let calculatedSpentSincePayday = 0;
  for (const tx of outflows) {
    if (fixedTransactionIds.has(tx.id)) continue;
    const txDate = tx.booking_date || tx.transaction_date || tx.value_date || '';
    if (txDate >= periodStartIso) {
      calculatedSpentSincePayday += Math.abs(Number(tx.amount));
    }
  }

  const detectedFixedExpenses = Array.from(detectedFixedMap.values())
    .map(({ matchedTxIds: _ignore, ...rest }) => rest)
    .sort((a, b) => b.amount - a.amount);

  return {
    detectedFixedExpenses,
    detectedIncomes,
    suggestedPayday,
    calculatedSpentSincePayday: Math.round(calculatedSpentSincePayday),
    analyzedTransactionCount: transactions.length,
  };
}
