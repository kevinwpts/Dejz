// Logo search and resolution utility with comprehensive Swedish & international brand dictionary
// Provides context-aware brand recognition (e.g., "Svea Fastigheter(Hyra)" -> sveafastigheter.se, "Maxi" -> ICA Maxi, "Fitness 24-7" -> fitness24seven.com, etc.)

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
                // Reject tiny 1x1 tracking pixels
                if (img.naturalWidth <= 1 && img.naturalHeight <= 1) {
                    resolve(false);
                } else {
                    resolve(true);
                }
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
 * Domains where img.logo.dev serves a scraped og:image photograph instead of a logo,
 * or where a specific high-resolution favicon/logo endpoint is verified superior.
 */
export const DOMAIN_LOGO_OVERRIDES: Record<string, string> = {
    'folksam.se': 'https://www.google.com/s2/favicons?domain=https://www.folksam.se&sz=128',
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
    'sf bio': 'filmstaden.se',
    'sf anytime': 'sfanytime.com',
    'blockbuster': 'blockbuster.se',
    'mubi': 'mubi.com',
    'draken film': 'drakenfilm.se',
    'drakfilm': 'drakenfilm.se',
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
    'everand': 'everand.com',

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
    'di.se': 'di.se',
    'göteborgs-posten': 'gp.se',
    'goteborgs-posten': 'gp.se',
    'göteborgsposten': 'gp.se',
    'goteborgsposten': 'gp.se',
    'gp': 'gp.se',
    'sydsvenskan': 'sydsvenskan.se',
    'helsingborgs dagblad': 'hd.se',
    'unt': 'unt.se',
    'uppsala nya tidning': 'unt.se',
    'nerikes allehanda': 'na.se',
    'västerbottens-kuriren': 'vk.se',
    'norran': 'norran.se',
    'nsd': 'nsd.se',
    'kuriren': 'kuriren.nu',
    'corren': 'corren.se',
    'barometern': 'barometern.se',
    'blekinge läns tidning': 'blt.se',
    'smålandsposten': 'smp.se',
    'borås tidning': 'bt.se',
    'hallandsposten': 'hallandsposten.se',
    'ekuriren': 'ekuriren.se',
    'gefle dagblad': 'gd.se',
    'sundsvalls tidning': 'st.nu',
    'östersunds-posten': 'op.se',
    'nya wermlands-tidningen': 'nwt.se',
    'nwt': 'nwt.se',
    'omni': 'omni.se',
    'omni mer': 'omni.se',
    'omni ekonomi': 'omni.se',
    'breakit': 'breakit.se',
    'kvartal': 'kvartal.se',
    'fokus': 'fokus.se',
    'filter': 'magasinetfilter.se',
    'the economist': 'economist.com',
    'economist': 'economist.com',
    'new york times': 'nytimes.com',
    'nyt': 'nytimes.com',
    'financial times': 'ft.com',
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
    'perplexity': 'perplexity.ai',
    'cursor': 'cursor.com',
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
    'world of warcraft': 'battle.net',
    'roblox': 'roblox.com',
    'minecraft': 'minecraft.net',
    'geforce now': 'nvidia.com',
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
    'onedrive': 'microsoft.com',
    'google': 'google.com',
    'google one': 'google.com',
    'google drive': 'google.com',
    'google workspace': 'google.com',
    'icloud': 'apple.com',
    'icloud storage': 'apple.com',
    'icloud+': 'apple.com',
    'apple icloud': 'apple.com',
    'apple': 'apple.com',
    'dropbox': 'dropbox.com',
    '1password': '1password.com',
    'bitwarden': 'bitwarden.com',
    'lastpass': 'lastpass.com',
    'dashlane': 'dashlane.com',
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
    'babbel': 'babbel.com',
    'notion': 'notion.so',
    'notion plus': 'notion.so',
    'obsidian': 'obsidian.md',
    'evernote': 'evernote.com',
    'todoist': 'todoist.com',
    'figma': 'figma.com',
    'slack': 'slack.com',
    'zoom': 'zoom.us',
    'grammarly': 'grammarly.com',
    'setapp': 'setapp.com',
    'raycast': 'raycast.com',
    'linear': 'linear.app',
    'vercel': 'vercel.com',
    'netlify': 'netlify.com',
    'cloudflare': 'cloudflare.com',
    'digitalocean': 'digitalocean.com',
    'hetzner': 'hetzner.com',
    'loopia': 'loopia.se',
    'oderland': 'oderland.se',
    'one.com': 'one.com',
    'binero': 'binero.com',
    'gleef': 'gleef.com',

    // --- TRÄNING, HÄLSA & GYM ---
    'fitness 24/7': 'fitness24seven.com',
    'fitness 24-7': 'fitness24seven.com',
    'fitness24-7': 'fitness24seven.com',
    'fitness24/7': 'fitness24seven.com',
    'fitness 24 7': 'fitness24seven.com',
    'fitness 24 seven': 'fitness24seven.com',
    'fitness24seven': 'fitness24seven.com',
    'fitness 24': 'fitness24seven.com',
    'fitness24': 'fitness24seven.com',
    'f24s': 'fitness24seven.com',
    '24/7 gym': 'fitness24seven.com',
    '24-7 gym': 'fitness24seven.com',
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
    'stc gym': 'stc.se',
    'stc training': 'stc.se',
    'member 24': 'member24.se',
    'member24': 'member24.se',
    'puls & träning': 'pulsochtraning.se',
    'puls och träning': 'pulsochtraning.se',
    'pulsochtraning': 'pulsochtraning.se',
    'malkars': 'malkars.se',
    'iksu': 'iksu.se',
    'fysiken': 'fysiken.nu',
    'gerdahallen': 'gerdahallen.com',
    'campushallen': 'campushallen.se',
    'gymmet': 'gymmet.nu',
    'medley': 'medley.se',
    'bruce': 'bruce.app',
    'bruce pass': 'bruce.app',
    'epassi': 'epassi.se',
    'benify': 'benify.se',
    'wellnet': 'wellnet.se',
    'matchi': 'matchi.se',
    'playtomic': 'playtomic.io',
    'pdl center': 'pdlcenter.se',
    'every padel': 'everypadel.com',
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
    'yazio': 'yazio.com',
    'natural cycles': 'naturalcycles.com',
    'naturalcycles': 'naturalcycles.com',
    'sleep cycle': 'sleepcycle.com',
    'sleepcycle': 'sleepcycle.com',

    // --- FÖRSÄKRINGAR & PENSION ---
    'hedvig': 'hedvig.com',
    'hedvig försäkring': 'hedvig.com',
    'hedvig hemförsäkring': 'hedvig.com',
    'länsförsäkringar': 'lansforsakringar.se',
    'lansforsakringar': 'lansforsakringar.se',
    'lf försäkring': 'lansforsakringar.se',
    'lf forsakring': 'lansforsakringar.se',
    'lf bank': 'lansforsakringar.se',
    'trygg-hansa': 'trygghansa.se',
    'trygghansa': 'trygghansa.se',
    'trygg hansa': 'trygghansa.se',
    'folksam': 'folksam.se',
    'folksam försäkring': 'folksam.se',
    'folksam hemförsäkring': 'folksam.se',
    'folksam bilförsäkring': 'folksam.se',
    'if': 'if.se',
    'if försäkring': 'if.se',
    'if hemförsäkring': 'if.se',
    'ica försäkring': 'icaforsakring.se',
    'ica forsakring': 'icaforsakring.se',
    'skandia': 'skandia.se',
    'skandiabanken': 'skandia.se',
    'agria': 'agria.se',
    'agria djurförsäkring': 'agria.se',
    'lassie': 'lassie.co',
    'lassie djurförsäkring': 'lassie.co',
    'manypets': 'manypets.com',
    'sveland': 'sveland.se',
    'svedea': 'svedea.se',
    'dina försäkringar': 'dina.se',
    'dina forsakringar': 'dina.se',
    'gjensidige': 'gjensidige.se',
    'moderna försäkringar': 'modernaforsakringar.se',
    'moderna forsakringar': 'modernaforsakringar.se',
    'bliwa': 'bliwa.se',
    'euroaccident': 'euroaccident.com',
    'watercircles': 'watercircles.se',
    'accept': 'accept.se',
    'småföretagarnas': 'smaforetagarna.se',
    'amf': 'amf.se',
    'alecta': 'alecta.se',
    'spp': 'spp.se',
    'collectum': 'collectum.se',
    'fora': 'fora.se',
    'minpension': 'minpension.se',

    // --- BOENDE, HYRESVÄRDAR, FASTIGHETSBOLAG, EL & DRIFT ---
    'sveafastigheter': 'sveafastigheter.se',
    'svea fastigheter': 'sveafastigheter.se',
    'stena fastigheter': 'stenafastigheter.se',
    'stenafastigheter': 'stenafastigheter.se',
    'wallenstam': 'wallenstam.se',
    'heimstaden': 'heimstaden.com',
    'heim staden': 'heimstaden.com',
    'victoriahem': 'victoriahem.se',
    'victoria hem': 'victoriahem.se',
    'victoria park': 'victoriahem.se',
    'rikshem': 'rikshem.se',
    'riks hem': 'rikshem.se',
    'willhem': 'willhem.se',
    'will hem': 'willhem.se',
    'akelius': 'akelius.com',
    'balder': 'balder.se',
    'fastighets ab balder': 'balder.se',
    'vasakronan': 'vasakronan.se',
    'stockholmshem': 'stockholmshem.se',
    'stockholms hem': 'stockholmshem.se',
    'svenska bostäder': 'svenskabostader.se',
    'svenskabostäder': 'svenskabostader.se',
    'svenska bostader': 'svenskabostader.se',
    'familjebostäder': 'familjebostader.com',
    'familjebostader': 'familjebostader.com',
    'familje bostäder': 'familjebostader.com',
    'hsb': 'hsb.se',
    'riksbyggen': 'riksbyggen.se',
    'sbc': 'sbc.se',
    'hyresgästföreningen': 'hyresgastforeningen.se',
    'hyresgastforeningen': 'hyresgastforeningen.se',
    'bostadsförmedlingen': 'bostad.stockholm.se',
    'homeq': 'homeq.se',
    'qasa': 'qasa.se',
    'samtrygg': 'samtrygg.se',
    'hemnet': 'hemnet.se',
    'booli': 'booli.se',
    'byggvesta': 'byggvesta.se',
    'bygg vesta': 'byggvesta.se',
    'klarabo': 'klarabo.se',
    'klara bo': 'klarabo.se',
    'wåhlins': 'wahlins.se',
    'wahlins': 'wahlins.se',
    'wåhlins fastigheter': 'wahlins.se',
    'wahlins fastigheter': 'wahlins.se',
    'wåhlin fastigheter': 'wahlins.se',
    'diös': 'dios.se',
    'dios': 'dios.se',
    'diös fastigheter': 'dios.se',
    'uppsalahem': 'uppsalahem.se',
    'uppsala hem': 'uppsalahem.se',
    'mkb': 'mkbfastighet.se',
    'mkb fastighets': 'mkbfastighet.se',
    'öbo': 'obo.se',
    'obo': 'obo.se',
    'örebrobostäder': 'obo.se',
    'orebrobostader': 'obo.se',
    'stångåstaden': 'stangastaden.se',
    'stangastaden': 'stangastaden.se',
    'vätterhem': 'vatterhem.se',
    'vatterhem': 'vatterhem.se',
    'lkf': 'lkf.se',
    'lunds kommuns fastighets': 'lkf.se',
    'gavlegårdarna': 'gavlegardarna.se',
    'gavlegardarna': 'gavlegardarna.se',
    'mitthem': 'mitthem.se',
    'mitt hem': 'mitthem.se',
    'lulebo': 'lulebo.se',
    'mimer': 'mimer.nu',
    'bostads ab mimer': 'mimer.nu',
    'einar mattsson': 'einarmattsson.se',
    'einarmattsson': 'einarmattsson.se',
    'olov lindgren': 'olovlindgren.se',
    'olovlindgren': 'olovlindgren.se',
    'john mattson': 'johnmattson.se',
    'johnmattson': 'johnmattson.se',
    'k2a': 'k2a.se',
    'k2a fastigheter': 'k2a.se',
    'k-fastigheter': 'k-fastigheter.com',
    'k fastigheter': 'k-fastigheter.com',
    'kfastigheter': 'k-fastigheter.com',
    'neobo': 'neobo.se',
    'neobo fastigheter': 'neobo.se',
    'trianon': 'trianon.se',
    'fastighets ab trianon': 'trianon.se',
    'brinova': 'brinova.se',
    'brinova fastigheter': 'brinova.se',
    'heba': 'hebafast.se',
    'heba fastighets': 'hebafast.se',
    'förvaltaren': 'forvaltaren.se',
    'forvaltaren': 'forvaltaren.se',
    'signalisten': 'signalisten.se',
    'huge': 'huge.se',
    'huge bostäder': 'huge.se',
    'botkyrkabyggen': 'botkyrkabyggen.se',
    'sollentunahem': 'sollentunahem.se',
    'sollentuna hem': 'sollentunahem.se',
    'järfällahus': 'jarfallahus.se',
    'jarfallahus': 'jarfallahus.se',
    'castellum': 'castellum.se',
    'fabege': 'fabege.se',
    'wihlborgs': 'wihlborgs.se',
    'hufvudstaden': 'hufvudstaden.se',
    'fastpartner': 'fastpartner.se',
    'poseidon': 'poseidon.goteborg.se',
    'bostads ab poseidon': 'poseidon.goteborg.se',
    'helsingborgshem': 'helsingborgshem.se',
    'växjöbostäder': 'vaxjobostader.se',
    'vaxjobostader': 'vaxjobostader.se',
    'kalmarhem': 'kalmarhem.se',
    'gotlandshem': 'gotlandshem.se',
    'kfast': 'kfast.se',
    'tunabyggen': 'tunabyggen.se',
    'kopparstaden': 'kopparstaden.se',
    'kbab': 'kbab.se',
    'karlstads bostads': 'kbab.se',
    'hfab': 'hfab.se',
    'halmstads fastighets': 'hfab.se',
    'partillebo': 'partillebo.se',
    'väsbyhem': 'vasbyhem.se',
    'vasbyhem': 'vasbyhem.se',
    'tyresö bostäder': 'tyresobostader.se',
    'tyresobostader': 'tyresobostader.se',
    'haninge bostäder': 'haningebostader.se',
    'haningebostader': 'haningebostader.se',
    'skebo': 'skebo.se',
    'pitebo': 'pitebo.se',
    'bodenbo': 'bodenbo.se',
    'faluhem': 'faluhem.se',
    'uddevallahem': 'uddevallahem.se',
    'skövdebostäder': 'skovdebostader.se',
    'skovdebostader': 'skovdebostader.se',
    'derome': 'derome.se',
    'derome bostad': 'deromebostad.se',
    'slättö': 'slatto.se',
    'slatto': 'slatto.se',
    'newsec': 'newsec.se',
    'skb': 'skb.org',
    'fastighetsbyrån': 'fastighetsbyran.com',
    'fastighetsbyran': 'fastighetsbyran.com',
    'svensk fastighetsförmedling': 'svenskfast.se',
    'bjurfors': 'bjurfors.se',
    'notar': 'notar.se',
    'erik olsson': 'erikolsson.se',
    'mäklarhuset': 'maklarhuset.se',
    'maklarhuset': 'maklarhuset.se',
    'skandiamäklarna': 'skandiamaklarna.se',
    'husmanhagberg': 'husmanhagberg.se',
    'tibber': 'tibber.com',
    'tibber el': 'tibber.com',
    'vattenfall': 'vattenfall.se',
    'fortum': 'fortum.se',
    'e.on': 'eon.se',
    'eon': 'eon.se',
    'ellevio': 'ellevio.se',
    'göteborg energi': 'goteborgenergi.se',
    'goteborg energi': 'goteborgenergi.se',
    'stockholm exergi': 'stockholmexergi.se',
    'öresundskraft': 'oresundskraft.se',
    'oresundskraft': 'oresundskraft.se',
    'skellefteå kraft': 'skekraft.se',
    'skelleftea kraft': 'skekraft.se',
    'skekraft': 'skekraft.se',
    'greenely': 'greenely.com',
    'bixia': 'bixia.se',
    'godel': 'godel.se',
    'god el': 'godel.se',
    'dalakraft': 'dalakraft.se',
    'jämtkraft': 'jamtkraft.se',
    'jamtkraft': 'jamtkraft.se',
    'mälarenergi': 'malarenergi.se',
    'malarenergi': 'malarenergi.se',
    'tekniska verken': 'tekniskaverken.se',
    'kraftringen': 'kraftringen.se',
    'telge energi': 'telgeenergi.se',
    'luleå energi': 'luleaenergi.se',
    'umeå energi': 'umeaenergi.se',
    'sundsvall energi': 'sundsvallenergi.se',
    'gävle energi': 'gavleenergi.se',
    'eskilstuna energi': 'eem.se',
    'karlstads energi': 'karlstadsenergi.se',
    'jönköping energi': 'jonkopingenergi.se',
    'kalmar energi': 'kalmarenergi.se',
    'affärsverken': 'affarsverken.se',
    'varberg energi': 'varbergenergi.se',
    'borås energi': 'borasenergimiljo.se',
    'nacka energi': 'nackaenergi.se',
    'ystad energi': 'ystadenergi.se',
    'borlänge energi': 'borlangeenergi.se',
    'skånska energi': 'skanskaenergi.se',
    'bjäre kraft': 'bjarekraft.se',
    'svea solar': 'sveasolar.com',
    'sveasolar': 'sveasolar.com',
    'sveaskog': 'sveaskog.se',
    'svea skog': 'sveaskog.se',
    'svea vaccin': 'sveavaccin.se',
    'sveavaccin': 'sveavaccin.se',
    'verisure': 'verisure.se',
    'verisure larm': 'verisure.se',
    'sector alarm': 'sectoralarm.se',
    'sectoralarm': 'sectoralarm.se',
    'svenska alarm': 'svenskaalarm.se',
    'gardio': 'gardio.se',

    // --- MOBIL & BREDBAND ---
    'telia': 'telia.se',
    'tele2': 'tele2.se',
    'telenor': 'telenor.se',
    'tre (3)': 'tre.se',
    'tre mobil': 'tre.se',
    'tre bredband': 'tre.se',
    '3 mobil': 'tre.se',
    '3 abonnemang': 'tre.se',
    '3 bredband': 'tre.se',
    'hi3g': 'tre.se',
    'tre': 'tre.se',
    'vimla': 'vimla.se',
    'hallon': 'hallon.se',
    'comviq': 'comviq.se',
    'fello': 'fello.se',
    'halebop': 'halebop.se',
    'chilimobil': 'chilimobil.se',
    'lycamobile': 'lycamobile.se',
    'penny': 'penny.se',
    'bahnhof': 'bahnhof.se',
    'bredband2': 'bredband2.com',
    'bredbandsbolaget': 'telenor.se',
    'comhem': 'tele2.se',
    'com hem': 'tele2.se',
    'ownit': 'ownit.se',
    'fibra': 'fibra.se',
    'globalconnect': 'globalconnect.se',
    'ip-only': 'globalconnect.se',
    'open infra': 'openinfra.com',
    'stadsnät': 'stadsnat.se',

    // --- FACK, A-KASSA & MYNDIGHETER ---
    'csn': 'csn.se',
    'csn lån': 'csn.se',
    'unionen': 'unionen.se',
    'unionens a-kassa': 'unionensakassa.se',
    'sveriges ingenjörer': 'sverigesingenjorer.se',
    'sveriges ingenjorer': 'sverigesingenjorer.se',
    'kommunal': 'kommunal.se',
    'vision fack': 'vision.se',
    'fackförbundet vision': 'vision.se',
    'alfa-kassan': 'alfakassan.se',
    'alfakassan': 'alfakassan.se',
    'akademikernas': 'akademikernas.se',
    'akademikernas a-kassa': 'akademikernas.se',
    'aea': 'akademikernas.se',
    'akavia': 'akavia.se',
    'if metall': 'ifmetall.se',
    'handels a-kassa': 'handels.se',
    'handels fack': 'handels.se',
    'handelsanställdas': 'handels.se',
    'transport a-kassa': 'transport.se',
    'transportarbetareförbundet': 'transport.se',
    'byggnads': 'byggnads.se',
    'lärarförbundet': 'sverigeslarare.se',
    'sveriges lärare': 'sverigeslarare.se',
    'sveriges larare': 'sverigeslarare.se',
    'vårdförbundet': 'vardforbundet.se',
    'vardforbundet': 'vardforbundet.se',
    'polisförbundet': 'polisforbundet.se',
    'sekos a-kassa': 'seko.se',
    'seko': 'seko.se',
    'elektrikerna': 'sef.se',
    'målarna': 'malarna.se',
    'fastighets fack': 'fastighets.se',
    'fastighets a-kassa': 'fastighets.se',
    'fastighetsförbundet': 'fastighets.se',
    'livs': 'livs.se',
    'pappers': 'pappers.se',
    'gs-facket': 'gsfacket.se',
    'ledarna': 'ledarna.se',
    'saco': 'saco.se',
    'tco': 'tco.se',
    'lo': 'lo.se',
    'småa': 'smaa.se',
    'smaa': 'smaa.se',
    'skatteverket': 'skatteverket.se',
    'försäkringskassan': 'forsakringskassan.se',
    'forsakringskassan': 'forsakringskassan.se',
    'transportstyrelsen': 'transportstyrelsen.se',
    'kronofogden': 'kronofogden.se',
    'pensionsmyndigheten': 'pensionsmyndigheten.se',
    'arbetsförmedlingen': 'arbetsformedlingen.se',
    'bolagsverket': 'bolagsverket.se',
    'tullverket': 'tullverket.se',
    'migrationsverket': 'migrationsverket.se',
    'radiotjänst': 'svt.se',

    // --- BANK, KREDIT & INVESTERING ---
    'swedbank': 'swedbank.se',
    'seb': 'seb.se',
    'nordea': 'nordea.se',
    'handelsbanken': 'handelsbanken.se',
    'shb': 'handelsbanken.se',
    'danske bank': 'danskebank.se',
    'danskebank': 'danskebank.se',
    'sbab': 'sbab.se',
    'avanza': 'avanza.se',
    'nordnet': 'nordnet.se',
    'savr': 'savr.com',
    'lysa': 'lysa.se',
    'opti': 'opti.se',
    'klarna': 'klarna.com',
    'swish': 'swish.nu',
    'qliro': 'qliro.com',
    'walley': 'walley.se',
    'svea bank': 'svea.com',
    'sveabank': 'svea.com',
    'svea ekonomi': 'svea.com',
    'svea finans': 'svea.com',
    'svea inkasso': 'svea.com',
    'svea': 'svea.com',
    'resurs bank': 'resursbank.se',
    'resurs': 'resursbank.se',
    'anyfin': 'anyfin.com',
    'revolut': 'revolut.com',
    'wise': 'wise.com',
    'paypal': 'paypal.com',
    'ica banken': 'icabanken.se',
    'icabanken': 'icabanken.se',
    'ikano bank': 'ikanobank.se',
    'ikano': 'ikanobank.se',
    'marginalen bank': 'marginalen.se',
    'marginalen': 'marginalen.se',
    'santander': 'santanderconsumer.se',
    'morrow bank': 'morrowbank.se',
    'morrow': 'morrowbank.se',
    'komplett bank': 'morrowbank.se',
    'remember': 'remember.se',
    'norion bank': 'norionbank.se',
    'norion': 'norionbank.se',
    'collector bank': 'norionbank.se',
    'collector': 'norionbank.se',
    'lunar': 'lunar.app',
    'northmill': 'northmill.com',
    'hypoteket': 'hypoteket.com',
    'stabelo': 'stabelo.se',
    'landshypotek': 'landshypotek.se',
    'bluestep': 'bluestep.se',
    'lendo': 'lendo.se',
    'zmarta': 'zmarta.se',
    'sambla': 'sambla.se',
    'advisa': 'advisa.se',
    'compricer': 'compricer.se',
    'american express': 'americanexpress.com',
    'amex': 'americanexpress.com',
    'mastercard': 'mastercard.se',
    'eurocard': 'eurocard.se',
    'first card': 'firstcard.se',
    'kivra': 'kivra.se',
    'billogram': 'billogram.com',
    'trustly': 'trustly.com',
    'zimpler': 'zimpler.com',

    // --- TRANSPORT, FORDON, PARKERING & RESOR ---
    'sl': 'sl.se',
    'sl månadskort': 'sl.se',
    'sl kort': 'sl.se',
    'stockholms lokaltrafik': 'sl.se',
    'sj': 'sj.se',
    'sj tåg': 'sj.se',
    'västtrafik': 'vasttrafik.se',
    'vasttrafik': 'vasttrafik.se',
    'skånetrafiken': 'skanetrafiken.se',
    'skanetrafiken': 'skanetrafiken.se',
    'östgötatrafiken': 'ostgotatrafiken.se',
    'ostgotatrafiken': 'ostgotatrafiken.se',
    'ul': 'ul.se',
    'upplands lokaltrafik': 'ul.se',
    'jlt': 'jlt.se',
    'hallandstrafiken': 'hallandstrafiken.se',
    'länstrafiken': 'lanstrafiken.se',
    'dalatrafik': 'dalatrafik.se',
    'värmlandstrafik': 'varmlandstrafik.se',
    'x-trafik': 'xtrafik.se',
    'din tur': 'dintur.se',
    'blekingetrafiken': 'blekingetrafiken.se',
    'kalmar länstrafik': 'kalmarlanstrafik.se',
    'mälartåg': 'malartag.se',
    'malartag': 'malartag.se',
    'öresundståg': 'oresundstag.se',
    'oresundstag': 'oresundstag.se',
    'mtrx': 'vrsnabbtag.se',
    'vr snabbtåg': 'vrsnabbtag.se',
    'snälltåget': 'snalltaget.se',
    'snalltaget': 'snalltaget.se',
    'flixbus': 'flixbus.se',
    'flixtrain': 'flixtrain.se',
    'vy bus4you': 'vy.se',
    'bus4you': 'vy.se',
    'flygbussarna': 'flygbussarna.se',
    'arlanda express': 'arlandaexpress.com',
    'uber': 'uber.com',
    'bolt': 'bolt.eu',
    'cabonline': 'cabonline.com',
    'taxi stockholm': 'taxistockholm.se',
    'taxi kurir': 'taxikurir.se',
    'sverigetaxi': 'sverigetaxi.se',
    'voi': 'voiscooters.com',
    'tier': 'tier.app',
    'ryde': 'ryde-technology.com',
    'dott': 'ridedott.com',
    'lime': 'li.me',
    'parkster': 'parkster.com',
    'easypark': 'easypark.com',
    'aimo park': 'aimopark.se',
    'aimopark': 'aimopark.se',
    'aimo': 'aimopark.se',
    'q-park': 'aimopark.se',
    'apcoa': 'apcoa.se',
    'smspark': 'smspark.se',
    'sms park': 'smspark.se',
    'circle k': 'circlek.se',
    'circlek': 'circlek.se',
    'okq8': 'okq8.se',
    'preem': 'preem.se',
    'st1': 'st1.se',
    'ingo': 'ingo.se',
    'shell': 'shell.se',
    'tanka': 'tanka.se',
    'qstar': 'qstar.se',
    'incharge': 'vattenfall.se',
    'eon drive': 'eon.se',
    'mer laddning': 'mer.se',
    'ionity': 'ionity.eu',
    'tesla': 'tesla.com',
    'tesla supercharger': 'tesla.com',
    'volvo': 'volvocars.com',
    'volvo on demand': 'volvoondemand.com',
    'volkswagen': 'volkswagen.se',
    'vw finans': 'vwfs.se',
    'polestar': 'polestar.com',
    'kia': 'kia.com',
    'toyota': 'toyota.se',
    'bmw': 'bmw.se',
    'audi': 'audi.se',
    'mercedes': 'mercedes-benz.se',
    'skoda': 'skoda.se',
    'peugeot': 'peugeot.se',
    'renault': 'renault.se',
    'hyundai': 'hyundai.se',
    'mazda': 'mazda.se',
    'ford': 'ford.se',
    'nissan': 'nissan.se',
    'kinto': 'kinto-mobility.se',
    'hyre': 'hyre.se',
    'gomore': 'gomore.se',
    'hertz': 'hertz.se',
    'avis': 'avis.se',
    'europcar': 'europcar.se',
    'sixt': 'sixt.se',
    'mabi': 'mabi.se',
    'mekonomen': 'mekonomen.se',
    'autoexperten': 'autoexperten.se',
    'bilia': 'bilia.se',
    'hedin bil': 'hedinbil.se',
    'werksta': 'werksta.se',
    'carglass': 'carglass.se',
    'ryds bilglas': 'rydsbilglas.se',
    'besikta': 'besikta.se',
    'bilprovningen': 'bilprovningen.se',
    'opus': 'bilprovning.se',
    'opus bilprovning': 'bilprovning.se',
    'dekra': 'dekra-bilbesiktning.se',
    'carspect': 'carspect.se',
    'däckia': 'dackia.se',
    'vianor': 'vianor.se',
    'euromaster': 'euromaster.se',
    'bythjul': 'bythjul.com',
    'skruvat': 'skruvat.se',
    'autodoc': 'autodoc.se',
    'sas': 'flysas.com',
    'norwegian': 'norwegian.com',
    'ryanair': 'ryanair.com',
    'bra flyg': 'flygbra.se',
    'wizz air': 'wizzair.com',
    'finnair': 'finnair.com',
    'lufthansa': 'lufthansa.com',
    'klm': 'klm.se',
    'air france': 'airfrance.se',
    'british airways': 'britishairways.com',
    'ving': 'ving.se',
    'tui': 'tui.se',
    'apollo': 'apollo.se',
    'hotels.com': 'hotels.com',
    'booking.com': 'booking.com',
    'booking': 'booking.com',
    'airbnb': 'airbnb.se',
    'momondo': 'momondo.se',
    'skyscanner': 'skyscanner.se',
    'flygresor': 'flygresor.se',
    'expedia': 'expedia.se',
    'trivago': 'trivago.se',
    'scandic': 'scandichotels.se',
    'strawberry': 'strawberry.se',
    'nordic choice': 'strawberry.se',
    'elite hotels': 'elite.se',
    'radisson': 'radissonhotels.com',
    'best western': 'bestwestern.se',
    'stena line': 'stenaline.se',
    'viking line': 'vikingline.se',
    'tallink': 'tallink.com',
    'silja line': 'tallink.com',
    'destination gotland': 'destinationgotland.se',
    'eckerö linjen': 'eckerolinjen.se',
    'skistar': 'skistar.com',
    'liseberg': 'liseberg.se',
    'gröna lund': 'gronalund.com',
    'grona lund': 'gronalund.com',
    'kolmården': 'kolmarden.com',
    'skansen': 'skansen.se',

    // --- MATKASSAR, LIVSMEDEL & DAGLIGVAROR ---
    'hellofresh': 'hellofresh.se',
    'hello fresh': 'hellofresh.se',
    'linas matkasse': 'linasmatkasse.se',
    'linas': 'linasmatkasse.se',
    'middagsfrid': 'middagsfrid.se',
    'mathem': 'mathem.se',
    'matsmart': 'matsmart.se',
    'motatos': 'matsmart.se',
    'foodora': 'foodora.se',
    'wolt': 'wolt.com',
    'uber eats': 'ubereats.com',
    'bolt food': 'bolt.eu',
    'ica': 'ica.se',
    'maxi': 'ica.se',
    'ica maxi': 'ica.se',
    'maxi ica': 'ica.se',
    'maxi stormarknad': 'ica.se',
    'ica kvantum': 'ica.se',
    'kvantum': 'ica.se',
    'ica supermarket': 'ica.se',
    'ica nära': 'ica.se',
    'ica nara': 'ica.se',
    'coop': 'coop.se',
    'stora coop': 'coop.se',
    'lilla coop': 'coop.se',
    'coop konsum': 'coop.se',
    'coop forum': 'coop.se',
    'coop extra': 'coop.se',
    'x:-tra': 'coop.se',
    'willys': 'willys.se',
    'willys hemma': 'willys.se',
    'hemköp': 'hemkop.se',
    'hemkop': 'hemkop.se',
    'lidl': 'lidl.se',
    'city gross': 'citygross.se',
    'citygross': 'citygross.se',
    'tempo': 'tempo.se',
    'handlarn': 'handlarn.se',
    'matdax': 'matdax.se',
    'matrebellerna': 'matrebellerna.se',
    'systembolaget': 'systembolaget.se',
    'systemet': 'systembolaget.se',
    'pressbyrån': 'pressbyran.se',
    'pressbyran': 'pressbyran.se',
    '7-eleven': '7-eleven.se',
    '7 eleven': '7-eleven.se',
    'direkten': 'direkten.se',
    'hemmakväll': 'hemmakvall.se',
    'hemmakvall': 'hemmakvall.se',

    // --- RESTAURANG, FIKA & SNABBMAT ---
    'max': 'max.se',
    'max hamburgare': 'max.se',
    'max burgers': 'max.se',
    'mcdonalds': 'mcdonalds.se',
    "mcdonald's": 'mcdonalds.se',
    'donken': 'mcdonalds.se',
    'burger king': 'burgerking.se',
    'burgerking': 'burgerking.se',
    'subway': 'subway.com',
    'espresso house': 'espressohouse.com',
    'espressohouse': 'espressohouse.com',
    'waynes coffee': 'waynescoffee.se',
    'waynes': 'waynescoffee.se',
    'fazer': 'fazer.se',
    'gateau': 'gateau.se',
    'fabrique': 'fabrique.se',
    'bröd & salt': 'brodsalt.se',
    'brod & salt': 'brodsalt.se',
    'bröd och salt': 'brodsalt.se',
    'konditori': 'gateau.se',
    'pinchos': 'pinchos.se',
    'bastard burgers': 'bastardburgers.com',
    'brödernas': 'brodernas.nu',
    'brodernas': 'brodernas.nu',
    'chopchop': 'chopchop.se',
    'chop chop': 'chopchop.se',
    'starbucks': 'starbucks.com',
    'kfc': 'kfc.se',
    'taco bell': 'tacobell.se',
    'pizza hut': 'pizzahut.se',
    'dominos': 'dominos.se',
    "domino's": 'dominos.se',
    'vapiano': 'vapiano.se',
    'olearys': 'olearys.se',
    "o'learys": 'olearys.se',
    'harrys': 'harrys.se',
    'pitchers': 'pitchers.se',
    'taco bar': 'tacobar.se',
    'tacobar': 'tacobar.se',
    'zocalo': 'zocalo.se',
    'sushi yama': 'sushiyama.se',
    'sushiyama': 'sushiyama.se',
    'hawaii poke': 'hawaiipoke.se',
    'panini': 'panini.nu',
    'panini internazionale': 'panini.nu',
    'sibylla': 'sibylla.se',
    'korvmoj': 'sibylla.se',

    // --- SHOPPING, KLÄDER, MÖBLER, BYGG & ELEKTRONIK ---
    'ikea': 'ikea.se',
    'mio': 'mio.se',
    'jysk': 'jysk.se',
    'hemtex': 'hemtex.se',
    'cervera': 'cervera.se',
    'granit': 'granit.com',
    'lagerhaus': 'lagerhaus.se',
    'designtorget': 'designtorget.se',
    'svenska hem': 'svenskahem.se',
    'chilli': 'chilli.se',
    'trademax': 'trademax.se',
    'homeroom': 'homeroom.se',
    'jotex': 'jotex.se',
    'royal design': 'royaldesign.se',
    'nordic nest': 'nordicnest.se',
    'kungsängen': 'kungsangen.com',
    'sova': 'sova.se',
    'h&m': 'hm.com',
    'hm': 'hm.com',
    'hennes & mauritz': 'hm.com',
    'lindex': 'lindex.com',
    'kappahl': 'kappahl.com',
    'cubus': 'cubus.com',
    'dressmann': 'dressmann.com',
    'carlings': 'carlings.com',
    'bik bok': 'bikbok.com',
    'bikbok': 'bikbok.com',
    'gina tricot': 'ginatricot.com',
    'ginatricot': 'ginatricot.com',
    'lager 157': 'lager157.com',
    'lager157': 'lager157.com',
    'mq': 'mq.se',
    'marqet': 'mq.se',
    'zara': 'zara.com',
    'uniqlo': 'uniqlo.com',
    'arket': 'arket.com',
    'cos': 'cos.com',
    'weekday': 'weekday.com',
    'monki': 'monki.com',
    '& other stories': 'stories.com',
    'other stories': 'stories.com',
    'åhléns': 'ahlens.se',
    'ahlens': 'ahlens.se',
    'nk': 'nk.se',
    'nordiska kompaniet': 'nk.se',
    'zalando': 'zalando.se',
    'asos': 'asos.com',
    'boozt': 'boozt.com',
    'booztlet': 'booztlet.com',
    'nelly': 'nelly.com',
    'bubbleroom': 'bubbleroom.se',
    'na-kd': 'na-kd.com',
    'nakd': 'na-kd.com',
    'ellos': 'ellos.se',
    'cellbes': 'cellbes.se',
    'footway': 'footway.se',
    'stadium': 'stadium.se',
    'xxl': 'xxl.se',
    'intersport': 'intersport.se',
    'naturkompaniet': 'naturkompaniet.se',
    'outnorth': 'outnorth.se',
    'addnature': 'addnature.com',
    'snipes': 'snipes.se',
    'junkyard': 'junkyard.com',
    'ridestore': 'ridestore.se',
    'gymshark': 'gymshark.com',
    'icaniwill': 'icaniwill.se',
    'iciw': 'icaniwill.se',
    'stronger': 'strongerlabel.com',
    'mmsports': 'mmsports.se',
    'mm sports': 'mmsports.se',
    'gymgrossisten': 'gymgrossisten.com',
    'proteinbolaget': 'proteinbolaget.se',
    'elgiganten': 'elgiganten.se',
    'power': 'power.se',
    'netonnet': 'netonnet.se',
    'net on net': 'netonnet.se',
    'mediamarkt': 'power.se',
    'media markt': 'power.se',
    'ur & penn': 'uropenn.se',
    'uropenn': 'uropenn.se',
    'guldfynd': 'guldfynd.se',
    'albrekts guld': 'albrektsguld.se',
    'hallbergs guld': 'hallbergsguld.se',
    'glitter': 'glitter.se',
    'webhallen': 'webhallen.com',
    'komplett': 'komplett.se',
    'inet': 'inet.se',
    'proshop': 'proshop.se',
    'dustin': 'dustinhome.se',
    'kjell & company': 'kjell.com',
    'kjell och company': 'kjell.com',
    'kjell': 'kjell.com',
    'clas ohlson': 'clasohlson.se',
    'clasohlson': 'clasohlson.se',
    'teknikmagasinet': 'teknikmagasinet.se',
    'jula': 'jula.se',
    'biltema': 'biltema.se',
    'bauhaus': 'bauhaus.se',
    'hornbach': 'hornbach.se',
    'byggmax': 'byggmax.se',
    'bygghemma': 'bygghemma.se',
    'beijer': 'beijerbygg.se',
    'beijer bygg': 'beijerbygg.se',
    'k-rauta': 'k-rauta.se',
    'krauta': 'k-rauta.se',
    'xl-bygg': 'xlbygg.se',
    'xl bygg': 'xlbygg.se',
    'granngården': 'granngarden.se',
    'granngarden': 'granngarden.se',
    'plantagen': 'plantagen.se',
    'blomsterlandet': 'blomsterlandet.se',
    'interflora': 'interflora.se',
    'euroflorist': 'euroflorist.se',
    'rusta': 'rusta.com',
    'normal': 'normal.se',
    'dollarstore': 'dollarstore.se',
    'öob': 'oob.se',
    'oob': 'oob.se',
    'ö&b': 'oob.se',
    'gekås': 'gekas.se',
    'gekas': 'gekas.se',
    'ullared': 'gekas.se',
    'amazon': 'amazon.se',
    'cdon': 'cdon.se',
    'temu': 'temu.com',
    'shein': 'shein.com',
    'aliexpress': 'aliexpress.com',
    'ebay': 'ebay.com',
    'etsy': 'etsy.com',
    'tradera': 'tradera.com',
    'blocket': 'blocket.se',
    'vinted': 'vinted.se',
    'sellpy': 'sellpy.se',
    'postnord': 'postnord.se',
    'instabox': 'instabox.io',
    'budbee': 'budbee.com',
    'airmee': 'airmee.com',
    'early bird': 'earlybird.se',
    'dhl': 'dhl.com',
    'schenker': 'dbschenker.com',
    'db schenker': 'dbschenker.com',
    'bring': 'bring.se',
    'ups': 'ups.com',
    'fedex': 'fedex.com',

    // --- APOTEK, SKÖNHET, VÅRD, BARN & HUSDJUR ---
    'kicks': 'kicks.se',
    'lyko': 'lyko.com',
    'rituals': 'rituals.com',
    'sephora': 'sephora.se',
    'the body shop': 'thebodyshop.se',
    'body shop': 'thebodyshop.se',
    'caia': 'caiacosmetics.com',
    'caia cosmetics': 'caiacosmetics.com',
    'apoteket': 'apoteket.se',
    'apotea': 'apotea.se',
    'kronans apotek': 'kronansapotek.se',
    'kronans': 'kronansapotek.se',
    'apotek hjärtat': 'apotekhjartat.se',
    'apotek hjartat': 'apotekhjartat.se',
    'hjärtat': 'apotekhjartat.se',
    'meds': 'meds.se',
    'doz apotek': 'dozapotek.se',
    'lloydsapotek': 'dozapotek.se',
    'apohem': 'apohem.se',
    'synsam': 'synsam.se',
    'synsam lifestyle': 'synsam.se',
    'specsavers': 'specsavers.se',
    'synoptik': 'synoptik.se',
    'mister spex': 'misterspex.se',
    'lensway': 'lensway.se',
    'kry': 'kry.se',
    'min doktor': 'mindoktor.se',
    'mindoktor': 'mindoktor.se',
    'doktor.se': 'doktor.se',
    'doktor24': 'doktor24.se',
    'capio': 'capio.se',
    'aleris': 'aleris.se',
    'mindler': 'mindler.se',
    'folktandvården': 'folktandvarden.se',
    'folktandvarden': 'folktandvarden.se',
    'aqua dental': 'aquadental.se',
    'distriktstandvården': 'distriktstandvarden.se',
    'arkenzoo': 'arkenzoo.se',
    'arken zoo': 'arkenzoo.se',
    'musti och mirr': 'arkenzoo.se',
    'musti': 'arkenzoo.se',
    'animail': 'arkenzoo.se',
    'vetzoo': 'vetzoo.se',
    'zoo.se': 'zoo.se',
    'evidensia': 'evidensia.se',
    'anicura': 'anicura.se',
    'firstvet': 'firstvet.com',
    'adlibris': 'adlibris.com',
    'bokus': 'bokus.com',
    'akademibokhandeln': 'akademibokhandeln.se',
    'panduro': 'panduro.com',
    'lekia': 'lekia.se',
    'jollyroom': 'jollyroom.se',
    'babyland': 'babyland.se',
    'polarn o. pyret': 'polarnopyret.se',
    'polarn och pyret': 'polarnopyret.se',
    'röda korset': 'rodakorset.se',
    'roda korset': 'rodakorset.se',
    'rädda barnen': 'raddabarnen.se',
    'radda barnen': 'raddabarnen.se',
    'unicef': 'unicef.se',
    'cancerfonden': 'cancerfonden.se',
    'barncancerfonden': 'barncancerfonden.se',
    'hjärt-lungfonden': 'hjart-lungfonden.se',
    'wwf': 'wwf.se',
    'läkare utan gränser': 'lakareutangranser.se',
    'svenska kyrkan': 'svenskakyrkan.se',
    'svenska spel': 'svenskaspel.se',
    'atg': 'atg.se',
    'postkodlotteriet': 'postkodlotteriet.se',
    'folkspel': 'folkspel.se',
    'bingolotto': 'bingolotto.se',
    'triss': 'svenskaspel.se'
};

// Pre-sorted known brand keys by length descending for optimal multi-word matching
const SORTED_BRAND_KEYS = Object.keys(KNOWN_BRANDS).sort((a, b) => b.length - a.length);

// Pre-computed compact brand map (no spaces/hyphens, both with åäö and ASCII aao)
// Automatically resolves "Svea Fastigheter" <-> "Sveafastigheter", "Stena Fastigheter" <-> "Stenafastigheter", "Victoria Hem" <-> "Victoriahem", etc.
const COMPACT_BRAND_MAP: Map<string, string> = new Map();
for (const key of SORTED_BRAND_KEYS) {
    const domain = KNOWN_BRANDS[key];
    const compact = key
        .replace(/24\s*[-/]\s*7/g, '24seven')
        .replace(/24\s+7/g, '24seven')
        .replace(/[^a-z0-9åäö]/g, '');
    if (compact.length >= 2 && !COMPACT_BRAND_MAP.has(compact)) {
        COMPACT_BRAND_MAP.set(compact, domain);
    }
    const compactAscii = compact.replace(/[åä]/g, 'a').replace(/[ö]/g, 'o');
    if (compactAscii.length >= 3 && compactAscii !== 'apple' && !COMPACT_BRAND_MAP.has(compactAscii)) {
        COMPACT_BRAND_MAP.set(compactAscii, domain);
    }
}

// Escape regex special characters
function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Common Swedish compound expense suffixes that can be attached directly to a brand name
// e.g. "Folksamförsäkring", "Sveafastigheterhyra", "Satsgym", "Icabanken", "Netflixabonnemang", "SL-kort"
const SWEDISH_COMPOUND_SUFFIXES = '(?:hyra|hyran|kallhyra|varmhyra|månadshyra|manadshyra|försäkring|forsakring|hemförsäkring|hemforsakring|bilförsäkring|bilforsakring|djurförsäkring|djurforsakring|hundförsäkring|kattförsäkring|barnförsäkring|villaförsäkring|abonnemang|kort|kortet|lån|lan|lånet|lanet|bolån|bolan|billån|privatlån|gym|gymkort|träningskort|träning|traning|bank|banken|el|elen|elnät|elräkning|energi|bredband|fiber|mobil|kasse|matkasse|mat|butik|avgift|månadsavgift|fackavgift|medlemsavgift|faktura|medlemskap|utgift|konto|sparande|räkning|rakning|prenumeration|parkering)?';

// Pre-compiled boundary regexes for each brand key so lookups are instantaneous and never false-match inside unrelated words
const BRAND_KEY_REGEXES: Map<string, RegExp> = new Map(
    SORTED_BRAND_KEYS.map((key) => {
        const escaped = escapeRegex(key);
        const regex = new RegExp(
            `(?:^|[^a-z0-9åäöéü])${escaped}${SWEDISH_COMPOUND_SUFFIXES}(?:$|[^a-z0-9åäöéü])`,
            'i'
        );
        return [key, regex];
    })
);

// Generic Swedish expense & category words that users often add before, after, or in parentheses next to a company name
// e.g. "Svea Fastigheter(Hyra)", "Hyra (Sveafastigheter)", "Tibber - Elräkning", "Kallhyra Wallenstam"
const GENERIC_EXPENSE_MODIFIERS = new Set([
    'hyra', 'hyran', 'månadshyra', 'manadshyra', 'kallhyra', 'varmhyra', 'lokalhyra', 'hyresavi', 'boende', 'bostad',
    'lägenhet', 'lagenhet', 'hus', 'villa', 'radhus', 'hem', 'hushåll', 'hushall', 'förråd', 'forrad',
    'månadsavgift', 'manadsavgift', 'brf', 'avgift', 'avgiften', 'avgifter', 'medlemsavgift', 'årsavgift', 'arsavgift',
    'fackavgift', 'fack', 'facket', 'fackförbund', 'fackforbund', 'a-kassa', 'akassa', 'medlemskap',
    'el', 'elen', 'elnät', 'elnat', 'elhandel', 'elavtal', 'elräkning', 'elrakning', 'ström', 'strom',
    'vatten', 'värme', 'varme', 'fjärrvärme', 'fjarrvarme', 'sopavgift', 'sophämtning', 'sophamtning', 'renhållning',
    'bredband', 'fiber', 'fibernät', 'internet', 'wifi', 'mobil', 'mobilabonnemang', 'telefon', 'telefoni', 'abonnemang', 'abonnemanget',
    'larm', 'hemlarm', 'villalarm',
    'försäkring', 'forsakring', 'försäkringar', 'forsakringar', 'hemförsäkring', 'hemforsakring',
    'villaförsäkring', 'villaforsakring', 'bilförsäkring', 'bilforsakring', 'djurförsäkring', 'djurforsakring',
    'hundförsäkring', 'hundforsakring', 'kattförsäkring', 'kattforsakring', 'barnförsäkring', 'barnforsakring',
    'livförsäkring', 'livforsakring', 'personförsäkring', 'personforsakring', 'olycksfallsförsäkring', 'olycksfall',
    'inkomstförsäkring', 'inkomstforsakring', 'båtförsäkring', 'reseförsäkring', 'självrisk', 'sjalvrisk',
    'lån', 'lan', 'lånet', 'lanet', 'bolån', 'bolan', 'bostadslån', 'bostadslan', 'huslån', 'huslan',
    'billån', 'billan', 'privatlån', 'privatlan', 'blancolån', 'studielån', 'studielan', 'csn-lån',
    'amortering', 'ränta', 'ranta', 'kredit', 'kreditkort', 'delbetalning', 'avbetalning',
    'faktura', 'räkning', 'rakning', 'räkningar', 'rakningar', 'autogiro', 'efaktura', 'e-faktura',
    'betalning', 'utgift', 'utgifter', 'fast', 'fasta', 'kostnad', 'månadskostnad',
    'sparande', 'spara', 'månadssparande', 'manadssparande', 'buffert', 'pension', 'pensionssparande', 'isk', 'fonder', 'aktier',
    'inkomst', 'lön', 'lon', 'utbetalning', 'bidrag', 'barnbidrag', 'studiebidrag',
    'gym', 'gymmet', 'gymkort', 'träning', 'traning', 'träningskort', 'traningskort', 'friskvård', 'friskvard', 'hälsa', 'halsa',
    'parkering', 'boendeparkering', 'garage', 'carport', 'p-plats', 'bensin', 'diesel', 'drivmedel', 'laddning',
    'månadskort', 'manadskort', 'busskort', 'tågkort', 'pendling', 'transport', 'resa', 'resor', 'semester', 'flyg', 'hotell',
    'leasing', 'privatleasing', 'service', 'serviceavtal', 'besiktning', 'däckhotell', 'biltvätt',
    'mat', 'matkasse', 'livsmedel', 'storhandel', 'handling', 'lunch', 'middag', 'frukost', 'fika', 'kaffe', 'restaurang', 'utemat',
    'streaming', 'prenumeration', 'tidning', 'nyheter', 'musik', 'ljudbok', 'ljudböcker', 'film', 'bio', 'spel', 'gaming', 'nöje', 'noje',
    'shopping', 'kläder', 'klader', 'skor', 'apotek', 'medicin', 'tandvård', 'tandvard', 'tandläkare', 'frisör', 'frisor',
    'hund', 'katt', 'djur', 'husdjur', 'barn', 'familj', 'delat', 'delad', 'privat', 'gemensam', 'gemensamt', 'övrigt', 'ovrigt', 'annat',
    'ab', 'hb', 'kb', 'aktiebolag', 'sverige', 'sweden', 'group', 'holding', 'nordic'
]);

const GENERIC_NON_BRAND_WORDS = new Set([
    ...GENERIC_EXPENSE_MODIFIERS,
    'buss', 'tag', 'tåg', 'bil', 'krog', 'cafe', 'bageri', 'butik', 'present', 'gåva', 'gava',
    'kontanter', 'tvätt', 'tvatt', 'städ', 'stad', 'städning', 'stadning', 'dagis', 'förskola', 'forskola',
    'skola', 'studier', 'kurs', 'böcker', 'bocker', 'skatt', 'restskatt', 'veckopeng', 'månadspeng', 'manadspeng',
    'utdelning', 'krypto', 'konto', 'kort'
]);

function normalizeInputText(text: string): string {
    return text
        .toLowerCase()
        // Ensure parentheses/brackets have spaces around them so "Fastigheter(Hyra)" never glues tokens together
        .replace(/([([{\<])/g, ' $1 ')
        .replace(/([)\]>])/g, ' $1 ')
        .replace(/[åä]/g, 'a')
        .replace(/[ö]/g, 'o')
        .replace(/24\s*[-/]\s*7/g, '24seven')
        .replace(/24\s+7/g, '24seven')
        .replace(/&/g, ' och ')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Strips generic Swedish expense modifier tokens from a phrase while preserving brand words.
 * e.g. "Svea Fastigheter Hyra" -> "svea fastigheter"
 * e.g. "Hyra Svea Fastigheter" -> "svea fastigheter"
 * e.g. "Sveafastigheterhyra" -> "sveafastigheter"
 */
function stripGenericModifiers(segment: string): string {
    const cleaned = segment
        .toLowerCase()
        .replace(/[([{\<)\]>]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (!cleaned) return '';

    const tokens = cleaned.split(/\s+/).filter(Boolean);
    const filtered = tokens.filter((tok) => {
        const cleanTok = tok.replace(/^[^a-z0-9åäö]+|[^a-z0-9åäö]+$/gi, '');
        if (!cleanTok) return false;
        const asciiTok = cleanTok.replace(/[åä]/g, 'a').replace(/[ö]/g, 'o');
        return !GENERIC_EXPENSE_MODIFIERS.has(cleanTok) && !GENERIC_EXPENSE_MODIFIERS.has(asciiTok);
    });

    let result = filtered.join(' ').trim();

    // Also strip trailing compound expense suffixes attached without spaces to a long brand word (e.g. "sveafastigheterhyra" -> "sveafastigheter")
    if (result && !result.includes(' ') && result.length >= 7) {
        const suffixStripped = result.replace(
            /(hyra|hyran|kallhyra|månadshyra|manadshyra|hemförsäkring|hemforsakring|bilförsäkring|bilforsakring|djurförsäkring|djurforsakring|försäkring|forsakring|abonnemang|månadsavgift|manadsavgift|fackavgift|medlemsavgift|avgift|faktura|räkning|rakning|elräkning|elrakning|bredband|bolån|bolan|billån|privatlån|gymkort|träningskort)$/i,
            ''
        );
        if (suffixStripped.length >= 3) {
            result = suffixStripped;
        }
    }

    return result;
}

/**
 * Decomposes any user-entered expense/transaction title into ordered company search candidates.
 * Handles:
 *  - "Svea Fastigheter(Hyra)" -> ["svea fastigheter", "svea fastigheter (hyra)"]
 *  - "Sveafastigheter(Hyra)" -> ["sveafastigheter", "sveafastigheter (hyra)"]
 *  - "Hyra (Svea Fastigheter)" -> ["svea fastigheter", "hyra (svea fastigheter)"]
 *  - "Svea Fastigheter - Hyra" -> ["svea fastigheter"]
 *  - "Månadshyra Svea Fastigheter" -> ["svea fastigheter"]
 */
export function extractBrandSearchCandidates(rawInput: string): string[] {
    if (!rawInput || !rawInput.trim()) return [];
    const trimmed = rawInput.trim().toLowerCase();
    const candidates: string[] = [];

    const addCandidate = (c?: string) => {
        if (!c) return;
        const norm = c.replace(/\s+/g, ' ').trim();
        if (norm.length >= 2 && !candidates.includes(norm)) {
            candidates.push(norm);
        }
    };

    // Preserve explicit parenthetical brands like "max (hbo)" or "tre (3)" first
    if (trimmed.includes('hbo') || trimmed.includes('(3)')) {
        addCandidate(trimmed);
    }

    // 1. Text outside parentheses/brackets (e.g. "Svea Fastigheter(Hyra)" -> "Svea Fastigheter")
    const outsideParens = trimmed.replace(/\s*[([{\<].*?[)\]>]\s*/g, ' ').replace(/\s+/g, ' ').trim();
    if (outsideParens) {
        const strippedOutside = stripGenericModifiers(outsideParens);
        if (strippedOutside) addCandidate(strippedOutside);
        addCandidate(outsideParens);
    }

    // 2. Text inside parentheses/brackets (e.g. "Hyra (Svea Fastigheter)" -> "Svea Fastigheter")
    const insideMatches = Array.from(trimmed.matchAll(/[([{\<](.*?)[)\]>]/g));
    for (const match of insideMatches) {
        const insideText = (match[1] || '').trim();
        if (insideText) {
            const strippedInside = stripGenericModifiers(insideText);
            if (strippedInside) addCandidate(strippedInside);
            if (!GENERIC_NON_BRAND_WORDS.has(insideText)) {
                addCandidate(insideText);
            }
        }
    }

    // 3. Segments split by dash / slash / colon / pipe (e.g. "Hyra - Svea Fastigheter" or "Svea Fastigheter / Hyra")
    if (/\s[-–—/:|]\s|:\s/.test(outsideParens || trimmed)) {
        const parts = (outsideParens || trimmed).split(/\s*[-–—/:|]\s*/).filter(Boolean);
        for (const part of parts) {
            const strippedPart = stripGenericModifiers(part);
            if (strippedPart) addCandidate(strippedPart);
            if (!GENERIC_NON_BRAND_WORDS.has(part.trim())) {
                addCandidate(part.trim());
            }
        }
    }

    // 4. Whole input with parentheses turned into spaces and generic modifiers stripped
    const spacedInput = trimmed.replace(/[([{\<)\]>]/g, ' ').replace(/\s+/g, ' ').trim();
    const strippedWhole = stripGenericModifiers(spacedInput);
    if (strippedWhole) addCandidate(strippedWhole);
    addCandidate(spacedInput);
    addCandidate(trimmed);

    return candidates;
}

/**
 * Finds a matching domain from the known brands dictionary with Swedish-aware word boundaries,
 * compound-word (särskrivning/ihopskrivning) support, and parenthetical/modifier stripping.
 */
export function findKnownBrandDomain(name: string, category?: string): string | undefined {
    if (!name || name.trim().length < 2) return undefined;
    const lower = name.toLowerCase().trim();
    const catLower = (category || '').toLowerCase();

    // Disambiguate "Max" (HBO streaming vs Max Burgers vs ICA Maxi)
    if (
        lower.includes('hbo') ||
        (/\bmax\b/i.test(lower) && !lower.includes('maxi') && !lower.includes('byggmax') && !lower.includes('trademax') && (catLower.includes('stream') || catLower.includes('nöje') || catLower.includes('media') || catLower.includes('prenumeration') || lower.includes('stream')))
    ) {
        return 'max.com';
    }

    // Disambiguate "Match" (only match match.com if dating context or explicit match.com, not "fotbollsmatch" / "padelmatch")
    if (lower === 'match' && (catLower.includes('dejt') || catLower.includes('dating') || catLower.includes('abonnemang') || catLower.includes('prenumeration'))) {
        return 'match.com';
    }

    const candidates = extractBrandSearchCandidates(lower);

    // 1. Direct & Compact dictionary match across all extracted candidates first!
    // This guarantees that "Svea Fastigheter(Hyra)", "Sveafastigheter(Hyra)", "Hyra (Svea Fastigheter)",
    // "Stena Fastigheter(Hyra)", "Victoria Hem (Hyra)" etc. match their exact company before any short prefix key.
    for (const candidate of candidates) {
        if (KNOWN_BRANDS[candidate]) {
            return KNOWN_BRANDS[candidate];
        }
        const normCandidate = normalizeInputText(candidate);
        if (KNOWN_BRANDS[normCandidate]) {
            return KNOWN_BRANDS[normCandidate];
        }

        const compact = candidate
            .replace(/24\s*[-/]\s*7/g, '24seven')
            .replace(/24\s+7/g, '24seven')
            .replace(/[^a-z0-9åäö]/g, '');

        if (compact.length >= 2) {
            if (compact === 'maxiica') return 'ica.se';
            if (compact === 'fitness247') return 'fitness24seven.com';
            if (compact === 'friskisochsvettis') return 'friskissvettis.se';

            const compactHit = COMPACT_BRAND_MAP.get(compact);
            if (compactHit) return compactHit;

            const compactAscii = compact.replace(/[åä]/g, 'a').replace(/[ö]/g, 'o');
            if (compactAscii !== 'apple' || candidate.includes('apple')) {
                const asciiHit = COMPACT_BRAND_MAP.get(compactAscii);
                if (asciiHit) return asciiHit;
            }
        }
    }

    // 2. Word-boundary matching using length-descending keys (so "svea fastigheter" matches before "svea", "ica maxi" before "ica")
    const spacedLower = lower.replace(/([([{\<])/g, ' $1 ').replace(/([)\]>])/g, ' $1 ');
    const normalized = normalizeInputText(spacedLower);
    const primaryCleanCandidate = candidates[0] || spacedLower;

    for (const key of SORTED_BRAND_KEYS) {
        // Avoid matching bare "tanka" when user writes "tanka bilen" unless only "tanka"
        if (key === 'tanka' && lower.includes('tanka bil')) continue;
        // Avoid matching "apple" if user wrote "äpple" / "äpplen" (normalized to "apple")
        if (key === 'apple' && !lower.includes('apple')) continue;
        // Prevent bare "svea" (Svea Bank) from hijacking other "Svea <Company>" names (e.g. "Svea Fastigheter", "Svea Husbilar", "Svea Revision")
        if (key === 'svea') {
            const sveaAllowed = /^(svea|svea\s+(bank|ekonomi|finans|inkasso|kredit|lån|lan|privat|spar|sparande|delbetalning|faktura))$/i.test(primaryCleanCandidate);
            if (!sveaAllowed) continue;
        }

        const regex = BRAND_KEY_REGEXES.get(key);
        if (regex && (regex.test(spacedLower) || regex.test(normalized))) {
            return KNOWN_BRANDS[key];
        }
    }

    return undefined;
}

/**
 * Returns the primary high-resolution logo URL for a given domain.
 * Respects DOMAIN_LOGO_OVERRIDES and appends &fallback=404 to img.logo.dev so missing logos trigger onerror fallback.
 */
export function getDomainPrimaryLogoUrl(domain: string): string {
    const cleanDomain = domain.toLowerCase().trim().replace(/^(?:https?:\/\/)?(?:www\.)?/, '').split('/')[0];
    if (DOMAIN_LOGO_OVERRIDES[cleanDomain]) {
        return DOMAIN_LOGO_OVERRIDES[cleanDomain];
    }

    const apiKey = import.meta.env?.VITE_LOGODEV_API_KEY;
    if (apiKey) {
        return `https://img.logo.dev/${cleanDomain}?token=${apiKey}&fallback=404`;
    }

    return getDomainFallbackLogoUrl(cleanDomain);
}

/**
 * Returns the reliable Google 128px favicon URL for a domain (never rate-limits, works on 99.5% of Swedish domains).
 */
export function getDomainFallbackLogoUrl(domain: string): string {
    const cleanDomain = domain.toLowerCase().trim().replace(/^(?:https?:\/\/)?(?:www\.)?/, '').split('/')[0];
    if (DOMAIN_LOGO_OVERRIDES[cleanDomain]) {
        return DOMAIN_LOGO_OVERRIDES[cleanDomain];
    }
    return `https://www.google.com/s2/favicons?domain=https://www.${cleanDomain}&sz=128`;
}

/**
 * Sanitizes any saved or resolved logo URL so broken/deprecated Clearbit URLs, known bad img.logo.dev photos
 * (like folksam.se), or mismatched automatic brand URLs (like svea.com on "Svea Fastigheter(Hyra)") are upgraded.
 */
export function sanitizeLogoUrl(url?: string, name?: string, category?: string): string | undefined {
    if (!url || url === 'none') return undefined;
    if (url.startsWith('data:image')) return url;

    // Check if any override domain is inside the URL (e.g., img.logo.dev/folksam.se)
    for (const [overrideDomain, overrideUrl] of Object.entries(DOMAIN_LOGO_OVERRIDES)) {
        if (url.includes(overrideDomain)) {
            return overrideUrl;
        }
    }

    // If this is an automatic logo URL (logo.dev / google favicons / clearbit) and we have the item's name,
    // verify whether findKnownBrandDomain resolves to a more specific brand domain (e.g. sveafastigheter.se instead of svea.com)
    if (name && (url.includes('img.logo.dev/') || url.includes('google.com/s2/favicons') || url.includes('logo.clearbit.com/'))) {
        const knownDomain = findKnownBrandDomain(name, category);
        if (knownDomain && !url.includes(knownDomain)) {
            return getDomainPrimaryLogoUrl(knownDomain);
        }
    }

    // Replace dead logo.clearbit.com URLs
    if (url.includes('logo.clearbit.com/')) {
        const domain = url.split('logo.clearbit.com/')[1]?.split('?')[0]?.trim();
        if (domain) {
            return getDomainPrimaryLogoUrl(domain);
        }
    }

    // Ensure img.logo.dev URLs include fallback=404 so missing domains don't render generic letter boxes
    if (url.includes('img.logo.dev/') && !url.includes('fallback=404')) {
        return `${url}${url.includes('?') ? '&' : '?'}fallback=404`;
    }

    return url;
}

/**
 * Given a logo URL that failed to load in an <img> tag (e.g. 404 or 429 rate limit on img.logo.dev),
 * returns a backup URL from a different provider (Google 128px Favicon) so the logo still displays!
 */
export function getFallbackLogoUrl(failedUrl?: string, name?: string, category?: string): string | undefined {
    // 1. Try extracting domain from failed img.logo.dev or clearbit URL
    if (failedUrl) {
        const logoDevMatch = failedUrl.match(/img\.logo\.dev\/([^/?&#]+)/i);
        if (logoDevMatch?.[1]) {
            const domain = logoDevMatch[1].toLowerCase();
            return `https://www.google.com/s2/favicons?domain=https://www.${domain}&sz=128`;
        }
        // If https://www.${domain} on Google Favicons failed, try without www.
        const googleWwwMatch = failedUrl.match(/favicons\?domain=https:\/\/www\.([^&#]+)&/i);
        if (googleWwwMatch?.[1]) {
            const domain = googleWwwMatch[1].toLowerCase();
            return `https://www.google.com/s2/favicons?domain=https://${domain}&sz=128`;
        }
    }

    // 2. Otherwise check known brand domain for name/category
    if (name) {
        const knownDomain = findKnownBrandDomain(name, category);
        if (knownDomain) {
            const fallback = `https://www.google.com/s2/favicons?domain=https://www.${knownDomain}&sz=128`;
            if (fallback !== failedUrl) return fallback;
        }
    }

    return undefined;
}

/**
 * Builds ordered candidate logo URLs for a given domain.
 */
export function buildDomainLogoUrls(domain: string): string[] {
    const cleanDomain = domain.toLowerCase().trim().replace(/^(?:https?:\/\/)?(?:www\.)?/, '').split('/')[0];
    if (DOMAIN_LOGO_OVERRIDES[cleanDomain]) {
        return [DOMAIN_LOGO_OVERRIDES[cleanDomain]];
    }

    const urls: string[] = [];
    const apiKey = import.meta.env?.VITE_LOGODEV_API_KEY;

    if (apiKey) {
        urls.push(`https://img.logo.dev/${cleanDomain}?token=${apiKey}&fallback=404`);
    }

    urls.push(`https://www.google.com/s2/favicons?domain=https://www.${cleanDomain}&sz=128`);
    urls.push(`https://www.google.com/s2/favicons?domain=https://${cleanDomain}&sz=128`);

    return urls;
}

/**
 * Synchronous resolver for a logo URL given a name, merchant or category.
 */
export const getLogoUrl = (title: string, category?: string): string | undefined => {
    if (!title || title.trim().length < 2) return undefined;
    
    // If it's already a full URL or data URI, sanitize & return it directly
    if (title.startsWith('http') || title.startsWith('data:image')) {
        return sanitizeLogoUrl(title, undefined, category);
    }

    // Check known brand domains (including parenthetical/modifier-stripped candidates like "Svea Fastigheter(Hyra)")
    const knownDomain = findKnownBrandDomain(title, category);
    if (knownDomain) {
        return getDomainPrimaryLogoUrl(knownDomain);
    }

    const candidates = extractBrandSearchCandidates(title);
    for (const candidate of candidates) {
        // Check if candidate already looks like an explicit domain (e.g., "synsam.se (Glasögon)")
        if (/^[a-z0-9-]+\.(se|nu|com|org|net|io|app|ai|co)$/i.test(candidate)) {
            return getDomainPrimaryLogoUrl(candidate);
        }
    }

    return undefined;
};

// In-memory cache for async company lookups so repeated lookups are instant
const resolvedLogoCache = new Map<string, string | null>();

/**
 * Queries Clearbit's public Company Autocomplete API to resolve domains for companies
 * not in the static dictionary, prioritizing Swedish (.se / .nu) domains and exact brand matches.
 */
async function lookupCompanyDomainOnline(query: string): Promise<string | undefined> {
    const candidates = extractBrandSearchCandidates(query);
    const primaryCandidate = candidates[0] || query.toLowerCase().trim();

    const cleanQuery = primaryCandidate
        .toLowerCase()
        .replace(/\b(ab|hb|kb|aktiebolag|sverige|sweden)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();

    if (cleanQuery.length < 2 || GENERIC_NON_BRAND_WORDS.has(cleanQuery)) return undefined;

    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 1800);
        const res = await fetch(
            `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(cleanQuery)}`,
            { signal: controller.signal }
        );
        clearTimeout(timer);
        if (!res.ok) return undefined;

        const suggestions: Array<{ name?: string; domain?: string; logo?: string }> = await res.json();
        if (!Array.isArray(suggestions) || suggestions.length === 0) return undefined;

        const queryCompact = cleanQuery.replace(/[^a-z0-9åäö]/g, '');
        const queryAscii = queryCompact.replace(/[åä]/g, 'a').replace(/[ö]/g, 'o');

        // Filter to relevant matches whose name or domain matches the user's query
        const validMatches = suggestions.filter((item) => {
            if (!item.domain) return false;
            const domainBase = item.domain.toLowerCase().split('.')[0].replace(/[^a-z0-9]/g, '');
            const nameCompact = (item.name || '').toLowerCase().replace(/[^a-z0-9åäö]/g, '');
            const nameAscii = nameCompact.replace(/[åä]/g, 'a').replace(/[ö]/g, 'o');

            return (
                domainBase === queryAscii ||
                nameCompact === queryCompact ||
                nameAscii === queryAscii ||
                domainBase.startsWith(queryAscii) ||
                nameCompact.startsWith(queryCompact) ||
                (queryAscii.length >= 4 && (queryAscii.startsWith(domainBase) || domainBase.includes(queryAscii)))
            );
        });

        if (validMatches.length === 0) return undefined;

        // Prioritize Swedish (.se / .nu) domains first, then exact domain base match
        validMatches.sort((a, b) => {
            const aSe = a.domain?.endsWith('.se') || a.domain?.endsWith('.nu') ? 1 : 0;
            const bSe = b.domain?.endsWith('.se') || b.domain?.endsWith('.nu') ? 1 : 0;
            if (aSe !== bSe) return bSe - aSe;

            const aBase = a.domain?.split('.')[0] || '';
            const bBase = b.domain?.split('.')[0] || '';
            const aExact = aBase === queryAscii ? 1 : 0;
            const bExact = bBase === queryAscii ? 1 : 0;
            return bExact - aExact;
        });

        return validMatches[0]?.domain;
    } catch {
        return undefined;
    }
}

/**
 * Asynchronous logo search that tests candidate URLs to guarantee image validity,
 * with smart parenthetical/modifier extraction and live online company lookup fallback.
 */
export const fetchLogoForName = async (name: string, category?: string): Promise<string | undefined> => {
    if (!name || name.trim().length < 2) return undefined;
    
    // If it's already an explicit URL or data URI, sanitize & verify it
    if (name.startsWith('data:image')) {
        return name;
    }
    if (name.startsWith('http')) {
        const sanitized = sanitizeLogoUrl(name, undefined, category) || name;
        const ok = await checkImage(sanitized);
        if (ok) return sanitized;
        const fallback = getFallbackLogoUrl(sanitized, undefined, category);
        if (fallback && await checkImage(fallback)) return fallback;
        return undefined;
    }

    const cacheKey = `${name.toLowerCase().trim()}__${(category || '').toLowerCase().trim()}`;
    if (resolvedLogoCache.has(cacheKey)) {
        return resolvedLogoCache.get(cacheKey) || undefined;
    }

    // 1. Check known brands first (handles "Svea Fastigheter(Hyra)", "Folksam", "ICA Maxi", "Fitness 24-7", etc.)
    const knownDomain = findKnownBrandDomain(name, category);
    if (knownDomain) {
        const candidateUrls = buildDomainLogoUrls(knownDomain);
        for (const url of candidateUrls) {
            if (await checkImage(url)) {
                resolvedLogoCache.set(cacheKey, url);
                return url;
            }
        }
        // Even if checkImage timed out due to network, return the reliable fallback URL for known brands
        const fallbackUrl = getDomainFallbackLogoUrl(knownDomain);
        resolvedLogoCache.set(cacheKey, fallbackUrl);
        return fallbackUrl;
    }

    // 2. Extract cleaned company name candidates (stripping "(Hyra)", "- El", generic modifiers, etc.)
    const candidates = extractBrandSearchCandidates(name);
    const primaryCandidate = candidates[0] || name.toLowerCase().trim();

    const normalizedAscii = primaryCandidate
        .replace(/[åä]/g, 'a')
        .replace(/[ö]/g, 'o')
        .replace(/\b(ab|hb|kb|aktiebolag)\b/g, '')
        .trim();

    const cleanName = normalizedAscii.replace(/[^a-z0-9]/g, '');
    const firstWord = normalizedAscii.split(/\s+/)[0]?.replace(/[^a-z0-9]/g, '') || '';

    if (
        !cleanName ||
        GENERIC_NON_BRAND_WORDS.has(primaryCandidate) ||
        GENERIC_NON_BRAND_WORDS.has(normalizedAscii) ||
        GENERIC_NON_BRAND_WORDS.has(cleanName) ||
        (normalizedAscii.split(/\s+/).length === 1 && GENERIC_NON_BRAND_WORDS.has(firstWord))
    ) {
        resolvedLogoCache.set(cacheKey, null);
        return undefined;
    }

    // 3. Live online lookup via Clearbit Company Autocomplete API using the cleaned company candidate
    const onlineDomain = await lookupCompanyDomainOnline(primaryCandidate);
    if (onlineDomain) {
        const candidateUrls = buildDomainLogoUrls(onlineDomain);
        for (const url of candidateUrls) {
            if (await checkImage(url)) {
                resolvedLogoCache.set(cacheKey, url);
                return url;
            }
        }
    }

    // 4. Direct .se domain probe on img.logo.dev using cleaned candidate (with fallback=404 so only verified indexed .se companies return 200 OK)
    const apiKey = import.meta.env?.VITE_LOGODEV_API_KEY;
    if (apiKey && cleanName.length >= 3 && cleanName.length <= 28 && normalizedAscii.split(/\s+/).length <= 3) {
        const seDomainsToTry = [`${cleanName}.se`];
        const words = normalizedAscii.split(/\s+/).filter(Boolean);
        // If user wrote "<Company> Fastigheter" / "<Company> Bostäder" / "<Company> Bil", also try "<company>.se" if "<companyfastigheter>.se" 404s
        if (words.length === 2 && /^(fastigheter|fastighets|bostader|bostad|bil|energi|gruppen|holding|forvaltning)$/i.test(words[1])) {
            const firstClean = words[0].replace(/[^a-z0-9]/g, '');
            if (firstClean.length >= 4 && !GENERIC_NON_BRAND_WORDS.has(firstClean)) {
                seDomainsToTry.push(`${firstClean}.se`);
            }
        }

        for (const seDomain of seDomainsToTry) {
            const seLogoDevUrl = `https://img.logo.dev/${seDomain}?token=${apiKey}&fallback=404`;
            if (await checkImage(seLogoDevUrl, 1800)) {
                resolvedLogoCache.set(cacheKey, seLogoDevUrl);
                return seLogoDevUrl;
            }
        }
    }

    resolvedLogoCache.set(cacheKey, null);
    return undefined;
};
