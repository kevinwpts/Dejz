import { supabase } from '../supabaseClient';

export interface CancellationInfo {
  serviceName: string;
  cancelUrl?: string;
  directActionType: 'link' | 'phone' | 'email' | 'app';
  phoneNumber?: string | null;
  supportEmail?: string | null;
  supportUrl?: string | null;
  steps: string[];
  noticePeriod?: string;
  tips?: string | null;
  isAiGenerated?: boolean;
}

// Curated 0ms offline database for top Swedish and international subscription services
const KNOWN_SERVICES: Record<string, CancellationInfo> = {
  // Streaming & Media
  spotify: {
    serviceName: 'Spotify',
    cancelUrl: 'https://www.spotify.com/account/change-plan/',
    directActionType: 'link',
    supportUrl: 'https://support.spotify.com/article/how-to-cancel-premium/',
    steps: [
      'Logga in på spotify.com/account i din webbläsare (kan ej göras i appen)',
      'Under "Ditt abonnemang", klicka på "Ändra abonnemang"',
      'Scrolla ner till "Säg upp Spotify" och klicka "Säg upp Premium"',
      'Följ stegen tills du ser bekräftelsen',
    ],
    noticePeriod: 'Abonnemanget löper till nästa förnyelsedatum utan återbetalning.',
    tips: 'Om du betalar via Apple (App Store) eller mobiloperatör måste uppsägningen göras där.',
  },
  netflix: {
    serviceName: 'Netflix',
    cancelUrl: 'https://www.netflix.com/youraccount',
    directActionType: 'link',
    supportUrl: 'https://help.netflix.com/node/407',
    steps: [
      'Gå till netflix.com/youraccount och logga in',
      'Klicka på knappen "Avsluta medlemskap" under Medlemskap och fakturering',
      'Klicka "Slutför uppsägning" för att bekräfta',
    ],
    noticePeriod: 'Du kan fortsätta titta tills innevarande faktureringsperiod är slut.',
    tips: 'Ditt konto och dina profiler sparas i 10 månader om du vill starta om senare.',
  },
  disney: {
    serviceName: 'Disney+',
    cancelUrl: 'https://www.disneyplus.com/account/subscription',
    directActionType: 'link',
    supportUrl: 'https://help.disneyplus.com/article/disneyplus-cancel',
    steps: [
      'Logga in på disneyplus.com i webbläsaren',
      'Välj din profil och klicka på "Konto"',
      'Klicka på ditt abonnemang och välj "Säg upp abonnemang"',
      'Ange anledning och bekräfta',
    ],
    noticePeriod: 'Avslutas vid nästa faktureringsperiod.',
  },
  viaplay: {
    serviceName: 'Viaplay',
    cancelUrl: 'https://account.viaplay.se/package',
    directActionType: 'link',
    supportUrl: 'https://help.viaplay.com/sv/',
    steps: [
      'Logga in på viaplay.se',
      'Klicka på ditt namn uppe till höger och välj "Mitt konto"',
      'Klicka på "Hantera paket" och välj "Säg upp abonnemang"',
      'Följ stegen och bekräfta uppsägningen',
    ],
    noticePeriod: 'Avslutas i slutet av din nuvarande betalningsperiod.',
  },
  hbo: {
    serviceName: 'Max (HBO Max)',
    cancelUrl: 'https://auth.max.com/subscription',
    directActionType: 'link',
    steps: [
      'Logga in på max.com',
      'Klicka på din profilikon och välj "Abonnemang"',
      'Välj "Säg upp abonnemang" och bekräfta',
    ],
    noticePeriod: 'Du behåller åtkomsten till slutet av betalperioden.',
  },
  storytel: {
    serviceName: 'Storytel',
    cancelUrl: 'https://www.storytel.com/se/sv/my-page/manage-subscription',
    directActionType: 'link',
    steps: [
      'Logga in på storytel.com i en webbläsare',
      'Gå till "Mina sidor" -> "Abonnemang"',
      'Klicka på "Avsluta abonnemang" och bekräfta',
    ],
    noticePeriod: 'Aktivt till nästa förnyelsedatum.',
  },
  bookbeat: {
    serviceName: 'BookBeat',
    cancelUrl: 'https://www.bookbeat.se/mina-sidor/avsluta-konto',
    directActionType: 'link',
    steps: [
      'Logga in på bookbeat.se',
      'Gå till "Mina sidor" och välj "Abonnemang"',
      'Klicka på "Avsluta abonnemang"',
    ],
    noticePeriod: 'Ingen bindningstid.',
  },
  youtube: {
    serviceName: 'YouTube Premium',
    cancelUrl: 'https://www.youtube.com/paid_memberships',
    directActionType: 'link',
    steps: [
      'Gå till youtube.com/paid_memberships',
      'Klicka på "Hantera medlemskap"',
      'Klicka på "Inaktivera" / "Avsluta"',
    ],
    noticePeriod: 'Löper perioden ut.',
  },
  apple: {
    serviceName: 'Apple Subscriptions (iCloud / Apple Music / Apple TV+)',
    cancelUrl: 'https://support.apple.com/HT202039',
    directActionType: 'link',
    steps: [
      'Öppna appen Inställningar på din iPhone/iPad',
      'Tryck på ditt namn/Apple ID högst upp',
      'Tryck på "Prenumerationer"',
      'Välj prenumerationen du vill avsluta och tryck "Avbryt prenumeration"',
    ],
    noticePeriod: 'Avslutas vid periodens slut.',
    tips: 'På Mac: Öppna App Store -> Klicka på ditt namn -> Kontoinställningar -> Prenumerationer.',
  },
  google: {
    serviceName: 'Google One / Google Play Prenumerationer',
    cancelUrl: 'https://play.google.com/store/account/subscriptions',
    directActionType: 'link',
    steps: [
      'Gå till play.google.com/store/account/subscriptions',
      'Hitta abonnemanget du vill säga upp',
      'Klicka på "Hantera" och välj "Säg upp prenumeration"',
    ],
  },
  chatgpt: {
    serviceName: 'ChatGPT Plus (OpenAI)',
    cancelUrl: 'https://chatgpt.com/#settings/Subscription',
    directActionType: 'link',
    steps: [
      'Öppna chatgpt.com och logga in',
      'Klicka på din profil i nedre vänstra hörnet och välj "Settings"',
      'Välj "Subscription" och klicka "Manage my subscription"',
      'Klicka "Cancel plan" i betalningsportalen',
    ],
    noticePeriod: 'Gäller månaden ut.',
  },
  adobe: {
    serviceName: 'Adobe Creative Cloud',
    cancelUrl: 'https://account.adobe.com/plans',
    directActionType: 'link',
    steps: [
      'Logga in på account.adobe.com/plans',
      'Klicka på "Hantera abonnemang" för ditt program',
      'Klicka på "Avbryt abonnemang"',
    ],
    tips: 'Obs! Adobe kan ta ut en avgift om du har ett årsavtal som betalas månadsvis och säger upp i förtid.',
  },
  microsoft: {
    serviceName: 'Microsoft 365 / Xbox Game Pass',
    cancelUrl: 'https://account.microsoft.com/services',
    directActionType: 'link',
    steps: [
      'Gå till account.microsoft.com/services och logga in',
      'Leta upp prenumerationen och välj "Hantera"',
      'Klicka på "Avbryt prenumeration"',
    ],
  },

  // Träning & Gym
  sats: {
    serviceName: 'SATS',
    cancelUrl: 'https://www.sats.se/mina-sidor',
    directActionType: 'link',
    phoneNumber: '010-110 50 00',
    steps: [
      'Logga in på sats.se eller i SATS-appen',
      'Gå till "Mina sidor" -> "Medlemskap"',
      'Klicka på "Säg upp medlemskap" eller kontakta receptionen/kundservice',
    ],
    noticePeriod: 'Normalt 1-2 månaders uppsägningstid utöver eventuell bindningstid.',
    tips: 'Kontrollera om du har kvarvarande bindningstid på ditt avtal.',
  },
  nordic: {
    serviceName: 'Nordic Wellness',
    cancelUrl: 'https://nordicwellness.se/mina-sidor/',
    directActionType: 'link',
    phoneNumber: '010-155 52 00',
    steps: [
      'Logga in på Mina Sidor på nordicwellness.se',
      'Gå till ditt aktiva medlemskap',
      'Välj uppsägning eller skicka formulär via kundservice/klubb',
    ],
    noticePeriod: 'Normalt 1 månads uppsägningstid efter att bindningstiden löpt ut.',
  },
  fitness24seven: {
    serviceName: 'Fitness24Seven',
    cancelUrl: 'https://fitness24seven.com/se/mina-sidor',
    directActionType: 'link',
    steps: [
      'Logga in på Mina Sidor på fitness24seven.com',
      'Gå till Mitt Medlemskap och registrera uppsägning',
      'Eller besök en bemannad reception med giltig legitimation',
    ],
    noticePeriod: '2 hela kalendermånader från månadsskiftet efter begäran.',
  },

  // Telekom & Bredband
  tele2: {
    serviceName: 'Tele2',
    cancelUrl: 'https://www.tele2.se/kundservice',
    directActionType: 'phone',
    phoneNumber: '90 222',
    steps: [
      'Tele2 kräver oftast uppsägning via telefon eller chatt',
      'Ring kundservice på 90 222 (vardagar 08-19, lördagar 09-15)',
      'Ha BankID och ditt personnummer redo',
    ],
    noticePeriod: '1 månads uppsägningstid på abonnemang utan bindningstid.',
  },
  telia: {
    serviceName: 'Telia',
    cancelUrl: 'https://www.telia.se/mitt-telia',
    directActionType: 'phone',
    phoneNumber: '90 200',
    steps: [
      'Ring Telias kundtjänst på 90 200 eller logga in på Mitt Telia',
      'Identifiera dig med Mobilt BankID',
      'Begär uppsägning av önskat mobil- eller bredbandsabonnemang',
    ],
    noticePeriod: '1 månads uppsägningstid enligt lag.',
  },
  telenor: {
    serviceName: 'Telenor',
    cancelUrl: 'https://www.telenor.se/mitt-telenor',
    directActionType: 'phone',
    phoneNumber: '020-222 222',
    steps: [
      'Ring Telenors kundservice på 020-222 222',
      'Bekräfta din identitet med BankID',
      'Säg upp abonnemanget',
    ],
    noticePeriod: '1 månads uppsägningstid.',
  },
  tre: {
    serviceName: 'Tre (3)',
    cancelUrl: 'https://www.tre.se/mitt-tre',
    directActionType: 'phone',
    phoneNumber: '0735-300 400',
    steps: [
      'Ring kundservice på 0735-300 400',
      'Identifiera dig med BankID och meddela vilket nummer/abonnemang du vill avsluta',
    ],
    noticePeriod: '1 månads uppsägningstid.',
  },
  vimla: {
    serviceName: 'Vimla',
    cancelUrl: 'https://mitt.vimla.se',
    directActionType: 'link',
    steps: [
      'Logga in på Mitt Vimla (mitt.vimla.se)',
      'Gå till "Inställningar" och scrolla ner',
      'Klicka på "Avsluta abonnemang"',
    ],
    noticePeriod: 'Ingen bindningstid, avslutas vid nästa månadsskifte.',
  },
  hallon: {
    serviceName: 'Hallon',
    cancelUrl: 'https://mina-sidor.hallon.se',
    directActionType: 'link',
    steps: [
      'Logga in på Mina sidor på hallon.se',
      'Klicka på "Abonnemang" och välj "Avsluta abonnemang"',
    ],
    noticePeriod: 'Ingen bindningstid eller uppsägningstid.',
  },
  bahnhof: {
    serviceName: 'Bahnhof',
    cancelUrl: 'https://mina-sidor.bahnhof.se',
    directActionType: 'link',
    phoneNumber: '010-510 00 00',
    steps: [
      'Logga in på Mina Sidor på bahnhof.se med BankID',
      'Gå till Kundservice -> Skapa ärende -> Uppsägning',
      'Eller ring kundservice på 010-510 00 00',
    ],
    noticePeriod: '1 månads uppsägningstid.',
  },

  // Försäkringar
  trygghansa: {
    serviceName: 'Trygg-Hansa',
    cancelUrl: 'https://www.trygghansa.se/mina-sidor',
    directActionType: 'phone',
    phoneNumber: '0771-111 110',
    steps: [
      'Logga in på Mina Sidor på trygghansa.se för att se ditt avtalsdatum',
      'Ring kundservice på 0771-111 110 för att säga upp',
    ],
    noticePeriod: 'Försäkringar löper normalt på 1 år och kan sägas upp till huvudförfallodagen (eller direkt vid såld bil/flytt).',
  },
  lansforsakringar: {
    serviceName: 'Länsförsäkringar',
    cancelUrl: 'https://www.lansforsakringar.se',
    directActionType: 'phone',
    phoneNumber: '0771-666 115',
    steps: [
      'Kontakta ditt lokala Länsförsäkringar-bolag eller logga in på Mina Sidor med BankID',
    ],
  },
  folksam: {
    serviceName: 'Folksam',
    cancelUrl: 'https://www.folksam.se/mina-sidor',
    directActionType: 'phone',
    phoneNumber: '0771-950 950',
    steps: [
      'Logga in på Mina Sidor på folksam.se med BankID',
      'Skicka ett säkert meddelande om uppsägning eller ring 0771-950 950',
    ],
  },

  // Nyheter & Tidningar
  aftonbladet: {
    serviceName: 'Aftonbladet Plus',
    cancelUrl: 'https://konto.aftonbladet.se/mina-sidor',
    directActionType: 'link',
    steps: [
      'Logga in på Aftonbladet och gå till "Mina sidor"',
      'Klicka på "Abonnemang och betalning"',
      'Klicka på "Säg upp prenumeration"',
    ],
    noticePeriod: 'Avslutas vid innevarande periodens slut.',
  },
  expressen: {
    serviceName: 'Expressen Premium',
    cancelUrl: 'https://kundservice.expressen.se',
    directActionType: 'link',
    steps: [
      'Logga in på Expressen Kundservice',
      'Gå till "Mina prenumerationer" och välj "Avsluta"',
    ],
  },
  readly: {
    serviceName: 'Readly',
    cancelUrl: 'https://se.readly.com/accounts/subscription',
    directActionType: 'link',
    steps: [
      'Logga in på readly.com i webbläsaren',
      'Gå till "Mitt konto" -> "Abonnemang"',
      'Klicka på "Avsluta abonnemang"',
    ],
  },
};

/**
 * Finds cancellation instructions and direct links for a given service.
 * 1. Checks curated high-confidence local database (0ms instant).
 * 2. If not found, calls Supabase Edge Function 'find-cancellation-url' with Gemini.
 * 3. Falls back to smart heuristic Google search link.
 */
export async function findCancellationDetails(
  name: string,
  category?: string,
  language: string = 'sv'
): Promise<CancellationInfo> {
  const cleanName = (name || '').trim();
  const lowerName = cleanName.toLowerCase().replace(/[^a-z0-9]/g, '');

  // 1. Check local instant database
  for (const [key, info] of Object.entries(KNOWN_SERVICES)) {
    if (lowerName.includes(key) || key.includes(lowerName)) {
      return info;
    }
  }

  // 2. Try Supabase Edge Function (AI via Gemini)
  try {
    const { data, error } = await supabase.functions.invoke('find-cancellation-url', {
      body: { name: cleanName, category, language },
    });

    if (!error && data && data.cancelUrl) {
      return {
        serviceName: data.serviceName || cleanName,
        cancelUrl: data.cancelUrl,
        directActionType: data.directActionType || 'link',
        phoneNumber: data.phoneNumber || null,
        supportEmail: data.supportEmail || null,
        supportUrl: data.supportUrl || null,
        steps: data.steps || [
          `Logga in på ${data.serviceName || cleanName}s officiella webbplats`,
          'Gå till Kontoinställningar / Mina Sidor och leta efter Abonnemang eller Fakturering',
          'Välj Säg upp eller Avsluta prenumeration och bekräfta',
        ],
        noticePeriod: data.noticePeriod || 'Kontrollera avtalets bindningstid och uppsägningstid.',
        tips: data.tips || null,
        isAiGenerated: true,
      };
    }
  } catch (err) {
    console.warn('[CancellationHelper] Edge function lookup failed, falling back to smart heuristic:', err);
  }

  // 3. Fallback Heuristic: Generate smart direct search URL & standard steps
  const encodedQuery = encodeURIComponent(`säga upp avsluta abonnemang ${cleanName}`);
  const fallbackUrl = `https://www.google.com/search?q=${encodedQuery}`;

  return {
    serviceName: cleanName,
    cancelUrl: fallbackUrl,
    directActionType: 'link',
    steps: [
      `Gå till ${cleanName}s webbplats eller app och logga in på Mina sidor`,
      'Navigera till Abonnemang, Inställningar eller Medlemskap',
      'Klicka på Avsluta eller Säg upp abonnemang',
      'Kontakta annars deras kundservice för skriftlig eller muntlig uppsägning',
    ],
    noticePeriod: 'Standard uppsägningstid för konsumenttjänster är ofta 1 månad om inget annat avtalats.',
    tips: 'Spara alltid en skriftlig bekräftelse på uppsägningen som kvitto.',
    isAiGenerated: true,
  };
}
