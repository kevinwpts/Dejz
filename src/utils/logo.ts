// Logo search and resolution utility with Swedish & international brand dictionary

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

// Curated mapping of common brands to their official website domains
export const KNOWN_BRANDS: Record<string, string> = {
    // Gym & Träning
    'fitness 24/7': 'fitness24seven.com',
    'fitness 24 seven': 'fitness24seven.com',
    'fitness24seven': 'fitness24seven.com',
    'fitness 24': 'fitness24seven.com',
    'fitness24': 'fitness24seven.com',
    'f24s': 'fitness24seven.com',
    'sats': 'sats.se',
    'nordic wellness': 'nordicwellness.se',
    'nordicwellness': 'nordicwellness.se',
    'friskis': 'friskissvettis.se',
    'friskis & svettis': 'friskissvettis.se',
    'friskis och svettis': 'friskissvettis.se',
    'friskissvettis': 'friskissvettis.se',
    'actic': 'actic.se',
    'stc': 'stc.se',
    'member 24': 'member24.se',
    'member24': 'member24.se',

    // Livsmedel & Matbutiker
    'ica': 'ica.se',
    'ica maxi': 'ica.se',
    'ica kvantum': 'ica.se',
    'ica supermarket': 'ica.se',
    'ica nära': 'ica.se',
    'ica nara': 'ica.se',
    'coop': 'coop.se',
    'stora coop': 'coop.se',
    'willys': 'willys.se',
    'willys hemma': 'willys.se',
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

    // Snabbmat, Kafé & Restaurang
    'mcdonalds': 'mcdonalds.se',
    "mcdonald's": 'mcdonalds.se',
    'donken': 'mcdonalds.se',
    'max': 'max.se',
    'max hamburgare': 'max.se',
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

    // Apotek & Hälsa
    'apoteket': 'apoteket.se',
    'apotea': 'apotea.se',
    'kronans apotek': 'kronansapotek.se',
    'meds': 'meds.se',
    'doz apotek': 'dozapotek.se',
    'kry': 'kry.se',
    'doktor.se': 'doktor.se',
    'mindler': 'mindler.se',

    // Resor, Kollektivtrafik, Parkering & Drivmedel
    'sl': 'sl.se',
    'stockholms lokaltrafik': 'sl.se',
    'sj': 'sj.se',
    'västtrafik': 'vasttrafik.se',
    'vasttrafik': 'vasttrafik.se',
    'skånetrafiken': 'skanetrafiken.se',
    'skanetrafiken': 'skanetrafiken.se',
    'mälartåg': 'malartag.se',
    'öresundståg': 'oresundstag.se',
    'uber': 'uber.com',
    'bolt': 'bolt.eu',
    'voi': 'voiscooters.com',
    'tier': 'tier.app',
    'ryde': 'ryde-technology.com',
    'parkster': 'parkster.com',
    'easypark': 'easypark.com',
    'aimo park': 'aimopark.se',
    'q-park': 'aimopark.se',
    'circle k': 'circlek.se',
    'circlek': 'circlek.se',
    'okq8': 'okq8.se',
    'preem': 'preem.se',
    'st1': 'st1.se',
    'ingo': 'ingo.se',
    'shell': 'shell.se',
    'sas': 'flysas.com'
};

// More international & subscription brands
const EXTENDED_BRANDS: Record<string, string> = {
    // Streaming & Nöje
    'spotify': 'spotify.com',
    'netflix': 'netflix.com',
    'hbo': 'max.com',
    'hbo max': 'max.com',
    'disney': 'disneyplus.com',
    'disney+': 'disneyplus.com',
    'viaplay': 'viaplay.se',
    'apple': 'apple.com',
    'apple music': 'apple.com',
    'apple tv': 'apple.com',
    'icloud': 'apple.com',
    'google': 'google.com',
    'google one': 'google.com',
    'youtube': 'youtube.com',
    'youtube premium': 'youtube.com',
    'storytel': 'storytel.com',
    'bookbeat': 'bookbeat.se',
    'nextory': 'nextory.se',
    'playstation': 'playstation.com',
    'xbox': 'xbox.com',
    'nintendo': 'nintendo.se',
    'steam': 'steampowered.com',
    'twitch': 'twitch.tv',
    'tv4 play': 'tv4play.se',
    'svt play': 'svtplay.se',

    // Shopping & Hem
    'ikea': 'ikea.se',
    'hm': 'hm.com',
    'h&m': 'hm.com',
    'zara': 'zara.com',
    'zalando': 'zalando.se',
    'asos': 'asos.com',
    'boozt': 'boozt.com',
    'na-kd': 'na-kd.com',
    'stadium': 'stadium.se',
    'xxl': 'xxl.se',
    'intersport': 'intersport.se',
    'elgiganten': 'elgiganten.se',
    'power': 'power.se',
    'netonnet': 'netonnet.se',
    'webhallen': 'webhallen.com',
    'komplett': 'komplett.se',
    'kjell': 'kjell.com',
    'kjell & company': 'kjell.com',
    'kjell och company': 'kjell.com',
    'clas ohlson': 'clasohlson.se',
    'clasohlson': 'clasohlson.se',
    'jula': 'jula.se',
    'biltema': 'biltema.se',
    'bauhaus': 'bauhaus.se',
    'rusta': 'rusta.com',
    'dollarstore': 'dollarstore.se',
    'amazon': 'amazon.se',
    'tradera': 'tradera.com',
    'blocket': 'blocket.se',
    'vinted': 'vinted.se',

    // Banker & Finans
    'swedbank': 'swedbank.se',
    'seb': 'seb.se',
    'nordea': 'nordea.se',
    'handelsbanken': 'handelsbanken.se',
    'länsförsäkringar': 'lansforsakringar.se',
    'lansforsakringar': 'lansforsakringar.se',
    'danske bank': 'danskebank.se',
    'sbab': 'sbab.se',
    'avanza': 'avanza.se',
    'nordnet': 'nordnet.se',
    'klarna': 'klarna.com',
    'swish': 'swish.nu',
    'qliro': 'qliro.com',
    'resurs bank': 'resursbank.se',
    'anyfin': 'anyfin.com',
    'revolut': 'revolut.com',
    'paypal': 'paypal.com',

    // Telekom & Bredband
    'telia': 'telia.se',
    'tele2': 'tele2.se',
    'telenor': 'telenor.se',
    'tre': 'tre.se',
    'vimla': 'vimla.se',
    'hallon': 'hallon.se',
    'comviq': 'comviq.se',
    'fello': 'fello.se',
    'halebop': 'halebop.se',
    'bahnhof': 'bahnhof.se',
    'bredband2': 'bredband2.se',

    // Försäkring & A-kassa
    'trygg-hansa': 'trygghansa.se',
    'trygghansa': 'trygghansa.se',
    'folksam': 'folksam.se',
    'if': 'if.se',
    'hedvig': 'hedvig.com',
    'unionen': 'unionen.se',
    'kommunal': 'kommunal.se',
    'akademikernas': 'akademikernas.se',

    // Myndigheter
    'csn': 'csn.se',
    'skatteverket': 'skatteverket.se',
    'försäkringskassan': 'forsakringskassan.se',
    'forsakringskassan': 'forsakringskassan.se',
    'transportstyrelsen': 'transportstyrelsen.se'
};

// High-resolution instant vector badge logos for key Swedish brands
export const INSTANT_BRAND_LOGOS: Record<string, string> = {
    // Fitness 24/7 & Gym
    'fitness 24/7': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%2304234c"/><text x="50" y="38" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="14" letter-spacing="1.5" text-anchor="middle">FITNESS</text><rect x="14" y="46" width="72" height="30" rx="15" fill="%23ff5500"/><text x="50" y="67" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="16" letter-spacing="0.5" text-anchor="middle">24Seven</text></svg>',
    'fitness24seven': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%2304234c"/><text x="50" y="38" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="14" letter-spacing="1.5" text-anchor="middle">FITNESS</text><rect x="14" y="46" width="72" height="30" rx="15" fill="%23ff5500"/><text x="50" y="67" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="16" letter-spacing="0.5" text-anchor="middle">24Seven</text></svg>',
    'fitness 24': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%2304234c"/><text x="50" y="38" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="14" letter-spacing="1.5" text-anchor="middle">FITNESS</text><rect x="14" y="46" width="72" height="30" rx="15" fill="%23ff5500"/><text x="50" y="67" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="16" letter-spacing="0.5" text-anchor="middle">24Seven</text></svg>',
    'fitness 24 seven': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%2304234c"/><text x="50" y="38" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="14" letter-spacing="1.5" text-anchor="middle">FITNESS</text><rect x="14" y="46" width="72" height="30" rx="15" fill="%23ff5500"/><text x="50" y="67" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="16" letter-spacing="0.5" text-anchor="middle">24Seven</text></svg>',
    'f24s': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%2304234c"/><text x="50" y="38" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="14" letter-spacing="1.5" text-anchor="middle">FITNESS</text><rect x="14" y="46" width="72" height="30" rx="15" fill="%23ff5500"/><text x="50" y="67" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="16" letter-spacing="0.5" text-anchor="middle">24Seven</text></svg>',
    'sats': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%230e1b2f"/><text x="50" y="62" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="24" letter-spacing="2" text-anchor="middle">SATS</text></svg>',
    'nordic wellness': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23111111"/><circle cx="50" cy="50" r="38" fill="none" stroke="%2395c11f" stroke-width="4"/><text x="50" y="48" fill="%2395c11f" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="18" text-anchor="middle">NW</text><text x="50" y="68" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="8" letter-spacing="1" text-anchor="middle">WELLNESS</text></svg>',
    'nordicwellness': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23111111"/><circle cx="50" cy="50" r="38" fill="none" stroke="%2395c11f" stroke-width="4"/><text x="50" y="48" fill="%2395c11f" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="18" text-anchor="middle">NW</text><text x="50" y="68" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="8" letter-spacing="1" text-anchor="middle">WELLNESS</text></svg>',
    'friskis': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23e30613"/><text x="50" y="58" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="22" letter-spacing="1" text-anchor="middle">F%26S</text><text x="50" y="74" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="8" letter-spacing="1" text-anchor="middle">FRISKIS</text></svg>',
    'friskissvettis': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23e30613"/><text x="50" y="58" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="22" letter-spacing="1" text-anchor="middle">F%26S</text><text x="50" y="74" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="8" letter-spacing="1" text-anchor="middle">FRISKIS</text></svg>',

    // Mat & Livsmedel (Svensk dagligvaruhandel)
    'coop': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%2300843D"/><g fill="%23ffffff" transform="translate(8, 36) scale(0.84)"><path d="M18.8 21.8c-2.3 2.2-5.4 3.4-9 3.4C3.8 25.2 0 20.8 0 14.4 0 7.9 4.1 3.5 10 3.5c3.6 0 6.6 1.2 8.8 3.4l-2.8 3.4c-1.6-1.5-3.6-2.3-6-2.3-3.6 0-6.1 2.7-6.1 6.4 0 3.7 2.4 6.4 6.1 6.4 2.3 0 4.4-.9 6-2.4l2.8 3.4zm14.5-18.3c6 0 10.1 4.4 10.1 10.9s-4.1 10.8-10.1 10.8c-6 0-10.1-4.3-10.1-10.8s4.1-10.9 10.1-10.9zm0 4.5c-3.6 0-6.1 2.7-6.1 6.4 0 3.7 2.5 6.4 6.1 6.4 3.6 0 6.1-2.7 6.1-6.4 0-3.7-2.5-6.4-6.1-6.4zm22.8-4.5c6 0 10.1 4.4 10.1 10.9s-4.1 10.8-10.1 10.8c-6 0-10.1-4.3-10.1-10.8s4.1-10.9 10.1-10.9zm0 4.5c-3.6 0-6.1 2.7-6.1 6.4 0 3.7 2.5 6.4 6.1 6.4 3.6 0 6.1-2.7 6.1-6.4 0-3.7-2.5-6.4-6.1-6.4zm22.8-4.5c6 0 10.1 4.4 10.1 10.9 0 6.5-4.1 10.8-10.1 10.8-2.9 0-5.4-1.1-7.1-3v10.4h-4V4.1h3.8v2.7c1.7-2 4.4-3.3 7.3-3.3zm-.4 4.5c-3.6 0-6.1 2.7-6.1 6.4 0 3.7 2.5 6.4 6.1 6.4 3.6 0 6.1-2.7 6.1-6.4 0-3.7-2.5-6.4-6.1-6.4z"/></g></svg>',
    'stora coop': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%2300843D"/><text x="50" y="32" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="12" letter-spacing="2" text-anchor="middle">STORA</text><g fill="%23ffffff" transform="translate(10, 44) scale(0.8)"><path d="M18.8 21.8c-2.3 2.2-5.4 3.4-9 3.4C3.8 25.2 0 20.8 0 14.4 0 7.9 4.1 3.5 10 3.5c3.6 0 6.6 1.2 8.8 3.4l-2.8 3.4c-1.6-1.5-3.6-2.3-6-2.3-3.6 0-6.1 2.7-6.1 6.4 0 3.7 2.4 6.4 6.1 6.4 2.3 0 4.4-.9 6-2.4l2.8 3.4zm14.5-18.3c6 0 10.1 4.4 10.1 10.9s-4.1 10.8-10.1 10.8c-6 0-10.1-4.3-10.1-10.8s4.1-10.9 10.1-10.9zm0 4.5c-3.6 0-6.1 2.7-6.1 6.4 0 3.7 2.5 6.4 6.1 6.4 3.6 0 6.1-2.7 6.1-6.4 0-3.7-2.5-6.4-6.1-6.4zm22.8-4.5c6 0 10.1 4.4 10.1 10.9s-4.1 10.8-10.1 10.8c-6 0-10.1-4.3-10.1-10.8s4.1-10.9 10.1-10.9zm0 4.5c-3.6 0-6.1 2.7-6.1 6.4 0 3.7 2.5 6.4 6.1 6.4 3.6 0 6.1-2.7 6.1-6.4 0-3.7-2.5-6.4-6.1-6.4zm22.8-4.5c6 0 10.1 4.4 10.1 10.9 0 6.5-4.1 10.8-10.1 10.8-2.9 0-5.4-1.1-7.1-3v10.4h-4V4.1h3.8v2.7c1.7-2 4.4-3.3 7.3-3.3zm-.4 4.5c-3.6 0-6.1 2.7-6.1 6.4 0 3.7 2.5 6.4 6.1 6.4 3.6 0 6.1-2.7 6.1-6.4 0-3.7-2.5-6.4-6.1-6.4z"/></g></svg>',
    'coop konsum': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%2300843D"/><g fill="%23ffffff" transform="translate(8, 36) scale(0.84)"><path d="M18.8 21.8c-2.3 2.2-5.4 3.4-9 3.4C3.8 25.2 0 20.8 0 14.4 0 7.9 4.1 3.5 10 3.5c3.6 0 6.6 1.2 8.8 3.4l-2.8 3.4c-1.6-1.5-3.6-2.3-6-2.3-3.6 0-6.1 2.7-6.1 6.4 0 3.7 2.4 6.4 6.1 6.4 2.3 0 4.4-.9 6-2.4l2.8 3.4zm14.5-18.3c6 0 10.1 4.4 10.1 10.9s-4.1 10.8-10.1 10.8c-6 0-10.1-4.3-10.1-10.8s4.1-10.9 10.1-10.9zm0 4.5c-3.6 0-6.1 2.7-6.1 6.4 0 3.7 2.5 6.4 6.1 6.4 3.6 0 6.1-2.7 6.1-6.4 0-3.7-2.5-6.4-6.1-6.4zm22.8-4.5c6 0 10.1 4.4 10.1 10.9s-4.1 10.8-10.1 10.8c-6 0-10.1-4.3-10.1-10.8s4.1-10.9 10.1-10.9zm0 4.5c-3.6 0-6.1 2.7-6.1 6.4 0 3.7 2.5 6.4 6.1 6.4 3.6 0 6.1-2.7 6.1-6.4 0-3.7-2.5-6.4-6.1-6.4zm22.8-4.5c6 0 10.1 4.4 10.1 10.9 0 6.5-4.1 10.8-10.1 10.8-2.9 0-5.4-1.1-7.1-3v10.4h-4V4.1h3.8v2.7c1.7-2 4.4-3.3 7.3-3.3zm-.4 4.5c-3.6 0-6.1 2.7-6.1 6.4 0 3.7 2.5 6.4 6.1 6.4 3.6 0 6.1-2.7 6.1-6.4 0-3.7-2.5-6.4-6.1-6.4z"/></g></svg>',
    'coop nära': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%2300843D"/><g fill="%23ffffff" transform="translate(8, 36) scale(0.84)"><path d="M18.8 21.8c-2.3 2.2-5.4 3.4-9 3.4C3.8 25.2 0 20.8 0 14.4 0 7.9 4.1 3.5 10 3.5c3.6 0 6.6 1.2 8.8 3.4l-2.8 3.4c-1.6-1.5-3.6-2.3-6-2.3-3.6 0-6.1 2.7-6.1 6.4 0 3.7 2.4 6.4 6.1 6.4 2.3 0 4.4-.9 6-2.4l2.8 3.4zm14.5-18.3c6 0 10.1 4.4 10.1 10.9s-4.1 10.8-10.1 10.8c-6 0-10.1-4.3-10.1-10.8s4.1-10.9 10.1-10.9zm0 4.5c-3.6 0-6.1 2.7-6.1 6.4 0 3.7 2.5 6.4 6.1 6.4 3.6 0 6.1-2.7 6.1-6.4 0-3.7-2.5-6.4-6.1-6.4zm22.8-4.5c6 0 10.1 4.4 10.1 10.9s-4.1 10.8-10.1 10.8c-6 0-10.1-4.3-10.1-10.8s4.1-10.9 10.1-10.9zm0 4.5c-3.6 0-6.1 2.7-6.1 6.4 0 3.7 2.5 6.4 6.1 6.4 3.6 0 6.1-2.7 6.1-6.4 0-3.7-2.5-6.4-6.1-6.4zm22.8-4.5c6 0 10.1 4.4 10.1 10.9 0 6.5-4.1 10.8-10.1 10.8-2.9 0-5.4-1.1-7.1-3v10.4h-4V4.1h3.8v2.7c1.7-2 4.4-3.3 7.3-3.3zm-.4 4.5c-3.6 0-6.1 2.7-6.1 6.4 0 3.7 2.5 6.4 6.1 6.4 3.6 0 6.1-2.7 6.1-6.4 0-3.7-2.5-6.4-6.1-6.4z"/></g></svg>',
    'coop nara': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%2300843D"/><g fill="%23ffffff" transform="translate(8, 36) scale(0.84)"><path d="M18.8 21.8c-2.3 2.2-5.4 3.4-9 3.4C3.8 25.2 0 20.8 0 14.4 0 7.9 4.1 3.5 10 3.5c3.6 0 6.6 1.2 8.8 3.4l-2.8 3.4c-1.6-1.5-3.6-2.3-6-2.3-3.6 0-6.1 2.7-6.1 6.4 0 3.7 2.4 6.4 6.1 6.4 2.3 0 4.4-.9 6-2.4l2.8 3.4zm14.5-18.3c6 0 10.1 4.4 10.1 10.9s-4.1 10.8-10.1 10.8c-6 0-10.1-4.3-10.1-10.8s4.1-10.9 10.1-10.9zm0 4.5c-3.6 0-6.1 2.7-6.1 6.4 0 3.7 2.5 6.4 6.1 6.4 3.6 0 6.1-2.7 6.1-6.4 0-3.7-2.5-6.4-6.1-6.4zm22.8-4.5c6 0 10.1 4.4 10.1 10.9s-4.1 10.8-10.1 10.8c-6 0-10.1-4.3-10.1-10.8s4.1-10.9 10.1-10.9zm0 4.5c-3.6 0-6.1 2.7-6.1 6.4 0 3.7 2.5 6.4 6.1 6.4 3.6 0 6.1-2.7 6.1-6.4 0-3.7-2.5-6.4-6.1-6.4zm22.8-4.5c6 0 10.1 4.4 10.1 10.9 0 6.5-4.1 10.8-10.1 10.8-2.9 0-5.4-1.1-7.1-3v10.4h-4V4.1h3.8v2.7c1.7-2 4.4-3.3 7.3-3.3zm-.4 4.5c-3.6 0-6.1 2.7-6.1 6.4 0 3.7 2.5 6.4 6.1 6.4 3.6 0 6.1-2.7 6.1-6.4 0-3.7-2.5-6.4-6.1-6.4z"/></g></svg>',
    'coop extra': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%2300843D"/><g fill="%23ffffff" transform="translate(8, 36) scale(0.84)"><path d="M18.8 21.8c-2.3 2.2-5.4 3.4-9 3.4C3.8 25.2 0 20.8 0 14.4 0 7.9 4.1 3.5 10 3.5c3.6 0 6.6 1.2 8.8 3.4l-2.8 3.4c-1.6-1.5-3.6-2.3-6-2.3-3.6 0-6.1 2.7-6.1 6.4 0 3.7 2.4 6.4 6.1 6.4 2.3 0 4.4-.9 6-2.4l2.8 3.4zm14.5-18.3c6 0 10.1 4.4 10.1 10.9s-4.1 10.8-10.1 10.8c-6 0-10.1-4.3-10.1-10.8s4.1-10.9 10.1-10.9zm0 4.5c-3.6 0-6.1 2.7-6.1 6.4 0 3.7 2.5 6.4 6.1 6.4 3.6 0 6.1-2.7 6.1-6.4 0-3.7-2.5-6.4-6.1-6.4zm22.8-4.5c6 0 10.1 4.4 10.1 10.9s-4.1 10.8-10.1 10.8c-6 0-10.1-4.3-10.1-10.8s4.1-10.9 10.1-10.9zm0 4.5c-3.6 0-6.1 2.7-6.1 6.4 0 3.7 2.5 6.4 6.1 6.4 3.6 0 6.1-2.7 6.1-6.4 0-3.7-2.5-6.4-6.1-6.4zm22.8-4.5c6 0 10.1 4.4 10.1 10.9 0 6.5-4.1 10.8-10.1 10.8-2.9 0-5.4-1.1-7.1-3v10.4h-4V4.1h3.8v2.7c1.7-2 4.4-3.3 7.3-3.3zm-.4 4.5c-3.6 0-6.1 2.7-6.1 6.4 0 3.7 2.5 6.4 6.1 6.4 3.6 0 6.1-2.7 6.1-6.4 0-3.7-2.5-6.4-6.1-6.4z"/></g></svg>',
    'coop forum': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%2300843D"/><g fill="%23ffffff" transform="translate(8, 36) scale(0.84)"><path d="M18.8 21.8c-2.3 2.2-5.4 3.4-9 3.4C3.8 25.2 0 20.8 0 14.4 0 7.9 4.1 3.5 10 3.5c3.6 0 6.6 1.2 8.8 3.4l-2.8 3.4c-1.6-1.5-3.6-2.3-6-2.3-3.6 0-6.1 2.7-6.1 6.4 0 3.7 2.4 6.4 6.1 6.4 2.3 0 4.4-.9 6-2.4l2.8 3.4zm14.5-18.3c6 0 10.1 4.4 10.1 10.9s-4.1 10.8-10.1 10.8c-6 0-10.1-4.3-10.1-10.8s4.1-10.9 10.1-10.9zm0 4.5c-3.6 0-6.1 2.7-6.1 6.4 0 3.7 2.5 6.4 6.1 6.4 3.6 0 6.1-2.7 6.1-6.4 0-3.7-2.5-6.4-6.1-6.4zm22.8-4.5c6 0 10.1 4.4 10.1 10.9s-4.1 10.8-10.1 10.8c-6 0-10.1-4.3-10.1-10.8s4.1-10.9 10.1-10.9zm0 4.5c-3.6 0-6.1 2.7-6.1 6.4 0 3.7 2.5 6.4 6.1 6.4 3.6 0 6.1-2.7 6.1-6.4 0-3.7-2.5-6.4-6.1-6.4zm22.8-4.5c6 0 10.1 4.4 10.1 10.9 0 6.5-4.1 10.8-10.1 10.8-2.9 0-5.4-1.1-7.1-3v10.4h-4V4.1h3.8v2.7c1.7-2 4.4-3.3 7.3-3.3zm-.4 4.5c-3.6 0-6.1 2.7-6.1 6.4 0 3.7 2.5 6.4 6.1 6.4 3.6 0 6.1-2.7 6.1-6.4 0-3.7-2.5-6.4-6.1-6.4z"/></g></svg>',
    'coop daglivs': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%2300843D"/><g fill="%23ffffff" transform="translate(8, 36) scale(0.84)"><path d="M18.8 21.8c-2.3 2.2-5.4 3.4-9 3.4C3.8 25.2 0 20.8 0 14.4 0 7.9 4.1 3.5 10 3.5c3.6 0 6.6 1.2 8.8 3.4l-2.8 3.4c-1.6-1.5-3.6-2.3-6-2.3-3.6 0-6.1 2.7-6.1 6.4 0 3.7 2.4 6.4 6.1 6.4 2.3 0 4.4-.9 6-2.4l2.8 3.4zm14.5-18.3c6 0 10.1 4.4 10.1 10.9s-4.1 10.8-10.1 10.8c-6 0-10.1-4.3-10.1-10.8s4.1-10.9 10.1-10.9zm0 4.5c-3.6 0-6.1 2.7-6.1 6.4 0 3.7 2.5 6.4 6.1 6.4 3.6 0 6.1-2.7 6.1-6.4 0-3.7-2.5-6.4-6.1-6.4zm22.8-4.5c6 0 10.1 4.4 10.1 10.9s-4.1 10.8-10.1 10.8c-6 0-10.1-4.3-10.1-10.8s4.1-10.9 10.1-10.9zm0 4.5c-3.6 0-6.1 2.7-6.1 6.4 0 3.7 2.5 6.4 6.1 6.4 3.6 0 6.1-2.7 6.1-6.4 0-3.7-2.5-6.4-6.1-6.4zm22.8-4.5c6 0 10.1 4.4 10.1 10.9 0 6.5-4.1 10.8-10.1 10.8-2.9 0-5.4-1.1-7.1-3v10.4h-4V4.1h3.8v2.7c1.7-2 4.4-3.3 7.3-3.3zm-.4 4.5c-3.6 0-6.1 2.7-6.1 6.4 0 3.7 2.5 6.4 6.1 6.4 3.6 0 6.1-2.7 6.1-6.4 0-3.7-2.5-6.4-6.1-6.4z"/></g></svg>',
    'coop mat': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%2300843D"/><g fill="%23ffffff" transform="translate(8, 36) scale(0.84)"><path d="M18.8 21.8c-2.3 2.2-5.4 3.4-9 3.4C3.8 25.2 0 20.8 0 14.4 0 7.9 4.1 3.5 10 3.5c3.6 0 6.6 1.2 8.8 3.4l-2.8 3.4c-1.6-1.5-3.6-2.3-6-2.3-3.6 0-6.1 2.7-6.1 6.4 0 3.7 2.4 6.4 6.1 6.4 2.3 0 4.4-.9 6-2.4l2.8 3.4zm14.5-18.3c6 0 10.1 4.4 10.1 10.9s-4.1 10.8-10.1 10.8c-6 0-10.1-4.3-10.1-10.8s4.1-10.9 10.1-10.9zm0 4.5c-3.6 0-6.1 2.7-6.1 6.4 0 3.7 2.5 6.4 6.1 6.4 3.6 0 6.1-2.7 6.1-6.4 0-3.7-2.5-6.4-6.1-6.4zm22.8-4.5c6 0 10.1 4.4 10.1 10.9s-4.1 10.8-10.1 10.8c-6 0-10.1-4.3-10.1-10.8s4.1-10.9 10.1-10.9zm0 4.5c-3.6 0-6.1 2.7-6.1 6.4 0 3.7 2.5 6.4 6.1 6.4 3.6 0 6.1-2.7 6.1-6.4 0-3.7-2.5-6.4-6.1-6.4zm22.8-4.5c6 0 10.1 4.4 10.1 10.9 0 6.5-4.1 10.8-10.1 10.8-2.9 0-5.4-1.1-7.1-3v10.4h-4V4.1h3.8v2.7c1.7-2 4.4-3.3 7.3-3.3zm-.4 4.5c-3.6 0-6.1 2.7-6.1 6.4 0 3.7 2.5 6.4 6.1 6.4 3.6 0 6.1-2.7 6.1-6.4 0-3.7-2.5-6.4-6.1-6.4z"/></g></svg>',
    
    'ica': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23e0001a"/><text x="50" y="64" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="30" letter-spacing="1" text-anchor="middle">ICA</text></svg>',
    'ica maxi': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23e0001a"/><text x="50" y="52" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="24" letter-spacing="1" text-anchor="middle">ICA</text><text x="50" y="74" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="14" letter-spacing="1" text-anchor="middle">MAXI</text></svg>',
    'ica kvantum': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23e0001a"/><text x="50" y="64" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="30" letter-spacing="1" text-anchor="middle">ICA</text></svg>',
    'ica supermarket': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23e0001a"/><text x="50" y="64" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="30" letter-spacing="1" text-anchor="middle">ICA</text></svg>',
    'ica nära': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23e0001a"/><text x="50" y="64" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="30" letter-spacing="1" text-anchor="middle">ICA</text></svg>',
    'ica nara': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23e0001a"/><text x="50" y="64" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="30" letter-spacing="1" text-anchor="middle">ICA</text></svg>',

    'willys': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23d81b27"/><text x="50" y="62" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="20" letter-spacing="0.5" text-anchor="middle">WILLYS:</text></svg>',
    'willys hemma': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23d81b27"/><text x="50" y="62" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="20" letter-spacing="0.5" text-anchor="middle">WILLYS:</text></svg>',
    'lidl': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%230050aa"/><circle cx="50" cy="50" r="38" fill="%23fff000" stroke="%23e60000" stroke-width="4"/><text x="50" y="60" fill="%230050aa" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="20" letter-spacing="0.5" text-anchor="middle">LIDL</text></svg>',
    'hemköp': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23d8232a"/><text x="50" y="62" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="18" letter-spacing="0.5" text-anchor="middle">HEMKÖP</text></svg>',
    'hemkop': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23d8232a"/><text x="50" y="62" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="18" letter-spacing="0.5" text-anchor="middle">HEMKÖP</text></svg>',
    'city gross': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23004b97"/><text x="50" y="48" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="18" text-anchor="middle">CITY</text><text x="50" y="72" fill="%23ffdd00" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="20" text-anchor="middle">GROSS</text></svg>',
    'citygross': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23004b97"/><text x="50" y="48" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="18" text-anchor="middle">CITY</text><text x="50" y="72" fill="%23ffdd00" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="20" text-anchor="middle">GROSS</text></svg>',
    'systembolaget': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23124338"/><circle cx="50" cy="50" r="36" fill="none" stroke="%23ffd100" stroke-width="3"/><text x="50" y="60" fill="%23ffd100" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="24" text-anchor="middle">S</text></svg>',

    // Transport, Fritid & Övrigt
    'sl': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23007ac3"/><circle cx="50" cy="50" r="34" fill="none" stroke="%23ffffff" stroke-width="5"/><text x="50" y="62" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="26" letter-spacing="1" text-anchor="middle">SL</text></svg>',
    'sj': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%231b6c39"/><text x="50" y="64" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="34" letter-spacing="2" text-anchor="middle">SJ</text></svg>',
    'max': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23e30613"/><text x="50" y="64" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="28" letter-spacing="1" text-anchor="middle">MAX</text></svg>',
    'max hamburgare': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23e30613"/><text x="50" y="64" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="28" letter-spacing="1" text-anchor="middle">MAX</text></svg>',
    'mcdonalds': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23bf0c0c"/><text x="50" y="70" fill="%23ffc72c" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="52" text-anchor="middle">M</text></svg>',
    "mcdonald's": 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23bf0c0c"/><text x="50" y="70" fill="%23ffc72c" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="52" text-anchor="middle">M</text></svg>',
    'donken': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23bf0c0c"/><text x="50" y="70" fill="%23ffc72c" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="52" text-anchor="middle">M</text></svg>',
    'spotify': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23121212"/><circle cx="50" cy="50" r="32" fill="%231db954"/><path d="M36 44c10-3 20-2 29 2M38 52c8-2 16-1 23 2M41 59c6-2 13-1 18 2" fill="none" stroke="%23121212" stroke-width="4" stroke-linecap="round"/></svg>'
};

/**
 * Returns an instant vector SVG logo data URI for known major brands.
 */
export function getInstantBrandLogo(name: string): string | undefined {
    if (!name) return undefined;
    const lower = name.toLowerCase().trim();

    // 1. Direct match
    if (INSTANT_BRAND_LOGOS[lower]) {
        return INSTANT_BRAND_LOGOS[lower];
    }

    // 2. Normalized character match (å/ä -> a, ö -> o)
    const normalized = lower
        .replace(/[åä]/g, 'a')
        .replace(/[ö]/g, 'o')
        .replace(/24\/7/g, '24seven')
        .replace(/24 7/g, '24seven')
        .replace(/&/g, '')
        .trim();

    if (INSTANT_BRAND_LOGOS[normalized]) {
        return INSTANT_BRAND_LOGOS[normalized];
    }

    // 3. Search keys sorted by length descending so multi-word keys (e.g. 'stora coop') match first
    const sortedKeys = Object.keys(INSTANT_BRAND_LOGOS).sort((a, b) => b.length - a.length);

    for (const key of sortedKeys) {
        if (lower === key || normalized === key) {
            return INSTANT_BRAND_LOGOS[key];
        }

        // Multi-word / punctuated keys (e.g. "fitness 24/7", "stora coop", "nordic wellness", "ica maxi")
        if (key.includes(' ') || key.includes('/') || key.includes('&') || key.length > 3) {
            // Check word boundary or direct contains
            const regex = new RegExp(`(?:^|[^a-z0-9])${key}(?:$|[^a-z0-9])`, 'i');
            if (regex.test(lower) || regex.test(normalized) || lower.includes(key) || normalized.includes(key)) {
                return INSTANT_BRAND_LOGOS[key];
            }
        } else {
            // Short keys (e.g. "sl", "ica", "max", "sj") must respect word boundaries
            const regex = new RegExp(`(?:^|[^a-z0-9])${key}(?:$|[^a-z0-9])`, 'i');
            if (regex.test(lower) || regex.test(normalized)) {
                return INSTANT_BRAND_LOGOS[key];
            }
        }
    }

    return undefined;
}

const ALL_BRANDS: Record<string, string> = { ...KNOWN_BRANDS, ...EXTENDED_BRANDS };

/**
 * Finds a matching domain from the known brands dictionary.
 */
export function findKnownBrandDomain(name: string): string | undefined {
    if (!name) return undefined;
    const lower = name.toLowerCase().trim();

    // 1. Direct match
    if (ALL_BRANDS[lower]) {
        return ALL_BRANDS[lower];
    }

    // 2. Normalized special characters check
    const normalized = lower
        .replace(/[åä]/g, 'a')
        .replace(/[ö]/g, 'o')
        .replace(/24\/7/g, '24seven')
        .replace(/24 7/g, '24seven')
        .replace(/&/g, '')
        .trim();

    if (ALL_BRANDS[normalized]) {
        return ALL_BRANDS[normalized];
    }

    // 3. Substring matching (e.g. "Medlemskap Fitness 24/7" or "Fitness 24/7 gym")
    for (const [key, domain] of Object.entries(ALL_BRANDS)) {
        if (lower.includes(key) || normalized.includes(key)) {
            return domain;
        }
    }

    return undefined;
}

/**
 * Builds logo URLs for a given domain using Google Favicon (128px high-res) / Clearbit / Logo.dev.
 */
function buildDomainLogoUrls(domain: string): string[] {
    const urls: string[] = [];
    const apiKey = import.meta.env.VITE_LOGODEV_API_KEY;

    if (apiKey) {
        urls.push(`https://img.logo.dev/${domain}?token=${apiKey}`);
    }

    // Google's 128px high-res favicon service returns authentic official brand logos reliably
    urls.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
    urls.push(`https://logo.clearbit.com/${domain}`);
    urls.push(`https://unavatar.io/${domain}`);

    return urls;
}

/**
 * Synchronous resolver for a logo URL given a name or merchant.
 */
export const getLogoUrl = (title: string): string | undefined => {
    if (!title) return undefined;
    
    // If it's already a full URL or data URI, return it
    if (title.startsWith('http') || title.startsWith('data:image')) return title;

    // Check if it's in known brands (e.g. Coop, ICA, Willys, Spotify, SATS, Max, etc.)
    const knownDomain = findKnownBrandDomain(title);
    if (knownDomain) {
        const apiKey = import.meta.env.VITE_LOGODEV_API_KEY;
        if (apiKey) {
            return `https://img.logo.dev/${knownDomain}?token=${apiKey}`;
        }
        return `https://www.google.com/s2/favicons?domain=${knownDomain}&sz=128`;
    }

    let normalized = title.toLowerCase().trim();
    
    // Check if it already looks like a domain (has . and no spaces)
    if (normalized.includes('.') && !normalized.includes(' ')) {
        const apiKey = import.meta.env.VITE_LOGODEV_API_KEY;
        if (apiKey) {
            return `https://img.logo.dev/${normalized}?token=${apiKey}`;
        }
        return `https://www.google.com/s2/favicons?domain=${normalized}&sz=128`;
    }

    // Map Swedish characters to ASCII counterparts for domain guessing
    normalized = normalized.replace(/[åä]/g, 'a').replace(/[ö]/g, 'o');
    normalized = normalized.replace(/24\/7/g, '24seven');
    normalized = normalized.replace(/24 7/g, '24seven');
    normalized = normalized.replace(/&/g, '');
    normalized = normalized.replace(/\s+ab$/g, '');
    normalized = normalized.replace(/\s+a-kassa$/g, '');
    normalized = normalized.replace(/\s+försäkring$/g, '');
    normalized = normalized.replace(/\s+forsakring$/g, '');
    normalized = normalized.replace(/\s+bank$/g, '');
    normalized = normalized.replace(/\s+energi$/g, '');
    normalized = normalized.replace(/\s+el$/g, '');

    const cleanName = normalized.replace(/[^a-z0-9]/g, '');
    const firstWord = normalized.split(' ')[0].replace(/[^a-z0-9]/g, '');
    
    if (!cleanName && !firstWord) return undefined;

    // Fallback guess: use full cleanName if >= 3 chars, otherwise firstWord
    const domainPart = cleanName.length >= 3 ? cleanName : firstWord;
    const domain = `${domainPart}.se`;

    const apiKey = import.meta.env.VITE_LOGODEV_API_KEY;
    if (apiKey) {
        return `https://img.logo.dev/${domain}?token=${apiKey}`;
    }
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
};

/**
 * Asynchronous logo search that tests URLs to ensure the returned logo actually exists.
 */
export const fetchLogoForName = async (name: string): Promise<string | undefined> => {
    if (!name || name.trim().length < 2) return undefined;
    
    // If it's already an explicit URL or data URI, verify it
    if (name.startsWith('data:image')) {
        return name;
    }
    if (name.startsWith('http')) {
        const ok = await checkImage(name);
        return ok ? name : undefined;
    }

    // 1. Check known brands first (covers Coop, ICA, Willys, SATS, Fitness 24/7, Max, etc.)
    const knownDomain = findKnownBrandDomain(name);
    if (knownDomain) {
        const candidateUrls = buildDomainLogoUrls(knownDomain);
        for (const url of candidateUrls) {
            if (await checkImage(url)) {
                return url;
            }
        }
    }

    // 2. Prepare domain candidates
    let normalized = name.toLowerCase().trim();
    normalized = normalized.replace(/[åä]/g, 'a').replace(/[ö]/g, 'o');
    normalized = normalized.replace(/24\/7/g, '24seven');
    normalized = normalized.replace(/24 7/g, '24seven');
    normalized = normalized.replace(/&/g, '');
    normalized = normalized.replace(/\s+ab$/g, '');
    normalized = normalized.replace(/\s+a-kassa$/g, '');
    normalized = normalized.replace(/\s+försäkring$/g, '');
    normalized = normalized.replace(/\s+forsakring$/g, '');
    normalized = normalized.replace(/\s+bank$/g, '');

    const cleanName = normalized.replace(/[^a-z0-9]/g, '');
    const firstWord = normalized.split(' ')[0]?.replace(/[^a-z0-9]/g, '') || '';
    
    const extensions = ['.se', '.com', '.nu', '.net', '.org', '.io', '.eu'];
    const domainCandidates: string[] = [];

    // Prioritize cleanName, then firstWord
    if (cleanName.length >= 3) {
        for (const ext of extensions) {
            domainCandidates.push(`${cleanName}${ext}`);
        }
    }
    if (firstWord.length >= 3 && firstWord !== cleanName) {
        for (const ext of extensions) {
            domainCandidates.push(`${firstWord}${ext}`);
        }
    }

    // Try domain candidates
    for (const domain of domainCandidates) {
        const urls = buildDomainLogoUrls(domain);
        for (const url of urls) {
            if (await checkImage(url)) {
                return url;
            }
        }
    }

    return undefined;
};
