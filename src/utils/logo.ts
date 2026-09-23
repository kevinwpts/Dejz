// Logo search and resolution utility with advanced Swedish & international brand dictionary,
// bank statement noise cleaning, word-boundary matching, and generic term filtering.

export const checkImage = (url: string, timeoutMs = 2500): Promise<boolean> => {
    return new Promise((resolve) => {
        let finished = false;
        const img = new Image();
        
        const timer = setTimeout(() => {
            if (!finished) {
                finished = true;
                img.src = '';
                resolve(false);
            }
        }, timeoutMs);

        img.onload = () => {
            if (!finished) {
                finished = true;
                clearTimeout(timer);
                resolve(true);
            }
        };
        img.onerror = () => {
            if (!finished) {
                finished = true;
                clearTimeout(timer);
                resolve(false);
            }
        };
        img.src = url;
    });
};

function escapeRegExp(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Common bank transaction prefixes, codes, and noise present in Swedish bank & card statements.
 */
const BANK_PREFIXES = [
    'kortköp', 'kortkop', 'kort', 'swish till', 'swish', 'reservation',
    'paypal *', 'paypal', 'klarna *', 'klarna', 'zettle *', 'zettle',
    'iz *', 'izettle *', 'stripe *', 'stripe', 'sq *', 'tst *', 'uber *',
    'apple.com/bill', 'google *', 'bg', 'pg', 'autogiro', 'betalning',
    'köp', 'kop', 'utlägg', 'utlagg'
];

/**
 * Generic everyday non-brand terms in Swedish & English.
 * These should NEVER match a company logo or have a domain blind-guessed.
 */
export const GENERIC_TERMS = new Set([
    'lunch', 'middag', 'fika', 'kaffe', 'mat', 'godis', 'bio', 'hyra', 'el', 'bensin',
    'diesel', 'parkering', 'taxi', 'snus', 'tobak', 'öl', 'vin', 'sprit', 'kläder',
    'skor', 'resa', 'hotell', 'tåg', 'buss', 'flyg', 'frisör', 'frisor', 'tandläkare',
    'medicin', 'apotek', 'gym', 'träning', 'traning', 'prenumeration', 'swish',
    'överföring', 'overforing', 'utlägg', 'räkning', 'rakning', 'faktura', 'lön',
    'lon', 'sparande', 'present', 'presentkort', 'pant', 'pantkvitto', 'utgift',
    'inköp', 'inkop', 'handlat', 'övrigt', 'ovrigt', 'övriga', 'ovriga', 'kaffemaskin',
    'slips', 'jacka', 'byxor', 'matkasse', 'skåp', 'skap', 'bord', 'stol', 'mamma',
    'pappa', 'kompis', 'vän', 'van', 'massage', 'klippning', 'bilverkstad', 'däck',
    'dack', 'tvätt', 'tvatt', 'städning', 'stadning', 'blommor', 'måla', 'mala',
    'målare', 'hantverkare', 'service', 'avgift', 'ränta', 'ranta', 'amortering',
    'pension', 'skatt', 'fackavgift', 'medlemskap', 'abonnemang', 'glass', 'mellanmål',
    'frukost', 'kvällsmat', 'pizza', 'sushi', 'hamburgare', 'kebab', 'sallad', 'soppa',
    'godsaker', 'frukt', 'grönt', 'gront', 'läsk', 'lask', 'vatten', 'bröd', 'brod',
    'mjölk', 'mjolk', 'ost', 'smör', 'smor', 'kött', 'kott', 'fisk', 'kyckling',
    'ägg', 'agg', 'kaffebönor', 'te', 'juice', 'dricka', 'godis', 'choklad', 'snacks',
    'chips', 'popcorn', 'snabbmat', 'restaurang', 'uteservering', 'krogen', 'puben',
    'bar', 'nattklubb', 'biograf', 'teater', 'konsert', 'nöje', 'noje', 'nöjespark',
    'badhus', 'simhall', 'spa', 'massage', 'naglar', 'hår', 'har', 'skönhet', 'skonhet',
    'hudvård', 'hudvard', 'parfym', 'makeup', 'smink', 'tvättmedel', 'diskmedel',
    'stopp', 'reparation', 'underhåll', 'underhall', 'reservdelar', 'verktyg',
    'möbler', 'mobler', 'inredning', 'belysning', 'textil', 'mattor', 'gardiner',
    'säng', 'sang', 'kudde', 'täcke', 'tacke', 'lakan', 'handdukar', 'porslin',
    'bestick', 'glas', 'kastrull', 'panna', 'elektronik', 'mobilladdare', 'sladd',
    'kabel', 'hörlurar', 'horlurar', 'skärm', 'skarm', 'tangentbord', 'mus', 'spel',
    'leksaker', 'barnkläder', 'barnskor', 'blöjor', 'blojor', 'välling', 'valling',
    'barnvagn', 'hundmat', 'kattmat', 'djurmat', 'veterinär', 'veterinar', 'djur',
    'hund', 'katt', 'fiskar', 'fågel', 'fagel', 'häst', 'hast', 'cykel', 'moped',
    'mc', 'bil', 'släp', 'slap', 'båt', 'bat', 'drivmedel', 'laddning', 'tvätta',
    'trängselskatt', 'trangselskatt', 'broavgift', 'färja', 'farja', 'båtbiljett',
    'tågbiljett', 'bussbiljett', 'flygbiljett', 'hotellrum', 'boende', 'stuga',
    'camping', 'skidor', 'liftkort', 'hyra', 'bostadsrätt', 'bostadsratt',
    'samfällighet', 'samfallighet', 'bredband', 'telefoni', 'mobilabonemang',
    'försäkring', 'forsakring', 'hemförsäkring', 'bilförsäkring', 'a-kassa',
    'fack', 'studielån', 'csn', 'spar', 'målspar', 'malspar', 'buffert', 'pension',
    'tjänstepension', 'fond', 'fonder', 'aktier', 'investering', 'krypto', 'skatt',
    'deklaration', 'moms', 'faktura', 'ocr', 'bg', 'pg', 'överföring', 'swish'
]);

/**
 * Cleans bank transaction strings by stripping out common statement prefixes,
 * store codes, dates, and trailing location names.
 */
export function cleanMerchantText(rawText: string): string {
    if (!rawText) return '';
    let text = rawText.toLowerCase().trim();

    // Remove bank prefixes
    for (const prefix of BANK_PREFIXES) {
        if (text.startsWith(prefix + ' ')) {
            text = text.slice(prefix.length).trim();
        }
    }

    // Remove transaction noise like dates (e.g. 240512, 2024-05-12), store numbers (#1042, 1042)
    text = text.replace(/\b\d{6}\b/g, ''); // 6-digit dates
    text = text.replace(/\b\d{8}\b/g, ''); // 8-digit dates
    text = text.replace(/#\d+/g, ''); // store IDs
    text = text.replace(/\b[a-z]{2,3}\s*\*\s*/g, ''); // e.g. "iz *", "sq *"
    text = text.replace(/\s+\d{3,5}\b/g, ''); // store numbers

    // Clean up punctuation and whitespace
    text = text.replace(/[*_#]/g, ' ').replace(/\s+/g, ' ').trim();

    return text;
}

// Curated mapping of common Swedish & international brands to their official website domains
export const KNOWN_BRANDS: Record<string, string> = {
    // Matbutiker & Stormarknader
    'ica maxi': 'ica.se',
    'ica kvantum': 'ica.se',
    'ica supermarket': 'ica.se',
    'ica nära': 'ica.se',
    'ica nara': 'ica.se',
    'ica': 'ica.se',
    'stora coop': 'coop.se',
    'coop konsum': 'coop.se',
    'coop extra': 'coop.se',
    'coop nära': 'coop.se',
    'coop': 'coop.se',
    'willys hemma': 'willys.se',
    'willys': 'willys.se',
    'hemköp': 'hemkop.se',
    'hemkop': 'hemkop.se',
    'lidl': 'lidl.se',
    'city gross': 'citygross.se',
    'citygross': 'citygross.se',
    'systembolaget': 'systembolaget.se',
    'mathem': 'mathem.se',
    'matsmart': 'matsmart.se',
    'pressbyrån': 'pressbyran.se',
    'pressbyran': 'pressbyran.se',
    '7-eleven': '7-eleven.se',
    'seven eleven': '7-eleven.se',
    'handlar\'n': 'handlarn.se',
    'handlarn': 'handlarn.se',
    'tempo': 'tempo.se',
    'convini': 'convini.se',
    'snabbgross': 'snabbgross.se',
    'eko': 'ekostormarknad.se',

    // Gym & Träning
    'fitness 24/7': 'fitness24seven.com',
    'fitness 24 seven': 'fitness24seven.com',
    'fitness24seven': 'fitness24seven.com',
    'fitness 24': 'fitness24seven.com',
    'fitness24': 'fitness24seven.com',
    'f24s': 'fitness24seven.com',
    'nordic wellness': 'nordicwellness.se',
    'nordicwellness': 'nordicwellness.se',
    'friskis & svettis': 'friskissvettis.se',
    'friskis och svettis': 'friskissvettis.se',
    'friskissvettis': 'friskissvettis.se',
    'friskis': 'friskissvettis.se',
    'sats': 'sats.se',
    'actic': 'actic.se',
    'stc': 'stc.se',
    'member 24': 'member24.se',
    'member24': 'member24.se',
    'gymgrossisten': 'gymgrossisten.com',
    'mm sports': 'mmsports.se',
    'mmsports': 'mmsports.se',

    // Snabbmat, Restaurang & Kafé
    "mcdonald's": 'mcdonalds.se',
    'mcdonalds': 'mcdonalds.se',
    'donken': 'mcdonalds.se',
    'max hamburgare': 'max.se',
    'max': 'max.se',
    'burger king': 'burgerking.se',
    'subway': 'subway.com',
    'espresso house': 'espressohouse.com',
    'espressohouse': 'espressohouse.com',
    "wayne's coffee": 'waynescoffee.se',
    'waynes coffee': 'waynescoffee.se',
    'pinchos': 'pinchos.se',
    'bastard burgers': 'bastardburgers.com',
    'brödernas': 'brodernas.nu',
    'brodernas': 'brodernas.nu',
    'chopchop': 'chopchop.se',
    'starbucks': 'starbucks.com',
    'kfc': 'kfc.se',
    'pizza hut': 'pizzahut.se',
    'foodora': 'foodora.se',
    'wolt': 'wolt.com',
    'uber eats': 'ubereats.com',
    'joe & the juice': 'joejuice.com',
    'bröd & salt': 'brodosalt.se',
    'brod & salt': 'brodosalt.se',
    'fabrique': 'fabrique.se',
    'gateau': 'gateau.se',
    'holy greens': 'holygreens.se',
    'zocalo': 'zocalo.se',
    'o\'learys': 'olearys.se',
    'olearys': 'olearys.se',
    'taco bar': 'tacobar.se',
    'sibylla': 'sibylla.se',

    // Apotek, Hälsa & Skönhet
    'apotek hjärtat': 'apotekhjartat.se',
    'apotek hjartat': 'apotekhjartat.se',
    'kronans apotek': 'kronansapotek.se',
    'apoteket': 'apoteket.se',
    'apotea': 'apotea.se',
    'meds': 'meds.se',
    'doz apotek': 'dozapotek.se',
    'kry': 'kry.se',
    'doktor.se': 'doktor.se',
    'mindler': 'mindler.se',
    'lyko': 'lyko.com',
    'nordicfeel': 'nordicfeel.se',
    'kicks': 'kicks.se',
    'sephora': 'sephora.se',
    'rituals': 'rituals.com',
    'synsam': 'synsam.se',
    'specsavers': 'specsavers.se',
    'smarteyes': 'smarteyes.se',

    // Detaljhandel, Mode & Sport
    'h&m': 'hm.com',
    'hm': 'hm.com',
    'zara': 'zara.com',
    'stadium outlet': 'stadiumoutlet.se',
    'stadium': 'stadium.se',
    'xxl': 'xxl.se',
    'intersport': 'intersport.se',
    'kappahl': 'kappahl.se',
    'lindex': 'lindex.com',
    'gina tricot': 'ginatricot.com',
    'bikbok': 'bikbok.com',
    'mq marqet': 'mq.se',
    'mq': 'mq.se',
    'åhléns': 'ahlens.se',
    'ahlens': 'ahlens.se',
    'nk': 'nk.se',
    'zalando': 'zalando.se',
    'boozt': 'boozt.com',
    'asos': 'asos.com',
    'uniqlo': 'uniqlo.com',
    'outnorth': 'outnorth.se',
    'revolutionrace': 'revolutionrace.se',
    'peak performance': 'peakperformance.com',

    // Elektronik, Hem & Bygg
    'elgiganten': 'elgiganten.se',
    'mediamarkt': 'mediamarkt.se',
    'power': 'power.se',
    'netonnet': 'netonnet.se',
    'webhallen': 'webhallen.com',
    'inet': 'inet.se',
    'kjell & company': 'kjell.com',
    'kjell och company': 'kjell.com',
    'kjell': 'kjell.com',
    'clas ohlson': 'clasohlson.com',
    'clasohlson': 'clasohlson.com',
    'biltema': 'biltema.se',
    'jula': 'jula.se',
    'rusta': 'rusta.com',
    'ikea': 'ikea.se',
    'mio': 'mio.se',
    'jysk': 'jysk.se',
    'bauhaus': 'bauhaus.se',
    'hornbach': 'hornbach.se',
    'plantagen': 'plantagen.se',
    'blomsterlandet': 'blomsterlandet.se',
    'cervera': 'cervera.se',

    // Resor, Kollektivtrafik, Parkering & Drivmedel
    'stockholms lokaltrafik': 'sl.se',
    'sl': 'sl.se',
    'sj': 'sj.se',
    'västtrafik': 'vasttrafik.se',
    'vasttrafik': 'vasttrafik.se',
    'skånetrafiken': 'skanetrafiken.se',
    'skanetrafiken': 'skanetrafiken.se',
    'mälartåg': 'malartag.se',
    'öresundståg': 'oresundstag.se',
    'ul': 'ul.se',
    'uber': 'uber.com',
    'bolt': 'bolt.eu',
    'voi': 'voiscooters.com',
    'tier': 'tier.app',
    'ryde': 'ryde-technology.com',
    'lime': 'li.me',
    'parkster': 'parkster.com',
    'easypark': 'easypark.com',
    'aimo park': 'aimopark.se',
    'aimo': 'aimopark.se',
    'circle k': 'circlek.se',
    'circlek': 'circlek.se',
    'okq8': 'okq8.se',
    'preem': 'preem.se',
    'st1': 'st1.se',
    'ingo': 'ingo.se',
    'shell': 'shell.se',
    'sas': 'flysas.com',
    'norwegian': 'norwegian.com',
    'flygbussarna': 'flygbussarna.se',
    'flixbus': 'flixbus.se',
    'taxi stockholm': 'taxistockholm.se',

    // Streaming, Nöje & Media
    'spotify': 'spotify.com',
    'netflix': 'netflix.com',
    'hbo max': 'max.com',
    'hbo': 'max.com',
    'disney+': 'disneyplus.com',
    'disney plus': 'disneyplus.com',
    'disney': 'disneyplus.com',
    'storytel': 'storytel.com',
    'bookbeat': 'bookbeat.se',
    'nextory': 'nextory.se',
    'podme': 'podme.com',
    'audible': 'audible.com',
    'viaplay': 'viaplay.se',
    'tv4 play': 'tv4play.se',
    'tv4play': 'tv4play.se',
    'discovery+': 'discoveryplus.com',
    'amazon prime': 'primevideo.com',
    'prime video': 'primevideo.com',
    'youtube premium': 'youtube.com',
    'youtube': 'youtube.com',
    'apple music': 'apple.com',
    'apple': 'apple.com',
    'twitch': 'twitch.tv',
    'steam': 'steampowered.com',
    'playstation': 'playstation.com',
    'xbox': 'xbox.com',
    'nintendo': 'nintendo.se',
    'expressen': 'expressen.se',
    'aftonbladet': 'aftonbladet.se',
    'dagens nyheter': 'dn.se',
    'dn': 'dn.se',

    // Mobil, Telekom & Mjukvara
    'tele2': 'tele2.se',
    'telia': 'telia.se',
    'telenor': 'telenor.se',
    'tre': 'tre.se',
    'comviq': 'comviq.se',
    'hallon': 'hallon.se',
    'vimla': 'vimla.se',
    'halebop': 'halebop.se',
    'bahnhof': 'bahnhof.se',
    'bredband2': 'bredband2.com',
    'chatgpt': 'openai.com',
    'openai': 'openai.com',
    'notion': 'notion.so',
    'github': 'github.com',
    'adobe': 'adobe.com',
    'google': 'google.com',
    'microsoft': 'microsoft.com',
    'dropbox': 'dropbox.com',

    // Banker, Betaltjänster & Försäkringar
    'klarna': 'klarna.com',
    'swish': 'swish.nu',
    'paypal': 'paypal.com',
    'revolut': 'revolut.com',
    'avanza': 'avanza.se',
    'nordnet': 'nordnet.se',
    'trygg-hansa': 'trygghansa.se',
    'länsförsäkringar': 'lansforsakringar.se',
    'folksam': 'folksam.se',
    'if': 'if.se',
    'hedvig': 'hedvig.com',
    'sbab': 'sbab.se',
    'seb': 'seb.se',
    'swedbank': 'swedbank.se',
    'handelsbanken': 'handelsbanken.se',
    'nordea': 'nordea.se'
};

// Sorted brand keys by length descending to ensure longer multi-word keys (e.g. "ica maxi") match before short keys ("ica")
const SORTED_BRAND_KEYS = Object.keys(KNOWN_BRANDS).sort((a, b) => b.length - a.length);

/**
 * Finds a matching domain from the known brands dictionary using strict word boundary matching.
 */
export function findKnownBrandDomain(name: string): string | undefined {
    if (!name) return undefined;
    
    // 1. Clean statement text
    const cleaned = cleanMerchantText(name);
    if (!cleaned || cleaned.length < 2) return undefined;

    // 2. Check if cleaned text is purely a generic term
    if (GENERIC_TERMS.has(cleaned)) {
        return undefined;
    }

    // 3. Direct match
    if (KNOWN_BRANDS[cleaned]) {
        return KNOWN_BRANDS[cleaned];
    }

    // 4. Normalized special character string
    const normalized = cleaned
        .replace(/[åä]/g, 'a')
        .replace(/[ö]/g, 'o')
        .replace(/24\/7/g, '24seven')
        .replace(/24 7/g, '24seven')
        .replace(/&/g, '')
        .trim();

    if (KNOWN_BRANDS[normalized]) {
        return KNOWN_BRANDS[normalized];
    }

    // 5. Strict Word Boundary Match across sorted keys
    for (const key of SORTED_BRAND_KEYS) {
        const domain = KNOWN_BRANDS[key];

        // Ensure key matches as a full word/token, not inside words like "kaffemaskin" -> "max"
        const boundaryRegex = new RegExp(`(?:^|[^a-z0-9åäö])${escapeRegExp(key)}(?:$|[^a-z0-9åäö])`, 'i');

        if (boundaryRegex.test(cleaned) || boundaryRegex.test(normalized)) {
            return domain;
        }
    }

    return undefined;
}

/**
 * Synchronous resolver for a logo URL given a merchant or title.
 * NEVER blind-guesses .se domain URLs for generic terms!
 */
export const getLogoUrl = (title: string): string | undefined => {
    if (!title) return undefined;
    
    // Explicit URL or Data URI
    if (title.startsWith('http') || title.startsWith('data:image') || title.startsWith('/')) {
        return title;
    }

    // Check if the title itself is a explicit domain (e.g., "spotify.com", "notion.so", "figma.com")
    const trimmed = title.trim().toLowerCase();
    if (trimmed.includes('.') && !trimmed.includes(' ') && !GENERIC_TERMS.has(trimmed)) {
        const apiKey = import.meta.env.VITE_LOGODEV_API_KEY;
        if (apiKey) {
            return `https://img.logo.dev/${trimmed}?token=${apiKey}`;
        }
        return `https://www.google.com/s2/favicons?domain=${trimmed}&sz=128`;
    }

    // Match known brand domain
    const knownDomain = findKnownBrandDomain(title);
    if (knownDomain) {
        const apiKey = import.meta.env.VITE_LOGODEV_API_KEY;
        if (apiKey) {
            return `https://img.logo.dev/${knownDomain}?token=${apiKey}`;
        }
        return `https://www.google.com/s2/favicons?domain=${knownDomain}&sz=128`;
    }

    // Do NOT blind-guess .se domains for unknown or generic terms!
    return undefined;
};

/**
 * Asynchronous logo search that tests candidate URLs to verify image existence.
 */
export const fetchLogoForName = async (name: string): Promise<string | undefined> => {
    if (!name || name.trim().length < 2) return undefined;
    
    if (name.startsWith('data:image')) {
        return name;
    }
    if (name.startsWith('http') || name.startsWith('/')) {
        const ok = await checkImage(name);
        return ok ? name : undefined;
    }

    // 1. Check known brand domain first
    const knownDomain = findKnownBrandDomain(name);
    if (knownDomain) {
        const candidateUrls: string[] = [];
        const apiKey = import.meta.env.VITE_LOGODEV_API_KEY;
        if (apiKey) {
            candidateUrls.push(`https://img.logo.dev/${knownDomain}?token=${apiKey}`);
        }
        candidateUrls.push(`https://www.google.com/s2/favicons?domain=${knownDomain}&sz=128`);
        candidateUrls.push(`https://logo.clearbit.com/${knownDomain}`);

        for (const url of candidateUrls) {
            if (await checkImage(url)) {
                return url;
            }
        }
    }

    // 2. If not a generic term, try clean domain candidate testing
    const cleaned = cleanMerchantText(name);
    if (!cleaned || GENERIC_TERMS.has(cleaned) || cleaned.length < 3) {
        return undefined;
    }

    const cleanAscii = cleaned
        .replace(/[åä]/g, 'a')
        .replace(/[ö]/g, 'o')
        .replace(/[^a-z0-9]/g, '');

    if (cleanAscii.length >= 3) {
        const extensions = ['.se', '.com', '.nu', '.org'];
        for (const ext of extensions) {
            const domain = `${cleanAscii}${ext}`;
            const testUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
            if (await checkImage(testUrl)) {
                return testUrl;
            }
        }
    }

    return undefined;
};

/**
 * Returns instant SVG logo if available (retained for backward compatibility).
 */
export function getInstantBrandLogo(name: string): string | undefined {
    const domain = findKnownBrandDomain(name);
    if (domain) {
        return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
    }
    return undefined;
}
