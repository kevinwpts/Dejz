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
    title: 'Dejz – Enkel budget för hela månaden och mellan löner',
    description: 'Få full koll på din personliga ekonomi med Dejz. Samla inkomster, fasta utgifter, sparande och budget på ett ställe och se vad du har kvar att spendera mellan två löner.',
    ogTitle: 'Dejz – Hela din ekonomi. Svart på vitt.',
    ogDescription: 'Samla inkomster, fasta utgifter, sparande och budget på ett ställe och se vad som finns kvar att spendera mellan två löner.',
    keywords: 'budget, privatekonomi, sparande, fasta utgifter, inkomst, lönedag, budgetapp, sverige',
    htmlLang: 'sv',
  },
  da: {
    title: 'Dejz – Enkelt budget for hele måneden og mellem lønninger',
    description: 'Få fuld kontrol over din personlige økonomi med Dejz. Saml indtægter, faste udgifter, opsparing og budget ét sted og se hvad du har tilbage at bruge mellem to lønninger.',
    ogTitle: 'Dejz – Hele din økonomi. Sort på hvidt.',
    ogDescription: 'Saml indtægter, faste udgifter, opsparing og budget ét sted og se hvad du har tilbage at bruge mellem to lønninger.',
    keywords: 'budget, privatøkonomi, opsparing, faste udgifter, lønningsdag, budgetapp, danmark',
    htmlLang: 'da',
  },
  no: {
    title: 'Dejz – Enkelt budsjett for hele måneden og mellom lønninger',
    description: 'Få full kontroll over privatøkonomien med Dejz. Samle inntekter, faste utgifter, sparing og budsjett på ett sted og se hva du har igjen å bruke mellom to lønninger.',
    ogTitle: 'Dejz – Hele din økonomi. Svart på hvitt.',
    ogDescription: 'Samle inntekter, faste utgifter, sparing og budsjett på ett sted og se hva du har igjen å bruke mellom to lønninger.',
    keywords: 'budsjett, privatøkonomi, sparing, faste utgifter, inntekt, lønningsdag, budsjettapp, norge',
    htmlLang: 'nb',
  },
  fi: {
    title: 'Dejz – Yksinkertainen budjetti koko kuukaudelle ja palkkakaudelle',
    description: 'Ota taloutesi hallintaan Dejz-sovelluksella. Kokoa tulot, kiinteät kulut, säästöt ja budjetti yhteen paikkaan ja näe mitä sinulla on jäljellä käytettäväksi kahden palkan välillä.',
    ogTitle: 'Dejz – Koko taloutesi. Mustaa valkoisella.',
    ogDescription: 'Kokoa tulot, kiinteät kulut, säästöt ja budjetti yhteen paikkaan ja näe mitä sinulla on jäljellä käytettäväksi kahden palkan välillä.',
    keywords: 'budjetti, henkilökohtainen talous, säästäminen, kiinteät kulut, palkkapäivä, budjettisovellus, suomi',
    htmlLang: 'fi',
  },
  en: {
    title: 'Dejz – Simple budget for your pay period',
    description: 'Take full control of your personal finances with Dejz. Bring income, fixed expenses, savings, and budget together in one place and see what you have left to spend between two paydays.',
    ogTitle: 'Dejz – Your whole budget in black and white.',
    ogDescription: 'Bring income, fixed expenses, savings, and budget together in one place and see what is left to spend between two paydays.',
    keywords: 'budget, personal finance, savings, fixed expenses, income, payday, budget app',
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
