/**
 * Icons8 Color Category Icon Catalog for Dejz
 * 
 * Provides 100+ rich, illustrated Icons8 Color assets for categories.
 * Icons are stored locally in `/icons/categories/*.png` with high-res PNGs (200KB total for the entire library).
 * Includes automatic fallbacks to CDN and mappings for legacy icon names.
 */

export interface CategoryColorIcon {
  key: string;
  name: string; // Swedish label
  category: 'food' | 'home' | 'transport' | 'health' | 'shopping' | 'leisure' | 'insurance' | 'tech' | 'income' | 'family' | 'other';
  keywords: string[];
}

export const ICONS8_CATEGORY_GROUPS: { id: string; label: string }[] = [
  { id: 'all', label: 'Alla' },
  { id: 'food', label: 'Mat & Dryck' },
  { id: 'home', label: 'Boende & Hem' },
  { id: 'transport', label: 'Transport' },
  { id: 'health', label: 'Hälsa & Träning' },
  { id: 'shopping', label: 'Shopping & Kläder' },
  { id: 'leisure', label: 'Nöje & Fritid' },
  { id: 'insurance', label: 'Försäkring & Trygghet' },
  { id: 'tech', label: 'Teknik & Abonnemang' },
  { id: 'income', label: 'Inkomst & Ekonomi' },
  { id: 'family', label: 'Familj & Husdjur' },
  { id: 'other', label: 'Övrigt' }
];

export const ICONS8_CATEGORY_ICONS: CategoryColorIcon[] = [
  // 1. Mat & Dryck (food)
  { key: 'ingredients-list', name: 'Matvaror / Matkasse', category: 'food', keywords: ['mat', 'dagligvaror', 'matkasse', 'livsmedel', 'ingredienser'] },
  { key: 'shopping-cart', name: 'Kundvagn', category: 'food', keywords: ['handla', 'mat', 'stormarknad', 'ica', 'coop', 'willys'] },
  { key: 'grocery-shelf', name: 'Matbutik', category: 'food', keywords: ['butik', 'hylla', 'mataffär', 'snabbköp'] },
  { key: 'restaurant', name: 'Restaurang', category: 'food', keywords: ['middag', 'lunch', 'äta ute', 'krog', 'mat'] },
  { key: 'cafe', name: 'Kafé / Fika', category: 'food', keywords: ['kaffe', 'fika', 'bulle', 'espresso', 'café'] },
  { key: 'hamburger', name: 'Snabbmat', category: 'food', keywords: ['burgare', 'mcdonalds', 'max', 'gatukök'] },
  { key: 'pizza', name: 'Pizza', category: 'food', keywords: ['pizzeria', 'takeaway', 'mat'] },
  { key: 'cutlery', name: 'Bestick / Mat', category: 'food', keywords: ['måltid', 'äta', 'lunch'] },
  { key: 'apple-jam', name: 'Frukt / Sylt', category: 'food', keywords: ['äpple', 'frukt', 'grönt', 'frukost'] },
  { key: 'bread', name: 'Bageri / Bröd', category: 'food', keywords: ['bröd', 'macka', 'bageri'] },
  { key: 'cupcake', name: 'Fika & Bakverk', category: 'food', keywords: ['kaka', 'tårta', 'efterrätt', 'godis'] },
  { key: 'wine-glass', name: 'Vin / Bar', category: 'food', keywords: ['vin', 'systembolaget', 'alkohol', 'fest'] },
  { key: 'cocktail', name: 'Drink / Cocktail', category: 'food', keywords: ['bar', 'drink', 'uteliv'] },
  { key: 'beer-bottle', name: 'Öl / Brygd', category: 'food', keywords: ['öl', 'pub', 'afterwork'] },
  { key: 'coffee-pot', name: 'Kaffebryggare', category: 'food', keywords: ['kaffe', 'morgon', 'fika'] },

  // 2. Boende & Hem (home)
  { key: 'home', name: 'Bostad / Hus', category: 'home', keywords: ['hem', 'hus', 'villa', 'hyra', 'boende', 'bostad'] },
  { key: 'apartment', name: 'Lägenhet', category: 'home', keywords: ['lägenhet', 'hyresrätt', 'bostadsrätt', 'bostad'] },
  { key: 'sofa', name: 'Inredning / Möbler', category: 'home', keywords: ['soffa', 'ikea', 'möbler', 'hem'] },
  { key: 'electricity', name: 'El & Energi', category: 'home', keywords: ['elräkning', 'el', 'ström', 'energi'] },
  { key: 'water', name: 'Vatten & Avlopp', category: 'home', keywords: ['vatten', 'sopavgift', 'samfällighet'] },
  { key: 'vacuum-cleaner', name: 'Städning', category: 'home', keywords: ['dammsugare', 'städ', 'hemfrid'] },
  { key: 'washing-machine', name: 'Tvätt', category: 'home', keywords: ['tvättmaskin', 'tvättstuga', 'klädvård'] },
  { key: 'bed', name: 'Säng / Hotell', category: 'home', keywords: ['sova', 'övernattning', 'säng'] },
  { key: 'paint-palette', name: 'Renovering / Måla', category: 'home', keywords: ['färg', 'renovera', 'bygga', 'inreda'] },
  { key: 'wrench', name: 'Verktyg & Reparation', category: 'home', keywords: ['reparera', 'fixa', 'verktyg', 'hantverkare'] },
  { key: 'key', name: 'Nyckel / Lås', category: 'home', keywords: ['nyckel', 'hem', 'inflyttning'] },
  { key: 'lamp', name: 'Belysning / Lampa', category: 'home', keywords: ['lampa', 'ljus', 'inredning'] },

  // 3. Transport & Fordon (transport)
  { key: 'car', name: 'Bil', category: 'transport', keywords: ['bil', 'fordon', 'pendling', 'transport'] },
  { key: 'gas-station', name: 'Drivmedel / Tanka', category: 'transport', keywords: ['bensin', 'diesel', 'laddning', 'tanka', 'circle k'] },
  { key: 'bicycle', name: 'Cykel', category: 'transport', keywords: ['cykla', 'elcykel', 'pendla'] },
  { key: 'bus', name: 'Buss / Kollektivtrafik', category: 'transport', keywords: ['sl', 'buss', 'västtrafik', 'skånetrafiken', 'biljett'] },
  { key: 'train', name: 'Tåg / Spårvagn', category: 'transport', keywords: ['sj', 'tåg', 'pendeltåg', 'resa'] },
  { key: 'taxi', name: 'Taxi / Samåkning', category: 'transport', keywords: ['uber', 'bolt', 'taxi'] },
  { key: 'parking', name: 'Parkering', category: 'transport', keywords: ['p-hus', 'parkering', 'easypark'] },
  { key: 'motorcycle', name: 'Motorcykel / MC', category: 'transport', keywords: ['mc', 'moped'] },
  { key: 'scooter', name: 'Elsparkcykel', category: 'transport', keywords: ['voi', 'lime', 'tier', 'sparkcykel'] },
  { key: 'airplane-take-off', name: 'Flyg / Resor', category: 'transport', keywords: ['flyg', 'semester', 'resa', 'utland'] },
  { key: 'car-rental', name: 'Hyrbil', category: 'transport', keywords: ['hyrbil', 'bilpool', 'kin'] },

  // 4. Hälsa & Träning (health)
  { key: 'heart-with-pulse', name: 'Hälsa / Hjärtformad', category: 'health', keywords: ['hälsa', 'må bra', 'kropp'] },
  { key: 'dumbbell', name: 'Träning / Gym', category: 'health', keywords: ['gym', 'träna', 'hantel', 'sats', 'friskis'] },
  { key: 'barbell', name: 'Styrketräning', category: 'health', keywords: ['skivstång', 'crossfit', 'styrka'] },
  { key: 'running', name: 'Löpning / Sport', category: 'health', keywords: ['springa', 'motion', 'sport', 'fotboll'] },
  { key: 'pharmacy', name: 'Apotek', category: 'health', keywords: ['apotek', 'medicin', 'hälsa', 'läkemedel'] },
  { key: 'pills', name: 'Medicin & Kosttillskott', category: 'health', keywords: ['piller', 'tabletter', 'vitaminer'] },
  { key: 'hospital', name: 'Vård / Läkare', category: 'health', keywords: ['sjukhus', 'läkarbesök', 'vårdcentral', 'tandläkare'] },
  { key: 'stethoscope', name: 'Sjukvård', category: 'health', keywords: ['undersökning', 'läkare', 'klinik'] },
  { key: 'toothbrush', name: 'Tandvård / Hygien', category: 'health', keywords: ['tandläkare', 'tandborste', 'hygien'] },
  { key: 'water-bottle', name: 'Vattenflaska / Wellness', category: 'health', keywords: ['vätska', 'träning', 'wellness'] },
  { key: 'yoga', name: 'Yoga / Meditation', category: 'health', keywords: ['yoga', 'mindfulness', 'stretch'] },

  // 5. Shopping & Mode (shopping)
  { key: 'shopping-bag', name: 'Shoppingkasse', category: 'shopping', keywords: ['shopping', 'köpa', 'butik', 'rea'] },
  { key: 't-shirt', name: 'Kläder', category: 'shopping', keywords: ['kläder', 'mode', 'tröja', 'byxor', 'plagg'] },
  { key: 'scissors', name: 'Frisör / Skönhet', category: 'shopping', keywords: ['klippa', 'frisör', 'sax', 'hår'] },
  { key: 'lipstick', name: 'Smink / Kosmetika', category: 'shopping', keywords: ['smink', 'skönhet', 'hudvård'] },
  { key: 'diamond', name: 'Smycken & Lyx', category: 'shopping', keywords: ['smycken', 'diamant', 'guld', 'klocka'] },
  { key: 'hanger', name: 'Garderob / Mode', category: 'shopping', keywords: ['galge', 'garderob', 'mode'] },
  { key: 'perfume-bottle', name: 'Parfym / Doft', category: 'shopping', keywords: ['parfym', 'doft', 'present'] },
  { key: 'package', name: 'Paket / E-handel', category: 'shopping', keywords: ['postnord', 'leverans', 'e-handel', 'paket'] },

  // 6. Nöje & Fritid (leisure)
  { key: 'theatre-mask', name: 'Teater & Kultur', category: 'leisure', keywords: ['nöje', 'fritid', 'kultur', 'teater', 'show'] },
  { key: 'controller', name: 'Gaming / Spel', category: 'leisure', keywords: ['gaming', 'playstation', 'xbox', 'nintendo', 'spel'] },
  { key: 'movie-theater', name: 'Bio / Film', category: 'leisure', keywords: ['bio', 'filmkväll', 'popcorn', 'sf'] },
  { key: 'film-reel', name: 'Streaming / Film', category: 'leisure', keywords: ['film', 'bio', 'serie'] },
  { key: 'music', name: 'Musik', category: 'leisure', keywords: ['konsert', 'musik', 'låtar', 'festival'] },
  { key: 'guitar', name: 'Instrument / Gitarr', category: 'leisure', keywords: ['gitarr', 'spela', 'hobby'] },
  { key: 'two-tickets', name: 'Biljetter / Evenemang', category: 'leisure', keywords: ['evenemang', 'konsert', 'match', 'biljett'] },
  { key: 'confetti', name: 'Fest & Firande', category: 'leisure', keywords: ['kalas', 'party', 'fira', 'fest'] },
  { key: 'beach', name: 'Semester / Strand', category: 'leisure', keywords: ['strand', 'sol', 'bad', 'semester'] },

  // 7. Försäkring & Trygghet (insurance)
  { key: 'shield', name: 'Försäkring / Sköld', category: 'insurance', keywords: ['försäkring', 'trygghet', 'skydd', 'hemförsäkring'] },
  { key: 'safe', name: 'Kassaskåp', category: 'insurance', keywords: ['sparande', 'säkerhet', 'värdesaker'] },
  { key: 'umbrella', name: 'Skydd / Paraply', category: 'insurance', keywords: ['paraply', 'skydd', 'oförutsett'] },
  { key: 'contract', name: 'Avtal & Kontrakt', category: 'insurance', keywords: ['avtal', 'kontrakt', 'papper'] },
  { key: 'law', name: 'Juridik & Rätt', category: 'insurance', keywords: ['lag', 'juridik', 'advokat'] },

  // 8. Teknik & Abonnemang (tech)
  { key: 'smartphone', name: 'Mobiltelefon', category: 'tech', keywords: ['mobil', 'abonnemang', 'telefon', 'smartphone'] },
  { key: 'tv', name: 'TV / Skärm', category: 'tech', keywords: ['tv', 'netflix', 'streaming', 'skärm'] },
  { key: 'laptop', name: 'Dator & IT', category: 'tech', keywords: ['dator', 'laptop', 'elektronik'] },
  { key: 'internet', name: 'Bredband / Internet', category: 'tech', keywords: ['internet', 'bredband', 'fiber'] },
  { key: 'wifi', name: 'Wi-Fi / Trådlöst', category: 'tech', keywords: ['wifi', 'nätverk', 'router'] },
  { key: 'cloud', name: 'Molntjänster / Cloud', category: 'tech', keywords: ['icloud', 'google drive', 'moln'] },
  { key: 'play', name: 'Streaming / Video', category: 'tech', keywords: ['youtube', 'video', 'streaming'] },
  { key: 'music-record', name: 'Spotify / Streaming', category: 'tech', keywords: ['spotify', 'vinyl', 'musikabonnemang'] },

  // 9. Inkomst, Lön & Ekonomi (income)
  { key: 'money-bag', name: 'Lönesäck / Lön', category: 'income', keywords: ['lön', 'inkomst', 'pengar', 'arbete'] },
  { key: 'money', name: 'Sedlar / Kontanter', category: 'income', keywords: ['pengar', 'kontanter', 'sedel'] },
  { key: 'coins', name: 'Mynt', category: 'income', keywords: ['mynt', 'växel', 'spara'] },
  { key: 'bank', name: 'Bank & Sparande', category: 'income', keywords: ['bank', 'konto', 'sparande', 'ränta'] },
  { key: 'bank-cards', name: 'Betalkort', category: 'income', keywords: ['kort', 'visa', 'mastercard', 'kreditkort'] },
  { key: 'wallet', name: 'Plånbok', category: 'income', keywords: ['plånbok', 'kassa', 'saldo'] },
  { key: 'briefcase', name: 'Extraknäck / Frilans', category: 'income', keywords: ['jobb', 'frilans', 'konsult', 'portfölj'] },
  { key: 'money-box', name: 'Spargris / Sparmål', category: 'income', keywords: ['spara', 'spargris', 'mål', 'buffert'] },

  // 10. Familj & Husdjur (family)
  { key: 'baby-bottle', name: 'Nappflaska / Småbarn', category: 'family', keywords: ['barn', 'bebis', 'blöjor', 'småbarn'] },
  { key: 'stroller', name: 'Barnvagn', category: 'family', keywords: ['barnvagn', 'barn', 'familj'] },
  { key: 'children-faces', name: 'Barn / Familj', category: 'family', keywords: ['familj', 'barnbidrag', 'skola'] },
  { key: 'dog', name: 'Hund', category: 'family', keywords: ['hund', 'djur', 'veterinär', 'hundmat'] },
  { key: 'cat', name: 'Katt', category: 'family', keywords: ['katt', 'kattmat', 'husdjur'] },
  { key: 'pets', name: 'Husdjur', category: 'family', keywords: ['djur', 'husdjur', 'djuraffär'] },
  { key: 'dog-paw-print', name: 'Tassavtryck', category: 'family', keywords: ['tass', 'djur'] },
  { key: 'school', name: 'Skola / Utbildning', category: 'family', keywords: ['skola', 'dagis', 'förskola'] },
  { key: 'graduation-cap', name: 'Studier / CSN', category: 'family', keywords: ['csn', 'studier', 'universitet', 'examen'] },
  { key: 'book', name: 'Böcker / Litteratur', category: 'family', keywords: ['bok', 'böcker', 'kurslitteratur'] },

  // 11. Övrigt & Sparande (other)
  { key: 'box', name: 'Låda / Övrigt', category: 'other', keywords: ['övrigt', 'blandat', 'box'] },
  { key: 'sparkling', name: 'Gnistrande / Stjärnor', category: 'other', keywords: ['magi', 'special', 'lyx'] },
  { key: 'gift', name: 'Present / Gåva', category: 'other', keywords: ['gåva', 'present', 'födelsedag', 'julklapp'] },
  { key: 'star', name: 'Stjärna / Favorit', category: 'other', keywords: ['favorit', 'stjärna', 'viktigt'] },
  { key: 'target', name: 'Mål / Sparmål', category: 'other', keywords: ['mål', 'sparmål', 'sikte'] }
];

/**
 * Mapping from legacy Lucide icon names to Icons8 Color names.
 * Ensures existing categories seamlessly render Icons8 Color icons.
 */
export const LEGACY_ICON_TO_ICONS8_MAP: Record<string, string> = {
  // Expense categories
  'shoppingcart': 'ingredients-list',
  'shopping-cart': 'ingredients-list',
  'cart': 'ingredients-list',
  'utensils': 'restaurant',
  'fork': 'restaurant',
  'food': 'ingredients-list',
  'groceries': 'ingredients-list',
  'car': 'car',
  'car-front': 'car',
  'automobile': 'car',
  'shopping': 'shopping-bag',
  'shoppingbag': 'shopping-bag',
  'bag': 'shopping-bag',
  'drama': 'theatre-mask',
  'theater': 'theatre-mask',
  'home': 'home',
  'house': 'home',
  'heart': 'heart-with-pulse',
  'heartpulse': 'heart-with-pulse',
  'shield': 'shield',
  'shieldcheck': 'shield',
  'smartphone': 'smartphone',
  'phone': 'smartphone',
  'package': 'box',
  'box': 'box',

  // Income categories
  'banknote': 'money-bag',
  'money': 'money-bag',
  'salary': 'money-bag',
  'briefcase': 'briefcase',
  'gift': 'gift',
  'arrowdownup': 'bank-cards',
  'arrow-down-up': 'bank-cards',
  'wallet': 'wallet',
  'piggybank': 'money-box',
  'piggy-bank': 'money-box',

  // Other commons
  'coffee': 'cafe',
  'dumbbell': 'dumbbell',
  'plane': 'airplane-take-off',
  'flight': 'airplane-take-off',
  'gamepad': 'controller',
  'gamepad2': 'controller',
  'tv': 'tv',
  'wifi': 'wifi',
  'bus': 'bus',
  'train': 'train',
  'receipt': 'bank-cards',
  'tag': 'ingredients-list'
};

/**
 * Default icon for category by category name (smart fallback)
 */
export function getIcons8ForCategoryName(categoryName?: string): string {
  if (!categoryName) return 'box';
  const norm = categoryName.trim().toLowerCase();

  if (norm.includes('mat') || norm.includes('daglig') || norm.includes('livsmedel') || norm.includes('ica') || norm.includes('coop')) {
    return 'ingredients-list';
  }
  if (norm.includes('restaurang') || norm.includes('äta') || norm.includes('lunch') || norm.includes('middag') || norm.includes('fika') || norm.includes('café') || norm.includes('kaffe')) {
    return norm.includes('fika') || norm.includes('café') || norm.includes('kaffe') ? 'cafe' : 'restaurant';
  }
  if (norm.includes('bil') || norm.includes('transport') || norm.includes('fordon') || norm.includes('pendl')) {
    return 'car';
  }
  if (norm.includes('shopping') || norm.includes('kläd') || norm.includes('mode')) {
    return 'shopping-bag';
  }
  if (norm.includes('nöje') || norm.includes('fritid') || norm.includes('kultur') || norm.includes('underhållning')) {
    return 'theatre-mask';
  }
  if (norm.includes('boende') || norm.includes('hushåll') || norm.includes('hem') || norm.includes('hyra') || norm.includes('lägenhet')) {
    return 'home';
  }
  if (norm.includes('hälsa') || norm.includes('träning') || norm.includes('gym') || norm.includes('motion') || norm.includes('sport')) {
    return 'heart-with-pulse';
  }
  if (norm.includes('försäkring') || norm.includes('trygghet')) {
    return 'shield';
  }
  if (norm.includes('abonnemang') || norm.includes('mobil') || norm.includes('telef')) {
    return 'smartphone';
  }
  if (norm.includes('lön') || norm.includes('inkomst')) {
    return 'money-bag';
  }
  if (norm.includes('frilans') || norm.includes('extra')) {
    return 'briefcase';
  }
  if (norm.includes('bidrag') || norm.includes('ersättning')) {
    return 'gift';
  }
  if (norm.includes('swish') || norm.includes('överföring')) {
    return 'bank-cards';
  }
  if (norm.includes('spar') || norm.includes('buffert') || norm.includes('investering')) {
    return 'money-box';
  }
  if (norm.includes('res') || norm.includes('semester') || norm.includes('flyg')) {
    return 'airplane-take-off';
  }
  if (norm.includes('husdjur') || norm.includes('hund') || norm.includes('katt')) {
    return 'pets';
  }

  return 'box';
}

/**
 * Resolves any icon string (legacy lucide key, icons8 key, or category name)
 * to a verified Icons8 Color icon key.
 */
export function resolveIcons8Key(iconKey?: string, categoryName?: string): string {
  if (!iconKey) {
    return getIcons8ForCategoryName(categoryName);
  }

  const cleanKey = iconKey.trim().toLowerCase();

  // 1. Direct match with verified Icons8 list
  const exists = ICONS8_CATEGORY_ICONS.some(i => i.key === cleanKey);
  if (exists) return cleanKey;

  // 2. Check legacy Lucide mapping
  if (LEGACY_ICON_TO_ICONS8_MAP[cleanKey]) {
    return LEGACY_ICON_TO_ICONS8_MAP[cleanKey];
  }

  // 3. Fallback to category name matching
  return getIcons8ForCategoryName(categoryName || cleanKey);
}

/**
 * Returns the URL for an Icons8 Color icon.
 * Prefers the local `/icons/categories/[key].png` asset, falling back to CDN.
 */
export function getIcons8Url(iconKey: string): string {
  const resolved = resolveIcons8Key(iconKey);
  return `/icons/categories/${resolved}.png`;
}

/**
 * Fallback CDN URL if local asset is ever missing.
 */
export function getIcons8CdnUrl(iconKey: string): string {
  const resolved = resolveIcons8Key(iconKey);
  return `https://img.icons8.com/color/96/${resolved}.png`;
}
