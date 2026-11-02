import React, { useState } from 'react';
import {
  getStoredExpenseCategories,
  getStoredIncomeCategories,
  getStoredPaymentMethods,
} from '../utils/appCache';
import {
  FLUENT_EMOJI_FALLBACK_KEY,
  FLUENT_EMOJI_SVGS,
  FluentEmojiKey,
} from '../utils/fluentEmojiIcons';
import { SwishLogo } from './SwishLogo';
import { getLogoUrl } from '../utils/logo';

export interface CategoryIconOption {
  id: string;
  label: string;
  fluentKey: FluentEmojiKey;
}

/**
 * Curated Fluent Emoji Flat options for the Category Icon Picker.
 * Preserves all existing icon IDs so user selections never reset.
 */
export const AVAILABLE_CATEGORY_ICONS: CategoryIconOption[] = [
  { id: 'cart', label: 'Mat & dagligvaror', fluentKey: 'shopping-cart' },
  { id: 'fork-knife', label: 'Restaurang', fluentKey: 'fork-and-knife-with-plate' },
  { id: 'coffee', label: 'Kaffe & fika', fluentKey: 'hot-beverage' },
  { id: 'hamburger', label: 'Snabbmat', fluentKey: 'hamburger' },
  { id: 'pizza', label: 'Pizza', fluentKey: 'pizza' },
  { id: 'house', label: 'Boende & hem', fluentKey: 'house-with-garden' },
  { id: 'light-bulb', label: 'El & energi', fluentKey: 'light-bulb' },
  { id: 'key', label: 'Hyra & nyckel', fluentKey: 'key' },
  { id: 'receipt', label: 'Räkning & faktura', fluentKey: 'receipt' },
  { id: 'broadcast', label: 'Abonnemang & TV', fluentKey: 'television' },
  { id: 'antenna', label: 'Bredband & nät', fluentKey: 'satellite-antenna' },
  { id: 'phone', label: 'Mobil & telefoni', fluentKey: 'mobile-phone' },
  { id: 'car', label: 'Bil & transport', fluentKey: 'automobile' },
  { id: 'bus', label: 'Kollektivtrafik', fluentKey: 'bus' },
  { id: 'train', label: 'Tåg & pendling', fluentKey: 'train' },
  { id: 'bicycle', label: 'Cykel', fluentKey: 'bicycle' },
  { id: 'fuel', label: 'Drivmedel & laddning', fluentKey: 'fuel-pump' },
  { id: 'shopping-bag', label: 'Shopping', fluentKey: 'shopping-bags' },
  { id: 't-shirt', label: 'Kläder & mode', fluentKey: 't-shirt' },
  { id: 'package', label: 'Paket & e-handel', fluentKey: 'package' },
  { id: 'film', label: 'Nöje & film', fluentKey: 'clapper-board' },
  { id: 'gamepad', label: 'Spel & gaming', fluentKey: 'video-game' },
  { id: 'music', label: 'Musik & konsert', fluentKey: 'musical-note' },
  { id: 'theater', label: 'Kultur & evenemang', fluentKey: 'performing-arts' },
  { id: 'heart', label: 'Hälsa & välmående', fluentKey: 'red-heart' },
  { id: 'barbell', label: 'Träning & gym', fluentKey: 'flexed-biceps' },
  { id: 'stethoscope', label: 'Vård & läkare', fluentKey: 'stethoscope' },
  { id: 'pill', label: 'Apotek & medicin', fluentKey: 'pill' },
  { id: 'shield', label: 'Försäkring', fluentKey: 'shield' },
  { id: 'piggy-bank', label: 'Sparande', fluentKey: 'pig-face' },
  { id: 'trend-up', label: 'Investering & fond', fluentKey: 'chart-increasing' },
  { id: 'gem', label: 'Värde & smycken', fluentKey: 'gem-stone' },
  { id: 'coins', label: 'Lön & inkomst', fluentKey: 'money-bag' },
  { id: 'money', label: 'Återbetalning & sedel', fluentKey: 'dollar-banknote' },
  { id: 'coin', label: 'Mynt & extrainkomst', fluentKey: 'coin' },
  { id: 'wallet', label: 'Plånbok & övrigt', fluentKey: 'purse' },
  { id: 'briefcase', label: 'Arbete & frilans', fluentKey: 'briefcase' },
  { id: 'gift', label: 'Bidrag & gåva', fluentKey: 'wrapped-gift' },
  { id: 'hand-coins', label: 'Pension & stöd', fluentKey: 'palms-up-together' },
  { id: 'transfer', label: 'Överföring', fluentKey: 'money-with-wings' },
  { id: 'plane', label: 'Resa & semester', fluentKey: 'airplane' },
  { id: 'sparkle', label: 'Drömmar & mål', fluentKey: 'sparkles' },
  { id: 'graduation-cap', label: 'Studier & CSN', fluentKey: 'graduation-cap' },
  { id: 'books', label: 'Böcker & skola', fluentKey: 'books' },
  { id: 'baby', label: 'Barn & familj', fluentKey: 'teddy-bear' },
  { id: 'paw', label: 'Husdjur', fluentKey: 'paw-prints' },
  { id: 'wrench', label: 'Service & verktyg', fluentKey: 'hammer-and-wrench' },
  { id: 'tag', label: 'Etikett & övrigt', fluentKey: 'label' },
];

/**
 * Curated Fluent Emoji Flat options for the Payment Method Icon Picker.
 * Preserves all default payment method icon IDs.
 */
export const AVAILABLE_PAYMENT_METHOD_ICONS: CategoryIconOption[] = [
  { id: 'refresh', label: 'Autogiro', fluentKey: 'counterclockwise-arrows-button' },
  { id: 'credit-card', label: 'Kortbetalning', fluentKey: 'credit-card' },
  { id: 'file-text', label: 'E-faktura', fluentKey: 'page-facing-up' },
  { id: 'receipt', label: 'Faktura', fluentKey: 'receipt' },
  { id: 'smartphone', label: 'Mobilbetalning', fluentKey: 'mobile-phone-with-arrow' },
  { id: 'device-mobile', label: 'Digital plånbok', fluentKey: 'mobile-phone' },
  { id: 'shopping-bag', label: 'Delbetalning & köp', fluentKey: 'shopping-bags' },
  { id: 'envelope', label: 'Digital brevlåda', fluentKey: 'envelope' },
  { id: 'bank', label: 'Bankgiro & bank', fluentKey: 'bank' },
  { id: 'arrows-left-right', label: 'Banköverföring', fluentKey: 'left-right-arrow' },
  { id: 'transfer', label: 'Direktbetalning', fluentKey: 'money-with-wings' },
  { id: 'money', label: 'Kontant', fluentKey: 'dollar-banknote' },
  { id: 'wallet', label: 'Plånbok', fluentKey: 'purse' },
  { id: 'coins', label: 'Konto & saldo', fluentKey: 'money-bag' },
  { id: 'shield', label: 'Skyddad betalning', fluentKey: 'shield' },
  { id: 'tag', label: 'Övrigt betalsätt', fluentKey: 'label' },
];

/**
 * Direct mapping from canonical or legacy icon IDs to FluentEmojiKey.
 */
const ICON_ID_TO_FLUENT_KEY: Record<string, FluentEmojiKey> = {
  // Primary category & payment method IDs
  cart: 'shopping-cart',
  'fork-knife': 'fork-and-knife-with-plate',
  coffee: 'hot-beverage',
  hamburger: 'hamburger',
  pizza: 'pizza',
  car: 'automobile',
  bus: 'bus',
  train: 'train',
  bicycle: 'bicycle',
  fuel: 'fuel-pump',
  'shopping-bag': 'shopping-bags',
  't-shirt': 't-shirt',
  package: 'package',
  film: 'clapper-board',
  gamepad: 'video-game',
  music: 'musical-note',
  theater: 'performing-arts',
  house: 'house-with-garden',
  'light-bulb': 'light-bulb',
  key: 'key',
  heart: 'red-heart',
  stethoscope: 'stethoscope',
  pill: 'pill',
  barbell: 'flexed-biceps',
  shield: 'shield',
  broadcast: 'television',
  antenna: 'satellite-antenna',
  phone: 'mobile-phone',
  smartphone: 'mobile-phone-with-arrow',
  'device-mobile': 'mobile-phone',
  coins: 'money-bag',
  coin: 'coin',
  money: 'dollar-banknote',
  wallet: 'purse',
  briefcase: 'briefcase',
  gift: 'wrapped-gift',
  'hand-coins': 'palms-up-together',
  transfer: 'money-with-wings',
  'arrows-left-right': 'left-right-arrow',
  refresh: 'counterclockwise-arrows-button',
  'credit-card': 'credit-card',
  'file-text': 'page-facing-up',
  receipt: 'receipt',
  envelope: 'envelope',
  bank: 'bank',
  'piggy-bank': 'pig-face',
  gem: 'gem-stone',
  'trend-up': 'chart-increasing',
  plane: 'airplane',
  sparkle: 'sparkles',
  'graduation-cap': 'graduation-cap',
  books: 'books',
  baby: 'teddy-bear',
  paw: 'paw-prints',
  wrench: 'hammer-and-wrench',
  tag: 'label',

  // Direct Fluent Emoji Flat keys (if stored directly)
  'shopping-cart': 'shopping-cart',
  'fork-and-knife-with-plate': 'fork-and-knife-with-plate',
  'hot-beverage': 'hot-beverage',
  automobile: 'automobile',
  'fuel-pump': 'fuel-pump',
  'shopping-bags': 'shopping-bags',
  'clapper-board': 'clapper-board',
  'video-game': 'video-game',
  'musical-note': 'musical-note',
  'performing-arts': 'performing-arts',
  'house-with-garden': 'house-with-garden',
  'red-heart': 'red-heart',
  'flexed-biceps': 'flexed-biceps',
  television: 'television',
  'satellite-antenna': 'satellite-antenna',
  'mobile-phone': 'mobile-phone',
  'mobile-phone-with-arrow': 'mobile-phone-with-arrow',
  'money-bag': 'money-bag',
  'dollar-banknote': 'dollar-banknote',
  purse: 'purse',
  'wrapped-gift': 'wrapped-gift',
  'palms-up-together': 'palms-up-together',
  'money-with-wings': 'money-with-wings',
  'left-right-arrow': 'left-right-arrow',
  'counterclockwise-arrows-button': 'counterclockwise-arrows-button',
  'page-facing-up': 'page-facing-up',
  'pig-face': 'pig-face',
  'gem-stone': 'gem-stone',
  'chart-increasing': 'chart-increasing',
  airplane: 'airplane',
  sparkles: 'sparkles',
  'teddy-bear': 'teddy-bear',
  'paw-prints': 'paw-prints',
  'hammer-and-wrench': 'hammer-and-wrench',
  label: 'label',

  // Legacy Lucide / Icons8 / emoji aliases so existing user data maps seamlessly
  shoppingcart: 'shopping-cart',
  'ingredients-list': 'shopping-cart',
  'grocery-shelf': 'shopping-cart',
  shoppingbasket: 'shopping-cart',
  utensils: 'fork-and-knife-with-plate',
  utensilscrossed: 'fork-and-knife-with-plate',
  restaurant: 'fork-and-knife-with-plate',
  cutlery: 'fork-and-knife-with-plate',
  food: 'fork-and-knife-with-plate',
  groceries: 'shopping-cart',
  cafe: 'hot-beverage',
  'coffee-pot': 'hot-beverage',
  cupsoda: 'hot-beverage',
  sandwich: 'hamburger',
  carfront: 'automobile',
  'car-front': 'automobile',
  taxi: 'automobile',
  cartaxifront: 'automobile',
  busfront: 'bus',
  trainfront: 'train',
  tramfront: 'train',
  bike: 'bicycle',
  scooter: 'bicycle',
  motorcycle: 'bicycle',
  'gas-station': 'fuel-pump',
  shopping: 'shopping-bags',
  shoppingbag: 'shopping-bags',
  bag: 'shopping-bags',
  store: 'shopping-bags',
  shirt: 't-shirt',
  hanger: 't-shirt',
  scissors: 't-shirt',
  lipstick: 't-shirt',
  box: 'package',
  clapperboard: 'clapper-board',
  'movie-theater': 'clapper-board',
  'film-reel': 'clapper-board',
  popcorn: 'clapper-board',
  ticket: 'clapper-board',
  'two-tickets': 'clapper-board',
  gamepad2: 'video-game',
  controller: 'video-game',
  dice5: 'video-game',
  'music-record': 'musical-note',
  headphones: 'musical-note',
  guitar: 'musical-note',
  mic: 'musical-note',
  drama: 'performing-arts',
  'theatre-mask': 'performing-arts',
  confetti: 'performing-arts',
  partypopper: 'performing-arts',
  palette: 'performing-arts',
  home: 'house-with-garden',
  apartment: 'house-with-garden',
  building: 'house-with-garden',
  building2: 'house-with-garden',
  sofa: 'house-with-garden',
  bed: 'house-with-garden',
  beddouble: 'house-with-garden',
  zap: 'light-bulb',
  flame: 'light-bulb',
  electricity: 'light-bulb',
  power: 'light-bulb',
  lamp: 'light-bulb',
  lampdesk: 'light-bulb',
  lightbulb: 'light-bulb',
  water: 'light-bulb',
  droplets: 'light-bulb',
  keyround: 'key',
  lock: 'key',
  doorclosed: 'key',
  heartpulse: 'red-heart',
  'heart-with-pulse': 'red-heart',
  activity: 'red-heart',
  hearthandshake: 'red-heart',
  health: 'stethoscope',
  hospital: 'stethoscope',
  pharmacy: 'stethoscope',
  cross: 'stethoscope',
  pills: 'pill',
  syringe: 'pill',
  dumbbell: 'flexed-biceps',
  running: 'flexed-biceps',
  trophy: 'flexed-biceps',
  medal: 'flexed-biceps',
  shieldcheck: 'shield',
  umbrella: 'shield',
  safe: 'shield',
  vault: 'shield',
  contract: 'shield',
  law: 'shield',
  tv: 'television',
  monitor: 'television',
  play: 'television',
  radio: 'television',
  wifi: 'satellite-antenna',
  internet: 'satellite-antenna',
  router: 'satellite-antenna',
  cloud: 'satellite-antenna',
  globe: 'satellite-antenna',
  laptop: 'satellite-antenna',
  phonecall: 'mobile-phone',
  banknote: 'money-bag',
  salary: 'money-bag',
  dollarsign: 'money-bag',
  circledollarsign: 'money-bag',
  badgedollarsign: 'money-bag',
  euro: 'dollar-banknote',
  work: 'briefcase',
  arrowdownup: 'money-with-wings',
  'arrow-down-up': 'money-with-wings',
  send: 'money-with-wings',
  rotateccw: 'counterclockwise-arrows-button',
  creditcard: 'credit-card',
  'bank-cards': 'credit-card',
  walletcards: 'credit-card',
  filetext: 'page-facing-up',
  receipttext: 'receipt',
  receiptcent: 'receipt',
  mail: 'envelope',
  landmark: 'bank',
  savings: 'pig-face',
  piggybank: 'pig-face',
  'money-box': 'pig-face',
  'pig-nose': 'pig-face',
  diamond: 'gem-stone',
  trending: 'chart-increasing',
  trendingup: 'chart-increasing',
  'airplane-take-off': 'airplane',
  planetakeoff: 'airplane',
  planelanding: 'airplane',
  flight: 'airplane',
  beach: 'airplane',
  palmtree: 'airplane',
  hotel: 'airplane',
  luggage: 'airplane',
  sparkling: 'sparkles',
  star: 'sparkles',
  target: 'sparkles',
  crown: 'sparkles',
  education: 'graduation-cap',
  graduationcap: 'graduation-cap',
  school: 'graduation-cap',
  book: 'books',
  library: 'books',
  'baby-bottle': 'teddy-bear',
  stroller: 'teddy-bear',
  'children-faces': 'teddy-bear',
  users: 'teddy-bear',
  user: 'teddy-bear',
  dog: 'paw-prints',
  cat: 'paw-prints',
  pet: 'paw-prints',
  pets: 'paw-prints',
  pawprint: 'paw-prints',
  'dog-paw-print': 'paw-prints',
  bird: 'paw-prints',
  hammer: 'hammer-and-wrench',
  drill: 'hammer-and-wrench',
  construction: 'hammer-and-wrench',
};

export function isEmojiString(val: string | undefined | null): boolean {
  if (!val) return false;
  return val.length <= 10 && /\p{Emoji}/u.test(val) && !val.startsWith('http');
}

export function isKnownIconId(val: string | undefined | null): boolean {
  if (!val) return false;
  const clean = val.trim().toLowerCase();
  return Boolean(ICON_ID_TO_FLUENT_KEY[clean]);
}

export function resolveCategoryIconId(category?: string, explicitIconId?: string): string {
  if (explicitIconId) {
    const cleanExplicit = explicitIconId.trim().toLowerCase();
    if (ICON_ID_TO_FLUENT_KEY[cleanExplicit]) {
      return cleanExplicit;
    }
  }

  const raw = (category || '').trim();
  const c = raw.toLowerCase();

  // Check stored custom/edited categories first so user icon customizations win everywhere
  if (c) {
    const allStored = [...getStoredExpenseCategories(), ...getStoredIncomeCategories()];
    const matched = allStored.find(
      (item) => item.name.toLowerCase() === c || item.id.toLowerCase() === c
    );
    if (matched?.icon) {
      const cleanMatched = matched.icon.trim().toLowerCase();
      if (ICON_ID_TO_FLUENT_KEY[cleanMatched]) {
        return cleanMatched;
      }
    }
  }

  if (ICON_ID_TO_FLUENT_KEY[c]) return c;

  if (c.includes('fika') || c.includes('kaffe') || c.includes('café') || c.includes('kafé')) {
    return 'coffee';
  }
  if (c.includes('pizza')) {
    return 'pizza';
  }
  if (c.includes('snabbmat') || c.includes('burgare')) {
    return 'hamburger';
  }
  if (c.includes('restaurang') || c.includes('uteliv') || c.includes('lunch') || c.includes('middag')) {
    return 'fork-knife';
  }
  if (c.includes('mat') || c.includes('dryck') || c.includes('livsmedel') || c.includes('dagligvaror')) {
    return 'cart';
  }
  if (c.includes('el ') || c === 'el' || c.includes('energi') || c.includes('ström')) {
    return 'light-bulb';
  }
  if (c.includes('boende') || c.includes('hem') || c.includes('hyra') || c.includes('bostad')) {
    return 'house';
  }
  if (c.includes('räkning') || c.includes('faktura') || c.includes('avgift') || c.includes('skatt')) {
    return 'receipt';
  }
  if (c.includes('bredband') || c.includes('wifi') || c.includes('internet')) {
    return 'antenna';
  }
  if (c.includes('mobil') || c.includes('telefon')) {
    return 'phone';
  }
  if (c.includes('abonnemang') || c.includes('streaming') || c.includes('media') || c.includes('tv')) {
    return 'broadcast';
  }
  if (c.includes('buss') || c.includes('kollektiv')) {
    return 'bus';
  }
  if (c.includes('tåg') || c.includes('pendel')) {
    return 'train';
  }
  if (c.includes('cykel')) {
    return 'bicycle';
  }
  if (c.includes('bensin') || c.includes('diesel') || c.includes('drivmedel') || c.includes('tanka')) {
    return 'fuel';
  }
  if (c.includes('transport') || c.includes('bil') || c.includes('parkering')) {
    return 'car';
  }
  if (c.includes('kläd') || c.includes('mode') || c.includes('skor')) {
    return 't-shirt';
  }
  if (c.includes('paket') || c.includes('leverans')) {
    return 'package';
  }
  if (c.includes('shopping') || c.includes('köp') || c.includes('butik')) {
    return 'shopping-bag';
  }
  if (c.includes('spel') || c.includes('gaming')) {
    return 'gamepad';
  }
  if (c.includes('musik') || c.includes('konsert')) {
    return 'music';
  }
  if (c.includes('kultur') || c.includes('teater') || c.includes('evenemang')) {
    return 'theater';
  }
  if (c.includes('nöje') || c.includes('fritid') || c.includes('bio') || c.includes('film')) {
    return 'film';
  }
  if (c.includes('gym') || c.includes('träning') || c.includes('sport') || c.includes('motion')) {
    return 'barbell';
  }
  if (c.includes('apotek') || c.includes('medicin')) {
    return 'pill';
  }
  if (c.includes('vård') || c.includes('läkare') || c.includes('tand')) {
    return 'stethoscope';
  }
  if (c.includes('hälsa')) {
    return 'heart';
  }
  if (c.includes('försäkring') || c.includes('trygghet')) {
    return 'shield';
  }
  if (c.includes('investering') || c.includes('fond') || c.includes('aktie')) {
    return 'trend-up';
  }
  if (c.includes('spar') || c.includes('buffert')) {
    return 'piggy-bank';
  }
  if (c.includes('lön') || c.includes('arvode')) {
    return 'coins';
  }
  if (c.includes('frilans') || c.includes('konsult') || c.includes('jobb') || c.includes('arbete')) {
    return 'briefcase';
  }
  if (c.includes('bidrag') || c.includes('csn') || c.includes('gåva') || c.includes('present')) {
    return 'gift';
  }
  if (c.includes('pension') || c.includes('ersättning') || c.includes('stöd')) {
    return 'hand-coins';
  }
  if (c.includes('swish') || c.includes('överföring')) {
    return 'transfer';
  }
  if (c.includes('återbetalning') || c.includes('retur') || c.includes('cashback')) {
    return 'money';
  }
  if (c.includes('inkomst')) {
    return 'wallet';
  }
  if (c.includes('resa') || c.includes('semester') || c.includes('flyg') || c.includes('hotell')) {
    return 'plane';
  }
  if (c.includes('studier') || c.includes('utbildning')) {
    return 'graduation-cap';
  }
  if (c.includes('bok') || c.includes('böcker') || c.includes('skola')) {
    return 'books';
  }
  if (c.includes('barn') || c.includes('familj') || c.includes('bebis')) {
    return 'baby';
  }
  if (c.includes('djur') || c.includes('hund') || c.includes('katt') || c.includes('husdjur')) {
    return 'paw';
  }
  if (c.includes('service') || c.includes('reparation') || c.includes('verktyg') || c.includes('underhåll')) {
    return 'wrench';
  }

  return 'tag';
}

export function resolvePaymentMethodIconId(method?: string, explicitIconId?: string): string {
  if (explicitIconId) {
    const cleanExplicit = explicitIconId.trim().toLowerCase();
    if (ICON_ID_TO_FLUENT_KEY[cleanExplicit]) {
      return cleanExplicit;
    }
  }

  const raw = (method || '').trim();
  const m = raw.toLowerCase();

  if (m) {
    const storedMethods = getStoredPaymentMethods();
    const matched = storedMethods.find(
      (item) => item.name.toLowerCase() === m || item.id.toLowerCase() === m
    );
    if (matched?.icon) {
      const cleanMatched = matched.icon.trim().toLowerCase();
      if (ICON_ID_TO_FLUENT_KEY[cleanMatched]) {
        return cleanMatched;
      }
    }
  }

  if (ICON_ID_TO_FLUENT_KEY[m]) return m;

  if (m.includes('autogiro') || m.includes('automatisk')) return 'refresh';
  if (m.includes('kort') || m.includes('visa') || m.includes('mastercard') || m.includes('amex')) {
    return 'credit-card';
  }
  if (m.includes('e-faktura') || m.includes('efaktura')) return 'file-text';
  if (m.includes('faktura') || m.includes('räkning') || m.includes('avi')) return 'receipt';
  if (m.includes('swish')) return 'smartphone';
  if (m.includes('klarna') || m.includes('delbetal')) return 'shopping-bag';
  if (m.includes('kivra') || m.includes('post') || m.includes('brevlåda')) return 'envelope';
  if (m.includes('apple pay') || m.includes('google pay') || m.includes('samsung pay')) {
    return 'device-mobile';
  }
  if (m.includes('bankgiro') || m.includes('plusgiro') || m.includes('bank')) return 'bank';
  if (m.includes('överföring') || m.includes('insättning')) return 'arrows-left-right';
  if (m.includes('kontant')) return 'money';

  return 'credit-card';
}

export function resolveCategoryColor(category?: string, explicitColor?: string): string {
  if (explicitColor) return explicitColor;
  const raw = (category || '').trim().toLowerCase();
  if (raw) {
    const allStored = [...getStoredExpenseCategories(), ...getStoredIncomeCategories()];
    const matched = allStored.find(
      (item) => item.name.toLowerCase() === raw || item.id.toLowerCase() === raw
    );
    if (matched?.color) return matched.color;
  }

  const iconId = resolveCategoryIconId(category);
  switch (iconId) {
    case 'cart':
    case 'fork-knife':
    case 'coffee':
    case 'hamburger':
    case 'pizza':
      return '#10b981';
    case 'house':
    case 'light-bulb':
    case 'key':
      return '#3b82f6';
    case 'receipt':
      return '#6366f1';
    case 'broadcast':
    case 'antenna':
    case 'phone':
      return '#8b5cf6';
    case 'car':
    case 'bus':
    case 'train':
    case 'bicycle':
    case 'fuel':
      return '#f59e0b';
    case 'shopping-bag':
    case 't-shirt':
    case 'package':
      return '#ec4899';
    case 'film':
    case 'gamepad':
    case 'music':
    case 'theater':
      return '#f43f5e';
    case 'heart':
    case 'barbell':
    case 'stethoscope':
    case 'pill':
      return '#14b8a6';
    case 'shield':
      return '#0ea5e9';
    case 'transfer':
      return '#06b6d4';
    case 'piggy-bank':
    case 'trend-up':
    case 'gem':
    case 'coins':
    case 'coin':
    case 'money':
    case 'wallet':
      return '#10b981';
    default:
      return '#64748b';
  }
}

export function resolveFluentEmojiKey(iconId?: string): FluentEmojiKey {
  if (!iconId) return FLUENT_EMOJI_FALLBACK_KEY;
  const clean = iconId.trim().toLowerCase();
  return ICON_ID_TO_FLUENT_KEY[clean] || FLUENT_EMOJI_FALLBACK_KEY;
}

interface FluentEmojiSvgProps {
  fluentKey: FluentEmojiKey;
  size: number;
  className?: string;
}

export const FluentEmojiSvg: React.FC<FluentEmojiSvgProps> = ({
  fluentKey,
  size,
  className = '',
}) => {
  const svgBody = FLUENT_EMOJI_SVGS[fluentKey] || FLUENT_EMOJI_SVGS[FLUENT_EMOJI_FALLBACK_KEY];
  return (
    <svg
      width={size}
      height={size}
      viewBox="1 1 30 30"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={`inline-block shrink-0 select-none pointer-events-none ${className}`}
      dangerouslySetInnerHTML={{ __html: svgBody }}
    />
  );
};

interface CategoryIconProps {
  category?: string;
  iconId?: string;
  color?: string;
  size?: number;
  badge?: boolean;
  className?: string;
  weight?: 'regular' | 'bold' | 'fill' | 'duotone' | 'light';
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  category,
  iconId,
  size = 14,
  badge = false,
  className = '',
}) => {
  const resolvedId = resolveCategoryIconId(category, iconId);
  const fluentKey = resolveFluentEmojiKey(resolvedId);

  // Optically balance colorful Fluent Emoji Flat icons across inline subtitles, pickers, and headers
  const opticalSize = badge
    ? Math.max(size + 5, 19)
    : size <= 11
    ? 14
    : size <= 13
    ? size + 3
    : size <= 16
    ? size + 2
    : size;

  if (badge) {
    return (
      <span
        className={`inline-flex items-center justify-center shrink-0 select-none ${className}`}
        style={{ width: opticalSize + 2, height: opticalSize + 2 }}
      >
        <FluentEmojiSvg fluentKey={fluentKey} size={opticalSize} />
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center justify-center shrink-0 select-none ${className}`}>
      <FluentEmojiSvg fluentKey={fluentKey} size={opticalSize} />
    </span>
  );
};

interface PaymentMethodIconProps {
  method?: string;
  iconId?: string;
  size?: number;
  badge?: boolean;
  className?: string;
}

export const PaymentMethodIcon: React.FC<PaymentMethodIconProps> = ({
  method,
  iconId,
  size = 15,
  badge = false,
  className = '',
}) => {
  const [brandImgFailed, setBrandImgFailed] = useState(false);

  const rawMethod = (method || '').trim().toLowerCase();
  const resolvedId = resolvePaymentMethodIconId(method, iconId);
  const fluentKey = resolveFluentEmojiKey(resolvedId);

  const opticalSize = badge
    ? Math.max(size + 5, 19)
    : size <= 12
    ? 14
    : size <= 14
    ? size + 2
    : size <= 16
    ? size + 2
    : size;

  // Preserve official payment service logos for Swish and Klarna unless the user chose a custom icon
  const isDefaultSwish =
    (rawMethod === 'swish' || rawMethod.includes('swish')) &&
    (!iconId || iconId === 'smartphone' || iconId === 'swish');

  const isDefaultKlarna =
    (rawMethod === 'klarna' || rawMethod.includes('klarna')) &&
    (!iconId || iconId === 'shopping-bag' || iconId === 'klarna');

  if (isDefaultSwish) {
    return (
      <span
        className={`inline-flex items-center justify-center shrink-0 select-none ${className}`}
        style={{ width: opticalSize, height: opticalSize }}
      >
        <SwishLogo size={Math.max(12, Math.round(opticalSize * 0.88))} />
      </span>
    );
  }

  if (isDefaultKlarna && !brandImgFailed) {
    const klarnaLogo = getLogoUrl('Klarna', 'Shopping');
    if (klarnaLogo) {
      return (
        <span
          className={`inline-flex items-center justify-center shrink-0 select-none ${className}`}
          style={{ width: opticalSize, height: opticalSize }}
        >
          <img
            src={klarnaLogo}
            alt="Klarna"
            onError={() => setBrandImgFailed(true)}
            className="w-full h-full object-contain rounded"
          />
        </span>
      );
    }
  }

  return (
    <span className={`inline-flex items-center justify-center shrink-0 select-none ${className}`}>
      <FluentEmojiSvg fluentKey={fluentKey} size={opticalSize} />
    </span>
  );
};
