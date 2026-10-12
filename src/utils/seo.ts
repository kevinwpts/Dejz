import { Language } from '../i18n';
import { normalizeLanguage } from './nordic';

export interface SeoMetadata {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  keywords: string;
  htmlLang: string;
}

export const REGIONAL_SEO: Record<Language, SeoMetadata> = {
  sv: {
    title: 'Dejz – Enkel budget och dagsbudget för hela månaden',
    description: 'Få full koll på din personliga ekonomi med Dejz. Se exakt vad du har kvar att spendera varje dag efter räkningar och sparande.',
    ogTitle: 'Dejz – Hela din ekonomi. Svart på vitt.',
    ogDescription: 'Samla inkomster, utgifter, sparande och dagsbudget på ett ställe. Få pengarna att räcka hela vägen till nästa lön.',
    keywords: 'budget, dagsbudget, privatekonomi, sparande, utgifter, lönedag, budgetapp, sverige',
    htmlLang: 'sv',
  },
  da: {
    title: 'Dejz – Enkelt budget og dagsbudget for hele måneden',
    description: 'Få fuld kontrol over din personlige økonomi med Dejz. Se præcis, hvad du har tilbage at bruge hver dag efter faste udgifter og opsparing.',
    ogTitle: 'Dejz – Hele din økonomi. Sort på hvidt.',
    ogDescription: 'Saml indtægter, udgifter, opsparing og dagsbudget ét sted. Få pengene til at række hele vejen til næste løn.',
    keywords: 'budget, dagsbudget, privatøkonomi, opsparing, udgifter, lønningsdag, budgetapp, danmark',
    htmlLang: 'da',
  },
  no: {
    title: 'Dejz – Enkelt budsjett og dagsbudsjett for hele måneden',
    description: 'Få full kontroll over privatøkonomien med Dejz. Se nøyaktig hva du har igjen å bruke hver dag etter faste utgifter og sparing.',
    ogTitle: 'Dejz – Hele din økonomi. Svart på hvitt.',
    ogDescription: 'Samle inntekter, utgifter, sparing og dagsbudsjett på ett sted. Få pengene til å strekke til helt frem til neste lønning.',
    keywords: 'budsjett, dagsbudsjett, privatøkonomi, sparing, faste utgifter, lønningsdag, budsjettapp, norge',
    htmlLang: 'nb',
  },
  fi: {
    title: 'Dejz – Yksinkertainen budjetti ja päiväbudjetti koko kuukaudelle',
    description: 'Ota taloutesi hallintaan Dejz-sovelluksella. Katso tarkalleen, kuinka paljon sinulla on varaa käyttää joka päivä laskujen ja säästöjen jälkeen.',
    ogTitle: 'Dejz – Koko taloutesi. Mustaa valkoisella.',
    ogDescription: 'Kokoa tulot, menot, säästöt ja päiväbudjetti yhteen paikkaan. Saa rahasi riittämään seuraavaan palkkapäivään asti.',
    keywords: 'budjetti, päiväbudjetti, henkilökohtainen talous, säästäminen, menot, palkkapäivä, budjettisovellus, suomi',
    htmlLang: 'fi',
  },
  en: {
    title: 'Dejz – Simple daily budget and personal finance',
    description: 'Take full control of your personal finances with Dejz. See exactly what you have left to spend each day after bills and savings.',
    ogTitle: 'Dejz – Your whole budget in black and white.',
    ogDescription: 'Track income, fixed expenses, daily budget, and savings goals in one intuitive Nordic app.',
    keywords: 'budget, daily budget, personal finance, savings, expenses, payday, budget app',
    htmlLang: 'en',
  },
};

/**
 * Updates head metadata, open graph tags, canonical tag, and hreflang links dynamically.
 */
export function updateDocumentSeo(lang: Language, _currentPath: string = '/'): void {
  if (typeof document === 'undefined') return;

  const normLang = normalizeLanguage(lang);
  const metadata = REGIONAL_SEO[normLang] || REGIONAL_SEO.sv;

  // 1. Title & HTML Lang
  document.title = metadata.title;
  document.documentElement.lang = metadata.htmlLang;

  // Helper to update or create meta tags
  const setMeta = (attr: 'name' | 'property', key: string, content: string) => {
    let el = document.querySelector(`meta[${attr}="${key}"]`);
    if (!el) {
      el = document.createElement('meta');
      el.setAttribute(attr, key);
      document.head.appendChild(el);
    }
    el.setAttribute('content', content);
  };

  // 2. Standard Meta Tags
  setMeta('name', 'description', metadata.description);
  setMeta('name', 'keywords', metadata.keywords);

  // 3. OpenGraph Tags
  setMeta('property', 'og:title', metadata.ogTitle);
  setMeta('property', 'og:description', metadata.ogDescription);
  setMeta('property', 'og:locale', metadata.htmlLang === 'nb' ? 'nb_NO' : metadata.htmlLang === 'da' ? 'da_DK' : metadata.htmlLang === 'fi' ? 'fi_FI' : 'sv_SE');

  // 4. Twitter Tags
  setMeta('name', 'twitter:title', metadata.ogTitle);
  setMeta('name', 'twitter:description', metadata.ogDescription);

  // 5. Canonical URL (Self-referencing canonical for the current language version)
  const origin = window.location.origin || 'https://dejz.se';
  const canonicalUrl = `${origin}/${normLang}/`;

  let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
  if (!canonicalLink) {
    canonicalLink = document.createElement('link');
    canonicalLink.setAttribute('rel', 'canonical');
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute('href', canonicalUrl);
  setMeta('property', 'og:url', canonicalUrl);

  // 6. Alternate Hreflang Links
  const hreflangs: { lang: string; url: string }[] = [
    { lang: 'sv', url: `${origin}/sv/` },
    { lang: 'da', url: `${origin}/da/` },
    { lang: 'no', url: `${origin}/no/` },
    { lang: 'nb', url: `${origin}/no/` },
    { lang: 'fi', url: `${origin}/fi/` },
    { lang: 'x-default', url: `${origin}/sv/` },
  ];

  // Remove old hreflang tags to prevent duplicates
  document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove());

  hreflangs.forEach(({ lang: hLang, url }) => {
    const link = document.createElement('link');
    link.setAttribute('rel', 'alternate');
    link.setAttribute('hreflang', hLang);
    link.setAttribute('href', url);
    document.head.appendChild(link);
  });
}
