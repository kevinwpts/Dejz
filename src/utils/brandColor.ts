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

// Cache for analyzed image dominant colors
export const imageColorCache = new Map<string, string>();

/**
 * Extracts vibrant/dominant color directly from SVG markup or data URI.
 */
export function extractColorFromSvg(svgUrlOrContent: string): string | null {
  try {
    const raw = svgUrlOrContent.startsWith('data:image/svg+xml')
      ? decodeURIComponent(svgUrlOrContent.replace(/^data:image\/svg\+xml;utf8,/, ''))
      : svgUrlOrContent;

    // Match hex colors (e.g. #FF0055, %23FF0055)
    const matches = raw.match(/(?:#|%23)([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g);
    if (!matches || matches.length === 0) return null;

    const candidates: { color: string; score: number }[] = [];

    for (const match of matches) {
      const cleanHex = match.replace('%23', '#');
      const expandedHex = cleanHex.length === 4
        ? '#' + cleanHex[1] + cleanHex[1] + cleanHex[2] + cleanHex[2] + cleanHex[3] + cleanHex[3]
        : cleanHex;

      const r = parseInt(expandedHex.slice(1, 3), 16);
      const g = parseInt(expandedHex.slice(3, 5), 16);
      const b = parseInt(expandedHex.slice(5, 7), 16);

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const delta = max - min;
      const lightness = (max + min) / (2 * 255);

      // Skip near-white, near-black, and flat neutral grays
      if (lightness > 0.92 || lightness < 0.08) continue;
      if (delta < 20) continue;

      const saturation = delta / (max === 0 ? 1 : max);
      // Higher score for saturated, vibrant colors
      const score = saturation * 2 + (1 - Math.abs(lightness - 0.5));
      candidates.push({ color: expandedHex.toUpperCase(), score });
    }

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0].color;
  } catch {
    return null;
  }
}

/**
 * Dynamically analyzes an image URL (PNG, JPEG, WebP, Favicon, SVG) on a canvas to find its true dominant color.
 */
export function extractDominantColorFromImage(url: string): Promise<string | null> {
  if (!url) return Promise.resolve(null);

  if (imageColorCache.has(url)) {
    return Promise.resolve(imageColorCache.get(url)!);
  }

  // If SVG data URI, extract synchronously
  if (url.startsWith('data:image/svg+xml')) {
    const svgColor = extractColorFromSvg(url);
    if (svgColor) {
      imageColorCache.set(url, svgColor);
      return Promise.resolve(svgColor);
    }
  }

  if (typeof document === 'undefined') return Promise.resolve(null);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const timer = setTimeout(() => {
      resolve(null);
    }, 1500);

    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          resolve(null);
          return;
        }

        ctx.drawImage(img, 0, 0, 32, 32);
        const imgData = ctx.getImageData(0, 0, 32, 32).data;

        const colorBuckets = new Map<string, { r: number; g: number; b: number; count: number; score: number }>();

        for (let i = 0; i < imgData.length; i += 4) {
          const a = imgData[i + 3];
          if (a < 120) continue; // Skip transparent pixels

          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const delta = max - min;
          const lightness = (max + min) / (2 * 255);

          // Discard near-white, near-black, and unsaturated gray
          if (lightness > 0.92 || lightness < 0.08) continue;
          if (delta < 20) continue;

          const saturation = delta / (max === 0 ? 1 : max);

          // Quantize into 16-level buckets to aggregate nearby shades
          const qr = Math.round(r / 16) * 16;
          const qg = Math.round(g / 16) * 16;
          const qb = Math.round(b / 16) * 16;
          const key = `${qr},${qg},${qb}`;

          const existing = colorBuckets.get(key);
          if (existing) {
            existing.count += 1;
            existing.score += saturation;
          } else {
            colorBuckets.set(key, { r, g, b, count: 1, score: saturation });
          }
        }

        if (colorBuckets.size === 0) {
          resolve(null);
          return;
        }

        let bestColor = '';
        let bestScore = -1;

        for (const bucket of colorBuckets.values()) {
          const finalScore = bucket.score * Math.sqrt(bucket.count);
          if (finalScore > bestScore) {
            bestScore = finalScore;
            const hexR = Math.min(255, Math.max(0, bucket.r)).toString(16).padStart(2, '0');
            const hexG = Math.min(255, Math.max(0, bucket.g)).toString(16).padStart(2, '0');
            const hexB = Math.min(255, Math.max(0, bucket.b)).toString(16).padStart(2, '0');
            bestColor = `#${hexR}${hexG}${hexB}`.toUpperCase();
          }
        }

        if (bestColor) {
          imageColorCache.set(url, bestColor);
          resolve(bestColor);
        } else {
          resolve(null);
        }
      } catch {
        resolve(null);
      }
    };

    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };

    img.src = url;
  });
}

/**
 * Resolves the most accurate brand or entity color for subtle ambient UI tinting.
 * Prioritizes the true visible icon/logo color over guessing.
 */
export function getTransactionDominantColor(transaction: Transaction, config?: Config): string {
  // 1. Resolve what visual representation is actually rendered on screen
  const visual = resolveEntityVisual(transaction, config);

  // If the visual is an image/logo:
  if (visual.logoUrl) {
    // Check in-memory cache
    if (imageColorCache.has(visual.logoUrl)) {
      return imageColorCache.get(visual.logoUrl)!;
    }

    // If SVG data URI, extract color directly
    if (visual.logoUrl.startsWith('data:image/svg+xml')) {
      const svgColor = extractColorFromSvg(visual.logoUrl);
      if (svgColor) {
        imageColorCache.set(visual.logoUrl, svgColor);
        return svgColor;
      }
    }

    // High confidence brand lookup by strict whole-word match
    const merchantText = transaction.merchant || transaction.note || '';
    const norm = normalizeMerchant(merchantText).trim();
    if (norm) {
      if (BRAND_COLORS[norm]) {
        return BRAND_COLORS[norm];
      }
      const words = norm.split(/\s+/);
      for (const word of words) {
        if (word.length >= 2 && BRAND_COLORS[word]) {
          return BRAND_COLORS[word];
        }
      }
    }
  }

  // 2. If it is an ICON (Lucide, Category, Emoji):
  // The icon is rendered inside a circle with visual.backgroundColor.
  // We MUST use that exact color so the gradient matches what the user sees!
  if (visual.backgroundColor && visual.backgroundColor !== '#6E6961' && visual.backgroundColor !== '#ffffff') {
    return visual.backgroundColor;
  }

  // 3. Category color in config
  const categoryText = typeof transaction.category === 'object' ? (transaction.category as any)?.name : (transaction.category || '');
  const cat = [...(config?.categories || []), ...(config?.incomeCategories || [])].find(
    c => c.name.trim().toLowerCase() === categoryText.trim().toLowerCase()
  );
  if (cat?.color) {
    return cat.color;
  }

  // 4. Fallback based on type
  if (transaction.type === 'income') return '#05B862';
  if (transaction.type === 'savings') return '#3B82F6';
  return '#7C3AED'; // Soft vibrant violet fallback
}
