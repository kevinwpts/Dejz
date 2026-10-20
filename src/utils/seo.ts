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
    title: 'Dejz – Full koll på pengarna från lön till lön',
    description: 'Samla lön, fasta räkningar och sparande på ett ställe. Logga dina köp på sekunder och se exakt vad du har kvar att röra dig med fram till nästa lön.',
    ogTitle: 'Dejz – Full koll på pengarna från lön till lön',
    ogDescription: 'Samla lön, fasta räkningar och sparande på ett ställe. Logga dina köp på sekunder och se exakt vad du har kvar att röra dig med fram till nästa lön.',
    keywords: 'budgetapp, privatekonomi, lön till lön, fasta utgifter, sparande, utgiftskoll, budget, sverige, dejz',
    htmlLang: 'sv',
  },
  da: {
    title: 'Dejz – Fuld kontrol over pengene fra løn til løn',
    description: 'Saml løn, faste regninger og opsparing ét sted. Log dine køb på sekunder og se præcis, hvad du har tilbage at bruge frem til næste løn.',
    ogTitle: 'Dejz – Fuld kontrol over pengene fra løn til løn',
    ogDescription: 'Saml løn, faste regninger og opsparing ét sted. Log dine køb på sekunder og se præcis, hvad du har tilbage at bruge frem til næste løn.',
    keywords: 'budgetapp, privatøkonomi, løn til løn, faste udgifter, opsparing, budget, danmark, dejz',
    htmlLang: 'da',
  },
  no: {
    title: 'Dejz – Full kontroll på pengene fra lønn til lønn',
    description: 'Samle lønn, faste regninger og sparing på ett sted. Logg kjøpene dine på sekunder og se nøyaktig hva du har igjen å bruke frem til neste lønn.',
    ogTitle: 'Dejz – Full kontroll på pengene fra lønn til lønn',
    ogDescription: 'Samle lønn, faste regninger og sparing på ett sted. Logg kjøpene dine på sekunder og se nøyaktig hva du har igjen å bruke frem til neste lønn.',
    keywords: 'budsjettapp, privatøkonomi, lønn til lønn, faste utgifter, sparing, budsjett, norge, dejz',
    htmlLang: 'nb',
  },
  fi: {
    title: 'Dejz – Täysi hallinta rahoistasi palkasta palkkaan',
    description: 'Kokoa palkka, kiinteät laskut ja säästöt yhteen paikkaan. Kirjaa ostoksesi sekunneissa ja näe tarkalleen, mitä sinulla on käytettävissä seuraavaan palkkapäivään asti.',
    ogTitle: 'Dejz – Täysi hallinta rahoistasi palkasta palkkaan',
    ogDescription: 'Kokoa palkka, kiinteät laskut ja säästöt yhteen paikkaan. Kirjaa ostoksesi sekunneissa ja näe tarkalleen, mitä sinulla on käytettävissä seuraavaan palkkapäivään asti.',
    keywords: 'budjettisovellus, oma talous, palkasta palkkaan, kiinteät kulut, säästäminen, budjetti, suomi, dejz',
    htmlLang: 'fi',
  },
  en: {
    title: 'Dejz – Know what you have left from payday to payday',
    description: 'Bring your salary, fixed bills, and savings together in one place. Log purchases in seconds and see exactly what you have left to spend until next payday.',
    ogTitle: 'Dejz – Know what you have left from payday to payday',
    ogDescription: 'Bring your salary, fixed bills, and savings together in one place. Log purchases in seconds and see exactly what you have left to spend until next payday.',
    keywords: 'budget app, personal finance, payday to payday, fixed bills, savings, expense tracker, dejz',
    htmlLang: 'en',
  },
};

/**
 * Updates head metadata, open graph tags, canonical tag, and hreflang links dynamically.
 */
export function updateDocumentSeo(lang: Language, currentPath: string = '/'): void {
  if (typeof document === 'undefined') return;

  const normLang = normalizeLanguage(lang);
  const metadata = REGIONAL_SEO[normLang] || REGIONAL_SEO.sv;
  const lowerPath = (currentPath || '/').toLowerCase();

  const isPrivacyPage = lowerPath.includes('privacy') || lowerPath.includes('integritet');
  const isTermsPage = lowerPath.includes('terms') || lowerPath.includes('villkor');
  const isCookiesPage = lowerPath.includes('cookie');

  let pageTitle = metadata.title;
  if (isPrivacyPage) {
    pageTitle = normLang === 'en' ? 'Privacy Policy – Dejz' : 'Integritetspolicy – Dejz';
  } else if (isTermsPage) {
    pageTitle = normLang === 'en' ? 'Terms of Use – Dejz' : 'Användarvillkor – Dejz';
  } else if (isCookiesPage) {
    pageTitle = normLang === 'en' ? 'Cookie Policy – Dejz' : 'Cookiepolicy – Dejz';
  }

  // 1. Title & HTML Lang
  document.title = pageTitle;
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
  const origin = window.location.origin || 'https://dejz.se';
  const ogImageUrl = `${origin}/dejz_02.png`;
  const ogLocale =
    metadata.htmlLang === 'nb'
      ? 'nb_NO'
      : metadata.htmlLang === 'da'
      ? 'da_DK'
      : metadata.htmlLang === 'fi'
      ? 'fi_FI'
      : metadata.htmlLang === 'en'
      ? 'en_US'
      : 'sv_SE';

  setMeta('property', 'og:title', pageTitle);
  setMeta('property', 'og:description', metadata.ogDescription);
  setMeta('property', 'og:locale', ogLocale);
  setMeta('property', 'og:image', ogImageUrl);

  // 4. Twitter Tags
  setMeta('name', 'twitter:title', pageTitle);
  setMeta('name', 'twitter:description', metadata.ogDescription);
  setMeta('name', 'twitter:image', ogImageUrl);

  // 5. Canonical URL
  let canonicalUrl = `${origin}/${normLang}/`;
  if (isPrivacyPage) {
    canonicalUrl = `${origin}/privacy`;
  } else if (isTermsPage) {
    canonicalUrl = `${origin}/terms`;
  } else if (isCookiesPage) {
    canonicalUrl = `${origin}/cookies`;
  }

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
    { lang: 'en', url: `${origin}/en/` },
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
