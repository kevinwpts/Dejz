import { Transaction, Config } from '../types';
import { resolveEntityVisual, normalizeMerchant } from './resolver';

// Curated dictionary of prominent brand colors (hex) for authentic ambient tints
export const BRAND_COLORS: Record<string, string> = {
  // Streaming & Media
  spotify: '#1DB954',
  netflix: '#E50914',
  youtube: '#FF0000',
  disney: '#113CCF',
  viaplay: '#E50043',
  hbo: '#9933FF',
  max: '#002BE7',
  twitch: '#9146FF',
  apple: '#8E8E93',
  storytel: '#FF5A00',
  bookbeat: '#00D494',
  nextory: '#00A3E0',
  soundic: '#FF5500',

  // Groceries & Retail (Sweden / Nordic)
  ica: '#E01A22',
  'ica maxi': '#E01A22',
  'ica kvantum': '#E01A22',
  'ica supermarket': '#E01A22',
  'ica nära': '#E01A22',
  coop: '#009640',
  'stora coop': '#009640',
  willys: '#E2001A',
  hemköp: '#E30613',
  lidl: '#0050AA',
  citygross: '#E3001B',
  'city gross': '#E3001B',
  systembolaget: '#00843D',
  snabbgross: '#E2001A',
  pressbyrån: '#FFCC00',
  pressbyran: '#FFCC00',
  '7-eleven': '#008163',
  seveneleven: '#008163',
  mathem: '#00A859',

  // Fast food, Restaurants & Delivery
  mcdonalds: '#FFBC0D',
  mcdonald: '#FFBC0D',
  donken: '#FFBC0D',
  maxhamburgare: '#DA291C',
  maxburgers: '#DA291C',
  burgerking: '#D62300',
  subway: '#008C15',
  kfc: '#A3080C',
  starbucks: '#006241',
  espressohouse: '#6F3A15',
  foodora: '#D70F64',
  wolt: '#009DE0',
  uber: '#000000',
  ubereats: '#06C167',
  bolt: '#34D186',
  pinchos: '#D4A017',
  bastardburgers: '#1A1A1A',
  brödernas: '#D32F2F',

  // Shopping & Fashion
  ikea: '#0058A3',
  hm: '#E50012',
  'h&m': '#E50012',
  zara: '#1A1A1A',
  zalando: '#FF6900',
  amazon: '#FF9900',
  asos: '#2D2D2D',
  shein: '#1A1A1A',
  boozt: '#1A1A1A',
  nk: '#1A1A1A',
  åhlens: '#E30613',
  ahlens: '#E30613',
  stadium: '#0055A5',
  xxl: '#D4E600',
  intersport: '#004B9B',
  clasohlson: '#009FE3',
  rusta: '#E30613',
  jula: '#E30613',
  biltema: '#0055A5',
  bauhaus: '#E30613',
  hornbach: '#FF6600',
  elgiganten: '#001E62',
  mediamarkt: '#DF0000',
  power: '#FF6A00',
  netonnet: '#002F6C',
  inet: '#0070BA',
  webhallen: '#0090DF',
  komplett: '#FF6600',

  // Pharmacy & Health
  apoteket: '#00824B',
  kronansapotek: '#008C50',
  apotea: '#00A389',
  hjärtat: '#E30613',
  apotekhjärtat: '#E30613',
  doctolib: '#0596DE',
  kry: '#3B82F6',
  doktorse: '#00BFA5',
  sats: '#FF0055',
  friskis: '#E30613',
  nordicwellness: '#FF6600',
  gymgrossisten: '#002E6D',

  // Travel & Transport
  sl: '#0070BA',
  västtrafik: '#009DE0',
  vasttrafik: '#009DE0',
  skånetrafiken: '#E3001B',
  skanetrafiken: '#E3001B',
  sj: '#008559',
  sas: '#000066',
  norwegian: '#D81E05',
  ryanair: '#0D3580',
  airbnb: '#FF5A5F',
  booking: '#003580',
  hotels: '#D32F2F',
  vy: '#004F4D',
  mälartåg: '#E30613',

  // Fuel & Charging
  circlek: '#EE1C25',
  okq8: '#ED1C24',
  preem: '#008559',
  st1: '#0055A5',
  shell: '#FFD100',
  qstar: '#009FE3',
  incharge: '#008559',
  ionity: '#0055A5',
  tesla: '#E82127',

  // Telecom & Tech
  telia: '#802882',
  tele2: '#002D54',
  telenor: '#008CE6',
  tre: '#FF6600',
  halebop: '#FF007A',
  vimla: '#00D26A',
  hallon: '#E91E63',
  comviq: '#E30613',
  bahnhof: '#E30613',
  ownit: '#00A3E0',
  klarna: '#FFB3C7',
  swish: '#E83D43',
  revolut: '#0075EB',
  paypal: '#003087',
  google: '#4285F4',
  microsoft: '#00A4EF',
  playstation: '#003791',
  xbox: '#107C10',
  steam: '#171A21',
  nintendo: '#E60012',
  openai: '#10A37F',
  chatgpt: '#10A37F',
  tinder: '#FE3C72',
  hinge: '#7C3AED'
};

/**
 * Resolves the most prominent/dominant brand or entity color for subtle ambient UI tinting.
 */
export function getTransactionDominantColor(transaction: Transaction, config?: Config): string {
  const merchantText = transaction.merchant || transaction.note || '';
  const norm = normalizeMerchant(merchantText).replace(/\s+/g, '');
  
  // Check exact/prefix match in brand colors
  if (norm) {
    if (BRAND_COLORS[norm]) {
      return BRAND_COLORS[norm];
    }
    for (const [key, color] of Object.entries(BRAND_COLORS)) {
      if (norm.includes(key) || key.includes(norm)) {
        return color;
      }
    }
  }

  // Visual resolver fallback (category color, user preference, etc.)
  const visual = resolveEntityVisual(transaction, config);
  if (visual.backgroundColor && visual.backgroundColor !== '#6E6961' && visual.backgroundColor !== '#ffffff') {
    return visual.backgroundColor;
  }

  // Find category color in config
  const categoryText = typeof transaction.category === 'object' ? (transaction.category as any)?.name : (transaction.category || '');
  const cat = [...(config?.categories || []), ...(config?.incomeCategories || [])].find(
    c => c.name.trim().toLowerCase() === categoryText.trim().toLowerCase()
  );
  if (cat?.color) {
    return cat.color;
  }

  // Default elegant subtle accent
  if (transaction.type === 'income') return '#05B862';
  if (transaction.type === 'savings') return '#3B82F6';
  return '#7C3AED'; // Soft vibrant violet fallback
}
