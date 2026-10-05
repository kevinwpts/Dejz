// Logo search and resolution utility with massive Swedish & international brand dictionary
// Provides context-aware brand recognition (e.g., distinguishing "Max (HBO)" from "Max Hamburgare")

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

/**
 * Curated mapping of Swedish and international brands to official domains.
 * Sorted by length descending during lookup so specific multi-word phrases match first.
 */
export const KNOWN_BRANDS: Record<string, string> = {
    // --- DATING, SOCIALS & APPS ---
    'tinder': 'tinder.com',
    'tinder plus': 'tinder.com',
    'tinder gold': 'tinder.com',
    'tinder platinum': 'tinder.com',
    'hinge': 'hinge.co',
    'hinge preferred': 'hinge.co',
    'match': 'match.com',
    'match.com': 'match.com',
    'bumble': 'bumble.com',
    'bumble boost': 'bumble.com',
    'bumble premium': 'bumble.com',
    'badoo': 'badoo.com',
    'happn': 'happn.com',
    'happn premium': 'happn.com',
    'relate': 'relate-app.com',
    'mötesplatsen': 'motesplatsen.se',
    'motesplatsen': 'motesplatsen.se',
    'goodones': 'goodones.se',
    'good ones': 'goodones.se',
    'elitsinglar': 'elitsinglar.se',
    'grindr': 'grindr.com',
    'linkedin': 'linkedin.com',
    'linkedin premium': 'linkedin.com',
    'twitter': 'x.com',
    'x premium': 'x.com',
    'instagram': 'instagram.com',
    'snapchat': 'snapchat.com',
    'snapchat+': 'snapchat.com',
    'snapchat plus': 'snapchat.com',
    'tiktok': 'tiktok.com',
    'facebook': 'facebook.com',
    'reddit': 'reddit.com',
    'reddit premium': 'reddit.com',
    'discord': 'discord.com',
    'discord nitro': 'discord.com',
    'patreon': 'patreon.com',
    'onlyfans': 'onlyfans.com',
    'twitch': 'twitch.tv',
    'twitch sub': 'twitch.tv',
    'twitch subs': 'twitch.tv',
    'strava': 'strava.com',
    'strava premium': 'strava.com',
    'strava summit': 'strava.com',
    'bereal': 'bereal.com',
    'threads': 'threads.net',
    'whatsapp': 'whatsapp.com',
    'telegram': 'telegram.org',
    'signal': 'signal.org',

    // --- STREAMING FILM, SERIER & TV ---
    'skyshowtime': 'skyshowtime.com',
    'sky showtime': 'skyshowtime.com',
    'skyshow': 'skyshowtime.com',
    'max (hbo)': 'max.com',
    'max hbo': 'max.com',
    'hbo max': 'max.com',
    'hbo': 'max.com',
    'max streaming': 'max.com',
    'max abonnemang': 'max.com',
    'netflix': 'netflix.com',
    'spotify': 'spotify.com',
    'spotify premium': 'spotify.com',
    'spotify duo': 'spotify.com',
    'spotify family': 'spotify.com',
    'spotify student': 'spotify.com',
    'disney+': 'disneyplus.com',
    'disney plus': 'disneyplus.com',
    'disney': 'disneyplus.com',
    'amazon prime': 'primevideo.com',
    'prime video': 'primevideo.com',
    'prime': 'primevideo.com',
    'viaplay': 'viaplay.se',
    'viaplay total': 'viaplay.se',
    'viaplay medium': 'viaplay.se',
    'viaplay film': 'viaplay.se',
    'tv4 play': 'tv4play.se',
    'tv4 play plus': 'tv4play.se',
    'tv4play': 'tv4play.se',
    'tv4': 'tv4play.se',
    'svt play': 'svtplay.se',
    'svtplay': 'svtplay.se',
    'apple tv': 'apple.com',
    'apple tv+': 'apple.com',
    'apple tv plus': 'apple.com',
    'apple music': 'apple.com',
    'apple one': 'apple.com',
    'apple arcade': 'apple.com',
    'apple podcast': 'apple.com',
    'apple news': 'apple.com',
    'youtube': 'youtube.com',
    'youtube premium': 'youtube.com',
    'youtube music': 'youtube.com',
    'crunchyroll': 'crunchyroll.com',
    'dazn': 'dazn.com',
    'paramount+': 'paramountplus.com',
    'paramount plus': 'paramountplus.com',
    'paramount': 'paramountplus.com',
    'discovery+': 'discoveryplus.com',
    'discovery plus': 'discoveryplus.com',
    'discovery': 'discoveryplus.com',
    'allente': 'allente.se',
    'boxer': 'boxer.se',
    'tele2 play': 'tele2play.se',
    'telenor stream': 'telenor.se',
    'telia play': 'teliaplay.se',
    'filmstaden': 'filmstaden.se',
    'sf anytime': 'sfanytime.com',
    'blockbuster': 'blockbuster.se',
    'mubi': 'mubi.com',
    'drakfilm': 'triart.se',
    'triart': 'triart.se',
    'cineasterna': 'cineasterna.se',

    // --- LJUD, BÖCKER & PODCASTS ---
    'storytel': 'storytel.com',
    'bookbeat': 'bookbeat.se',
    'nextory': 'nextory.se',
    'audible': 'audible.com',
    'podme': 'podme.com',
    'podme premium': 'podme.com',
    'podimo': 'podimo.com',
    'podimo premium': 'podimo.com',
    'readly': 'readly.com',
    'readly tidningar': 'readly.com',
    'tidal': 'tidal.com',
    'deezer': 'deezer.com',
    'soundcloud': 'soundcloud.com',
    'scribd': 'scribd.com',

    // --- NYHETER & TIDNINGAR ---
    'aftonbladet': 'aftonbladet.se',
    'aftonbladet plus': 'aftonbladet.se',
    'expressen': 'expressen.se',
    'expressen premium': 'expressen.se',
    'dagens nyheter': 'dn.se',
    'dn': 'dn.se',
    'svenska dagbladet': 'svd.se',
    'svd': 'svd.se',
    'dagens industri': 'di.se',
    'di': 'di.se',
    'göteborgs-posten': 'gp.se',
    'goteborgs-posten': 'gp.se',
    'gp': 'gp.se',
    'sydsvenskan': 'sydsvenskan.se',
    'omni': 'omni.se',
    'omni mer': 'omni.se',
    'omni ekonomi': 'omni.se',
    'the economist': 'economist.com',
    'economist': 'economist.com',
    'new york times': 'nytimes.com',
    'nyt': 'nytimes.com',
    'financial times': 'ft.com',
    'ft': 'ft.com',
    'wall street journal': 'wsj.com',
    'wsj': 'wsj.com',
    'medium': 'medium.com',
    'substack': 'substack.com',

    // --- AI, GAMING & TEKNIK ---
    'chatgpt': 'openai.com',
    'chatgpt plus': 'openai.com',
    'chat gpt': 'openai.com',
    'openai': 'openai.com',
    'gpt-4': 'openai.com',
    'claude': 'anthropic.com',
    'claude pro': 'anthropic.com',
    'anthropic': 'anthropic.com',
    'midjourney': 'midjourney.com',
    'github': 'github.com',
    'github copilot': 'github.com',
    'copilot': 'github.com',
    'playstation': 'playstation.com',
    'playstation plus': 'playstation.com',
    'ps plus': 'playstation.com',
    'psn': 'playstation.com',
    'sony playstation': 'playstation.com',
    'xbox': 'xbox.com',
    'xbox game pass': 'xbox.com',
    'game pass': 'xbox.com',
    'nintendo': 'nintendo.se',
    'nintendo switch online': 'nintendo.se',
    'switch online': 'nintendo.se',
    'steam': 'steampowered.com',
    'epic games': 'epicgames.com',
    'ea play': 'ea.com',
    'ubisoft': 'ubisoft.com',
    'ubisoft+': 'ubisoft.com',
    'battle.net': 'battle.net',
    'blizzard': 'battle.net',
    'roblox': 'roblox.com',
    'adobe': 'adobe.com',
    'adobe creative cloud': 'adobe.com',
    'adobe lightroom': 'adobe.com',
    'adobe photoshop': 'adobe.com',
    'creative cloud': 'adobe.com',
    'photoshop': 'adobe.com',
    'lightroom': 'adobe.com',
    'microsoft': 'microsoft.com',
    'microsoft 365': 'microsoft.com',
    'office 365': 'microsoft.com',
    'm365': 'microsoft.com',
    'google': 'google.com',
    'google one': 'google.com',
    'google drive': 'google.com',
    'google workspace': 'google.com',
    'icloud': 'apple.com',
    'icloud storage': 'apple.com',
    'icloud+': 'apple.com',
    'apple icloud': 'apple.com',
    'dropbox': 'dropbox.com',
    '1password': '1password.com',
    'bitwarden': 'bitwarden.com',
    'lastpass': 'lastpass.com',
    'nordvpn': 'nordvpn.com',
    'expressvpn': 'expressvpn.com',
    'surfshark': 'surfshark.com',
    'mullvad': 'mullvad.net',
    'mullvad vpn': 'mullvad.net',
    'proton': 'proton.me',
    'protonmail': 'proton.me',
    'proton vpn': 'proton.me',
    'canva': 'canva.com',
    'canva pro': 'canva.com',
    'duolingo': 'duolingo.com',
    'super duolingo': 'duolingo.com',
    'duolingo max': 'duolingo.com',
    'notion': 'notion.so',
    'notion plus': 'notion.so',
    'figma': 'figma.com',
    'slack': 'slack.com',
    'zoom': 'zoom.us',
    'grammarly': 'grammarly.com',
    'setapp': 'setapp.com',

    // --- TRÄNING, HÄLSA & GYM ---
    'fitness 24/7': 'fitness24seven.com',
    'fitness 24 seven': 'fitness24seven.com',
    'fitness24seven': 'fitness24seven.com',
    'fitness 24': 'fitness24seven.com',
    'fitness24': 'fitness24seven.com',
    'f24s': 'fitness24seven.com',
    'sats': 'sats.se',
    'sats gym': 'sats.se',
    'nordic wellness': 'nordicwellness.se',
    'nordicwellness': 'nordicwellness.se',
    'friskis & svettis': 'friskissvettis.se',
    'friskis och svettis': 'friskissvettis.se',
    'friskis': 'friskissvettis.se',
    'friskissvettis': 'friskissvettis.se',
    'actic': 'actic.se',
    'actic gym': 'actic.se',
    'stc': 'stc.se',
    'stc training': 'stc.se',
    'member 24': 'member24.se',
    'member24': 'member24.se',
    'gymmet': 'gymmet.nu',
    'medley': 'medley.se',
    'bruce': 'bruce.app',
    'bruce pass': 'bruce.app',
    'classpass': 'classpass.com',
    'whoop': 'whoop.com',
    'whoop membership': 'whoop.com',
    'oura': 'ouraring.com',
    'oura ring': 'ouraring.com',
    'garmin': 'garmin.com',
    'headspace': 'headspace.com',
    'calm': 'calm.com',
    'lifesum': 'lifesum.com',
    'myfitnesspal': 'myfitnesspal.com',
    'sleep cycle': 'sleepcycle.com',

    // --- FÖRSÄKRINGAR & SKYDD ---
    'hedvig': 'hedvig.com',
    'hedvig försäkring': 'hedvig.com',
    'hedvig hemförsäkring': 'hedvig.com',
    'länsförsäkringar': 'lansforsakringar.se',
    'lansforsakringar': 'lansforsakringar.se',
    'trygg-hansa': 'trygghansa.se',
    'trygghansa': 'trygghansa.se',
    'folksam': 'folksam.se',
    'if': 'if.se',
    'if försäkring': 'if.se',
    'if hemförsäkring': 'if.se',
    'ica försäkring': 'icaforsakring.se',
    'agria': 'agria.se',
    'agria djurförsäkring': 'agria.se',
    'lassie': 'lassie.co',
    'lassie djurförsäkring': 'lassie.co',
    'manypets': 'manypets.com',
    'svedea': 'svedea.se',
    'dina försäkringar': 'dina.se',
    'gjensidige': 'gjensidige.se',

    // --- BOENDE, EL, LARM & DRIFT ---
    'tibber': 'tibber.com',
    'tibber el': 'tibber.com',
    'vattenfall': 'vattenfall.se',
    'fortum': 'fortum.se',
    'e.on': 'eon.se',
    'eon': 'eon.se',
    'göteborg energi': 'goteborgenergi.se',
    'goteborg energi': 'goteborgenergi.se',
    'öresundskraft': 'oresundskraft.se',
    'oresundskraft': 'oresundskraft.se',
    'skellefteå kraft': 'skekraft.se',
    'greenely': 'greenely.com',
    'verisure': 'verisure.se',
    'verisure larm': 'verisure.se',
    'sector alarm': 'sectoralarm.se',
    'sectoralarm': 'sectoralarm.se',
    'svenska alarm': 'svenskaalarm.se',

    // --- MOBIL & BREDBAND ---
    'telia': 'telia.se',
    'tele2': 'tele2.se',
    'telenor': 'telenor.se',
    'tre (3)': 'tre.se',
    'tre': 'tre.se',
    '3': 'tre.se',
    'vimla': 'vimla.se',
    'hallon': 'hallon.se',
    'comviq': 'comviq.se',
    'fello': 'fello.se',
    'halebop': 'halebop.se',
    'bahnhof': 'bahnhof.se',
    'bredband2': 'bredband2.se',
    'ownit': 'ownit.se',
    'fibra': 'fibra.se',

    // --- FACK, A-KASSA & MYNDIGHETER ---
    'csn': 'csn.se',
    'csn lån': 'csn.se',
    'unionen': 'unionen.se',
    'sveriges ingenjörer': 'sverigesingenjorer.se',
    'sveriges ingenjorer': 'sverigesingenjorer.se',
    'kommunal': 'kommunal.se',
    'vision': 'vision.se',
    'alfa-kassan': 'alfakassan.se',
    'alfakassan': 'alfakassan.se',
    'akademikernas': 'akademikernas.se',
    'akavia': 'akavia.se',
    'if metall': 'ifmetall.se',
    'handels': 'handels.se',
    'transport': 'transport.se',
    'byggnads': 'byggnads.se',
    'skatteverket': 'skatteverket.se',
    'försäkringskassan': 'forsakringskassan.se',
    'forsakringskassan': 'forsakringskassan.se',
    'transportstyrelsen': 'transportstyrelsen.se',

    // --- BANK, KREDIT & INVESTERING ---
    'swedbank': 'swedbank.se',
    'seb': 'seb.se',
    'nordea': 'nordea.se',
    'handelsbanken': 'handelsbanken.se',
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
    'ica banken': 'icabanken.se',
    'icabanken': 'icabanken.se',
    'lunar': 'lunar.app',
    'northmill': 'northmill.com',
    'hypoteket': 'hypoteket.com',
    'stabelo': 'stabelo.se',

    // --- TRANSPORT, FORDON & RESOR ---
    'sl': 'sl.se',
    'sl månadskort': 'sl.se',
    'stockholms lokaltrafik': 'sl.se',
    'sj': 'sj.se',
    'västtrafik': 'vasttrafik.se',
    'vasttrafik': 'vasttrafik.se',
    'skånetrafiken': 'skanetrafiken.se',
    'skanetrafiken': 'skanetrafiken.se',
    'mälartåg': 'malartag.se',
    'öresundståg': 'oresundstag.se',
    'flygbussarna': 'flygbussarna.se',
    'arlanda express': 'arlandaexpress.com',
    'uber': 'uber.com',
    'bolt': 'bolt.eu',
    'voi': 'voiscooters.com',
    'tier': 'tier.app',
    'ryde': 'ryde-technology.com',
    'dott': 'ridedott.com',
    'lime': 'li.me',
    'parkster': 'parkster.com',
    'easypark': 'easypark.com',
    'aimo park': 'aimopark.se',
    'aimo': 'aimopark.se',
    'q-park': 'aimopark.se',
    'apcoa': 'apcoa.se',
    'circle k': 'circlek.se',
    'circlek': 'circlek.se',
    'okq8': 'okq8.se',
    'preem': 'preem.se',
    'st1': 'st1.se',
    'ingo': 'ingo.se',
    'shell': 'shell.se',
    'tanka': 'tanka.se',
    'sas': 'flysas.com',
    'norwegian': 'norwegian.com',
    'ryanair': 'ryanair.com',

    // --- MATKASSAR, LIVSMEDEL & SHOPPING ---
    'hellofresh': 'hellofresh.se',
    'hello fresh': 'hellofresh.se',
    'linas matkasse': 'linasmatkasse.se',
    'linas': 'linasmatkasse.se',
    'mathem': 'mathem.se',
    'matsmart': 'matsmart.se',
    'foodora': 'foodora.se',
    'wolt': 'wolt.com',
    'uber eats': 'ubereats.com',
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
    'pressbyrån': 'pressbyran.se',
    'pressbyran': 'pressbyran.se',
    '7-eleven': '7-eleven.se',
    'seven eleven': '7-eleven.se',

    // --- RESTAURANG & SNABBMat ---
    'max': 'max.se',
    'max hamburgare': 'max.se',
    'mcdonalds': 'mcdonalds.se',
    "mcdonald's": 'mcdonalds.se',
    'donken': 'mcdonalds.se',
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

    // --- RETAIL, ELEKTRONIK & APOTEK ---
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
    'ur & penn': 'uropenn.se',
    'ur och penn': 'uropenn.se',
    'uropenn': 'uropenn.se',
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
    'sellpy': 'sellpy.se',
    'apoteket': 'apoteket.se',
    'apotea': 'apotea.se',
    'kronans apotek': 'kronansapotek.se',
    'meds': 'meds.se',
    'doz apotek': 'dozapotek.se',
    'kry': 'kry.se',
    'doktor.se': 'doktor.se',
    'mindler': 'mindler.se'
};

// Instant vector SVG logos for iconic brands
export const INSTANT_BRAND_LOGOS: Record<string, string> = {
    // Fitness 24/7 & Gym
    'fitness 24/7': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%2304234c"/><text x="50" y="38" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="14" letter-spacing="1.5" text-anchor="middle">FITNESS</text><rect x="14" y="46" width="72" height="30" rx="15" fill="%23ff5500"/><text x="50" y="67" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="16" letter-spacing="0.5" text-anchor="middle">24Seven</text></svg>',
    'fitness24seven': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%2304234c"/><text x="50" y="38" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="14" letter-spacing="1.5" text-anchor="middle">FITNESS</text><rect x="14" y="46" width="72" height="30" rx="15" fill="%23ff5500"/><text x="50" y="67" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="16" letter-spacing="0.5" text-anchor="middle">24Seven</text></svg>',
    'sats': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%230e1b2f"/><text x="50" y="62" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="24" letter-spacing="2" text-anchor="middle">SATS</text></svg>',
    'nordic wellness': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23111111"/><circle cx="50" cy="50" r="38" fill="none" stroke="%2395c11f" stroke-width="4"/><text x="50" y="48" fill="%2395c11f" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="18" text-anchor="middle">NW</text><text x="50" y="68" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="8" letter-spacing="1" text-anchor="middle">WELLNESS</text></svg>',
    'nordicwellness': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23111111"/><circle cx="50" cy="50" r="38" fill="none" stroke="%2395c11f" stroke-width="4"/><text x="50" y="48" fill="%2395c11f" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="18" text-anchor="middle">NW</text><text x="50" y="68" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="8" letter-spacing="1" text-anchor="middle">WELLNESS</text></svg>',
    'friskis': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23e30613"/><text x="50" y="58" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="22" letter-spacing="1" text-anchor="middle">F%26S</text><text x="50" y="74" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="8" letter-spacing="1" text-anchor="middle">FRISKIS</text></svg>',
    'friskissvettis': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23e30613"/><text x="50" y="58" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="22" letter-spacing="1" text-anchor="middle">F%26S</text><text x="50" y="74" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="700" font-size="8" letter-spacing="1" text-anchor="middle">FRISKIS</text></svg>',

    // Mat & Livsmedel
    'coop': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%2300843D"/><g fill="%23ffffff" transform="translate(8, 36) scale(0.84)"><path d="M18.8 21.8c-2.3 2.2-5.4 3.4-9 3.4C3.8 25.2 0 20.8 0 14.4 0 7.9 4.1 3.5 10 3.5c3.6 0 6.6 1.2 8.8 3.4l-2.8 3.4c-1.6-1.5-3.6-2.3-6-2.3-3.6 0-6.1 2.7-6.1 6.4 0 3.7 2.4 6.4 6.1 6.4 2.3 0 4.4-.9 6-2.4l2.8 3.4zm14.5-18.3c6 0 10.1 4.4 10.1 10.9s-4.1 10.8-10.1 10.8c-6 0-10.1-4.3-10.1-10.8s4.1-10.9 10.1-10.9zm0 4.5c-3.6 0-6.1 2.7-6.1 6.4 0 3.7 2.5 6.4 6.1 6.4 3.6 0 6.1-2.7 6.1-6.4 0-3.7-2.5-6.4-6.1-6.4zm22.8-4.5c6 0 10.1 4.4 10.1 10.9s-4.1 10.8-10.1 10.8c-6 0-10.1-4.3-10.1-10.8s4.1-10.9 10.1-10.9zm0 4.5c-3.6 0-6.1 2.7-6.1 6.4 0 3.7 2.5 6.4 6.1 6.4 3.6 0 6.1-2.7 6.1-6.4 0-3.7-2.5-6.4-6.1-6.4zm22.8-4.5c6 0 10.1 4.4 10.1 10.9 0 6.5-4.1 10.8-10.1 10.8-2.9 0-5.4-1.1-7.1-3v10.4h-4V4.1h3.8v2.7c1.7-2 4.4-3.3 7.3-3.3zm-.4 4.5c-3.6 0-6.1 2.7-6.1 6.4 0 3.7 2.5 6.4 6.1 6.4 3.6 0 6.1-2.7 6.1-6.4 0-3.7-2.5-6.4-6.1-6.4z"/></g></svg>',
    'ica': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23e0001a"/><text x="50" y="64" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="30" letter-spacing="1" text-anchor="middle">ICA</text></svg>',
    'willys': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23d81b27"/><text x="50" y="62" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="20" letter-spacing="0.5" text-anchor="middle">WILLYS:</text></svg>',
    'lidl': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%230050aa"/><circle cx="50" cy="50" r="38" fill="%23fff000" stroke="%23e60000" stroke-width="4"/><text x="50" y="60" fill="%230050aa" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="20" letter-spacing="0.5" text-anchor="middle">LIDL</text></svg>',
    'hemköp': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23d8232a"/><text x="50" y="62" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="18" letter-spacing="0.5" text-anchor="middle">HEMKÖP</text></svg>',
    
    // Kollektivtrafik
    'sl': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23007ac3"/><circle cx="50" cy="50" r="34" fill="none" stroke="%23ffffff" stroke-width="5"/><text x="50" y="62" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="26" letter-spacing="1" text-anchor="middle">SL</text></svg>',
    'sj': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%231b6c39"/><text x="50" y="64" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="34" letter-spacing="2" text-anchor="middle">SJ</text></svg>',
    
    // Snabbmat & Streaming
    'max': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23e30613"/><text x="50" y="64" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="28" letter-spacing="1" text-anchor="middle">MAX</text></svg>',
    'mcdonalds': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23bf0c0c"/><text x="50" y="70" fill="%23ffc72c" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="52" text-anchor="middle">M</text></svg>',
    'spotify': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23121212"/><circle cx="50" cy="50" r="32" fill="%231db954"/><path d="M36 44c10-3 20-2 29 2M38 52c8-2 16-1 23 2M41 59c6-2 13-1 18 2" fill="none" stroke="%23121212" stroke-width="4" stroke-linecap="round"/></svg>',
    'tinder': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><defs><linearGradient id="tinderGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="%23fd297b"/><stop offset="50%" stop-color="%23ff5864"/><stop offset="100%" stop-color="%23ff655b"/></linearGradient></defs><rect width="100" height="100" fill="url(%23tinderGrad)"/><path d="M49.2 24c.7 2.4 1 5 .8 7.6-.4 3.7-2.2 7-5 9.4-2.5 2.2-4.1 5.3-4.4 8.7-.6 7.4 5 13.9 12.4 14.5 7.4.6 13.9-5 14.5-12.4.2-2.9-.6-5.8-2.3-8.1-1.3 4.1-4.7 7.2-9 8.1 3.5-6.2 3.1-13.8-.9-19.6-1.5-2.2-3.6-4-6.1-5.2v-3z" fill="%23ffffff"/></svg>',
    'skyshowtime': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23000000"/><text x="50" y="44" fill="%2300d2ff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="17" letter-spacing="1" text-anchor="middle">SKY</text><text x="50" y="68" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="13" letter-spacing="0.5" text-anchor="middle">SHOWTIME</text></svg>',
    'max (hbo)': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23002be7"/><text x="50" y="65" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="30" letter-spacing="2" text-anchor="middle">MAX</text></svg>',
    'hbo max': 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100"><rect width="100" height="100" fill="%23002be7"/><text x="50" y="65" fill="%23ffffff" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="30" letter-spacing="2" text-anchor="middle">MAX</text></svg>'
};

/**
 * Disambiguation helper for context-dependent names like "Max (HBO)" vs "Max Hamburgare"
 */
export function isStreamingMaxContext(name: string, category?: string): boolean {
    const lowerName = (name || '').toLowerCase();
    const lowerCat = (category || '').toLowerCase();

    // Explicit mentions of HBO or streaming
    if (
        lowerName.includes('hbo') ||
        lowerName.includes('stream') ||
        lowerName.includes('tv') ||
        lowerName.includes('film') ||
        lowerName.includes('serie') ||
        lowerName.includes('abonnemang') ||
        lowerName.includes('play')
    ) {
        return true;
    }

    // Category indicates entertainment/streaming
    if (
        lowerCat.includes('stream') ||
        lowerCat.includes('abonnemang') ||
        lowerCat.includes('nöje') ||
        lowerCat.includes('noje') ||
        lowerCat.includes('media') ||
        lowerCat.includes('tv')
    ) {
        return true;
    }

    return false;
}

/**
 * Returns an instant vector SVG logo data URI for known major brands.
 */
export function getInstantBrandLogo(name: string, category?: string): string | undefined {
    if (!name) return undefined;
    const lower = name.toLowerCase().trim();

    // Check specific streaming context for Max
    if (lower.includes('max') && (isStreamingMaxContext(lower, category) || lower.includes('hbo'))) {
        return INSTANT_BRAND_LOGOS['max (hbo)'];
    }

    // Direct match
    if (INSTANT_BRAND_LOGOS[lower]) {
        // If it matched fastfood 'max' but context is streaming, return HBO max logo
        if (lower === 'max' && isStreamingMaxContext(lower, category)) {
            return INSTANT_BRAND_LOGOS['max (hbo)'];
        }
        return INSTANT_BRAND_LOGOS[lower];
    }

    // Normalized match
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

    // Search keys sorted by length descending so multi-word keys match first
    const sortedKeys = Object.keys(INSTANT_BRAND_LOGOS).sort((a, b) => b.length - a.length);

    for (const key of sortedKeys) {
        // Skip hamburger 'max' if context is streaming
        if (key === 'max' && isStreamingMaxContext(lower, category)) {
            continue;
        }

        if (key.includes(' ') || key.includes('/') || key.length > 3) {
            if (lower.includes(key) || normalized.includes(key)) {
                return INSTANT_BRAND_LOGOS[key];
            }
        } else {
            const regex = new RegExp(`(?:^|[^a-z0-9])${key}(?:$|[^a-z0-9])`, 'i');
            if (regex.test(lower) || regex.test(normalized)) {
                return INSTANT_BRAND_LOGOS[key];
            }
        }
    }

    return undefined;
}

// Pre-sorted known brand keys by length descending for optimal multi-word matching
const SORTED_BRAND_KEYS = Object.keys(KNOWN_BRANDS).sort((a, b) => b.length - a.length);

/**
 * Finds a matching domain from the known brands dictionary.
 */
export function findKnownBrandDomain(name: string, category?: string): string | undefined {
    if (!name) return undefined;
    const lower = name.toLowerCase().trim();

    // 0. Smart Context Disambiguation for "Max"
    if (lower.includes('max') && (isStreamingMaxContext(lower, category) || lower.includes('hbo'))) {
        return 'max.com';
    }

    // 1. Direct match
    if (KNOWN_BRANDS[lower]) {
        if (lower === 'max' && isStreamingMaxContext(lower, category)) {
            return 'max.com';
        }
        return KNOWN_BRANDS[lower];
    }

    // 2. Normalized special characters check
    const normalized = lower
        .replace(/[åä]/g, 'a')
        .replace(/[ö]/g, 'o')
        .replace(/24\/7/g, '24seven')
        .replace(/24 7/g, '24seven')
        .replace(/&/g, '')
        .trim();

    if (KNOWN_BRANDS[normalized]) {
        return KNOWN_BRANDS[normalized];
    }

    // 3. Substring matching using length-descending keys (so "max (hbo)" matches before "max")
    for (const key of SORTED_BRAND_KEYS) {
        // Multi-character / composite keys
        if (key.length > 3 || key.includes(' ') || key.includes('+') || key.includes('/') || key.includes('(')) {
            if (lower.includes(key) || normalized.includes(key)) {
                return KNOWN_BRANDS[key];
            }
        } else {
            // Short keys (e.g. "sl", "ica", "sj", "if", "tre", "stc", "3") require word-boundary check
            const regex = new RegExp(`(?:^|[^a-z0-9])${key}(?:$|[^a-z0-9])`, 'i');
            if (regex.test(lower) || regex.test(normalized)) {
                if (key === 'max' && isStreamingMaxContext(lower, category)) {
                    return 'max.com';
                }
                return KNOWN_BRANDS[key];
            }
        }
    }

    return undefined;
}

/**
 * Builds logo URLs for a given domain using Google Favicon (128px high-res) / Clearbit / Logo.dev.
 */
export function buildDomainLogoUrls(domain: string): string[] {
    const urls: string[] = [];
    const apiKey = import.meta.env.VITE_LOGODEV_API_KEY;

    if (apiKey) {
        urls.push(`https://img.logo.dev/${domain}?token=${apiKey}`);
    }

    // Google 128px high-res favicon service returns authentic brand icons reliably
    urls.push(`https://www.google.com/s2/favicons?domain=${domain}&sz=128`);
    urls.push(`https://logo.clearbit.com/${domain}`);
    urls.push(`https://unavatar.io/${domain}`);

    return urls;
}

/**
 * Synchronous resolver for a logo URL given a name, merchant or category.
 */
export const getLogoUrl = (title: string, category?: string): string | undefined => {
    if (!title) return undefined;
    
    // If it's already a full URL or data URI, return it directly
    if (title.startsWith('http') || title.startsWith('data:image')) return title;

    // Check known brands first (Tinder, Max, Spotify, SATS, SkyShowtime, etc.)
    const knownDomain = findKnownBrandDomain(title, category);
    if (knownDomain) {
        const apiKey = import.meta.env.VITE_LOGODEV_API_KEY;
        if (apiKey) {
            return `https://img.logo.dev/${knownDomain}?token=${apiKey}`;
        }
        return `https://www.google.com/s2/favicons?domain=${knownDomain}&sz=128`;
    }

    // Check instant vector badges fallback
    const instantSvg = getInstantBrandLogo(title, category);
    if (instantSvg) {
        return instantSvg;
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

    // Clean common suffixes and map Swedish characters to ASCII
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
    const firstWord = normalized.split(' ')[0]?.replace(/[^a-z0-9]/g, '') || '';
    
    if (!cleanName && !firstWord) return undefined;

    // Fallback domain guess: default to .se or .com
    const domainPart = cleanName.length >= 3 ? cleanName : firstWord;
    const domain = `${domainPart}.se`;

    const apiKey = import.meta.env.VITE_LOGODEV_API_KEY;
    if (apiKey) {
        return `https://img.logo.dev/${domain}?token=${apiKey}`;
    }
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
};

/**
 * Asynchronous logo search that tests candidate URLs to guarantee image validity.
 */
export const fetchLogoForName = async (name: string, category?: string): Promise<string | undefined> => {
    if (!name || name.trim().length < 2) return undefined;
    
    // If it's already an explicit URL or data URI, verify it
    if (name.startsWith('data:image')) {
        return name;
    }
    if (name.startsWith('http')) {
        const ok = await checkImage(name);
        return ok ? name : undefined;
    }

    // 0. Check instant vector logo
    const instant = getInstantBrandLogo(name, category);
    if (instant) {
        return instant;
    }

    // 1. Check known brands first (Tinder, SkyShowtime, Max, Spotify, SATS, Coop, etc.)
    const knownDomain = findKnownBrandDomain(name, category);
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
    
    const extensions = ['.se', '.com', '.nu', '.net', '.org', '.io', '.co', '.app', '.eu'];
    const domainCandidates: string[] = [];

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
