// Regler för fasta utgifter, butiker, Swish och kategorier. Del av bankanalysen (tidigare utils/bankHistoryAnalyzer.ts).
import { BankTransactionItem } from '../../services/bankService';
import type { BankRawJson } from '../../app/models';
import { SWEDISH_EXPENSE_PRESETS } from '../../data/swedishExpensePresets';
import { Frequency } from '../../types';
import { getLogoUrl, getLearnedBrandCategory } from '../logo';
import { resolveMerchantAlias, resolveSwishPhoneToName } from '../appCache';
import { isInternalTransferOrMicroSavings } from './normalization/internalTransfer';
import { inferCategoryAndMethodFromName } from './existingBudget/manualCategory';

// ---------------------------------------------------------------------------
// 3. FIXED EXPENSE & EVERYDAY MERCHANT RULES
// ---------------------------------------------------------------------------

export interface KeywordRule {
  keywords: string[];
  presetId?: string;
  fallbackName: string;
  category: string;
  paymentMethod: string;
  splitByExactAmount?: boolean;
  requireMultipleMonthsForCard?: boolean;
}

export const EXTENDED_FIXED_EXPENSE_RULES: KeywordRule[] = [
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

  // Boende, Hyra, Fastigheter, El & Larm
  {
    keywords: [
      'sveafastigheter',
      'fastigheter',
      'fastighets',
      'hyra',
      'hyresavi',
      'bostadsrätt',
      'bostadsratt',
      'brf ',
      'hsb ',
      'riksbyggen',
      'sbc ',
      'heimstaden',
      'rikky',
      'wallenstam',
      'willhem',
      'akelius',
      'stena fastighet',
      'balder',
      'familjebostäder',
      'familjebostader',
      'poseidon',
      'stockholmshem',
      'svenska bostäder',
      'svenska bostader',
      'mimer',
      'gavlegårdarna',
      'uppsalahem',
      'botkyrkabyggen',
      'huge bostäder',
      'hfba',
      'halmstads fastighets',
    ],
    presetId: 'hyra-bostad',
    fallbackName: 'Hyra / Boende',
    category: 'Boende',
    paymentMethod: 'Bankgiro',
  },
  { keywords: ['bolån', 'bolan', 'bostadslån', 'hypotek', 'sbab', 'landshypotek', 'stabelo', 'amortering'], presetId: 'bostadslan-ranta', fallbackName: 'Bolån & Ränta', category: 'Boende', paymentMethod: 'Autogiro' },
  { keywords: ['tibber'], presetId: 'tibber-el', fallbackName: 'Tibber El', category: 'Boende', paymentMethod: 'Autogiro' },
  { keywords: ['vattenfall'], presetId: 'vattenfall-el', fallbackName: 'Vattenfall', category: 'Boende', paymentMethod: 'Autogiro' },
  { keywords: ['fortum'], presetId: 'fortum-el', fallbackName: 'Fortum', category: 'Boende', paymentMethod: 'Autogiro' },
  { keywords: ['öresundskraft', 'oresundskraft', 'öresundkraft', 'oresundkraft'], fallbackName: 'Öresundskraft', category: 'Boende', paymentMethod: 'Autogiro' },
  { keywords: ['ellevio', 'e.on', 'eon energi', 'göteborg energi', 'goteborg energi', 'skånska energi', 'kraftringen', 'jämtkraft', 'mälarenergi', 'tekniska verken', 'greenely', 'bixia', 'godel', 'hemab'], presetId: 'elavtal', fallbackName: 'Elräkning & Nät', category: 'Boende', paymentMethod: 'Autogiro' },
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
  { keywords: ['fitness24seven', 'fitness 24 seven', 'fitness 24se', 'fitness24se'], presetId: 'fitness24seven', fallbackName: 'Fitness24Seven', category: 'Hälsa', paymentMethod: 'Autogiro' },
  { keywords: ['friskis'], presetId: 'friskis-svettis', fallbackName: 'Friskis & Svettis', category: 'Hälsa', paymentMethod: 'Autogiro' },
  { keywords: ['actic'], presetId: 'actic-gym', fallbackName: 'Actic', category: 'Hälsa', paymentMethod: 'Autogiro' },
  { keywords: ['stc training', 'stc gym'], presetId: 'stc-training', fallbackName: 'STC', category: 'Hälsa', paymentMethod: 'Autogiro' },
  { keywords: ['strava'], presetId: 'strava-premium', fallbackName: 'Strava', category: 'Hälsa', paymentMethod: 'Kort' },
  { keywords: ['whoop'], presetId: 'whoop-membership', fallbackName: 'WHOOP', category: 'Hälsa', paymentMethod: 'Kort' },

  // Transport & Fordon
  { keywords: ['storstockholms lokaltrafik', 'ab sl'], presetId: 'sl-manadskort', fallbackName: 'SL Månadskort', category: 'Transport', paymentMethod: 'Kort' },
  { keywords: ['västtrafik', 'vasttrafik'], presetId: 'vasttrafik-period', fallbackName: 'Västtrafik', category: 'Transport', paymentMethod: 'Kort' },
  { keywords: ['skånetrafiken', 'skanetrafiken'], presetId: 'skanetrafiken-period', fallbackName: 'Skånetrafiken', category: 'Transport', paymentMethod: 'Kort' },
  { keywords: ['hallandstrafiken'], fallbackName: 'Hallandstrafiken', category: 'Transport', paymentMethod: 'Kort' },
  { keywords: ['transportstyrelsen', 'trängselskatt', 'trangselskatt', 'epass24'], presetId: 'trangselskatt-infrastruktur', fallbackName: 'Trängselskatt / Fordon', category: 'Transport', paymentMethod: 'Autogiro' },
  { keywords: ['volvofinans', 'ziklo bank', 'vw finans', 'volkswagen finans', 'santander consumer', 'dnb finans', 'toyota financial'], presetId: 'bil-leasing', fallbackName: 'Billeasing / Billån', category: 'Transport', paymentMethod: 'Autogiro' },

  // Fack, A-kassa, Bankavgift & CSN
  { keywords: ['csn', 'centrala studiestödsnämnden'], presetId: 'csn-aterbetalning', fallbackName: 'CSN Lån', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['union.akassa', 'unionens a-kassa', 'unionen a-kassa', 'unionen akassa'], fallbackName: 'Unionens A-kassa', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['unionen'], fallbackName: 'Unionen', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['sveriges ingenjörer', 'akademikernas a-kassa', 'akademikernas erkända'], presetId: 'akassa-sveriges-ingenjorer', fallbackName: 'A-kassa / Fackförbund', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['kommunal'], presetId: 'akassa-kommunal', fallbackName: 'Kommunal', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['vision'], presetId: 'akassa-vision', fallbackName: 'Vision', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['alfa-kassan', 'alfakassan'], presetId: 'akassa-alfakassan', fallbackName: 'Alfa-kassan', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['enkla vardag', 'vardagspaket'], fallbackName: 'SEB Enkla vardagen', category: 'Räkningar', paymentMethod: 'Autogiro' },

  // Tech, Moln, AI & Tidningar
  { keywords: ['apple.com/bill', 'apple com/bi', 'apple.com/bi', 'itunes.com/bill'], fallbackName: 'Apple / iCloud', category: 'Abonnemang', paymentMethod: 'Kort', splitByExactAmount: true, requireMultipleMonthsForCard: true },
  { keywords: ['openai', 'chatgpt'], presetId: 'chatgpt-plus', fallbackName: 'ChatGPT Plus', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['google one', 'google*storage'], presetId: 'google-one-100gb', fallbackName: 'Google One', category: 'Abonnemang', paymentMethod: 'Kort', requireMultipleMonthsForCard: true },
  { keywords: ['microsoft*365', 'microsoft*office', 'msbill.info'], presetId: 'microsoft-365', fallbackName: 'Microsoft 365', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['anthropic', 'claude.ai'], presetId: 'claude-pro', fallbackName: 'Claude Pro', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['cursor.com', 'cursor, ai'], fallbackName: 'Cursor', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['midjourney'], fallbackName: 'Midjourney', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['adobe'], presetId: 'adobe-photography', fallbackName: 'Adobe', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['1password'], presetId: '1password', fallbackName: '1Password', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['nordvpn'], presetId: 'nordvpn', fallbackName: 'NordVPN', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['mullvad'], fallbackName: 'Mullvad VPN', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['dropbox'], fallbackName: 'Dropbox', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['canva'], fallbackName: 'Canva', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['patreon'], fallbackName: 'Patreon', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['substack'], fallbackName: 'Substack', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['duolingo'], fallbackName: 'Duolingo', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['playstation', 'sony interactive'], presetId: 'playstation-plus', fallbackName: 'PlayStation', category: 'Nöjen', paymentMethod: 'Kort', requireMultipleMonthsForCard: true },
  { keywords: ['xbox', 'microsoft*xbox'], presetId: 'xbox-game-pass', fallbackName: 'Xbox Game Pass', category: 'Nöjen', paymentMethod: 'Kort', requireMultipleMonthsForCard: true },
  { keywords: ['nintendo'], presetId: 'nintendo-switch-online', fallbackName: 'Nintendo', category: 'Nöjen', paymentMethod: 'Kort', requireMultipleMonthsForCard: true },
  { keywords: ['discord'], presetId: 'discord-nitro', fallbackName: 'Discord Nitro', category: 'Nöjen', paymentMethod: 'Kort' },
  { keywords: ['aftonbladet'], presetId: 'aftonbladet-plus', fallbackName: 'Aftonbladet Plus', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['expressen'], presetId: 'expressen-premium', fallbackName: 'Expressen Premium', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['dagens nyheter', 'dn.se'], presetId: 'dagens-nyheter', fallbackName: 'Dagens Nyheter', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['svenska dagbladet', 'svd.se'], presetId: 'svenska-dagbladet', fallbackName: 'Svenska Dagbladet', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['dagens industri', 'di.se'], presetId: 'dagens-industri', fallbackName: 'Dagens Industri', category: 'Abonnemang', paymentMethod: 'Kort' },
  { keywords: ['readly'], presetId: 'readly-tidningar', fallbackName: 'Readly', category: 'Abonnemang', paymentMethod: 'Kort' },

  // Ytterligare svenska lån, fack, a-kassor, bredband & gym
  { keywords: ['anyfin'], fallbackName: 'Anyfin', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['resurs bank'], fallbackName: 'Resurs Bank', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['ikano bank'], fallbackName: 'Ikano Bank', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['marginalen'], fallbackName: 'Marginalen Bank', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['avida'], fallbackName: 'Avida Finans', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['brocc'], fallbackName: 'Brocc', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['hyresgästföreningen', 'hyresgastforeningen'], fallbackName: 'Hyresgästföreningen', category: 'Boende', paymentMethod: 'Autogiro' },
  { keywords: ['småa', 'smaa', 'småföretagarnas a-kassa'], fallbackName: 'SMÅA A-kassa', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['handels a-kassa', 'handelsanställdas'], fallbackName: 'Handels', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['lärarnas a-kassa', 'sveriges lärare', 'lararnas a-kassa'], fallbackName: 'Sveriges Lärare / A-kassa', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['if metall'], fallbackName: 'IF Metall', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['vårdförbundet', 'vardforbundet'], fallbackName: 'Vårdförbundet', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['ledarna'], fallbackName: 'Ledarna', category: 'Räkningar', paymentMethod: 'Autogiro' },
  { keywords: ['sappa'], fallbackName: 'Sappa', category: 'Abonnemang', paymentMethod: 'Autogiro' },
  { keywords: ['open infra'], fallbackName: 'Open Infra', category: 'Abonnemang', paymentMethod: 'Autogiro' },
  { keywords: ['globalconnect'], fallbackName: 'GlobalConnect', category: 'Abonnemang', paymentMethod: 'Autogiro' },
  { keywords: ['malkars'], fallbackName: 'Malkars Träningscenter', category: 'Hälsa', paymentMethod: 'Autogiro' },
  { keywords: ['member 24', 'member24'], fallbackName: 'Member 24', category: 'Hälsa', paymentMethod: 'Autogiro' },
  { keywords: ['puls & träning', 'puls och traning'], fallbackName: 'Puls & Träning', category: 'Hälsa', paymentMethod: 'Autogiro' },
];

// Merchants that are everyday variable purchases and should NEVER be auto-classified as fixed monthly expenses
export const VARIABLE_SPENDING_EXCLUSIONS = [
  'ica ',
  'maxi ica',
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
  'din-x',
  'din x',
  'tanka ',
  'qstar',
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
  'felparkeringsavgift',
  'kontrollavgift',
  'parkeringsbot',
  'svea inkasso',
];

export interface EverydayMerchantRule {
  keywords: string[];
  cleanName: string;
  preferredCategories: string[];
}

export const EVERYDAY_MERCHANT_RULES: EverydayMerchantRule[] = [
  { keywords: ['maxi ica', 'ica maxi'], cleanName: 'ICA Maxi', preferredCategories: ['Mat & dryck', 'Mat', 'Livsmedel'] },
  { keywords: ['ica kvantum'], cleanName: 'ICA Kvantum', preferredCategories: ['Mat & dryck', 'Mat', 'Livsmedel'] },
  { keywords: ['ica supermarket'], cleanName: 'ICA Supermarket', preferredCategories: ['Mat & dryck', 'Mat', 'Livsmedel'] },
  { keywords: ['ica nära', 'ica nara'], cleanName: 'ICA Nära', preferredCategories: ['Mat & dryck', 'Mat', 'Livsmedel'] },
  { keywords: ['ica '], cleanName: 'ICA', preferredCategories: ['Mat & dryck', 'Mat', 'Livsmedel'] },
  { keywords: ['stora coop', 'coop '], cleanName: 'Coop', preferredCategories: ['Mat & dryck', 'Mat', 'Livsmedel'] },
  { keywords: ['x-tra', 'x -tra', 'xtra '], cleanName: 'X-tra', preferredCategories: ['Mat & dryck', 'Mat', 'Livsmedel'] },
  { keywords: ['gekås', 'gekas', 'gek$s', 'ullared'], cleanName: 'Gekås Ullared', preferredCategories: ['Shopping', 'Hemmet'] },
  { keywords: ['willys'], cleanName: 'Willys', preferredCategories: ['Mat & dryck', 'Mat', 'Livsmedel'] },
  { keywords: ['hemköp', 'hemkop'], cleanName: 'Hemköp', preferredCategories: ['Mat & dryck', 'Mat', 'Livsmedel'] },
  { keywords: ['lidl'], cleanName: 'Lidl', preferredCategories: ['Mat & dryck', 'Mat', 'Livsmedel'] },
  { keywords: ['city gross', 'citygross'], cleanName: 'City Gross', preferredCategories: ['Mat & dryck', 'Mat', 'Livsmedel'] },
  { keywords: ['mathem'], cleanName: 'Mathem', preferredCategories: ['Mat & dryck', 'Mat', 'Livsmedel'] },
  { keywords: ['hellofresh', 'hello fresh'], cleanName: 'HelloFresh', preferredCategories: ['Mat & dryck', 'Mat'] },
  { keywords: ['linas matkasse'], cleanName: 'Linas Matkasse', preferredCategories: ['Mat & dryck', 'Mat'] },
  { keywords: ['systembolaget', 'systembolag', 'systembolage', 'sys.bolaget', 'sysbolaget'], cleanName: 'Systembolaget', preferredCategories: ['Mat & dryck', 'Nöjen', 'Uteliv'] },
  { keywords: ['öresundskraft', 'oresundskraft'], cleanName: 'Öresundskraft AB', preferredCategories: ['Boende', 'Räkningar'] },
  { keywords: ['holy greens', 'holygreens'], cleanName: 'Holy Greens', preferredCategories: ['Uteliv', 'Restaurang', 'Mat & dryck'] },
  { keywords: ['mcdonalds', 'mcdonald', 'mcdfalkenberg', 'mcdfalkenber', 'mcd '], cleanName: "McDonald's", preferredCategories: ['Uteliv', 'Restaurang', 'Mat & dryck'] },
  { keywords: ['max burgers', 'max hamburger'], cleanName: 'MAX Burgers', preferredCategories: ['Uteliv', 'Restaurang', 'Mat & dryck'] },
  { keywords: ['burger king'], cleanName: 'Burger King', preferredCategories: ['Uteliv', 'Restaurang', 'Mat & dryck'] },
  { keywords: ['bastard burgers'], cleanName: 'Bastard Burgers', preferredCategories: ['Uteliv', 'Restaurang', 'Mat & dryck'] },
  { keywords: ['brödernas', 'brodernas'], cleanName: 'Brödernas', preferredCategories: ['Uteliv', 'Restaurang', 'Mat & dryck'] },
  { keywords: ['mister york'], cleanName: 'Mister York', preferredCategories: ['Uteliv', 'Restaurang', 'Mat & dryck'] },
  { keywords: ['phil\'s burger', 'phils burger'], cleanName: "Phil's Burger", preferredCategories: ['Uteliv', 'Restaurang', 'Mat & dryck'] },
  { keywords: ['chopchop', 'chop chop'], cleanName: 'ChopChop', preferredCategories: ['Uteliv', 'Restaurang', 'Mat & dryck'] },
  { keywords: ['sushi yama', 'sushiyama'], cleanName: 'Sushi Yama', preferredCategories: ['Uteliv', 'Restaurang', 'Mat & dryck'] },
  { keywords: ['pinchos'], cleanName: 'Pinchos', preferredCategories: ['Uteliv', 'Restaurang', 'Mat & dryck'] },
  { keywords: ['olearys', "o'learys"], cleanName: "O'Learys", preferredCategories: ['Uteliv', 'Restaurang', 'Mat & dryck'] },
  { keywords: ['vapiano'], cleanName: 'Vapiano', preferredCategories: ['Uteliv', 'Restaurang', 'Mat & dryck'] },
  { keywords: ['basta ', 'basta!'], cleanName: 'Basta', preferredCategories: ['Uteliv', 'Restaurang', 'Mat & dryck'] },
  { keywords: ['taco bar', 'tacobar'], cleanName: 'Taco Bar', preferredCategories: ['Uteliv', 'Restaurang', 'Mat & dryck'] },
  { keywords: ['subway'], cleanName: 'Subway', preferredCategories: ['Uteliv', 'Restaurang', 'Mat & dryck'] },
  { keywords: ['kfc'], cleanName: 'KFC', preferredCategories: ['Uteliv', 'Restaurang', 'Mat & dryck'] },
  { keywords: ['pizza hut', 'pizzahut'], cleanName: 'Pizza Hut', preferredCategories: ['Uteliv', 'Restaurang', 'Mat & dryck'] },
  { keywords: ['dominos', "domino's"], cleanName: "Domino's", preferredCategories: ['Uteliv', 'Restaurang', 'Mat & dryck'] },
  { keywords: ['espresso house'], cleanName: 'Espresso House', preferredCategories: ['Uteliv', 'Café', 'Mat & dryck'] },
  { keywords: ['waynes', "wayne's coffee"], cleanName: "Wayne's Coffee", preferredCategories: ['Uteliv', 'Café', 'Mat & dryck'] },
  { keywords: ['joe & the juice', 'joe and the juice'], cleanName: 'Joe & The Juice', preferredCategories: ['Uteliv', 'Café', 'Mat & dryck'] },
  { keywords: ['fabrique'], cleanName: 'Fabrique', preferredCategories: ['Uteliv', 'Café', 'Mat & dryck'] },
  { keywords: ['gateau'], cleanName: 'Gateau', preferredCategories: ['Uteliv', 'Café', 'Mat & dryck'] },
  { keywords: ['bröd & salt', 'brod & salt', 'brod och salt'], cleanName: 'Bröd & Salt', preferredCategories: ['Uteliv', 'Café', 'Mat & dryck'] },
  { keywords: ['mr cake', 'mrcake'], cleanName: 'MR CAKE', preferredCategories: ['Uteliv', 'Café', 'Mat & dryck'] },
  { keywords: ['starbucks'], cleanName: 'Starbucks', preferredCategories: ['Uteliv', 'Café', 'Mat & dryck'] },
  { keywords: ['pressbyrån', 'pressbyran', 'pressbyra'], cleanName: 'Pressbyrån', preferredCategories: ['Mat & dryck', 'Uteliv'] },
  { keywords: ['7-eleven', '7 eleven'], cleanName: '7-Eleven', preferredCategories: ['Mat & dryck', 'Uteliv'] },
  { keywords: ['foodora'], cleanName: 'Foodora', preferredCategories: ['Uteliv', 'Mat & dryck'] },
  { keywords: ['wolt'], cleanName: 'Wolt', preferredCategories: ['Uteliv', 'Mat & dryck'] },
  { keywords: ['uber eats', 'ubereats'], cleanName: 'Uber Eats', preferredCategories: ['Uteliv', 'Mat & dryck'] },
  { keywords: ['circle k'], cleanName: 'Circle K', preferredCategories: ['Transport', 'Bilen'] },
  { keywords: ['okq8'], cleanName: 'OKQ8', preferredCategories: ['Transport', 'Bilen'] },
  { keywords: ['preem'], cleanName: 'Preem', preferredCategories: ['Transport', 'Bilen'] },
  { keywords: ['st1 '], cleanName: 'St1', preferredCategories: ['Transport', 'Bilen'] },
  { keywords: ['ingo '], cleanName: 'INGO', preferredCategories: ['Transport', 'Bilen'] },
  { keywords: ['easypark'], cleanName: 'EasyPark', preferredCategories: ['Transport', 'Bilen'] },
  { keywords: ['aimo park', 'apcoa', 'parkster'], cleanName: 'Parkering', preferredCategories: ['Transport', 'Bilen'] },
  { keywords: ['uber '], cleanName: 'Uber', preferredCategories: ['Transport'] },
  { keywords: ['bolt '], cleanName: 'Bolt', preferredCategories: ['Transport'] },
  { keywords: ['voi '], cleanName: 'Voi', preferredCategories: ['Transport'] },
  { keywords: ['ryde '], cleanName: 'Ryde', preferredCategories: ['Transport'] },
  { keywords: ['apotea'], cleanName: 'Apotea', preferredCategories: ['Hälsa', 'Shopping'] },
  { keywords: ['apoteket', 'kronans apotek', 'apotek hjärtat', 'hjärtat', 'meds '], cleanName: 'Apotek', preferredCategories: ['Hälsa', 'Shopping'] },
  { keywords: ['bokadirekt'], cleanName: 'Bokadirekt', preferredCategories: ['Hälsa', 'Shopping'] },
  { keywords: ['clas ohlson'], cleanName: 'Clas Ohlson', preferredCategories: ['Shopping', 'Hemmet'] },
  { keywords: ['kjell & co', 'kjell o co'], cleanName: 'Kjell & Company', preferredCategories: ['Shopping', 'Elektronik'] },
  { keywords: ['biltema'], cleanName: 'Biltema', preferredCategories: ['Shopping', 'Transport'] },
  { keywords: ['jula'], cleanName: 'Jula', preferredCategories: ['Shopping', 'Hemmet'] },
  { keywords: ['rusta'], cleanName: 'Rusta', preferredCategories: ['Shopping', 'Hemmet'] },
  { keywords: ['ikea'], cleanName: 'IKEA', preferredCategories: ['Shopping', 'Boende'] },
  { keywords: ['normal '], cleanName: 'NORMAL', preferredCategories: ['Shopping', 'Hälsa'] },
  { keywords: ['h&m', 'hennes & mauritz'], cleanName: 'H&M', preferredCategories: ['Shopping', 'Kläder'] },
  { keywords: ['zara'], cleanName: 'Zara', preferredCategories: ['Shopping', 'Kläder'] },
  { keywords: ['åhlens', 'ahlens', 'åhléns'], cleanName: 'Åhléns', preferredCategories: ['Shopping'] },
  { keywords: ['lagerhaus'], cleanName: 'Lagerhaus', preferredCategories: ['Shopping'] },
  { keywords: ['granit'], cleanName: 'Granit', preferredCategories: ['Shopping'] },
  { keywords: ['cervera'], cleanName: 'Cervera', preferredCategories: ['Shopping'] },
  { keywords: ['hemtex'], cleanName: 'Hemtex', preferredCategories: ['Shopping'] },
  { keywords: ['akademibokhandeln'], cleanName: 'Akademibokhandeln', preferredCategories: ['Shopping'] },
  { keywords: ['stadium'], cleanName: 'Stadium', preferredCategories: ['Shopping'] },
  { keywords: ['intersport'], cleanName: 'Intersport', preferredCategories: ['Shopping'] },
  { keywords: ['xxl'], cleanName: 'XXL', preferredCategories: ['Shopping'] },
  { keywords: ['boozt'], cleanName: 'Boozt', preferredCategories: ['Shopping'] },
  { keywords: ['zalando'], cleanName: 'Zalando', preferredCategories: ['Shopping'] },
  { keywords: ['lyko'], cleanName: 'Lyko', preferredCategories: ['Shopping', 'Hälsa'] },
  { keywords: ['kicks'], cleanName: 'KICKS', preferredCategories: ['Shopping', 'Hälsa'] },
  { keywords: ['sephora'], cleanName: 'Sephora', preferredCategories: ['Shopping', 'Hälsa'] },
  { keywords: ['rituals'], cleanName: 'Rituals', preferredCategories: ['Shopping', 'Hälsa'] },
  { keywords: ['elgiganten'], cleanName: 'Elgiganten', preferredCategories: ['Shopping', 'Elektronik'] },
  { keywords: ['netonnet'], cleanName: 'NetOnNet', preferredCategories: ['Shopping', 'Elektronik'] },
  { keywords: ['webhallen'], cleanName: 'Webhallen', preferredCategories: ['Shopping', 'Elektronik'] },
  { keywords: ['power '], cleanName: 'POWER', preferredCategories: ['Shopping', 'Elektronik'] },
  { keywords: ['klarna'], cleanName: 'Klarna', preferredCategories: ['Shopping', 'Övrigt'] },
  { keywords: ['avanza'], cleanName: 'Avanza', preferredCategories: ['Sparande', 'Överföring'] },
  { keywords: ['nordnet'], cleanName: 'Nordnet', preferredCategories: ['Sparande', 'Överföring'] },
  { keywords: ['lysa '], cleanName: 'Lysa', preferredCategories: ['Sparande', 'Överföring'] },
  { keywords: ['opti '], cleanName: 'Opti', preferredCategories: ['Sparande', 'Överföring'] },
  { keywords: ['savr'], cleanName: 'SAVR', preferredCategories: ['Sparande', 'Överföring'] },
  { keywords: ['levler'], cleanName: 'Levler', preferredCategories: ['Sparande', 'Överföring'] },
  { keywords: ['montrose'], cleanName: 'Montrose', preferredCategories: ['Sparande', 'Överföring'] },
  { keywords: ['borgo'], cleanName: 'Borgo', preferredCategories: ['Sparande', 'Överföring'] },
];

export function normalizeMerchantKey(rawText: string | null | undefined): string {
  return String(rawText || '')
    .toLowerCase()
    .replace(/\b(ab|aktiebolag|sverige|sweden|se|stockholm|göteborg|malmö|halmstad|hovas|hovås|autogiro|betalning|kortköp|kortkop|bg|pg)\b/g, ' ')
    .replace(/[0-9*#/_.,:-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extraherar ett giltigt svenskt Swish-mobilnummer (070, 072, 073, 076, 079 eller +467...)
 * eller 10-siffrigt Swish-företagsnummer (123xxxxxxx).
 * Matchar ALDRIG bankkontonummer (t.ex. SEB 11-siffriga kontonummer som råkar innehålla "075..."
 * eller kontonummer + referensnummer som bildar "0753225532").
 */
export function extractSwishPhoneNumber(
  rawText: string | null | undefined,
  requireStandaloneIfNoSwishKeyword = true
): string | null {
  if (!rawText || typeof rawText !== 'string') return null;
  const trimmed = rawText.trim();
  if (!trimmed) return null;

  const hasSwishKeyword = /\bswish\b/i.test(trimmed) || trimmed.toLowerCase().includes('swish');

  if (hasSwishKeyword) {
    // När "swish" finns i texten, leta efter ett fristående svenskt mobilnummer (070/072/073/076/079) eller 123-nummer
    const tokens = trimmed.replace(/[()]/g, ' ').split(/\s+/);
    // Prova först sammanhängande siffergrupper i texten
    const regex = /(?:^|[^\d])(\+?46\s*7[02369](?:[\s-]?\d){7}|07[02369](?:[\s-]?\d){7}|123(?:[\s-]?\d){7})(?:$|[^\d])/i;
    const match = trimmed.match(regex);
    if (match && match[1]) {
      const digits = match[1].replace(/\D/g, '');
      if (digits.startsWith('467') && digits.length === 11) {
        return '07' + digits.slice(3);
      }
      if ((digits.startsWith('07') || digits.startsWith('123')) && digits.length === 10) {
        return digits;
      }
    }
    for (const tok of tokens) {
      const d = tok.replace(/\D/g, '');
      if (/^467[02369]\d{7}$/.test(d)) return '07' + d.slice(3);
      if (/^(07[02369]\d{7}|123\d{7})$/.test(d)) return d;
    }
    return null;
  }

  if (requireStandaloneIfNoSwishKeyword) {
    // Utan ordet "swish" får texten ENBART tolkas som ett Swish-nummer om hela strängen
    // (efter ev. enkel betalningsprefix) är ett fristående giltigt svenskt mobilnummer (070, 072, 073, 076, 079)
    // eller ett 10-siffrigt Swish-företagsnummer (123xxxxxxx),
    // ALDRIG om det är ett 11-siffrigt bankkontonummer eller kontonummer + referens!
    const candidate = trimmed
      .replace(/^(betalning|insättning|insattning|från|fran|till)\s+/i, '')
      .trim();
    const standaloneRegex =
      /^(?:(?:\+?46[\s-]*7[02369]|07[02369])(?:[\s-]?\d){7}|123(?:[\s-]?\d){7})$/;
    if (standaloneRegex.test(candidate)) {
      const digits = candidate.replace(/\D/g, '');
      if (digits.startsWith('467') && digits.length === 11) {
        return '07' + digits.slice(3);
      }
      if ((digits.startsWith('07') || digits.startsWith('123')) && digits.length === 10) {
        return digits;
      }
    }
  }

  return null;
}

/**
 * Avgör säkert om en transaktionstext är en Swish-transaktion.
 * Förhindrar att banköverföringar mellan egna konton (t.ex. SEB konto ...0753 + ref) felaktigt klassas som Swish.
 */
export function isLikelySwishTransactionText(
  text: string | null | undefined,
  rawJson?: BankRawJson | null
): boolean {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase().trim();
  if (!lower) return false;

  if (lower.includes('swish')) {
    return true;
  }

  const bankCodeDesc = String(rawJson?.bank_transaction_code?.description || '')
    .trim()
    .toLowerCase();
  if (
    bankCodeDesc === 'transfer' ||
    bankCodeDesc === 'internal transfer' ||
    bankCodeDesc === 'internaltransfer' ||
    bankCodeDesc === 'account transfer'
  ) {
    return false;
  }

  return Boolean(extractSwishPhoneNumber(text, true));
}

export function formatSwishPhone(rawNumber: string): string {
  const digits = rawNumber.replace(/\D/g, '');
  let swedishDigits = digits;
  if (digits.startsWith('467')) {
    swedishDigits = '07' + digits.slice(3);
  }
  if (/^07[02369]\d{7}$/.test(swedishDigits)) {
    return `${swedishDigits.slice(0, 3)}-${swedishDigits.slice(3, 6)} ${swedishDigits.slice(6, 8)} ${swedishDigits.slice(8, 10)}`;
  }
  if (/^123\d{7}$/.test(digits)) {
    return `123-${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8, 10)}`;
  }
  return rawNumber;
}

export function formatSwishTitle(
  description: string | null | undefined,
  counterpartyName: string | null | undefined,
  isIncome?: boolean,
  rawJson?: BankRawJson | null,
  ignoreCustomDirectory?: boolean
): string {
  const raw = String(description || '').trim();
  const cpRaw = String(counterpartyName || '').trim();
  const combinedLower = `${raw} ${cpRaw}`.toLowerCase();

  const inferredIncome =
    isIncome !== undefined
      ? isIncome
      : combinedLower.includes('mottagen') ||
        combinedLower.includes('inbetalning') ||
        combinedLower.includes('från') ||
        combinedLower.includes('fran')
      ? true
      : combinedLower.includes('skickad') ||
        combinedLower.includes('betalning') ||
        combinedLower.includes('till')
      ? false
      : undefined;

  const formatWithDirection = (personOrMerchantName: string): string => {
    const clean = personOrMerchantName
      .replace(/^swish\s*(från|fran|till|mottagen|skickad|inbetalning|betalning|·|-)?\s*/i, '')
      .trim();
    if (!clean || /^swish$/i.test(clean)) return 'Swish';
    if (inferredIncome === true) {
      return `Swish från ${clean}`;
    }
    if (inferredIncome === false) {
      return `Swish till ${clean}`;
    }
    return `Swish från ${clean}`;
  };

  // 1. Extrahera eventuellt giltigt Swish-telefonnummer (t.ex. 46739976655 -> 0739976655)
  const phoneDigits =
    extractSwishPhoneNumber(`swish ${raw}`, true) ||
    extractSwishPhoneNumber(`swish ${cpRaw}`, true);
  const formattedPhone = phoneDigits ? formatSwishPhone(phoneDigits) : '';

  // 2. Kontrollera först om telefonnumret finns i vår Swish-nummeruppslagning / kontaktbok
  if (phoneDigits && !ignoreCustomDirectory) {
    const lookedUpName = resolveSwishPhoneToName(phoneDigits);
    if (lookedUpName) {
      return formatWithDirection(cleanDisplayMerchantName(lookedUpName));
    }
  }

  // 3. Om banken har ett separat motpartsnamn (eller debtor/creditor i rawJson) som inte bara är "Swish" eller ett telefonnummer
  const jsonNameCandidates = [
    cpRaw,
    rawJson?.debtor?.name,
    rawJson?.creditor?.name,
    rawJson?.debtor_name,
    rawJson?.creditor_name,
    rawJson?.ultimate_debtor,
    rawJson?.ultimate_creditor,
  ];
  for (const cand of jsonNameCandidates) {
    if (typeof cand !== 'string' || !cand.trim()) continue;
    const trimmedCand = cand.trim();
    const candPhone = extractSwishPhoneNumber(trimmedCand, false);
    if (
      !/^swish$/i.test(trimmedCand) &&
      !candPhone &&
      !/^[\d\s()+-]+$/.test(trimmedCand) &&
      /[a-zA-ZåäöÅÄÖ]{2,}/.test(trimmedCand)
    ) {
      return formatWithDirection(cleanDisplayMerchantName(trimmedCand));
    }
  }

  if (!raw) {
    return formattedPhone ? `Swish (${formattedPhone})` : 'Swish';
  }

  // 4. Extrahera personens/företagets namn från typiska svenska Swish-beskrivningar:
  let cleaned = raw
    .replace(/^swish\s*(mottagen|inbetalning|inb\.?|skickad|betalning|från|fran|till)?\s*/i, '')
    .trim();

  // Rensa bort telefonnummer
  cleaned = cleaned
    .replace(/(?:\+?46\s*7[02369]|07[02369]|123)(?:[\s-]?\d){7}/g, '')
    .trim();
  cleaned = cleaned.replace(/^\d+[\s/-]+/, '').trim();

  // Rensa bort allt utom faktiska bokstäver för att kontrollera om ett riktigt namn finns
  const remainingLetters = cleaned.replace(/[^a-zA-ZåäöÅÄÖ]/g, '').trim();

  if (remainingLetters.length >= 2 && !/^swish$/i.test(remainingLetters)) {
    return formatWithDirection(cleanDisplayMerchantName(cleaned));
  }

  if (formattedPhone) {
    return `Swish (${formattedPhone})`;
  }

  return 'Swish';
}

export const KNOWN_MERCHANT_NAMES_MAP: Record<string, string> = {
  systembolaget: 'Systembolaget',
  systembolage: 'Systembolaget',
  systembolag: 'Systembolaget',
  'sys.bolaget': 'Systembolaget',
  sysbolaget: 'Systembolaget',
  öresundskraft: 'Öresundskraft AB',
  oresundskraft: 'Öresundskraft AB',
  'öresundskraft ab': 'Öresundskraft AB',
  'oresundskraft ab': 'Öresundskraft AB',
  pressbyrån: 'Pressbyrån',
  pressbyran: 'Pressbyrån',
  pressbyra: 'Pressbyrån',
  hemköp: 'Hemköp',
  hemkop: 'Hemköp',
  hemko: 'Hemköp',
  willys: 'Willys',
  apotea: 'Apotea',
  apoteket: 'Apoteket',
  'apotek hjärtat': 'Apotek Hjärtat',
  'apotek hjartat': 'Apotek Hjärtat',
  'apoteket hjärtat': 'Apotek Hjärtat',
  'apotek hjart': 'Apotek Hjärtat',
  'apoteket hjar': 'Apotek Hjärtat',
  'kronans apotek': 'Kronans Apotek',
  'kronans apote': 'Kronans Apotek',
  elgiganten: 'Elgiganten',
  netonnet: 'NetOnNet',
  webhallen: 'Webhallen',
  biltema: 'Biltema',
  rusta: 'Rusta',
  jula: 'Jula',
  ikea: 'IKEA',
  'clas ohlson': 'Clas Ohlson',
  'clas ohlso': 'Clas Ohlson',
  'kjell & company': 'Kjell & Company',
  'kjell & co': 'Kjell & Company',
  'kjell o co': 'Kjell & Company',
  stabelo: 'Stabelo',
  sbab: 'SBAB',
  klarna: 'Klarna',
  'klarna bank ab': 'Klarna',
  'klarna bank': 'Klarna',
  'klarna ab': 'Klarna',
  spotify: 'Spotify',
  'spotify ab': 'Spotify',
  netflix: 'Netflix',
  'netflix com': 'Netflix',
  'netflix.com': 'Netflix',
  'apple.com/bill': 'Apple',
  'itunes.com/bill': 'Apple',
  sl: 'SL',
  'ab sl': 'SL',
  västtrafik: 'Västtrafik',
  vasttrafik: 'Västtrafik',
  skånetrafiken: 'Skånetrafiken',
  skanetrafiken: 'Skånetrafiken',
  hallandstrafiken: 'Hallandstrafiken',
  sj: 'SJ',
  'sj ab': 'SJ',
  mcdonalds: "McDonald's",
  'max burgers': 'MAX Burgers',
  'max hamburger': 'MAX Burgers',
  'burger king': 'Burger King',
  'espresso house': 'Espresso House',
  'waynes coffee': 'Wayne’s Coffee',
  foodora: 'Foodora',
  wolt: 'Wolt',
  'circle k': 'Circle K',
  okq8: 'OKQ8',
  preem: 'Preem',
  st1: 'St1',
  ingo: 'INGO',
  easypark: 'EasyPark',
  parkster: 'Parkster',
  'aimo park': 'Aimo Park',
  sats: 'SATS',
  'nordic wellness': 'Nordic Wellness',
  fitness24seven: 'Fitness24Seven',
  'friskis & svettis': 'Friskis & Svettis',
  'friskis och svettis': 'Friskis & Svettis',
  stc: 'STC',
  actic: 'Actic',
  tele2: 'Tele2',
  telia: 'Telia',
  telenor: 'Telenor',
  'tre sverige': 'Tre (3)',
  vimla: 'Vimla',
  hallon: 'Hallon',
  bahnhof: 'Bahnhof',
  halebop: 'Halebop',
  fello: 'Fello',
  comviq: 'Comviq',
  ownit: 'Ownit',
  bredband2: 'Bredband2',
  tibber: 'Tibber',
  vattenfall: 'Vattenfall',
  fortum: 'Fortum',
  ellevio: 'Ellevio',
  'e.on': 'E.ON',
  eon: 'E.ON',
  hedvig: 'Hedvig',
  folksam: 'Folksam',
  länsförsäkringar: 'Länsförsäkringar',
  lansforsakringar: 'Länsförsäkringar',
  'trygg-hansa': 'Trygg-Hansa',
  trygghansa: 'Trygg-Hansa',
  'if skadeförsäkring': 'If Skadeförsäkring',
  'if skadeforsakring': 'If Skadeförsäkring',
  agria: 'Agria Djurförsäkring',
  lassie: 'Lassie',
  'ica banken': 'ICA Banken',
  'ica försäkring': 'ICA Försäkring',
  csn: 'CSN',
  försäkringskassan: 'Försäkringskassan',
  forsakringskassan: 'Försäkringskassan',
  pensionsmyndigheten: 'Pensionsmyndigheten',
  pensionsmynd: 'Pensionsmyndigheten',
  skatteverket: 'Skatteverket',
  transportstyrelsen: 'Transportstyrelsen',
  kronofogden: 'Kronofogden',
  unionen: 'Unionen',
  kommunal: 'Kommunal',
  vision: 'Vision',
  'akademikernas a-kassa': 'Akademikernas a-kassa',
  'alfa-kassan': 'Alfa-kassan',
  alfakassan: 'Alfa-kassan',
};

export const CORPORATE_SUFFIXES = new Set([
  'AB',
  'HB',
  'KB',
  'AS',
  'OY',
  'GMBH',
  'LLC',
  'LTD',
  'INC',
  'PLC',
  'PUBL',
]);

export const ACRONYM_BRANDS: Record<string, string> = {
  ica: 'ICA',
  coop: 'Coop',
  ikea: 'IKEA',
  csn: 'CSN',
  sl: 'SL',
  sj: 'SJ',
  sats: 'SATS',
  stc: 'STC',
  okq8: 'OKQ8',
  'h&m': 'H&M',
  hm: 'H&M',
  bmw: 'BMW',
  dnb: 'DNB',
  seb: 'SEB',
  sbab: 'SBAB',
  xxl: 'XXL',
  kfc: 'KFC',
  tv4: 'TV4',
  se: 'SE',
};

export const LOWERCASE_JOINERS = new Set(['och', 'i', 'på', 'av', 'af', 'von', 'de', 'la', 'the', 'of', 'and']);

export const SWEDISH_ASCII_PLACE_AND_WORD_MAP: Record<string, string> = {
  rydeback: 'Rydebäck',
  malmo: 'Malmö',
  goteborg: 'Göteborg',
  gbg: 'Göteborg',
  sthlm: 'Stockholm',
  vasteras: 'Västerås',
  orebro: 'Örebro',
  linkoping: 'Linköping',
  norrkoping: 'Norrköping',
  jonkoping: 'Jönköping',
  angelholm: 'Ängelholm',
  vala: 'Väla',
  hoor: 'Höör',
  bjarred: 'Bjärred',
  solvesborg: 'Sölvesborg',
  koping: 'Köping',
  nykoping: 'Nyköping',
  enkoping: 'Enköping',
  lidkoping: 'Lidköping',
  falkoping: 'Falköping',
  soderkoping: 'Söderköping',
  umea: 'Umeå',
  lulea: 'Luleå',
  pitea: 'Piteå',
  skelleftea: 'Skellefteå',
  boras: 'Borås',
  gavle: 'Gävle',
  skovde: 'Skövde',
  vaxjo: 'Växjö',
  kalmar: 'Kalmar',
  kristianstad: 'Kristianstad',
  hassleholm: 'Hässleholm',
  landskrona: 'Landskrona',
  trelleborg: 'Trelleborg',
  hoganas: 'Höganäs',
  bastad: 'Båstad',
  laholm: 'Laholm',
  varberg: 'Varberg',
  kungsbacka: 'Kungsbacka',
  molndal: 'Mölndal',
  partille: 'Partille',
  kungalv: 'Kungälv',
  uddevalla: 'Uddevalla',
  trollhattan: 'Trollhättan',
  vanersborg: 'Vänersborg',
  amal: 'Åmål',
  karlstad: 'Karlstad',
  kristinehamn: 'Kristinehamn',
  eskilstuna: 'Eskilstuna',
  strangnas: 'Strängnäs',
  katrineholm: 'Katrineholm',
  nynashamn: 'Nynäshamn',
  sodertalje: 'Södertälje',
  taby: 'Täby',
  lidingo: 'Lidingö',
  solna: 'Solna',
  sundbyberg: 'Sundbyberg',
  jarfalla: 'Järfälla',
  upplands: 'Upplands',
  vasby: 'Väsby',
  akersberga: 'Åkersberga',
  norrtalje: 'Norrtälje',
  varmdo: 'Värmdö',
  haninge: 'Haninge',
  tyreso: 'Tyresö',
  huddinge: 'Huddinge',
  botkyrka: 'Botkyrka',
  salem: 'Salem',
  ekero: 'Ekerö',
  danderyd: 'Danderyd',
  vallentuna: 'Vallentuna',
  osteraker: 'Österskär',
  ostermalm: 'Östermalm',
  sodermalm: 'Södermalm',
  vasastan: 'Vasastan',
  kungsholmen: 'Kungsholmen',
  bromma: 'Bromma',
  hagersten: 'Hägersten',
  vallingby: 'Vällingby',
  farsta: 'Farsta',
  skarpnack: 'Skarpnäck',
  enskededalen: 'Enskededalen',
  sollentuna: 'Sollentuna',
  frolunda: 'Frölunda',
  hisingen: 'Hisingen',
  limhamn: 'Limhamn',
  hyllie: 'Hyllie',
  jagersro: 'Jägersro',
  mobilia: 'Mobilia',
  emporia: 'Emporia',
  triangeln: 'Triangeln',
  center: 'Center',
  nara: 'Nära',
  kafe: 'Kafé',
  kaf: 'Kafé',
};

export function cleanDisplayMerchantName(rawText: string | null | undefined): string {
  let cleaned = String(rawText || '').trim();
  if (!cleaned) return 'Banktransaktion';

  const origLower = cleaned.toLowerCase();
  const isExplicitTransferText =
    origLower.includes('egen överföring') ||
    origLower.includes('egen overforing') ||
    origLower.includes('intern överföring') ||
    origLower.includes('intern overforing') ||
    /^(överföring|overforing|överf\.?|overf\.?)\b/i.test(origLower);

  // 1. Rensa bort tekniska prefix och inledande BG/PG/datum/referensnummer från banker
  cleaned = cleaned
    .replace(
      /^(AUTOGIRO|BG|PG|BANKGIRO|PLUSGIRO|KORTKÖP|KORTKOP|BETALNING|RESERVATION|PRELIMINÄR|PRELIMINAR|KÖP|INBETALNING|UTBETALNING|ÖVERFÖRING|OVERFORING)\s*(?:BG|PG)?\s*[:#-]?\s*(\d[\d\s.-]{2,}\s+)?/i,
      ''
    )
    .replace(/^\d{6}\s+/, '') // Inledande 6-siffrigt datum t.ex. "261028 "
    .replace(/^\d[\d\s-]{4,}\s+/, '') // Inledande referensnummer om det följs av text
    .replace(/^[*#._-]+\s*/, '')
    .trim();

  // 2. Hantera Klarna-prefix snyggt (t.ex. "KLARNA*849203" -> "Klarna", "KLARNA*BOOZT" -> "Klarna · Boozt")
  if (/^klarna\s*[*#_-]/i.test(cleaned)) {
    const afterKlarna = cleaned.replace(/^klarna\s*[*#_-]+\s*/i, '').trim();
    if (!afterKlarna || /^[\d\s#*-]+$/.test(afterKlarna)) {
      return 'Klarna';
    }
    const subCleaned = cleanDisplayMerchantName(afterKlarna);
    if (subCleaned && subCleaned !== 'Banktransaktion' && subCleaned.toLowerCase() !== 'klarna') {
      return `Klarna · ${subCleaned}`;
    }
    return 'Klarna';
  }

  // 3. Rensa bort kortterminal-/betalväxelprefix (ZETTLE*, SUMUP*, NYX*, STRIPE*, BAMBORA*, PAYPAL*, SQ*, WL* etc.)
  cleaned = cleaned
    .replace(
      /^(ZETTLE|IZETTLE|IZ|SUMUP|PAYPAL|STRIPE|SQ|SP|WL|BAMBORA|NETS|ADYEN|TRUSTLY|QCK|BILLO)\s*[*#_-]+\s*/i,
      ''
    )
    .replace(/^NYX\s*[*#_-]+\s*(SVENSKA\s*)?/i, 'Varuautomat ')
    .trim();

  // 4. Rensa bort terminalsuffix som landskod, slutsiffror och bolagsändelser allra sist på raden
  cleaned = cleaned
    .replace(/\s+(SE|SWE|SWEDEN)$/i, '')
    .replace(/\s+\d{3,}\s*$/, '') // T.ex. " 1421", " 0124" endast allra sist på raden
    .replace(/\s+(SE|SWE|SWEDEN)$/i, '')
    .trim();

  // Ta bort avslutande bolagsform (AB, AKTIEBOLAG, HB, KB, PUBL) när ett riktigt företagsnamn står framför
  const withoutCorpSuffix = cleaned
    .replace(/\s+(AKTIEBOLAG|AB|A\.B\.|HB|KB|PUBL)$/i, '')
    .trim();
  if (withoutCorpSuffix.length >= 2 && /[a-zA-ZåäöÅÄÖ]/.test(withoutCorpSuffix)) {
    cleaned = withoutCorpSuffix;
  }

  // 4.5. Hantera ISO-646-SE teckenersättningar i kortterminaler (t.ex. "GEK$S ULLARED # ULLARED" -> "Gekås Ullared", "X -TRA" -> "X-tra", "MCDFALKENBERG" -> "McDonald's Falkenberg")
  cleaned = cleaned
    .replace(/\bGEK\$S\b/gi, 'Gekås')
    .replace(/\bX\s+-\s*TRA\b/gi, 'X-tra')
    .replace(/\bMCD([A-ZÅÄÖ]{3,})\b/gi, (_, city) => `McDonald's ${city}`)
    .replace(/\s+#\s+/g, ' ')
    .replace(/\s+#$/g, '')
    .trim();

  if (!cleaned || /^[\d\s*-]+$/.test(cleaned)) {
    return isExplicitTransferText ? 'Överföring' : 'Banktransaktion';
  }

  const lower = cleaned.toLowerCase().trim();

  // 5. Kontrollera mot ordbok om hela raden matchar ett känt varumärke eller avhugget butiksnamn
  if (KNOWN_MERCHANT_NAMES_MAP[lower]) {
    return KNOWN_MERCHANT_NAMES_MAP[lower];
  }

  // 6. Ta bort avhuggna ord eller dubbletter mitt i/slutet av banksträngar när nästa ord är samma ord eller börjar på samma avhuggna stam
  // (t.ex. "COOP GAMLETULL HALMSTA HALMSTAD" -> "Coop Gamletull Halmstad", "GEKÅS ULLARED ULLARED" -> "Gekås Ullared")
  const rawWords = cleaned.split(/\s+/);
  const dedupedWords: string[] = [];
  for (let i = 0; i < rawWords.length; i++) {
    const curr = rawWords[i];
    const next = rawWords[i + 1];
    if (curr === '#') continue;
    if (next && next.length >= 2) {
      const currL = curr.toLowerCase();
      const nextL = next.toLowerCase();
      if (currL === nextL) {
        continue;
      }
      if (
        i > 0 &&
        /^[a-zA-ZåäöÅÄÖ]+$/.test(curr) &&
        nextL.startsWith(currL) &&
        (curr.length === 1 || curr.length >= 4)
      ) {
        continue;
      }
    }
    dedupedWords.push(curr);
  }

  // 7. Universell svensk Title Case, ortsnamnsåterställning & förkortningar
  const formattedWords = dedupedWords.map((w, idx) => {
    const punctuationMatch = w.match(/^([^a-zA-ZåäöÅÄÖ0-9]*)(.*?)([^a-zA-ZåäöÅÄÖ0-9]*)$/);
    const prefix = punctuationMatch ? punctuationMatch[1] : '';
    const core = punctuationMatch ? punctuationMatch[2] : w;
    const suffix = punctuationMatch ? punctuationMatch[3] : '';

    const coreLower = core.toLowerCase();

    if (ACRONYM_BRANDS[coreLower]) {
      return `${prefix}${ACRONYM_BRANDS[coreLower]}${suffix}`;
    }
    if (SWEDISH_ASCII_PLACE_AND_WORD_MAP[coreLower]) {
      return `${prefix}${SWEDISH_ASCII_PLACE_AND_WORD_MAP[coreLower]}${suffix}`;
    }
    if (KNOWN_MERCHANT_NAMES_MAP[coreLower] && !KNOWN_MERCHANT_NAMES_MAP[coreLower].includes(' ')) {
      return `${prefix}${KNOWN_MERCHANT_NAMES_MAP[coreLower]}${suffix}`;
    }

    if (
      CORPORATE_SUFFIXES.has(coreLower.toUpperCase()) ||
      coreLower === 'ab' ||
      coreLower === 'a.b.' ||
      coreLower === 'a/b'
    ) {
      return `${prefix}AB${suffix}`;
    }

    if (idx > 0 && LOWERCASE_JOINERS.has(coreLower)) {
      return `${prefix}${coreLower}${suffix}`;
    }

    if (core.length > 0) {
      const titleCased = core.charAt(0).toUpperCase() + core.slice(1).toLowerCase();
      return `${prefix}${titleCased}${suffix}`;
    }

    return w;
  });

  return formattedWords.join(' ');
}

export function extractRawJsonFallbackText(rawJson: BankRawJson | null | undefined): string {
  if (!rawJson || typeof rawJson !== 'object') return '';
  const parts: string[] = [];
  if (typeof rawJson.creditor?.name === 'string') parts.push(rawJson.creditor.name);
  if (typeof rawJson.debtor?.name === 'string') parts.push(rawJson.debtor.name);
  if (typeof rawJson.merchant_name === 'string') parts.push(rawJson.merchant_name);
  if (typeof rawJson.additional_information === 'string') parts.push(rawJson.additional_information);
  if (Array.isArray(rawJson.remittance_information)) {
    for (const item of rawJson.remittance_information) {
      if (typeof item === 'string') parts.push(item);
      else if (item && typeof item.unstructured === 'string') parts.push(item.unstructured);
    }
  } else if (typeof rawJson.remittance_information === 'string') {
    parts.push(rawJson.remittance_information);
  }
  return parts.map((p) => p.trim()).filter(Boolean).join(' ');
}

export function categorizeBankTransactionForApp(
  tx: BankTransactionItem,
  availableCategories: Array<string | { name?: string }> = [],
  _incomeCategories?: Array<string | { name?: string }>,
  ignoreUserAliases?: boolean
): { merchant: string; category: string; logo?: string } {
  const rawFallback = extractRawJsonFallbackText(tx.raw_json);
  const effectiveDesc =
    tx.description && tx.description.toLowerCase().trim() !== 'banktransaktion'
      ? tx.description
      : rawFallback || tx.description || '';
  const combined = `${effectiveDesc} ${tx.counterparty_name || ''} ${rawFallback}`.toLowerCase();
  const categoryNames = (availableCategories || [])
    .map((c) => (typeof c === 'string' ? c : c?.name || ''))
    .filter((name): name is string => typeof name === 'string' && name.trim().length > 0);

  const resolveCategory = (preferredList: string[]): string => {
    if (categoryNames.length > 0) {
      for (const pref of preferredList) {
        const prefLower = (pref || '').toLowerCase();
        const exact = categoryNames.find((c) => c.toLowerCase() === prefLower);
        if (exact) return exact;
        const partial = categoryNames.find(
          (c) => c.toLowerCase().includes(prefLower) || prefLower.includes(c.toLowerCase())
        );
        if (partial) return partial;
      }
      const fallbackOther = categoryNames.find(
        (c) => c.toLowerCase().includes('övrigt') || c.toLowerCase().includes('other')
      );
      return fallbackOther || categoryNames[0];
    }
    return preferredList[0] || 'Övrigt';
  };

  if (
    tx.reconciliation_status === 'internal_transfer' ||
    isInternalTransferOrMicroSavings(tx)
  ) {
    return {
      merchant: 'Överföring mellan egna konton',
      category: resolveCategory(['Överföring', 'Övrigt']),
      logo: getLogoUrl('Överföring', 'Överföring'),
    };
  }

  const isSwishTx =
    isLikelySwishTransactionText(effectiveDesc, tx.raw_json) ||
    isLikelySwishTransactionText(tx.counterparty_name, tx.raw_json);

  if (isSwishTx) {
    const swishTitle = formatSwishTitle(
      effectiveDesc,
      tx.counterparty_name,
      undefined,
      tx.raw_json,
      ignoreUserAliases
    );
    return {
      merchant: swishTitle,
      category: 'Swish',
      logo: getLogoUrl(swishTitle, 'Swish'),
    };
  }

  // Tvätta bankens råa namn lätt och smart (ta bort ZETTLE*, KORTKÖP, SE, AB och fixa VERSALER -> Title Case)
  // samtidigt som specifika butiksnamn bevaras och originaltexten sparas på transaktionskortet.
  const directBankName = (tx.counterparty_name || effectiveDesc || 'Kortköp')
    .replace(/\s+/g, ' ')
    .trim();
  const cleanedBankName = cleanDisplayMerchantName(directBankName);
  const rawOrCleanBankName =
    cleanedBankName && cleanedBankName !== 'Banktransaktion'
      ? cleanedBankName
      : directBankName || 'Kortköp';
  const hasReadableBankName =
    rawOrCleanBankName &&
    rawOrCleanBankName.toLowerCase() !== 'banktransaktion' &&
    rawOrCleanBankName.toLowerCase() !== 'kortköp';

  // Kontrollera användarens sparade merchant-alias / regler först (Merchant Memory)
  if (!ignoreUserAliases) {
    const userAlias =
      resolveMerchantAlias(directBankName) ||
      resolveMerchantAlias(cleanedBankName) ||
      resolveMerchantAlias(tx.counterparty_name || '') ||
      resolveMerchantAlias(effectiveDesc);
    if (userAlias) {
      const resolvedCat = resolveCategory([userAlias.category]);
      return {
        merchant: userAlias.name,
        category: resolvedCat,
        logo: getLogoUrl(userAlias.name, resolvedCat) || getLogoUrl(directBankName, resolvedCat),
      };
    }
  }

  for (const rule of EVERYDAY_MERCHANT_RULES) {
    if (rule.keywords.some((kw) => combined.includes(kw))) {
      const category = resolveCategory(rule.preferredCategories);
      const displayMerchant = hasReadableBankName ? rawOrCleanBankName : rule.cleanName;
      return {
        merchant: displayMerchant,
        category,
        logo: getLogoUrl(rule.cleanName, category) || getLogoUrl(displayMerchant, category),
      };
    }
  }

  for (const rule of EXTENDED_FIXED_EXPENSE_RULES) {
    if (rule.keywords.some((kw) => combined.includes(kw.toLowerCase()))) {
      const preset = rule.presetId
        ? SWEDISH_EXPENSE_PRESETS.find((p) => p.id === rule.presetId)
        : undefined;
      const fallbackDisplay = preset?.name || rule.fallbackName;
      const displayName = hasReadableBankName ? rawOrCleanBankName : fallbackDisplay;
      const category = resolveCategory([preset?.category || rule.category]);
      return {
        merchant: displayName,
        category,
        logo: getLogoUrl(fallbackDisplay, category) || getLogoUrl(displayName, category),
      };
    }
  }

  // Kontrollera om vi har en inlärd AI-kategori eller keyword-baserad kategori
  const learnedCat =
    getLearnedBrandCategory(directBankName) || getLearnedBrandCategory(cleanedBankName);
  if (learnedCat) {
    const category = resolveCategory([learnedCat]);
    return {
      merchant: rawOrCleanBankName,
      category,
      logo: getLogoUrl(rawOrCleanBankName, category),
    };
  }

  const inferredManual = inferCategoryAndMethodFromName(rawOrCleanBankName, 'transaction');
  if (inferredManual?.category) {
    const category = resolveCategory([inferredManual.category]);
    return {
      merchant: rawOrCleanBankName,
      category,
      logo: inferredManual.logo || getLogoUrl(rawOrCleanBankName, category),
    };
  }

  // Steg 5: Utnyttja bankens MCC-kod (Merchant Category Code, ISO 18245) från Enable Banking raw_json
  const mccPreferredCategories = resolveCategoryFromMccCode(tx.raw_json);
  if (mccPreferredCategories && mccPreferredCategories.length > 0) {
    const category = resolveCategory(mccPreferredCategories);
    return {
      merchant: rawOrCleanBankName,
      category,
      logo: getLogoUrl(rawOrCleanBankName, category),
    };
  }

  const category = resolveCategory(['Övrigt']);
  return {
    merchant: rawOrCleanBankName,
    category,
    logo: getLogoUrl(rawOrCleanBankName, category),
  };
}

/**
 * Mappar bankens ISO 18245 MCC-kod (Merchant Category Code) eller bank_transaction_code
 * till rätt svensk kategori när handlaren är en okänd lokal butik, restaurang eller utlandsköp.
 */
export function resolveCategoryFromMccCode(rawJson: BankRawJson | null | undefined): string[] | null {
  if (!rawJson || typeof rawJson !== 'object') return null;

  const rawMcc =
    rawJson.merchant_category_code ??
    rawJson.mcc ??
    rawJson.card_transaction?.merchant_category_code ??
    rawJson.card_transaction?.mcc ??
    rawJson.bank_transaction_code?.sub_family_code ??
    rawJson.proprietary_bank_transaction_code;

  if (rawMcc !== undefined && rawMcc !== null) {
    const mccMatch = String(rawMcc).trim().match(/\b(\d{4})\b/);
    if (mccMatch) {
      const code = parseInt(mccMatch[1], 10);

      // Livsmedel, bageri, kiosk, restaurang, café, bar & snabbmat
      if (
        (code >= 5411 && code <= 5499) ||
        code === 5300 ||
        (code >= 5811 && code <= 5814)
      ) {
        return ['Mat & dryck', 'Mat', 'Uteliv'];
      }

      // Kollektivtrafik, tåg, taxi, parkering, trängselavgift, bensinstation, bilverkstad, hyrbil
      if (
        (code >= 4111 && code <= 4131) ||
        code === 4784 ||
        code === 4789 ||
        (code >= 5511 && code <= 5599) ||
        (code >= 7512 && code <= 7549)
      ) {
        return ['Transport', 'Bilen'];
      }

      // Flygbolag (3000–3350, 4511), hotell (3501–3838, 7011) & resebyråer (4722)
      if (
        (code >= 3000 && code <= 3838) ||
        code === 4511 ||
        code === 4722 ||
        code === 7011
      ) {
        return ['Nöje', 'Transport'];
      }

      // Apotek, läkare, tandläkare, optiker, frisör, skönhetsvård, spa & gym
      if (
        code === 5912 ||
        (code >= 8011 && code <= 8099) ||
        code === 7230 ||
        code === 7297 ||
        code === 7298 ||
        code === 7997
      ) {
        return ['Hälsa'];
      }

      // Kläder, skor, varuhus, möbler, inredning, elektronik, bokhandel, sport & hobby
      if (
        code === 5200 ||
        code === 5211 ||
        code === 5251 ||
        code === 5261 ||
        code === 5311 ||
        code === 5331 ||
        code === 5399 ||
        (code >= 5611 && code <= 5699) ||
        (code >= 5712 && code <= 5735) ||
        (code >= 5940 && code <= 5999)
      ) {
        return ['Shopping'];
      }

      // Digitala prenumerationer, spel, bio, teater, evenemang & nöjesparker
      if (
        (code >= 5815 && code <= 5818) ||
        (code >= 7829 && code <= 7841) ||
        (code >= 7911 && code <= 7999)
      ) {
        return ['Nöje', 'Abonnemang'];
      }

      // Telekom, bredband & TV
      if (code === 4812 || code === 4814 || code === 4816 || code === 4899) {
        return ['Abonnemang', 'Räkningar'];
      }

      // El, vatten, fjärrvärme, skatt & myndighetsavgifter
      if (code === 4900 || code === 9311 || code === 9399) {
        return ['Räkningar', 'Boende'];
      }

      // Försäkring
      if (code === 6300 || code === 5960) {
        return ['Försäkring', 'Räkningar'];
      }

      // Fastighetsförvaltning / Hyra
      if (code === 6513) {
        return ['Boende'];
      }
    }
  }

  return null;
}

export const AI_SKIP_GENERIC_PLACEHOLDERS = new Set([
  'banktransaktion',
  'kortköp',
  'kortkop',
  'betalning',
  'autogiro',
  'bankgiro',
  'plusgiro',
  'bg',
  'pg',
  'insättning',
  'insattning',
  'utgift',
  'inkomst',
  'köp',
  'kop',
  'reserverat',
  'reservation',
  'överföring',
  'overforing',
  'okänd',
  'okand',
  'övrigt',
  'ovrigt',
]);

/**
 * Avgör om en banktransaktion innehåller kryptiska kortterminalprefix
 * (t.ex. ZETTLE*GBG KAF, NYX*SVENSKA, SUMUP*..., KLARNA*84920).
 * Vanliga läsbara bankrader (t.ex. "Hemköp Rydebäck") ska ALDRIG skrivas om av AI!
 */
export function needsAiMerchantCleaning(
  rawText: string | null | undefined,
  currentTitle?: string | null,
  currentCategory?: string | null
): boolean {
  const rawTrimmed = (rawText || '').trim();
  const titleTrimmed = (currentTitle || '').trim();
  const combined = `${rawTrimmed} ${titleTrimmed}`.trim();
  if (!combined || combined.length < 2) return false;
  const lower = combined.toLowerCase();

  const rawLower = rawTrimmed.toLowerCase();
  const titleLower = titleTrimmed.toLowerCase();
  if (
    (!rawLower || AI_SKIP_GENERIC_PLACEHOLDERS.has(rawLower) || /^[\d\s*-]+$/.test(rawLower)) &&
    (!titleLower || AI_SKIP_GENERIC_PLACEHOLDERS.has(titleLower) || /^[\d\s*-]+$/.test(titleLower))
  ) {
    return false;
  }

  if (
    isLikelySwishTransactionText(lower) ||
    currentCategory === 'Swish'
  ) {
    return false;
  }

  // Trigger ENBART på kryptiska betalväxelprefix med asterisk/brädgård (t.ex. ZETTLE*, NYX*, SUMUP*, STRIPE*, KLARNA*84920)
  const hasCrypticTerminalPattern =
    /\b(zettle|izettle|iz|sumup|nyx|stripe|sq|sp|wl|bambora|nets|adyen|qck|billo|klarna)\s*[*#]/i.test(
      combined
    ) || /[a-zA-Z0-9]\*[a-zA-Z0-9]/.test(combined);

  return hasCrypticTerminalPattern;
}

export function getDayOfMonthFromIso(dateStr: string | null | undefined, fallbackDay = 27): number {
  if (!dateStr) return fallbackDay;
  const parts = dateStr.split('-');
  if (parts.length >= 3) {
    const day = parseInt(parts[2], 10);
    if (day >= 1 && day <= 31) return day;
  }
  return fallbackDay;
}

/**
 * Räknar ut den faktiska återkommande dragnings-/utbetalningsdagen i månaden (1–31)
 * utifrån samtliga observerade datum i transaktionshistoriken.
 * Tar hänsyn till om en enskild dragning flyttats p.g.a. helg (t.ex. fredag före helg-25:e
 * eller måndag efter helg-förfallodag), men tvingar ALDRIG en inkomst (såsom A-kassa den 22:a)
 * till den 25:e om transaktionerna faktiskt sker på en annan dag.
 */
export function inferTrueRecurringDayOfMonth(
  datesIso: string[],
  kind: 'expense' | 'income',
  category: string,
  name: string,
  fallbackDay = 25
): number {
  const validDates = Array.from(new Set(datesIso.filter(Boolean))).sort((a, b) =>
    b.localeCompare(a)
  );
  if (validDates.length === 0) return fallbackDay;

  interface ParsedObs {
    iso: string;
    year: number;
    month: number;
    day: number;
    dayOfWeek: number; // 0 = Sun, 1 = Mon, ..., 5 = Fri, 6 = Sat
    daysInMonth: number;
  }

  const parsed: ParsedObs[] = [];
  for (const d of validDates) {
    const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) continue;
    const year = parseInt(m[1], 10);
    const month = parseInt(m[2], 10);
    const day = parseInt(m[3], 10);
    if (month < 1 || month > 12 || day < 1 || day > 31) continue;
    const dt = new Date(year, month - 1, day, 12, 0, 0);
    const daysInMonth = new Date(year, month, 0).getDate();
    parsed.push({
      iso: d,
      year,
      month,
      day,
      dayOfWeek: dt.getDay(),
      daysInMonth,
    });
  }

  if (parsed.length === 0) return fallbackDay;

  const rawDaysSet = new Set(parsed.map((p) => p.day));
  const lowerName = (name || '').toLowerCase();
  const lowerCat = (category || '').toLowerCase();
  const isAkassaOrBenefit =
    lowerName.includes('kassa') ||
    lowerName.includes('unionen') ||
    lowerName.includes('ersättning') ||
    lowerCat === 'ersättning' ||
    lowerName.includes('försäkringskassan');

  const adjustedDays = parsed.map((obs) => {
    const d = obs.day;

    if (kind === 'income') {
      // Om en utbetalning skedde på en fredag (dayOfWeek === 5):
      // Kontrollera om lördag (d+1) eller söndag (d+2) är den faktiska dagen under andra månader
      if (obs.dayOfWeek === 5) {
        if (rawDaysSet.has(d + 1)) {
          return d + 1;
        }
        if (rawDaysSet.has(d + 2)) {
          return d + 2;
        }
        // Endast om det är vanlig Lön eller CSN (EJ A-kassa!) och fredagen inföll den 23:e eller 24:e
        // (vilket innebär att den 25:e var lördag eller söndag) och ingen vardagsutbetalning skett på 23/24:
        if (
          !isAkassaOrBenefit &&
          (lowerCat === 'lön' || lowerCat === 'csn') &&
          (d === 23 || d === 24) &&
          !parsed.some((other) => other.day === d && other.dayOfWeek !== 5)
        ) {
          return 25;
        }
        if (
          lowerName.includes('barnbidrag') &&
          (d === 18 || d === 19) &&
          !parsed.some((other) => other.day === d && other.dayOfWeek !== 5)
        ) {
          return 20;
        }
      }
      return d;
    } else {
      // För utgifter (autogiro/bankgiro/kort):
      // Om en dragning skedde på en måndag (dayOfWeek === 1), kolla om söndagen (d-1) eller lördagen (d-2)
      // finns som dragningsdag en annan månad
      if (obs.dayOfWeek === 1) {
        if (d > 1 && rawDaysSet.has(d - 1)) return d - 1;
        if (d > 2 && rawDaysSet.has(d - 2)) return d - 2;
      }
      // Om en dragning skedde på en fredag (dayOfWeek === 5), kolla om lördagen (d+1) eller söndagen (d+2)
      // finns som dragningsdag en annan månad
      if (obs.dayOfWeek === 5) {
        if (rawDaysSet.has(d + 1)) return d + 1;
        if (rawDaysSet.has(d + 2)) return d + 2;
      }
      // Om februari-dragning skedde på sista dagen i februari (28/29) men andra månader drogs 30 eller 31:
      if (obs.month === 2 && d >= 27) {
        if (rawDaysSet.has(30)) return 30;
        if (rawDaysSet.has(31)) return 31;
      }
      return d;
    }
  });

  // Räkna ut vanligaste dagen (mode) bland alla observerade (och helgjusterade) månader
  const counts = new Map<number, number>();
  for (const d of adjustedDays) {
    counts.set(d, (counts.get(d) || 0) + 1);
  }

  let bestDay = adjustedDays[0];
  let bestCount = 0;
  for (const [dayVal, count] of counts.entries()) {
    if (count > bestCount) {
      bestCount = count;
      bestDay = dayVal;
    }
  }

  // Om alla dagar bara förekommit 1 gång men ligger tätt (t.ex. [23, 22]), välj den lägsta/typiska i klustret eller senaste
  return bestDay;
}

export function getYearMonthKey(dateStr: string | null | undefined): string {
  if (!dateStr) return 'unknown';
  return dateStr.slice(0, 7); // YYYY-MM
}

export function inferFrequencyFromDates(datesIso: string[]): Frequency {
  const validDates = Array.from(new Set(datesIso.filter(Boolean))).sort((a, b) =>
    b.localeCompare(a)
  );
  if (validDates.length < 2) return Frequency.MONTHLY;

  const gapsDays: number[] = [];
  for (let i = 0; i < validDates.length - 1; i++) {
    const d1 = Date.parse(`${validDates[i]}T12:00:00`);
    const d2 = Date.parse(`${validDates[i + 1]}T12:00:00`);
    if (Number.isFinite(d1) && Number.isFinite(d2)) {
      gapsDays.push(Math.abs(d1 - d2) / (1000 * 60 * 60 * 24));
    }
  }
  if (gapsDays.length === 0) return Frequency.MONTHLY;

  const avgGap = gapsDays.reduce((a, b) => a + b, 0) / gapsDays.length;
  if (avgGap >= 300) return Frequency.ANNUALLY;
  if (avgGap >= 150 && avgGap < 300) return Frequency.SEMI_ANNUALLY;
  if (avgGap >= 70 && avgGap < 150) return Frequency.QUARTERLY;
  return Frequency.MONTHLY;
}

export function buildEvidenceSummary(
  occurrences: number,
  dates: string[],
  amounts: number[],
  frequency: Frequency,
  isVariable?: boolean
): string {
  const latestDate = dates[0] || '';
  const uniqueAmounts = Array.from(new Set(amounts.map((a) => Math.round(a))));
  const amountLabel =
    uniqueAmounts.length > 1
      ? `${Math.min(...uniqueAmounts)}–${Math.max(...uniqueAmounts)} kr (rörligt)`
      : `${uniqueAmounts[0] || 0} kr`;
  const freqLabel = frequency || Frequency.MONTHLY;
  return `${occurrences} ${occurrences === 1 ? 'betalning' : 'betalningar'}${
    latestDate ? ` (senast ${latestDate})` : ''
  } · ${amountLabel} · ${freqLabel}${isVariable && uniqueAmounts.length <= 1 ? ' (rörlig)' : ''}`;
}
