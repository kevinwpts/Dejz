import { supabase } from '../supabaseClient';
import { Category, Transaction } from '../types';

export interface ParsedExpenseResult {
  amount: number;
  merchant: string;
  category: string;
  icon?: string;
  source: 'brand-db' | 'history' | 'ai' | 'fallback';
}

// Built-in comprehensive Swedish merchant & brand database
const SWEDISH_BRAND_CATEGORIES: Record<string, { categoryKeyword: string; defaultMerchant: string; icon?: string }> = {
  // Mat & Livsmedel / Restaurang
  'ica': { categoryKeyword: 'mat', defaultMerchant: 'ICA', icon: 'ShoppingCart' },
  'ica maxi': { categoryKeyword: 'mat', defaultMerchant: 'ICA Maxi', icon: 'ShoppingCart' },
  'ica kvantum': { categoryKeyword: 'mat', defaultMerchant: 'ICA Kvantum', icon: 'ShoppingCart' },
  'ica supermarket': { categoryKeyword: 'mat', defaultMerchant: 'ICA Supermarket', icon: 'ShoppingCart' },
  'ica nära': { categoryKeyword: 'mat', defaultMerchant: 'ICA Nära', icon: 'ShoppingCart' },
  'coop': { categoryKeyword: 'mat', defaultMerchant: 'Coop', icon: 'ShoppingCart' },
  'stora coop': { categoryKeyword: 'mat', defaultMerchant: 'Stora Coop', icon: 'ShoppingCart' },
  'willys': { categoryKeyword: 'mat', defaultMerchant: 'Willys', icon: 'ShoppingCart' },
  'willys hemma': { categoryKeyword: 'mat', defaultMerchant: 'Willys Hemma', icon: 'ShoppingCart' },
  'lidl': { categoryKeyword: 'mat', defaultMerchant: 'Lidl', icon: 'ShoppingCart' },
  'hemköp': { categoryKeyword: 'mat', defaultMerchant: 'Hemköp', icon: 'ShoppingCart' },
  'hemkop': { categoryKeyword: 'mat', defaultMerchant: 'Hemköp', icon: 'ShoppingCart' },
  'city gross': { categoryKeyword: 'mat', defaultMerchant: 'City Gross', icon: 'ShoppingCart' },
  'systembolaget': { categoryKeyword: 'mat', defaultMerchant: 'Systembolaget', icon: 'Wine' },
  'pressbyrån': { categoryKeyword: 'mat', defaultMerchant: 'Pressbyrån', icon: 'Coffee' },
  'pressbyran': { categoryKeyword: 'mat', defaultMerchant: 'Pressbyrån', icon: 'Coffee' },
  '7-eleven': { categoryKeyword: 'mat', defaultMerchant: '7-Eleven', icon: 'Coffee' },
  'seven eleven': { categoryKeyword: 'mat', defaultMerchant: '7-Eleven', icon: 'Coffee' },
  'mathem': { categoryKeyword: 'mat', defaultMerchant: 'Mathem', icon: 'ShoppingCart' },
  'matsmart': { categoryKeyword: 'mat', defaultMerchant: 'Matsmart', icon: 'ShoppingCart' },
  'snabbgross': { categoryKeyword: 'mat', defaultMerchant: 'Snabbgross', icon: 'ShoppingCart' },
  'tempo': { categoryKeyword: 'mat', defaultMerchant: 'Tempo', icon: 'ShoppingCart' },
  'espresso house': { categoryKeyword: 'fika', defaultMerchant: 'Espresso House', icon: 'Coffee' },
  'starbucks': { categoryKeyword: 'fika', defaultMerchant: 'Starbucks', icon: 'Coffee' },
  'waynes': { categoryKeyword: 'fika', defaultMerchant: "Wayne's Coffee", icon: 'Coffee' },
  'bröd & salt': { categoryKeyword: 'fika', defaultMerchant: 'Bröd & Salt', icon: 'Coffee' },
  'gateau': { categoryKeyword: 'fika', defaultMerchant: 'Gateau', icon: 'Coffee' },
  'fabrique': { categoryKeyword: 'fika', defaultMerchant: 'Fabrique', icon: 'Coffee' },
  'mcdonalds': { categoryKeyword: 'restaurang', defaultMerchant: "McDonald's", icon: 'Utensils' },
  'donken': { categoryKeyword: 'restaurang', defaultMerchant: "McDonald's", icon: 'Utensils' },
  'max': { categoryKeyword: 'restaurang', defaultMerchant: 'Max Burgers', icon: 'Utensils' },
  'max burgers': { categoryKeyword: 'restaurang', defaultMerchant: 'Max Burgers', icon: 'Utensils' },
  'burger king': { categoryKeyword: 'restaurang', defaultMerchant: 'Burger King', icon: 'Utensils' },
  'bastard burgers': { categoryKeyword: 'restaurang', defaultMerchant: 'Bastard Burgers', icon: 'Utensils' },
  'pinchos': { categoryKeyword: 'restaurang', defaultMerchant: 'Pinchos', icon: 'Utensils' },
  'subway': { categoryKeyword: 'restaurang', defaultMerchant: 'Subway', icon: 'Utensils' },
  'kfc': { categoryKeyword: 'restaurang', defaultMerchant: 'KFC', icon: 'Utensils' },
  'foodora': { categoryKeyword: 'restaurang', defaultMerchant: 'Foodora', icon: 'Utensils' },
  'wolt': { categoryKeyword: 'restaurang', defaultMerchant: 'Wolt', icon: 'Utensils' },
  'uber eats': { categoryKeyword: 'restaurang', defaultMerchant: 'Uber Eats', icon: 'Utensils' },
  'ubereats': { categoryKeyword: 'restaurang', defaultMerchant: 'Uber Eats', icon: 'Utensils' },
  'chopchop': { categoryKeyword: 'restaurang', defaultMerchant: 'ChopChop', icon: 'Utensils' },
  'kaffe': { categoryKeyword: 'fika', defaultMerchant: 'Kaffe', icon: 'Coffee' },
  'lunch': { categoryKeyword: 'restaurang', defaultMerchant: 'Lunch', icon: 'Utensils' },
  'middag': { categoryKeyword: 'restaurang', defaultMerchant: 'Middag', icon: 'Utensils' },
  'fika': { categoryKeyword: 'fika', defaultMerchant: 'Fika', icon: 'Coffee' },
  'pizza': { categoryKeyword: 'restaurang', defaultMerchant: 'Pizzeria', icon: 'Utensils' },
  'sushi': { categoryKeyword: 'restaurang', defaultMerchant: 'Sushi', icon: 'Utensils' },

  // Transport & Drivmedel
  'sl': { categoryKeyword: 'transport', defaultMerchant: 'SL', icon: 'Bus' },
  'västtrafik': { categoryKeyword: 'transport', defaultMerchant: 'Västtrafik', icon: 'Bus' },
  'vasttrafik': { categoryKeyword: 'transport', defaultMerchant: 'Västtrafik', icon: 'Bus' },
  'skånetrafiken': { categoryKeyword: 'transport', defaultMerchant: 'Skånetrafiken', icon: 'Bus' },
  'skanetrafiken': { categoryKeyword: 'transport', defaultMerchant: 'Skånetrafiken', icon: 'Bus' },
  'sj': { categoryKeyword: 'transport', defaultMerchant: 'SJ', icon: 'Train' },
  'mtr': { categoryKeyword: 'transport', defaultMerchant: 'MTRX', icon: 'Train' },
  'mtrx': { categoryKeyword: 'transport', defaultMerchant: 'MTRX', icon: 'Train' },
  'flygbussarna': { categoryKeyword: 'transport', defaultMerchant: 'Flygbussarna', icon: 'Bus' },
  'arlanda express': { categoryKeyword: 'transport', defaultMerchant: 'Arlanda Express', icon: 'Train' },
  'uber': { categoryKeyword: 'transport', defaultMerchant: 'Uber', icon: 'Car' },
  'bolt': { categoryKeyword: 'transport', defaultMerchant: 'Bolt', icon: 'Car' },
  'taxi': { categoryKeyword: 'transport', defaultMerchant: 'Taxi', icon: 'Car' },
  'taxi stockholm': { categoryKeyword: 'transport', defaultMerchant: 'Taxi Stockholm', icon: 'Car' },
  'taxi kurir': { categoryKeyword: 'transport', defaultMerchant: 'Taxi Kurir', icon: 'Car' },
  'voi': { categoryKeyword: 'transport', defaultMerchant: 'Voi', icon: 'Bike' },
  'tier': { categoryKeyword: 'transport', defaultMerchant: 'Tier', icon: 'Bike' },
  'lime': { categoryKeyword: 'transport', defaultMerchant: 'Lime', icon: 'Bike' },
  'dott': { categoryKeyword: 'transport', defaultMerchant: 'Dott', icon: 'Bike' },
  'circle k': { categoryKeyword: 'transport', defaultMerchant: 'Circle K', icon: 'Fuel' },
  'circlek': { categoryKeyword: 'transport', defaultMerchant: 'Circle K', icon: 'Fuel' },
  'okq8': { categoryKeyword: 'transport', defaultMerchant: 'OKQ8', icon: 'Fuel' },
  'ok q8': { categoryKeyword: 'transport', defaultMerchant: 'OKQ8', icon: 'Fuel' },
  'preem': { categoryKeyword: 'transport', defaultMerchant: 'Preem', icon: 'Fuel' },
  'st1': { categoryKeyword: 'transport', defaultMerchant: 'St1', icon: 'Fuel' },
  'shell': { categoryKeyword: 'transport', defaultMerchant: 'Shell', icon: 'Fuel' },
  'ingo': { categoryKeyword: 'transport', defaultMerchant: 'Ingo', icon: 'Fuel' },
  'qstar': { categoryKeyword: 'transport', defaultMerchant: 'Qstar', icon: 'Fuel' },
  'parkster': { categoryKeyword: 'transport', defaultMerchant: 'Parkster', icon: 'Car' },
  'easypark': { categoryKeyword: 'transport', defaultMerchant: 'EasyPark', icon: 'Car' },
  'easy park': { categoryKeyword: 'transport', defaultMerchant: 'EasyPark', icon: 'Car' },
  'aimo park': { categoryKeyword: 'transport', defaultMerchant: 'Aimo Park', icon: 'Car' },
  'bensin': { categoryKeyword: 'transport', defaultMerchant: 'Bensin', icon: 'Fuel' },
  'diesel': { categoryKeyword: 'transport', defaultMerchant: 'Drivmedel', icon: 'Fuel' },
  'parkering': { categoryKeyword: 'transport', defaultMerchant: 'Parkering', icon: 'Car' },

  // Shopping & Kläder
  'h&m': { categoryKeyword: 'shopping', defaultMerchant: 'H&M', icon: 'Shirt' },
  'hm': { categoryKeyword: 'shopping', defaultMerchant: 'H&M', icon: 'Shirt' },
  'zara': { categoryKeyword: 'shopping', defaultMerchant: 'Zara', icon: 'Shirt' },
  'zalando': { categoryKeyword: 'shopping', defaultMerchant: 'Zalando', icon: 'Package' },
  'åhlens': { categoryKeyword: 'shopping', defaultMerchant: 'Åhléns', icon: 'ShoppingBag' },
  'åhléns': { categoryKeyword: 'shopping', defaultMerchant: 'Åhléns', icon: 'ShoppingBag' },
  'stadium': { categoryKeyword: 'shopping', defaultMerchant: 'Stadium', icon: 'Activity' },
  'xxl': { categoryKeyword: 'shopping', defaultMerchant: 'XXL', icon: 'Activity' },
  'intersport': { categoryKeyword: 'shopping', defaultMerchant: 'Intersport', icon: 'Activity' },
  'kappahl': { categoryKeyword: 'shopping', defaultMerchant: 'Kappahl', icon: 'Shirt' },
  'lindex': { categoryKeyword: 'shopping', defaultMerchant: 'Lindex', icon: 'Shirt' },
  'gina tricot': { categoryKeyword: 'shopping', defaultMerchant: 'Gina Tricot', icon: 'Shirt' },
  'ginatricot': { categoryKeyword: 'shopping', defaultMerchant: 'Gina Tricot', icon: 'Shirt' },
  'nk': { categoryKeyword: 'shopping', defaultMerchant: 'NK', icon: 'ShoppingBag' },
  'ur & penn': { categoryKeyword: 'shopping', defaultMerchant: 'Ur & Penn', icon: 'Watch' },
  'ur och penn': { categoryKeyword: 'shopping', defaultMerchant: 'Ur & Penn', icon: 'Watch' },
  'uropenn': { categoryKeyword: 'shopping', defaultMerchant: 'Ur & Penn', icon: 'Watch' },
  'glitter': { categoryKeyword: 'shopping', defaultMerchant: 'Glitter', icon: 'Sparkles' },
  'guldfynd': { categoryKeyword: 'shopping', defaultMerchant: 'Guldfynd', icon: 'Sparkles' },
  'scorett': { categoryKeyword: 'shopping', defaultMerchant: 'Scorett', icon: 'ShoppingBag' },
  'din sko': { categoryKeyword: 'shopping', defaultMerchant: 'DinSko', icon: 'ShoppingBag' },
  'dinsko': { categoryKeyword: 'shopping', defaultMerchant: 'DinSko', icon: 'ShoppingBag' },
  'foot locker': { categoryKeyword: 'shopping', defaultMerchant: 'Foot Locker', icon: 'ShoppingBag' },
  'weekday': { categoryKeyword: 'shopping', defaultMerchant: 'Weekday', icon: 'Shirt' },
  'monki': { categoryKeyword: 'shopping', defaultMerchant: 'Monki', icon: 'Shirt' },
  'arket': { categoryKeyword: 'shopping', defaultMerchant: 'ARKET', icon: 'Shirt' },
  'cos': { categoryKeyword: 'shopping', defaultMerchant: 'COS', icon: 'Shirt' },
  'uniqlo': { categoryKeyword: 'shopping', defaultMerchant: 'Uniqlo', icon: 'Shirt' },
  'rituals': { categoryKeyword: 'shopping', defaultMerchant: 'Rituals', icon: 'Sparkles' },
  'kicks': { categoryKeyword: 'shopping', defaultMerchant: 'Kicks', icon: 'Sparkles' },
  'lyko': { categoryKeyword: 'shopping', defaultMerchant: 'Lyko', icon: 'Sparkles' },
  'sephora': { categoryKeyword: 'shopping', defaultMerchant: 'Sephora', icon: 'Sparkles' },
  'amazon': { categoryKeyword: 'shopping', defaultMerchant: 'Amazon', icon: 'Package' },

  // Boende & Hem
  'ikea': { categoryKeyword: 'boende', defaultMerchant: 'IKEA', icon: 'Home' },
  'rusta': { categoryKeyword: 'boende', defaultMerchant: 'Rusta', icon: 'Home' },
  'jysk': { categoryKeyword: 'boende', defaultMerchant: 'Jysk', icon: 'Home' },
  'bauhaus': { categoryKeyword: 'boende', defaultMerchant: 'Bauhaus', icon: 'Wrench' },
  'hornbach': { categoryKeyword: 'boende', defaultMerchant: 'Hornbach', icon: 'Wrench' },
  'k-rauta': { categoryKeyword: 'boende', defaultMerchant: 'K-Rauta', icon: 'Wrench' },
  'biltema': { categoryKeyword: 'boende', defaultMerchant: 'Biltema', icon: 'Wrench' },
  'clas ohlson': { categoryKeyword: 'boende', defaultMerchant: 'Clas Ohlson', icon: 'Wrench' },
  'clasohlson': { categoryKeyword: 'boende', defaultMerchant: 'Clas Ohlson', icon: 'Wrench' },
  'hemtex': { categoryKeyword: 'boende', defaultMerchant: 'Hemtex', icon: 'Home' },
  'mio': { categoryKeyword: 'boende', defaultMerchant: 'Mio', icon: 'Home' },
  'cervera': { categoryKeyword: 'boende', defaultMerchant: 'Cervera', icon: 'Home' },
  'lagerhaus': { categoryKeyword: 'boende', defaultMerchant: 'Lagerhaus', icon: 'Home' },
  'granit': { categoryKeyword: 'boende', defaultMerchant: 'Granit', icon: 'Home' },
  'plantagen': { categoryKeyword: 'boende', defaultMerchant: 'Plantagen', icon: 'Flower2' },
  'blomsterlandet': { categoryKeyword: 'boende', defaultMerchant: 'Blomsterlandet', icon: 'Flower2' },

  // Streaming, Media & Abonnemang
  'spotify': { categoryKeyword: 'streaming', defaultMerchant: 'Spotify', icon: 'Music' },
  'netflix': { categoryKeyword: 'streaming', defaultMerchant: 'Netflix', icon: 'Tv' },
  'hbo': { categoryKeyword: 'streaming', defaultMerchant: 'HBO Max', icon: 'Tv' },
  'hbo max': { categoryKeyword: 'streaming', defaultMerchant: 'HBO Max', icon: 'Tv' },
  'viaplay': { categoryKeyword: 'streaming', defaultMerchant: 'Viaplay', icon: 'Tv' },
  'disney': { categoryKeyword: 'streaming', defaultMerchant: 'Disney+', icon: 'Tv' },
  'disney+': { categoryKeyword: 'streaming', defaultMerchant: 'Disney+', icon: 'Tv' },
  'youtube': { categoryKeyword: 'streaming', defaultMerchant: 'YouTube Premium', icon: 'Tv' },
  'storytel': { categoryKeyword: 'streaming', defaultMerchant: 'Storytel', icon: 'BookOpen' },
  'bookbeat': { categoryKeyword: 'streaming', defaultMerchant: 'BookBeat', icon: 'BookOpen' },
  'nextory': { categoryKeyword: 'streaming', defaultMerchant: 'Nextory', icon: 'BookOpen' },
  'filmstaden': { categoryKeyword: 'nöje', defaultMerchant: 'Filmstaden', icon: 'Film' },
  'bio': { categoryKeyword: 'nöje', defaultMerchant: 'Bio', icon: 'Film' },
  'steam': { categoryKeyword: 'nöje', defaultMerchant: 'Steam', icon: 'Gamepad2' },
  'playstation': { categoryKeyword: 'nöje', defaultMerchant: 'PlayStation', icon: 'Gamepad2' },
  'psn': { categoryKeyword: 'nöje', defaultMerchant: 'PlayStation', icon: 'Gamepad2' },
  'nintendo': { categoryKeyword: 'nöje', defaultMerchant: 'Nintendo', icon: 'Gamepad2' },
  'xbox': { categoryKeyword: 'nöje', defaultMerchant: 'Xbox', icon: 'Gamepad2' },

  // Hälsa & Träning
  'apoteket': { categoryKeyword: 'hälsa', defaultMerchant: 'Apoteket', icon: 'HeartPulse' },
  'apotek hjärtat': { categoryKeyword: 'hälsa', defaultMerchant: 'Apotek Hjärtat', icon: 'HeartPulse' },
  'kronans apotek': { categoryKeyword: 'hälsa', defaultMerchant: 'Kronans Apotek', icon: 'HeartPulse' },
  'apotea': { categoryKeyword: 'hälsa', defaultMerchant: 'Apotea', icon: 'HeartPulse' },
  'doz apotek': { categoryKeyword: 'hälsa', defaultMerchant: 'DOZ Apotek', icon: 'HeartPulse' },
  'meds': { categoryKeyword: 'hälsa', defaultMerchant: 'MEDS Apotek', icon: 'HeartPulse' },
  'sats': { categoryKeyword: 'hälsa', defaultMerchant: 'SATS', icon: 'Dumbbell' },
  'nordic wellness': { categoryKeyword: 'hälsa', defaultMerchant: 'Nordic Wellness', icon: 'Dumbbell' },
  'friskis': { categoryKeyword: 'hälsa', defaultMerchant: 'Friskis & Svettis', icon: 'Dumbbell' },
  'friskis & svettis': { categoryKeyword: 'hälsa', defaultMerchant: 'Friskis & Svettis', icon: 'Dumbbell' },
  'fitness24seven': { categoryKeyword: 'hälsa', defaultMerchant: 'Fitness24Seven', icon: 'Dumbbell' },
  'stc': { categoryKeyword: 'hälsa', defaultMerchant: 'STC', icon: 'Dumbbell' },
  'actic': { categoryKeyword: 'hälsa', defaultMerchant: 'Actic', icon: 'Dumbbell' },

  // Elektronik & Media
  'elgiganten': { categoryKeyword: 'shopping', defaultMerchant: 'Elgiganten', icon: 'Smartphone' },
  'netonnet': { categoryKeyword: 'shopping', defaultMerchant: 'NetOnNet', icon: 'Tv' },
  'net on net': { categoryKeyword: 'shopping', defaultMerchant: 'NetOnNet', icon: 'Tv' },
  'webhallen': { categoryKeyword: 'shopping', defaultMerchant: 'Webhallen', icon: 'Gamepad2' },
  'inet': { categoryKeyword: 'shopping', defaultMerchant: 'Inet', icon: 'Laptop' },
  'kjell': { categoryKeyword: 'shopping', defaultMerchant: 'Kjell & Company', icon: 'Cable' },
  'kjell & company': { categoryKeyword: 'shopping', defaultMerchant: 'Kjell & Company', icon: 'Cable' },
  'apple': { categoryKeyword: 'shopping', defaultMerchant: 'Apple', icon: 'Smartphone' },
};

/**
 * Extracts amount and text from free-form string like:
 * "300kr coop", "coop 300 kr", "45 kaffe", "lunch på max 125", "149 spotify"
 */
export function extractAmountAndQuery(input: string): { amount: number | null; query: string } {
  const cleanInput = input.trim();
  if (!cleanInput) return { amount: null, query: '' };

  // Match numbers (e.g. 300, 300kr, 300.50, 45,50 kr, 25k)
  const numRegex = /(?:^|\s)(\d+(?:[.,]\d+)?|\d+k)(?:\s*(?:kr|sek|:-))?(?:\s|$)/i;
  const match = cleanInput.match(numRegex);

  let amount: number | null = null;
  let remainingText = cleanInput;

  if (match) {
    let numStr = match[1].toLowerCase();
    let multiplier = 1;
    if (numStr.endsWith('k')) {
      multiplier = 1000;
      numStr = numStr.slice(0, -1);
    }
    const parsed = parseFloat(numStr.replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0) {
      amount = Math.round(parsed * multiplier * 100) / 100;
      remainingText = cleanInput.replace(match[0], ' ').trim();
    }
  }

  // Clean trailing "kr", "på", "från", "hos"
  remainingText = remainingText
    .replace(/\b(kr|sek|:-)\b/gi, '')
    .replace(/\b(på|hos|från|fran|i|vid)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  return { amount, query: remainingText };
}

/**
 * Maps a keyword to one of the user's available categories
 */
function findBestUserCategory(keyword: string, categories: Category[], defaultCategory: string): string {
  if (!categories || categories.length === 0) return defaultCategory;

  const normalize = (s: string) => s.toLowerCase().trim();
  const normKey = normalize(keyword);

  // Exact match
  const exact = categories.find(c => normalize(c.name) === normKey);
  if (exact) return exact.name;

  // Keyword contains
  const partial = categories.find(c => {
    const n = normalize(c.name);
    return n.includes(normKey) || normKey.includes(n);
  });
  if (partial) return partial.name;

  // Specific semantic fallbacks
  if (normKey.includes('fika') || normKey.includes('kaffe') || normKey.includes('café') || normKey.includes('kafé')) {
    const fikaCat = categories.find(c => {
      const n = normalize(c.name);
      return n.includes('fika') || n.includes('kaffe') || n.includes('café') || n.includes('kafé');
    });
    if (fikaCat) return fikaCat.name;
    const restCat = categories.find(c => normalize(c.name).includes('restaurang') || normalize(c.name).includes('mat'));
    if (restCat) return restCat.name;
  }

  if (normKey.includes('restaurang') || normKey.includes('lunch') || normKey.includes('middag') || normKey.includes('utemat')) {
    const restCat = categories.find(c => {
      const n = normalize(c.name);
      return n.includes('restaurang') || n.includes('lunch') || n.includes('utemat') || n.includes('mat');
    });
    if (restCat) return restCat.name;
  }

  if (normKey.includes('streaming') || normKey.includes('media') || normKey.includes('film') || normKey.includes('musik') || normKey.includes('ljudbok')) {
    const streamCat = categories.find(c => {
      const n = normalize(c.name);
      return n.includes('stream') || n.includes('media') || n.includes('tv');
    });
    if (streamCat) return streamCat.name;
  }

  if (normKey.includes('abonnemang') || normKey.includes('telefon') || normKey.includes('mobil') || normKey.includes('bredband') || normKey.includes('fiber')) {
    const abonCat = categories.find(c => {
      const n = normalize(c.name);
      return n.includes('abonnemang') || n.includes('mobil') || n.includes('tele') || n.includes('räkning');
    });
    if (abonCat) return abonCat.name;
  }

  if (normKey.includes('mat') || normKey.includes('livsmedel') || normKey.includes('dagligvaror')) {
    const matCat = categories.find(c => {
      const n = normalize(c.name);
      return n.includes('mat') || n.includes('livsmedel') || n.includes('dagligvaror') || n.includes('groceries') || n.includes('food');
    });
    if (matCat) return matCat.name;
  }

  if (normKey.includes('transport') || normKey.includes('resa') || normKey.includes('bil') || normKey.includes('drivmedel')) {
    const transCat = categories.find(c => {
      const n = normalize(c.name);
      return n.includes('transport') || n.includes('res') || n.includes('bil') || n.includes('fordon');
    });
    if (transCat) return transCat.name;
  }

  if (normKey.includes('shopping') || normKey.includes('kläder') || normKey.includes('prylar')) {
    const shopCat = categories.find(c => {
      const n = normalize(c.name);
      return n.includes('shop') || n.includes('kläd') || n.includes('köp') || n.includes('övrigt');
    });
    if (shopCat) return shopCat.name;
  }

  if (normKey.includes('nöje') || normKey.includes('nöjen') || normKey.includes('fritid') || normKey.includes('underhållning')) {
    const nojeCat = categories.find(c => {
      const n = normalize(c.name);
      return n.includes('nöje') || n.includes('fritid') || n.includes('kul');
    });
    if (nojeCat) return nojeCat.name;
  }

  if (normKey.includes('boende') || normKey.includes('hem') || normKey.includes('hushåll')) {
    const boCat = categories.find(c => {
      const n = normalize(c.name);
      return n.includes('boende') || n.includes('hem') || n.includes('hushåll') || n.includes('fast');
    });
    if (boCat) return boCat.name;
  }

  if (normKey.includes('hälsa') || normKey.includes('träning') || normKey.includes('sjukvård') || normKey.includes('apotek')) {
    const healthCat = categories.find(c => {
      const n = normalize(c.name);
      return n.includes('hälsa') || n.includes('trän') || n.includes('apotek') || n.includes('skönhet');
    });
    if (healthCat) return healthCat.name;
  }

  if (normKey.includes('räkning') || normKey.includes('faktura') || normKey.includes('avgift') || normKey.includes('lån')) {
    const billCat = categories.find(c => {
      const n = normalize(c.name);
      return n.includes('räkning') || n.includes('faktura') || n.includes('avgift') || n.includes('lån');
    });
    if (billCat) return billCat.name;
  }

  return categories[0]?.name || defaultCategory;
}

/**
 * Intelligent expense parser:
 * 1. Pre-built Swedish merchant/brand base
 * 2. User transaction history matching
 * 3. Supabase Edge Function with Google AI / Gemini
 * 4. Safe fallback
 */
export async function parseQuickExpense(
  input: string,
  categories: Category[] = [],
  transactions: Transaction[] = [],
  defaultCategory: string = 'Övrigt'
): Promise<ParsedExpenseResult> {
  const { amount, query } = extractAmountAndQuery(input);
  const cleanQuery = query.toLowerCase().trim();

  // If only an amount was entered
  if (!cleanQuery) {
    return {
      amount: amount || 0,
      merchant: 'Snabb utgift',
      category: defaultCategory,
      source: 'fallback',
    };
  }

  // 1. Check Pre-built Swedish brand database
  // Direct match or substring match
  for (const [brandKey, brandInfo] of Object.entries(SWEDISH_BRAND_CATEGORIES)) {
    if (cleanQuery === brandKey || cleanQuery.startsWith(brandKey + ' ') || cleanQuery.endsWith(' ' + brandKey) || cleanQuery.includes(brandKey)) {
      const categoryName = findBestUserCategory(brandInfo.categoryKeyword, categories, defaultCategory);
      return {
        amount: amount || 0,
        merchant: brandInfo.defaultMerchant,
        category: categoryName,
        icon: brandInfo.icon,
        source: 'brand-db',
      };
    }
  }

  // 2. Check User Transaction History
  if (transactions && transactions.length > 0) {
    const normalize = (s?: string | null) => (s || '').toLowerCase().trim();
    const historyMatches = transactions.filter(t => {
      if (!t.category || normalize(t.category) === 'okategoriserat') return false;
      const mNorm = normalize(t.merchant);
      const nNorm = normalize(t.note);
      return mNorm === cleanQuery || nNorm === cleanQuery || (mNorm && cleanQuery.includes(mNorm));
    });

    if (historyMatches.length > 0) {
      // Pick latest matching
      historyMatches.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      const match = historyMatches[0];
      const matchedCat = categories.find(c => normalize(c.name) === normalize(match.category));
      if (matchedCat) {
        return {
          amount: amount || 0,
          merchant: match.merchant || cleanQuery.charAt(0).toUpperCase() + cleanQuery.slice(1),
          category: matchedCat.name,
          source: 'history',
        };
      }
    }
  }

  // 3. Try Supabase Edge Function 'parse-expense' with Google AI
  try {
    const categoryNames = categories.map(c => c.name);
    const historySnippet = transactions.slice(0, 10).map(t => ({
      merchant: t.merchant || t.note || '',
      category: t.category || '',
    })).filter(h => h.merchant && h.category);

    const { data, error } = await supabase.functions.invoke('parse-expense', {
      body: {
        prompt: input,
        categories: categoryNames.length > 0 ? categoryNames : undefined,
        history: historySnippet,
      },
    });

    if (!error && data && data.merchant) {
      const matchedCat = findBestUserCategory(data.category || '', categories, defaultCategory);
      return {
        amount: typeof data.amount === 'number' && data.amount > 0 ? data.amount : (amount || 0),
        merchant: data.merchant,
        category: matchedCat,
        icon: data.icon,
        source: 'ai',
      };
    }
  } catch {
    // Edge function failed or not yet deployed, continue to fallback
  }

  // 4. Graceful Fallback: Capitalize query & assign first category
  const capitalizedMerchant = cleanQuery.charAt(0).toUpperCase() + cleanQuery.slice(1);
  return {
    amount: amount || 0,
    merchant: capitalizedMerchant,
    category: categories[0]?.name || defaultCategory,
    source: 'fallback',
  };
}
