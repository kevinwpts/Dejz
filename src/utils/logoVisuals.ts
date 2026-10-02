import { normalizeMerchant } from './resolver';

export interface LogoVisualConfig {
  backgroundColor: string;
  isTransparent: boolean;
  hasUniformSolidBackground: boolean;
}

// Memory cache for instantaneous rendering across the entire application
const memoryLogoVisualCache = new Map<string, LogoVisualConfig>();

// Load persisted cache on startup if in browser
const STORAGE_KEY = 'dejz_logo_visual_cache_v2';
function getPersistedCache(): Record<string, LogoVisualConfig> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveToPersistedCache(key: string, value: LogoVisualConfig) {
  if (typeof window === 'undefined') return;
  try {
    const current = getPersistedCache();
    current[key] = value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Ignore storage quota errors
  }
}

/**
 * Verified background colors for known brands when transparent.
 * Guarantees optimal contrast and prevents placing symbols on their own color.
 */
export const VERIFIED_BRAND_BACKGROUNDS: Record<string, string> = {
  // Fast food & Restaurants
  mcdonalds: '#DA291C', // Red background for Yellow golden arches
  mcdonald: '#DA291C',
  donken: '#DA291C',
  maxhamburgare: '#DA291C',
  maxburgers: '#DA291C',
  burgerking: '#502314',
  starbucks: '#006241',
  subway: '#008C15',
  kfc: '#A3080C',
  espressohouse: '#6F3A15',
  foodora: '#D70F64',
  wolt: '#009DE0',
  pinchos: '#D4A017',
  bastardburgers: '#1A1A1A',

  // Streaming & Tech
  spotify: '#191414',
  netflix: '#000000',
  youtube: '#FFFFFF',
  apple: '#FFFFFF',
  google: '#FFFFFF',
  microsoft: '#FFFFFF',
  steam: '#171A21',
  playstation: '#003791',
  xbox: '#107C10',
  nintendo: '#E60012',
  twitch: '#9146FF',
  discord: '#5865F2',
  storytel: '#FF5A00',
  bookbeat: '#00D494',
  nextory: '#00A3E0',

  // Nordic Retail & Groceries
  ikea: '#0058A3',
  ica: '#FFFFFF',
  'ica maxi': '#FFFFFF',
  'ica kvantum': '#FFFFFF',
  'ica supermarket': '#FFFFFF',
  'ica nära': '#FFFFFF',
  coop: '#009640',
  'stora coop': '#009640',
  willys: '#FFFFFF',
  hemköp: '#FFFFFF',
  lidl: '#0050AA',
  citygross: '#FFFFFF',
  systembolaget: '#00843D',
  pressbyrån: '#FFCC00',
  pressbyran: '#FFCC00',
  '7-eleven': '#FFFFFF',
  mathem: '#00A859',

  // Shopping & Fashion
  hm: '#FFFFFF',
  'h&m': '#FFFFFF',
  zara: '#FFFFFF',
  zalando: '#FFFFFF',
  amazon: '#232F3E',
  stadium: '#0055A5',
  xxl: '#D4E600',
  clasohlson: '#009FE3',
  biltema: '#0055A5',
  elgiganten: '#001E62',
  netonnet: '#002F6C',
  inet: '#0070BA',
  webhallen: '#0090DF',

  // Telecom, Transport & Finance
  swish: '#FFFFFF',
  klarna: '#FFB3C7',
  revolut: '#0075EB',
  paypal: '#003087',
  sl: '#0070BA',
  sj: '#008559',
  sas: '#000066',
  circlek: '#EE1C25',
  okq8: '#ED1C24',
  preem: '#008559',
  telia: '#802882',
  tele2: '#002D54',
  telenor: '#008CE6'
};

/**
 * Calculates relative luminance for WCAG contrast computation.
 */
function getRelativeLuminance(r: number, g: number, b: number): number {
  const rs = r / 255;
  const gs = g / 255;
  const bs = b / 255;
  const rL = rs <= 0.03928 ? rs / 12.92 : Math.pow((rs + 0.055) / 1.055, 2.4);
  const gL = gs <= 0.03928 ? gs / 12.92 : Math.pow((gs + 0.055) / 1.055, 2.4);
  const bL = bs <= 0.03928 ? bs / 12.92 : Math.pow((bs + 0.055) / 1.055, 2.4);
  return 0.2126 * rL + 0.7152 * gL + 0.0722 * bL;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
      return { r, g, b };
    }
  }
  return null;
}

export function getContrastRatio(colorA: string, colorB: string): number {
  const rgbA = hexToRgb(colorA);
  const rgbB = hexToRgb(colorB);
  if (!rgbA || !rgbB) return 1;
  const lumA = getRelativeLuminance(rgbA.r, rgbA.g, rgbA.b);
  const lumB = getRelativeLuminance(rgbB.r, rgbB.g, rgbB.b);
  const brightest = Math.max(lumA, lumB);
  const darkest = Math.min(lumA, lumB);
  return (brightest + 0.05) / (darkest + 0.05);
}

function rgbToHex(r: number, g: number, b: number): string {
  const hr = Math.min(255, Math.max(0, Math.round(r))).toString(16).padStart(2, '0');
  const hg = Math.min(255, Math.max(0, Math.round(g))).toString(16).padStart(2, '0');
  const hb = Math.min(255, Math.max(0, Math.round(b))).toString(16).padStart(2, '0');
  return `#${hr}${hg}${hb}`.toUpperCase();
}

/**
 * High-accuracy edge & corner analysis to determine the true background of a logo image.
 * Analyzes multiple points along borders and corners.
 */
export function analyzeLogoBackground(
  logoUrl: string,
  merchantName?: string
): Promise<LogoVisualConfig> {
  if (!logoUrl) {
    return Promise.resolve({
      backgroundColor: '#FFFFFF',
      isTransparent: true,
      hasUniformSolidBackground: false,
    });
  }

  const cacheKey = `${logoUrl}|${merchantName || ''}`;

  // Check in-memory cache first
  if (memoryLogoVisualCache.has(cacheKey)) {
    return Promise.resolve(memoryLogoVisualCache.get(cacheKey)!);
  }

  // Check persistent storage cache
  const persisted = getPersistedCache();
  if (persisted[cacheKey]) {
    memoryLogoVisualCache.set(cacheKey, persisted[cacheKey]);
    return Promise.resolve(persisted[cacheKey]);
  }

  // Check verified brand dictionary for verified background
  const normMerchant = merchantName ? normalizeMerchant(merchantName) : '';
  const verifiedBrandBg = normMerchant ? (VERIFIED_BRAND_BACKGROUNDS[normMerchant] || null) : null;

  if (typeof document === 'undefined') {
    const fallbackResult: LogoVisualConfig = {
      backgroundColor: verifiedBrandBg || '#FFFFFF',
      isTransparent: !verifiedBrandBg,
      hasUniformSolidBackground: false,
    };
    return Promise.resolve(fallbackResult);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    const finalize = (result: LogoVisualConfig) => {
      memoryLogoVisualCache.set(cacheKey, result);
      saveToPersistedCache(cacheKey, result);
      resolve(result);
    };

    const timer = setTimeout(() => {
      finalize({
        backgroundColor: verifiedBrandBg || '#FFFFFF',
        isTransparent: true,
        hasUniformSolidBackground: false,
      });
    }, 1200);

    img.onload = () => {
      clearTimeout(timer);
      try {
        const canvas = document.createElement('canvas');
        const size = 48;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          finalize({
            backgroundColor: verifiedBrandBg || '#FFFFFF',
            isTransparent: true,
            hasUniformSolidBackground: false,
          });
          return;
        }

        ctx.drawImage(img, 0, 0, size, size);
        const imgData = ctx.getImageData(0, 0, size, size).data;

        // Sample 16 coordinates along all 4 corners and borders
        const sampleCoords: [number, number][] = [
          // 4 Corners
          [0, 0],
          [size - 1, 0],
          [0, size - 1],
          [size - 1, size - 1],
          // Top edge
          [Math.floor(size * 0.25), 0],
          [Math.floor(size * 0.5), 0],
          [Math.floor(size * 0.75), 0],
          // Bottom edge
          [Math.floor(size * 0.25), size - 1],
          [Math.floor(size * 0.5), size - 1],
          [Math.floor(size * 0.75), size - 1],
          // Left edge
          [0, Math.floor(size * 0.25)],
          [0, Math.floor(size * 0.5)],
          [0, Math.floor(size * 0.75)],
          // Right edge
          [size - 1, Math.floor(size * 0.25)],
          [size - 1, Math.floor(size * 0.5)],
          [size - 1, Math.floor(size * 0.75)],
        ];

        let transparentCount = 0;
        const opaqueSamples: { r: number; g: number; b: number }[] = [];

        for (const [x, y] of sampleCoords) {
          const idx = (y * size + x) * 4;
          const a = imgData[idx + 3];
          if (a < 35) {
            transparentCount++;
          } else {
            opaqueSamples.push({
              r: imgData[idx],
              g: imgData[idx + 1],
              b: imgData[idx + 2],
            });
          }
        }

        // 1. Transparent Logo Detection: If over 60% of sampled edge points are transparent
        if (transparentCount >= sampleCoords.length * 0.6) {
          const chosenBg = verifiedBrandBg || '#FFFFFF';
          finalize({
            backgroundColor: chosenBg,
            isTransparent: true,
            hasUniformSolidBackground: false,
          });
          return;
        }

        // 2. Solid Background Detection: Check color variance along edges
        if (opaqueSamples.length >= 8) {
          // Average color
          const sum = opaqueSamples.reduce(
            (acc, s) => ({ r: acc.r + s.r, g: acc.g + s.g, b: acc.b + s.b }),
            { r: 0, g: 0, b: 0 }
          );
          const avgR = sum.r / opaqueSamples.length;
          const avgG = sum.g / opaqueSamples.length;
          const avgB = sum.b / opaqueSamples.length;

          // Max distance from average
          let maxVariance = 0;
          for (const s of opaqueSamples) {
            const dr = s.r - avgR;
            const dg = s.g - avgG;
            const db = s.b - avgB;
            const dist = Math.sqrt(dr * dr + dg * dg + db * db);
            if (dist > maxVariance) maxVariance = dist;
          }

          // If low variance (<= 18 Euclidean distance), the background is an exact uniform solid color
          if (maxVariance <= 18) {
            const detectedBg = rgbToHex(avgR, avgG, avgB);
            finalize({
              backgroundColor: detectedBg,
              isTransparent: false,
              hasUniformSolidBackground: true,
            });
            return;
          }
        }

        // 3. Uneven / Gradient / Photo Background fallback:
        // Use verified brand background if available, otherwise high-contrast neutral #FFFFFF
        const neutralBg = verifiedBrandBg || '#FFFFFF';
        finalize({
          backgroundColor: neutralBg,
          isTransparent: false,
          hasUniformSolidBackground: false,
        });
      } catch {
        finalize({
          backgroundColor: verifiedBrandBg || '#FFFFFF',
          isTransparent: true,
          hasUniformSolidBackground: false,
        });
      }
    };

    img.onerror = () => {
      clearTimeout(timer);
      finalize({
        backgroundColor: verifiedBrandBg || '#FFFFFF',
        isTransparent: true,
        hasUniformSolidBackground: false,
      });
    };

    img.src = logoUrl;
  });
}
