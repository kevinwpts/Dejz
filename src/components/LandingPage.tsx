import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronDown, 
  Shield, 
  Lock, 
  Sparkles, 
  Check, 
  Receipt, 
  Instagram, 
  Star 
} from 'lucide-react';
import { Language, TranslationKey } from '../i18n';
import { PolicyModal } from './PolicyModal';
import { DejzLogo } from './DejzLogo';
import { Button, Card } from './ui';
import { LanguagePicker } from './LanguagePicker';

interface LandingPageProps {
  onGetStarted: () => void;
  onLogin?: () => void;
  onStartDemo?: () => void;
  onGoogleLogin?: () => void;
  onFacebookLogin?: () => void;
  onLegalClick?: (type: 'privacy' | 'terms' | 'cookies') => void;
  t?: (key: TranslationKey, params?: Record<string, string | number>) => string;
  currentLanguage: Language;
  onLanguageChange: (lang: Language) => void;
}

const LANDING_TEXTS = {
  sv: {
    navHow: 'Så fungerar det',
    navFeatures: 'Funktioner',
    login: 'Logga in',
    getStarted: 'Kom igång gratis',
    demoDirect: 'Testa demo direkt',
    continueWithGoogle: 'Fortsätt med Google',
    heroTitleLine1: 'Hela din ekonomi.',
    heroTitleLine2: 'Svart på vitt.',
    heroSubtitle: 'Samla inkomster, fasta utgifter, sparande och budget på ett ställe. Se exakt vad du har kvar att spendera mellan två löner.',
    trust1Title: 'Ingen bankkoppling',
    trust1Desc: 'Full kontroll över din data.',
    trust2Title: 'Säker och privat',
    trust2Desc: 'Din information är din.',
    trust3Title: 'Byggd för enkelhet',
    trust3Desc: 'Fokus på det som hjälper.',
    howTitle: 'Så fungerar Dejz',
    howSubtitle: 'Tre enkla steg till bättre koll på pengarna.',
    step1Num: '1',
    step1Title: 'Periodkalkyl',
    step1Desc: 'Fyll i din inkomst, fasta kostnader och sparande. Dejz räknar ut vad du faktiskt har kvar.',
    step1IncomeLabel: 'Inkomst',
    step1IncomeVal: '25 000 kr',
    step1FixedLabel: 'Fasta kostnader',
    step1FixedVal: '−12 000 kr',
    step1SavingsLabel: 'Sparande',
    step1SavingsVal: '−3 000 kr',
    step1LeftLabel: 'Kvar att spendera',
    step1LeftVal: '10 000 kr',
    step2Num: '2',
    step2Title: 'Registrera utgifter',
    step2Desc: 'Lägg snabbt till dina köp och välj kategori.',
    step2SampleName: 'Lunch',
    step2SampleVal: '−120 kr',
    step2Receipt: 'Bifoga kvitto',
    step3Num: '3',
    step3Title: 'Se vad du kan spendera',
    step3Desc: 'När du registrerar nya utgifter uppdaterar Dejz automatiskt hur mycket du har kvar.',
    step3LeftVal: '10 000 kr',
    step3Realtime: 'Uppdateras i realtid',
    featuresHeading: 'Din ekonomi, på dina villkor.',
    featuresSubheading: 'Dejz hjälper dig att få full kontroll över vardagsekonomin. Ingen bankkoppling och inga onödigt komplicerade verktyg – bara en tydlig överblick över dina pengar.',
    check1: 'Manuell inmatning – du bestämmer',
    check2: 'Smarta analyser',
    check3: 'Koll från lön till lön',
    check4: 'Säker och privat',
    check5: 'Kvitton och historik',
    check6: 'Ingen data säljs',
    allInOneHeadingLine1: 'Allt du behöver',
    allInOneHeadingLine2: '– samlat på ett ställe.',
    allInOneSub: 'Se dina utgifter, budget, historik och analyser på ett och samma ställe.',
    screenHome: 'Hem',
    screenHomeDesc: 'Se vad du kan spendera.',
    screenHistory: 'Historik',
    screenHistoryDesc: 'Alla dina transaktioner samlade.',
    screenAnalysis: 'Analys',
    screenAnalysisDesc: 'Förstå vart pengarna går.',
    screenEconomy: 'Ekonomi',
    screenEconomyDesc: 'Hantera inkomster och fasta utgifter.',
    reviewsBadge: '4.9 av 5 i betyg bland 20+ tidiga användare',
    reviewsHeading: 'Vad säger de som provat?',
    reviewsSubheading: 'Dejz har testats noggrant för att säkerställa att upplevelsen sitter perfekt från dag ett.',
    review1Text: '"Slutligen en app som inte kräver krångliga bankkopplingar. Har äntligen full koll på pengarna mellan lönerna!"',
    review1Author: 'Marcus Lindström',
    review1City: 'Betatestare (Stockholm)',
    review2Text: '"Periodkalkylen är guld värd. Man ser direkt vad som faktiskt finns kvar att spendera efter alla fasta utgifter."',
    review2Author: 'Sofia Karlsson',
    review2City: 'Betatestare (Göteborg)',
    review3Text: '"Superenkel, snabb och stilren design. Precis det ekonomiverktyg jag har letat efter i flera år."',
    review3Author: 'Alexander Ek',
    review3City: 'Betatestare (Malmö)',
    faqTitle: 'Vanliga frågor',
    faq1Q: 'Är Dejz gratis att använda?',
    faq1A: 'Ja, du kan komma igång och använda grundläggande funktioner helt gratis.',
    faq2Q: 'Hur fungerar Dejz utan bankkoppling?',
    faq2A: 'Du lägger enkelt till dina transaktioner manuellt, via snabbval eller genom att fota kvitton. Det ger dig fullständig kontroll och ökad medvetenhet om varje köp utan att dela dina bankinloggningsuppgifter.',
    faq3Q: 'Kan jag testa Dejz innan jag skapar konto?',
    faq3A: 'Absolut! Du kan klicka på "Testa demo direkt" för att utforska appen med färdig demo-data direkt i webbläsaren.',
    faq4Q: 'Hur fungerar perioderna mellan två löner?',
    faq4A: 'Du ställer in din egen lönedag (t.ex. den 25:e i månaden). Dejz räknar sedan automatiskt ut din budgetperiod och vad du har kvar att spendera fram till nästa lön.',
    finalCtaTitle: 'Redo att få koll på ekonomin?',
    finalCtaSub: 'Kom igång med Dejz på några minuter.',
    footerPrivacy: 'Integritetspolicy',
    footerTerms: 'Användarvillkor',
    footerContact: 'Kontakt',
  },
  da: {
    navHow: 'Sådan fungerer det',
    navFeatures: 'Funktioner',
    login: 'Log ind',
    getStarted: 'Kom i gang gratis',
    demoDirect: 'Prøv demo direkte',
    continueWithGoogle: 'Fortsæt med Google',
    heroTitleLine1: 'Hele din økonomi.',
    heroTitleLine2: 'Sort på hvidt.',
    heroSubtitle: 'Saml indtægter, faste udgifter, opsparing og budget ét sted. Se præcis hvad du har tilbage at bruge mellem to lønninger.',
    trust1Title: 'Ingen bankforbindelse',
    trust1Desc: 'Fuld kontrol over dine data.',
    trust2Title: 'Sikker og privat',
    trust2Desc: 'Dine oplysninger forbliver dine.',
    trust3Title: 'Bygget til enkelhed',
    trust3Desc: 'Fokus på det, der virker.',
    howTitle: 'Sådan fungerer Dejz',
    howSubtitle: 'Tre enkle trin til bedre styr på økonomien.',
    step1Num: '1',
    step1Title: 'Periodeberegning',
    step1Desc: 'Indtast din indkomst, faste omkostninger og opsparing. Dejz regner ud, hvad du reelt har tilbage.',
    step1IncomeLabel: 'Indkomst',
    step1IncomeVal: '25.000 kr.',
    step1FixedLabel: 'Faste udgifter',
    step1FixedVal: '−12.000 kr.',
    step1SavingsLabel: 'Opsparing',
    step1SavingsVal: '−3.000 kr.',
    step1LeftLabel: 'Tilbage at bruge',
    step1LeftVal: '10.000 kr.',
    step2Num: '2',
    step2Title: 'Registrer udgifter',
    step2Desc: 'Tilføj hurtigt dine køb og vælg en kategori.',
    step2SampleName: 'Frokost',
    step2SampleVal: '−120 kr.',
    step2Receipt: 'Vedhæft kvittering',
    step3Num: '3',
    step3Title: 'Se hvad du kan bruge',
    step3Desc: 'Når du registrerer nye udgifter, opdaterer Dejz automatisk dit rådighedsbeløb.',
    step3LeftVal: '10.000 kr.',
    step3Realtime: 'Opdateres i realtid',
    featuresHeading: 'Din økonomi, på dine præmisser.',
    featuresSubheading: 'Dejz hjælper dig med at få fuld kontrol over hverdagsøkonomien. Ingen bankforbindelse og ingen overkomplicerede grafer – bare et klart overblik.',
    check1: 'Manuel indtastning – du bestemmer',
    check2: 'Smarte analyser',
    check3: 'Overblik fra løn til løn',
    check4: 'Sikker og privat',
    check5: 'Kvitteringer og historik',
    check6: 'Ingen data sælges',
    allInOneHeadingLine1: 'Alt du behøver',
    allInOneHeadingLine2: '– samlet ét sted.',
    allInOneSub: 'Se dine udgifter, budget, historik og analyser samlet på en enkel skærm.',
    screenHome: 'Hjem',
    screenHomeDesc: 'Se hvad du kan bruge i dag.',
    screenHistory: 'Historik',
    screenHistoryDesc: 'Alle dine transaktioner samlet.',
    screenAnalysis: 'Analyse',
    screenAnalysisDesc: 'Forstå hvor pengene forsvinder hen.',
    screenEconomy: 'Økonomi',
    screenEconomyDesc: 'Håndter faste indtægter og udgifter.',
    reviewsBadge: '4.9 ud af 5 i bedømmelse blandt tidlige brugere',
    reviewsHeading: 'Hvad siger brugerne?',
    reviewsSubheading: 'Dejz er grundigt testet, så appen fungerer gnidningsfrit fra første dag.',
    review1Text: '"Endelig en app, der ikke kræver besværlig bankintegration. Har endelig fuldt overblik over pengene mellem lønninger!"',
    review1Author: 'Mads Lind',
    review1City: 'Bruger (København)',
    review2Text: '"Periodeberegningen er guld værd. Man ser straks, hvad der reelt er tilbage at bruge efter faste udgifter."',
    review2Author: 'Sofie Holm',
    review2City: 'Bruger (Aarhus)',
    review3Text: '"Super enkelt, hurtigt og stilrent design. Præcis det budgetværktøj jeg har ledt efter."',
    review3Author: 'Alexander M.',
    review3City: 'Bruger (Odense)',
    faqTitle: 'Ofte stillede spørgsmål',
    faq1Q: 'Er Dejz gratis at bruge?',
    faq1A: 'Ja, du kan oprette en profil og bruge de centrale budgetfunktioner helt gratis.',
    faq2Q: 'Hvordan fungerer Dejz uden bankforbindelse?',
    faq2A: 'Du indtaster blot dine køb manuelt eller fotograferer kvitteringer. Det giver dig fuld kontrol og større bevidsthed om dine penge uden at dele bankkoder.',
    faq3Q: 'Kan jeg prøve Dejz før jeg opretter en konto?',
    faq3A: 'Ja! Klik på "Prøv demo direkte" for at udforske hele appen med demodata direkte i browseren.',
    faq4Q: 'Hvordan fungerer perioden mellem to lønninger?',
    faq4A: 'Du angiver din egen lønningsdag. Dejz beregner automatisk din budgetperiode og hvad du har tilbage at bruge frem til næste løn.',
    finalCtaTitle: 'Klar til at få styr på økonomien?',
    finalCtaSub: 'Kom i gang med Dejz på få minutter.',
    footerPrivacy: 'Privatlivspolitik',
    footerTerms: 'Betingelser',
    footerContact: 'Kontakt',
  },
  no: {
    navHow: 'Slik fungerer det',
    navFeatures: 'Funksjoner',
    login: 'Logg inn',
    getStarted: 'Kom i gang gratis',
    demoDirect: 'Prøv demo direkte',
    continueWithGoogle: 'Fortsett med Google',
    heroTitleLine1: 'Hele din økonomi.',
    heroTitleLine2: 'Svart på hvitt.',
    heroSubtitle: 'Samle inntekter, faste utgifter, sparing og budsjett på ett sted. Se nøyaktig hva du har igjen å bruke mellom to lønninger.',
    trust1Title: 'Ingen banktilkobling',
    trust1Desc: 'Full kontroll over egne data.',
    trust2Title: 'Trygt og privat',
    trust2Desc: 'Informasjonen din forblir din.',
    trust3Title: 'Bygget for enkelhet',
    trust3Desc: 'Fokus på det som hjelper deg.',
    howTitle: 'Slik fungerer Dejz',
    howSubtitle: 'Tre enkle steg til full kontroll på pengene.',
    step1Num: '1',
    step1Title: 'Periodeberegning',
    step1Desc: 'Legg inn inntekt, faste utgifter og sparing. Dejz regner ut hva du faktisk har igjen.',
    step1IncomeLabel: 'Inntekt',
    step1IncomeVal: '25 000 kr',
    step1FixedLabel: 'Faste utgifter',
    step1FixedVal: '−12 000 kr',
    step1SavingsLabel: 'Sparing',
    step1SavingsVal: '−3 000 kr',
    step1LeftLabel: 'Igjen å bruke',
    step1LeftVal: '10 000 kr',
    step2Num: '2',
    step2Title: 'Registrer utgifter',
    step2Desc: 'Legg raskt inn kjøpene dine og velg kategori.',
    step2SampleName: 'Lunsj',
    step2SampleVal: '−120 kr',
    step2Receipt: 'Legg ved kvittering',
    step3Num: '3',
    step3Title: 'Se hva du kan bruke',
    step3Desc: 'Når du registrerer nye utgifter, oppdaterer Dejz automatisk hva du har igjen å bruke.',
    step3LeftVal: '10 000 kr',
    step3Realtime: 'Oppdateres i sanntid',
    featuresHeading: 'Din økonomi, på dine premisser.',
    featuresSubheading: 'Dejz hjelper deg med å få full kontroll over hverdagsøkonomien. Ingen bankkobling og ingen unødvendig kompliserte menyer – bare en krystallklar oversikt.',
    check1: 'Manuell registrering – du bestemmer',
    check2: 'Smarte analyser',
    check3: 'Oversikt fra lønn til lønn',
    check4: 'Trygt og privat',
    check5: 'Kvitteringer og historikk',
    check6: 'Ingen data selges',
    allInOneHeadingLine1: 'Alt du trenger',
    allInOneHeadingLine2: '– samlet på ett sted.',
    allInOneSub: 'Se dine utgifter, budsjett, historikk og analyser på en oversiktlig skjerm.',
    screenHome: 'Hjem',
    screenHomeDesc: 'Se hva du kan bruke i dag.',
    screenHistory: 'Historikk',
    screenHistoryDesc: 'Alle transaksjonene dine samlet.',
    screenAnalysis: 'Analyse',
    screenAnalysisDesc: 'Forstå hvor pengene tar veien.',
    screenEconomy: 'Økonomi',
    screenEconomyDesc: 'Administrer inntekter og faste utgifter.',
    reviewsBadge: '4.9 av 5 i vurdering blant tidlige brukere',
    reviewsHeading: 'Hva sier brukerne?',
    reviewsSubheading: 'Dejz er testet og finpusset for at opplevelsen skal sitte fra første dag.',
    review1Text: '"Endelig en app som ikke krever bankinnlogging. Har endelig full oversikt over pengene mellom lønningene!"',
    review1Author: 'Marius Lind',
    review1City: 'Bruker (Oslo)',
    review2Text: '"Periodeberegningen er genial. Man ser med en gang hva man faktisk har igjen å bruke etter faste regninger."',
    review2Author: 'Silje Karlsen',
    review2City: 'Bruker (Bergen)',
    review3Text: '"Superenkel, rask og minimalistisk design. Akkurat det økonomiverktøyet jeg har lett etter."',
    review3Author: 'Alexander E.',
    review3City: 'Bruker (Trondheim)',
    faqTitle: 'Vanlige spørsmål',
    faq1Q: 'Er Dejz gratis å bruke?',
    faq1A: 'Ja, du kan opprette bruker og bruke kjernefunksjonene helt gratis.',
    faq2Q: 'Hvordan fungerer Dejz uten banktilkobling?',
    faq2A: 'Du legger enkelt til kjøpene dine manuelt eller ved å ta bilde av kvitteringer. Det gir deg full kontroll og økt bevissthet rundt forbruket ditt.',
    faq3Q: 'Kan jeg teste Dejz før jeg oppretter konto?',
    faq3A: 'Ja! Klikk på "Prøv demo direkte" for å utforske appen med ferdige demodata direkte i nettleseren.',
    faq4Q: 'Hvordan fungerer perioden mellom to lønninger?',
    faq4A: 'Du stiller inn din egen lønningsdag. Dejz regner automatisk ut budsjettperioden din og hva du har igjen å bruke frem til neste lønning.',
    finalCtaTitle: 'Klar for å få kontroll på økonomien?',
    finalCtaSub: 'Kom i gang med Dejz på få minutter.',
    footerPrivacy: 'Personvern',
    footerTerms: 'Brukervilkår',
    footerContact: 'Kontakt',
  },
  fi: {
    navHow: 'Miten se toimii',
    navFeatures: 'Ominaisuudet',
    login: 'Kirjaudu sisään',
    getStarted: 'Aloita ilmaiseksi',
    demoDirect: 'Kokeile demoa heti',
    continueWithGoogle: 'Jatka Googlella',
    heroTitleLine1: 'Koko taloutesi.',
    heroTitleLine2: 'Mustaa valkoisella.',
    heroSubtitle: 'Kokoa tulot, kiinteät kulut, säästöt ja budjetti yhteen paikkaan. Näe tarkalleen, mitä sinulla on jäljellä käytettäväksi kahden palkan välillä.',
    trust1Title: 'Ei pankkiyhteyttä',
    trust1Desc: 'Täysi hallinta omiin tietoihisi.',
    trust2Title: 'Turvallinen ja yksityinen',
    trust2Desc: 'Tietosi pysyvät vain sinulla.',
    trust3Title: 'Rakennettu yksinkertaiseksi',
    trust3Desc: 'Keskity siihen mikä oikeasti auttaa.',
    howTitle: 'Miten Dejz toimii',
    howSubtitle: 'Kolme helppoa askelta parempaan taloudenhallintaan.',
    step1Num: '1',
    step1Title: 'Kausilaskelma',
    step1Desc: 'Syötä tulosi, kiinteät kulusi ja säästösi. Dejz laskee mitä sinulle todellisuudessa jää käteen.',
    step1IncomeLabel: 'Tulot',
    step1IncomeVal: '2 500 €',
    step1FixedLabel: 'Kiinteät kulut',
    step1FixedVal: '−1 200 €',
    step1SavingsLabel: 'Säästöt',
    step1SavingsVal: '−300 €',
    step1LeftLabel: 'Käytettävissä',
    step1LeftVal: '1 000 €',
    step2Num: '2',
    step2Title: 'Kirjaa kulut',
    step2Desc: 'Lisää ostoksesi vaivattomasti ja valitse kategoria.',
    step2SampleName: 'Lounas',
    step2SampleVal: '−12 €',
    step2Receipt: 'Liitä kuitti',
    step3Num: '3',
    step3Title: 'Näe mitä voit käyttää',
    step3Desc: 'Kun kirjaat uusia kuluja, Dejz päivittää automaattisesti mitä sinulla on jäljellä käytettäväksi.',
    step3LeftVal: '1 000 €',
    step3Realtime: 'Päivittyy reaaliajassa',
    featuresHeading: 'Taloutesi, sinun ehdoillasi.',
    featuresSubheading: 'Dejz auttaa sinua saamaan täyden hallinnan arjen taloudesta. Ei monimutkaisia pankkiliitoksia – vain selkeä ja rauhallinen yleisnäkymä rahoistasi.',
    check1: 'Manuaalinen kirjaus – sinä päätät',
    check2: 'Älykkäät analyysit',
    check3: 'Hallinta palkasta palkkaan',
    check4: 'Turvallinen ja yksityinen',
    check5: 'Kuitit ja historia',
    check6: 'Tietoja ei myydä koskaan',
    allInOneHeadingLine1: 'Kaikki mitä tarvitset',
    allInOneHeadingLine2: '– yhdessä paikassa.',
    allInOneSub: 'Näe kulusi, budjettisi, historiasi ja analyysisi yhdellä selkeällä ruudulla.',
    screenHome: 'Koti',
    screenHomeDesc: 'Katso paljonko voit käyttää tänään.',
    screenHistory: 'Historia',
    screenHistoryDesc: 'Kaikki tapahtumasi koottuna.',
    screenAnalysis: 'Analyysi',
    screenAnalysisDesc: 'Ymmärrä minne rahasi kuluvat.',
    screenEconomy: 'Talous',
    screenEconomyDesc: 'Hallinnoi tuloja ja kiinteitä kuluja.',
    reviewsBadge: '4.9 / 5 tähtiluokitus varhaisilta käyttäjiltä',
    reviewsHeading: 'Mitä testaajat sanovat?',
    reviewsSubheading: 'Dejz on testattu huolellisesti, jotta käyttökokemus tuntuu vaivattomalta ensimmäisestä päivästä alkaen.',
    review1Text: '"Vihdoinkin sovellus, joka ei vaadi pankkitunnuksia. Nyt tiedän tarkalleen missä mennään palkkapäivien välillä!"',
    review1Author: 'Markus L.',
    review1City: 'Käyttäjä (Helsinki)',
    review2Text: '"Kausilaskuri on uskomattoman hyödyllinen. Näkee heti mitä jää vapaasti käytettäväksi kiinteiden kulujen jälkeen."',
    review2Author: 'Sofia K.',
    review2City: 'Käyttäjä (Tampere)',
    review3Text: '"Superhelppo, nopea ja kaunis ulkoasu. Juuri se budjettityökalu jota olen etsinyt vuosia."',
    review3Author: 'Aleksi E.',
    review3City: 'Käyttäjä (Turku)',
    faqTitle: 'Usein kysytyt kysymykset',
    faq1Q: 'Onko Dejz ilmainen?',
    faq1A: 'Kyllä, voit luoda profiilin ja käyttää sovelluksen ydinominaisuuksia täysin ilmaiseksi.',
    faq2Q: 'Miten Dejz toimii ilman pankkiyhteyttä?',
    faq2A: 'Lisäät kulusi kätevästi käsin tai kuvaamalla kuitin. Tämä antaa sinulle täyden hallinnan ja vahvistaa tietoisuutta rahan käytöstä.',
    faq3Q: 'Voinko kokeilla sovellusta ennen tilin luomista?',
    faq3A: 'Kyllä! Napsauta "Kokeile demoa heti" testataksesi sovellusta valmiilla esimerkkidatalla suoraan selaimessa.',
    faq4Q: 'Miten palkkakaudet toimivat?',
    faq4A: 'Asetat oman palkkapäiväsi. Dejz laskee automaattisesti budjettikautesi ja mitä sinulla on käytettävissä seuraavaan palkkapäivään asti.',
    finalCtaTitle: 'Valmis ottamaan taloutesi haltuun?',
    finalCtaSub: 'Aloita Dejzin käyttö parissa minuutissa.',
    footerPrivacy: 'Tietosuojaseloste',
    footerTerms: 'Käyttöehdot',
    footerContact: 'Yhteystiedot',
  },
  en: {
    navHow: 'How it works',
    navFeatures: 'Features',
    login: 'Log in',
    getStarted: 'Get started free',
    demoDirect: 'Try demo directly',
    continueWithGoogle: 'Continue with Google',
    heroTitleLine1: 'Your whole budget.',
    heroTitleLine2: 'In black and white.',
    heroSubtitle: 'Bring income, fixed expenses, savings, and budget together in one place. See exactly what you have left to spend between two paydays.',
    trust1Title: 'No bank connection',
    trust1Desc: 'Total control over your data.',
    trust2Title: 'Secure and private',
    trust2Desc: 'Your financial data stays yours.',
    trust3Title: 'Built for simplicity',
    trust3Desc: 'Focused on what actually helps.',
    howTitle: 'How Dejz works',
    howSubtitle: 'Three simple steps to better control of your money.',
    step1Num: '1',
    step1Title: 'Period calculation',
    step1Desc: 'Enter your income, fixed costs, and savings. Dejz calculates what you genuinely have available.',
    step1IncomeLabel: 'Income',
    step1IncomeVal: '25 000 kr',
    step1FixedLabel: 'Fixed expenses',
    step1FixedVal: '−12 000 kr',
    step1SavingsLabel: 'Savings',
    step1SavingsVal: '−3 000 kr',
    step1LeftLabel: 'Available to spend',
    step1LeftVal: '10 000 kr',
    step2Num: '2',
    step2Title: 'Log expenses',
    step2Desc: 'Quickly enter purchases and assign categories.',
    step2SampleName: 'Lunch',
    step2SampleVal: '−120 kr',
    step2Receipt: 'Attach receipt',
    step3Num: '3',
    step3Title: 'See what you can spend',
    step3Desc: 'When you record new expenses, Dejz automatically recalculates your remaining balance.',
    step3LeftVal: '10 000 kr',
    step3Realtime: 'Updates in real time',
    featuresHeading: 'Your finances, on your terms.',
    featuresSubheading: 'Dejz helps you gain complete clarity over daily spending. No forced bank linking, no complicated tables – just an honest overview.',
    check1: 'Manual tracking – you are in charge',
    check2: 'Smart spending insights',
    check3: 'Payday to payday peace of mind',
    check4: 'Safe and private',
    check5: 'Receipts and history',
    check6: 'We never sell your data',
    allInOneHeadingLine1: 'Everything you need',
    allInOneHeadingLine2: '– all in one place.',
    allInOneSub: 'View expenses, budget, history, and analyses cleanly unified.',
    screenHome: 'Home',
    screenHomeDesc: 'See what you can spend today.',
    screenHistory: 'Log',
    screenHistoryDesc: 'All transactions gathered.',
    screenAnalysis: 'Analysis',
    screenAnalysisDesc: 'Understand where money flows.',
    screenEconomy: 'Finances',
    screenEconomyDesc: 'Manage income and fixed costs.',
    reviewsBadge: '4.9 out of 5 rated by early users',
    reviewsHeading: 'What do users say?',
    reviewsSubheading: 'Dejz has been crafted and tested to make everyday budgeting genuinely effortless.',
    review1Text: '"Finally an app that does not require linking bank accounts. I finally have full visibility into my budget!"',
    review1Author: 'Marcus L.',
    review1City: 'Beta tester (Stockholm)',
    review2Text: '"The pay period calculator is incredible. You immediately see what remains after fixed bills are covered."',
    review2Author: 'Sofia K.',
    review2City: 'Beta tester (Gothenburg)',
    review3Text: '"Super clean, responsive, and minimalist design. Exactly the finance tool I was wishing for."',
    review3Author: 'Alexander E.',
    review3City: 'Beta tester (Malmö)',
    faqTitle: 'Frequently asked questions',
    faq1Q: 'Is Dejz free to use?',
    faq1A: 'Yes, you can register and use the core budget features completely free.',
    faq2Q: 'How does Dejz work without linking a bank account?',
    faq2A: 'You quickly log purchases manually or snap receipt photos. This fosters awareness and keeps your credentials entirely safe.',
    faq3Q: 'Can I try Dejz before creating an account?',
    faq3A: 'Absolutely! Click "Try demo directly" to explore the application pre-populated with realistic demo data.',
    faq4Q: 'How do pay periods work?',
    faq4A: 'Set your regular payday. Dejz calculates your period boundaries and what you have left to spend until your next payday.',
    finalCtaTitle: 'Ready to take control of your finances?',
    finalCtaSub: 'Get started with Dejz in just a few minutes.',
    footerPrivacy: 'Privacy Policy',
    footerTerms: 'Terms of Service',
    footerContact: 'Contact',
  },
};

const PlaceholderBox = ({ 
  id, 
  className = 'aspect-[16/10]',
  labelClass = 'text-xs sm:text-sm'
}: { 
  id: string; 
  className?: string;
  labelClass?: string;
}) => {
  return (
    <div className={`w-full relative rounded-[var(--radius-card-nested,12px)] overflow-hidden shadow-2xs border border-[var(--border-subtle)] bg-[var(--surface-color)] flex items-center justify-center ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-black/[0.01] to-black/[0.04] dark:from-white/[0.01] dark:to-white/[0.03]" />
      <span className={`relative font-semibold text-[var(--text-tertiary)] uppercase tracking-wider text-center px-4 ${labelClass}`}>
        {id}
      </span>
    </div>
  );
};

const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-[var(--border-subtle)]">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-5 text-left flex items-center justify-between gap-4 group cursor-pointer focus:outline-none"
        aria-expanded={isOpen}
      >
        <span className="text-base sm:text-lg font-semibold text-[var(--text-primary)] group-hover:text-[var(--text-primary)] transition-colors">
          {question}
        </span>
        <ChevronDown 
          size={18} 
          className={`text-[var(--text-secondary)] shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <div className="pb-6 pr-6">
              <p className="text-[var(--text-secondary)] leading-relaxed font-normal text-sm sm:text-base">
                {answer}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export function LandingPage({ 
  onGetStarted, 
  onLogin, 
  onStartDemo, 
  onGoogleLogin, 
  onLegalClick: _onLegalClick,
  currentLanguage,
  onLanguageChange,
}: LandingPageProps) {
  const [activePolicy, setActivePolicy] = React.useState<'privacy' | 'terms' | null>(null);

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const normalizedLang = (currentLanguage === 'da' || currentLanguage === 'no' || currentLanguage === 'fi' || currentLanguage === 'en')
    ? currentLanguage
    : 'sv';
  const c = LANDING_TEXTS[normalizedLang] || LANDING_TEXTS.sv;

  return (
    <div className="min-h-dvh font-sans text-[var(--text-primary)] bg-[var(--bg-color)] relative selection:bg-[var(--accent-color)] selection:text-[var(--text-on-accent)]">
      {/* Policy Modal */}
      <PolicyModal 
        isOpen={activePolicy !== null}
        type={activePolicy || 'privacy'}
        onClose={() => setActivePolicy(null)}
      />

      {/* HEADER */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-[var(--bg-color)]/95 border-b border-[var(--border-subtle)] transition-all pt-[env(safe-area-inset-top)]">
        <div className="max-w-[1240px] mx-auto px-3 sm:px-8 h-16 sm:h-20 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-6 lg:gap-10 shrink-0">
            <div
              className="flex items-center select-none cursor-pointer shrink-0"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <DejzLogo className="text-xl sm:text-2xl font-black tracking-tight text-[var(--text-primary)] shrink-0" />
            </div>

            <nav className="hidden md:flex items-center gap-6">
              <a 
                href="#how-it-works" 
                className="text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap"
              >
                {c.navHow}
              </a>
              <a 
                href="#features" 
                className="text-sm font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors whitespace-nowrap"
              >
                {c.navFeatures}
              </a>
            </nav>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5 md:gap-3 shrink-0">
            <LanguagePicker
              currentLanguage={currentLanguage}
              onLanguageChange={onLanguageChange}
              variant="header"
            />

            {onLogin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onLogin}
                className="text-[var(--text-primary)] whitespace-nowrap text-xs sm:text-sm font-semibold h-8 sm:h-9 px-2.5 sm:px-3.5 shrink-0"
              >
                {c.login}
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={onGetStarted}
              className="hidden sm:inline-flex whitespace-nowrap text-xs sm:text-sm font-semibold h-8 sm:h-9 px-3.5 sm:px-4 shrink-0"
            >
              {c.getStarted}
            </Button>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative w-full bg-[var(--bg-color)] pt-6 pb-16 sm:py-20">
        <div className="max-w-[1240px] mx-auto px-6 sm:px-8">
          
          {/* ==================== DESKTOP LAYOUT (lg:block) ==================== */}
          <div className="hidden lg:grid lg:grid-cols-12 gap-14 items-center">
            {/* LEFT COLUMN: Text, CTAs, Trust */}
            <div className="lg:col-span-6 space-y-8">
              <div className="space-y-4">
                <h1 className="text-5xl lg:text-6xl font-semibold font-display tracking-tight text-[var(--text-primary)] leading-[1.2]">
                  {c.heroTitleLine1}<br />
                  {c.heroTitleLine2}
                </h1>
                <p className="text-lg text-[var(--text-secondary)] font-normal leading-relaxed max-w-xl">
                  {c.heroSubtitle}
                </p>
              </div>

              {/* CTA buttons */}
              <div className="space-y-3">
                <div className="flex items-stretch gap-3">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={onGetStarted}
                    className="flex-1 shadow-subtle shadow-[var(--accent-color)]/20"
                  >
                    {c.getStarted}
                  </Button>
                  {onStartDemo && (
                    <Button
                      variant="secondary"
                      size="lg"
                      onClick={onStartDemo}
                    >
                      {c.demoDirect}
                    </Button>
                  )}
                </div>

                {onGoogleLogin && (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={onGoogleLogin}
                    fullWidth
                    className="gap-3 font-semibold"
                  >
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    {c.continueWithGoogle}
                  </Button>
                )}
              </div>

              {/* Trust points */}
              <div className="grid grid-cols-3 gap-3 pt-4">
                <div className="space-y-1">
                  <div className="w-7 h-7 rounded-[var(--radius-icon-button,8px)] bg-[var(--surface-color)] flex items-center justify-center text-[var(--text-primary)] mb-1">
                    <Shield size={14} strokeWidth={2} />
                  </div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)] leading-tight">{c.trust1Title}</h4>
                  <p className="text-[11px] text-[var(--text-tertiary)] leading-snug">{c.trust1Desc}</p>
                </div>
                <div className="space-y-1">
                  <div className="w-7 h-7 rounded-[var(--radius-icon-button,8px)] bg-[var(--surface-color)] flex items-center justify-center text-[var(--text-primary)] mb-1">
                    <Lock size={14} strokeWidth={2} />
                  </div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)] leading-tight">{c.trust2Title}</h4>
                  <p className="text-[11px] text-[var(--text-tertiary)] leading-snug">{c.trust2Desc}</p>
                </div>
                <div className="space-y-1">
                  <div className="w-7 h-7 rounded-[var(--radius-icon-button,8px)] bg-[var(--surface-color)] flex items-center justify-center text-[var(--text-primary)] mb-1">
                    <Sparkles size={14} strokeWidth={2} />
                  </div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)] leading-tight">{c.trust3Title}</h4>
                  <p className="text-[11px] text-[var(--text-tertiary)] leading-snug">{c.trust3Desc}</p>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Image */}
            <div className="lg:col-span-6 flex justify-center">
              <div className="w-full relative rounded-[var(--radius-card,16px)] overflow-hidden shadow-subtle border border-[var(--border-subtle)] bg-[var(--surface-color)]">
                <img 
                  src="/hero.png" 
                  alt="Dejz App" 
                  className="w-full h-auto object-cover object-center block"
                />
              </div>
            </div>
          </div>

          {/* ==================== MOBILE LAYOUT (block lg:hidden) ==================== */}
          <div className="block lg:hidden space-y-6">
            <div className="space-y-4">
              <h1 className="text-3xl sm:text-4xl font-semibold font-display tracking-tight text-[var(--text-primary)] leading-[1.25]">
                {c.heroTitleLine1}<br />
                {c.heroTitleLine2}
              </h1>
              <p className="text-base text-[var(--text-secondary)] font-normal leading-relaxed">
                {c.heroSubtitle}
              </p>
            </div>

            {/* CTA buttons */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch gap-3">
                <Button
                  variant="primary"
                  size="lg"
                  onClick={onGetStarted}
                  fullWidth
                  className="shadow-subtle shadow-[var(--accent-color)]/20"
                >
                  {c.getStarted}
                </Button>
                {onStartDemo && (
                  <Button
                    variant="secondary"
                    size="lg"
                    onClick={onStartDemo}
                    fullWidth
                  >
                    {c.demoDirect}
                  </Button>
                )}
              </div>

              {onGoogleLogin && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={onGoogleLogin}
                  fullWidth
                  className="gap-3 font-semibold"
                >
                  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  {c.continueWithGoogle}
                </Button>
              )}
            </div>

            {/* Mobile Image */}
            <div className="w-full relative rounded-[var(--radius-card,16px)] overflow-hidden shadow-subtle border border-[var(--border-subtle)] bg-[var(--surface-color)] my-4">
              <img 
                src="/hero.png" 
                alt="Dejz App" 
                className="w-full h-auto object-cover object-center block"
              />
            </div>

            {/* Mobile Trust Points */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
              <div className="flex items-center sm:flex-col sm:items-start gap-3 sm:gap-1 bg-[var(--surface-color)] sm:bg-transparent p-3 sm:p-0 rounded-[var(--radius-card-nested,10px)] border sm:border-0 border-[var(--border-subtle)]">
                <div className="w-7 h-7 rounded-[var(--radius-icon-button,8px)] bg-[var(--bg-color)] sm:bg-[var(--surface-color)] border sm:border-0 border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)] shrink-0">
                  <Shield size={14} strokeWidth={2} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)] leading-tight">{c.trust1Title}</h4>
                  <p className="text-[11px] text-[var(--text-tertiary)] leading-snug">{c.trust1Desc}</p>
                </div>
              </div>

              <div className="flex items-center sm:flex-col sm:items-start gap-3 sm:gap-1 bg-[var(--surface-color)] sm:bg-transparent p-3 sm:p-0 rounded-[var(--radius-card-nested,10px)] border sm:border-0 border-[var(--border-subtle)]">
                <div className="w-7 h-7 rounded-[var(--radius-icon-button,8px)] bg-[var(--bg-color)] sm:bg-[var(--surface-color)] border sm:border-0 border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)] shrink-0">
                  <Lock size={14} strokeWidth={2} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)] leading-tight">{c.trust2Title}</h4>
                  <p className="text-[11px] text-[var(--text-tertiary)] leading-snug">{c.trust2Desc}</p>
                </div>
              </div>

              <div className="flex items-center sm:flex-col sm:items-start gap-3 sm:gap-1 bg-[var(--surface-color)] sm:bg-transparent p-3 sm:p-0 rounded-[var(--radius-card-nested,10px)] border sm:border-0 border-[var(--border-subtle)]">
                <div className="w-7 h-7 rounded-[var(--radius-icon-button,8px)] bg-[var(--bg-color)] sm:bg-[var(--surface-color)] border sm:border-0 border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-primary)] shrink-0">
                  <Sparkles size={14} strokeWidth={2} />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)] leading-tight">{c.trust3Title}</h4>
                  <p className="text-[11px] text-[var(--text-tertiary)] leading-snug">{c.trust3Desc}</p>
                </div>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 3. SÅ FUNGERAR DEJZ */}
      <section id="how-it-works" className="py-24 bg-[var(--surface-color)] border-y border-[var(--border-subtle)]">
        <div className="max-w-[1240px] mx-auto px-6 sm:px-8 space-y-14">
          <div className="max-w-2xl space-y-3">
            <h2 className="text-2xl sm:text-3xl font-semibold font-display tracking-tight text-[var(--text-primary)] leading-snug">
              {c.howTitle}
            </h2>
            <p className="text-base sm:text-lg text-[var(--text-secondary)]">
              {c.howSubtitle}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {/* Block 1 */}
            <Card variant="default" padding="lg" className="space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-9 h-9 rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] font-bold text-sm flex items-center justify-center">
                  {c.step1Num}
                </div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">{c.step1Title}</h3>
                <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                  {c.step1Desc}
                </p>
              </div>

              <div className="bg-[var(--surface-color)] rounded-[var(--radius-card-nested,10px)] p-4 border border-[var(--border-subtle)] space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>{c.step1IncomeLabel}</span>
                  <span className="font-semibold text-[var(--text-primary)]">{c.step1IncomeVal}</span>
                </div>
                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>{c.step1FixedLabel}</span>
                  <span className="font-semibold text-[var(--text-primary)]">{c.step1FixedVal}</span>
                </div>
                <div className="flex justify-between text-[var(--text-secondary)]">
                  <span>{c.step1SavingsLabel}</span>
                  <span className="font-semibold text-[var(--text-primary)]">{c.step1SavingsVal}</span>
                </div>
                <div className="border-t border-[var(--border-subtle)] pt-2 flex justify-between font-bold text-[var(--text-primary)] text-sm">
                  <span>{c.step1LeftLabel}</span>
                  <span className="text-emerald-600">{c.step1LeftVal}</span>
                </div>
              </div>
            </Card>

            {/* Block 2 */}
            <Card variant="default" padding="lg" className="space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-9 h-9 rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] font-bold text-sm flex items-center justify-center">
                  {c.step2Num}
                </div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">{c.step2Title}</h3>
                <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                  {c.step2Desc}
                </p>
              </div>

              <div className="bg-[var(--surface-color)] rounded-[var(--radius-card-nested,10px)] p-4 border border-[var(--border-subtle)] space-y-3">
                <div className="flex items-center justify-between bg-[var(--bg-color)] p-3 rounded-[var(--radius-card-nested,10px)] border border-[var(--border-subtle)] shadow-xs">
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{c.step2SampleName}</span>
                  <span className="text-sm font-bold text-rose-600">{c.step2SampleVal}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--text-tertiary)] px-1">
                  <Receipt size={14} className="text-[var(--text-tertiary)]" />
                  <span>{c.step2Receipt}</span>
                </div>
              </div>
            </Card>

            {/* Block 3 */}
            <Card variant="default" padding="lg" className="space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="w-9 h-9 rounded-full bg-[var(--text-primary)] text-[var(--bg-color)] font-bold text-sm flex items-center justify-center">
                  {c.step3Num}
                </div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">{c.step3Title}</h3>
                <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
                  {c.step3Desc}
                </p>
              </div>

              <div className="bg-[var(--surface-color)] rounded-[var(--radius-card-nested,10px)] p-4 border border-[var(--border-subtle)] space-y-1.5 text-center">
                <span className="text-xs text-[var(--text-tertiary)] font-medium uppercase tracking-wider">{c.step1LeftLabel}</span>
                <div className="text-2xl font-black text-emerald-600 tracking-tight">
                  {c.step3LeftVal}
                </div>
                <div className="text-[11px] text-[var(--text-tertiary)]">{c.step3Realtime}</div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* 4. STOR PRODUKTSEKTION ("Din ekonomi, på dina villkor") */}
      <section id="features" className="py-24 bg-[var(--bg-color)]">
        <div className="max-w-[1240px] mx-auto px-6 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
            {/* Left Image */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-[340px] sm:max-w-[380px] relative rounded-[var(--radius-card,16px)] overflow-hidden shadow-subtle border border-[var(--border-subtle)] bg-[var(--surface-color)]">
                <img 
                  src="/IMG_3049.PNG" 
                  alt="Dejz App Screenshot" 
                  className="w-full h-auto object-cover object-center block"
                />
              </div>
            </div>

            {/* Right Text */}
            <div className="lg:col-span-7 space-y-8">
              <div className="space-y-4">
                <h2 className="text-2xl sm:text-3xl font-semibold font-display tracking-tight text-[var(--text-primary)] leading-snug">
                  {c.featuresHeading}
                </h2>
                <p className="text-base sm:text-lg text-[var(--text-secondary)] leading-relaxed">
                  {c.featuresSubheading}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8 pt-2">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{c.check1}</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{c.check2}</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{c.check3}</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{c.check4}</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{c.check5}</span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                    <Check size={12} strokeWidth={3} />
                  </div>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">{c.check6}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. ALLT DU BEHÖVER – SAMLAT PÅ ETT STÄLLE */}
      <section className="py-24 bg-[var(--surface-color)] border-y border-[var(--border-subtle)]">
        <div className="max-w-[1240px] mx-auto px-6 sm:px-8">
          <Card variant="default" padding="lg" className="p-8 sm:p-12">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Content */}
              <div className="lg:col-span-5 space-y-6">
                <div className="space-y-4">
                  <h2 className="text-2xl sm:text-3xl font-semibold font-display tracking-tight text-[var(--text-primary)] leading-[1.25] max-w-sm">
                    {c.allInOneHeadingLine1}<br />
                    {c.allInOneHeadingLine2}
                  </h2>
                  <p className="text-[var(--text-secondary)] text-base sm:text-lg leading-relaxed max-w-md">
                    {c.allInOneSub}
                  </p>
                </div>

                <div>
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={onGetStarted}
                  >
                    {c.getStarted}
                  </Button>
                </div>
              </div>

              {/* Right Content */}
              <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="space-y-2.5">
                  <PlaceholderBox id="HEM" className="aspect-[9/18] min-h-[360px] sm:min-h-[420px]" labelClass="text-xs sm:text-sm font-bold" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">{c.screenHome}</h4>
                    <p className="text-[11px] sm:text-xs text-[var(--text-tertiary)] leading-snug">{c.screenHomeDesc}</p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <PlaceholderBox id="HISTORIK" className="aspect-[9/18] min-h-[360px] sm:min-h-[420px]" labelClass="text-xs sm:text-sm font-bold" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">{c.screenHistory}</h4>
                    <p className="text-[11px] sm:text-xs text-[var(--text-tertiary)] leading-snug">{c.screenHistoryDesc}</p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <PlaceholderBox id="ANALYS" className="aspect-[9/18] min-h-[360px] sm:min-h-[420px]" labelClass="text-xs sm:text-sm font-bold" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">{c.screenAnalysis}</h4>
                    <p className="text-[11px] sm:text-xs text-[var(--text-tertiary)] leading-snug">{c.screenAnalysisDesc}</p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <PlaceholderBox id="EKONOMI" className="aspect-[9/18] min-h-[360px] sm:min-h-[420px]" labelClass="text-xs sm:text-sm font-bold" />
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-[var(--text-primary)]">{c.screenEconomy}</h4>
                    <p className="text-[11px] sm:text-xs text-[var(--text-tertiary)] leading-snug">{c.screenEconomyDesc}</p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* 8. SOCIAL PROOF / REVIEWS */}
      <section className="py-24 bg-[var(--bg-color)] border-b border-[var(--border-subtle)]">
        <div className="max-w-[1240px] mx-auto px-6 sm:px-8 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--surface-color)] border border-[var(--border-subtle)] text-xs font-bold text-[var(--text-primary)] shadow-2xs">
              <div className="flex items-center gap-1 text-amber-500">
                <Star size={14} fill="currentColor" />
                <Star size={14} fill="currentColor" />
                <Star size={14} fill="currentColor" />
                <Star size={14} fill="currentColor" />
                <Star size={14} fill="currentColor" />
              </div>
              <span>{c.reviewsBadge}</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-semibold font-display tracking-tight text-[var(--text-primary)]">
              {c.reviewsHeading}
            </h2>
            <p className="text-base sm:text-lg text-[var(--text-secondary)]">
              {c.reviewsSubheading}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card variant="default" padding="lg" className="space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-1 text-amber-500">
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                </div>
                <p className="text-sm sm:text-base text-[var(--text-secondary)] italic leading-relaxed">
                  {c.review1Text}
                </p>
              </div>
              <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[var(--surface-muted)] text-[var(--text-primary)] font-bold text-xs flex items-center justify-center">
                  ML
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">{c.review1Author}</h4>
                  <p className="text-xs text-[var(--text-tertiary)]">{c.review1City}</p>
                </div>
              </div>
            </Card>

            <Card variant="default" padding="lg" className="space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-1 text-amber-500">
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                </div>
                <p className="text-sm sm:text-base text-[var(--text-secondary)] italic leading-relaxed">
                  {c.review2Text}
                </p>
              </div>
              <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[var(--surface-muted)] text-[var(--text-primary)] font-bold text-xs flex items-center justify-center">
                  SK
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">{c.review2Author}</h4>
                  <p className="text-xs text-[var(--text-tertiary)]">{c.review2City}</p>
                </div>
              </div>
            </Card>

            <Card variant="default" padding="lg" className="space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center gap-1 text-amber-500">
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                </div>
                <p className="text-sm sm:text-base text-[var(--text-secondary)] italic leading-relaxed">
                  {c.review3Text}
                </p>
              </div>
              <div className="pt-4 border-t border-[var(--border-subtle)] flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[var(--surface-muted)] text-[var(--text-primary)] font-bold text-xs flex items-center justify-center">
                  AE
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[var(--text-primary)]">{c.review3Author}</h4>
                  <p className="text-xs text-[var(--text-tertiary)]">{c.review3City}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* 9. FAQ */}
      <section className="py-24 bg-[var(--bg-color)]">
        <div className="max-w-[1000px] mx-auto px-6 sm:px-8 space-y-10">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[var(--text-primary)]">
            {c.faqTitle}
          </h2>

          <div className="space-y-0">
            <FAQItem 
              question={c.faq1Q} 
              answer={c.faq1A} 
            />
            <FAQItem 
              question={c.faq2Q} 
              answer={c.faq2A} 
            />
            <FAQItem 
              question={c.faq3Q} 
              answer={c.faq3A} 
            />
            <FAQItem 
              question={c.faq4Q} 
              answer={c.faq4A} 
            />
          </div>
        </div>
      </section>

      {/* 10. SLUTLIG CTA */}
      <section className="py-12 px-6 sm:px-8 max-w-[1240px] mx-auto">
        <Card variant="default" padding="lg" className="p-8 sm:p-12 flex flex-col lg:flex-row items-center justify-between gap-8 border border-[var(--border-subtle)]">
          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-xl sm:text-3xl font-semibold font-display tracking-tight text-[var(--text-primary)] leading-snug">
              {c.finalCtaTitle}
            </h2>
            <p className="text-[var(--text-secondary)] text-sm sm:text-lg font-medium leading-relaxed">
              {c.finalCtaSub}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3.5 w-full lg:w-auto">
            {onGoogleLogin && (
              <Button
                variant="outline"
                size="lg"
                onClick={onGoogleLogin}
                className="w-full sm:w-auto gap-2.5 font-semibold"
              >
                <svg className="w-4.5 h-4.5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                {c.continueWithGoogle}
              </Button>
            )}
            <Button
              variant="primary"
              size="lg"
              onClick={onGetStarted}
              className="w-full sm:w-auto font-bold"
            >
              {c.getStarted}
            </Button>
          </div>
        </Card>
      </section>

      {/* 11. FOOTER */}
      <footer className="py-12 border-t border-[var(--border-subtle)] mt-12 bg-[var(--bg-color)]">
        <div className="max-w-[1240px] mx-auto px-6 sm:px-8 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-[var(--text-secondary)]">
          <div className="flex items-center gap-2 select-none">
            <DejzLogo className="text-xl font-bold tracking-tight text-[var(--text-primary)]" />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 font-semibold">
            <a href="#features" className="hover:text-[var(--text-primary)] transition-colors">{c.navFeatures}</a>
            <button onClick={() => setActivePolicy('privacy')} className="hover:text-[var(--text-primary)] transition-colors cursor-pointer">{c.footerPrivacy}</button>
            <button onClick={() => setActivePolicy('terms')} className="hover:text-[var(--text-primary)] transition-colors cursor-pointer">{c.footerTerms}</button>
            <a href="#how-it-works" className="hover:text-[var(--text-primary)] transition-colors">{c.footerContact}</a>
          </div>

          <div className="flex items-center gap-4">
            <LanguagePicker
              currentLanguage={currentLanguage}
              onLanguageChange={onLanguageChange}
              variant="footer"
            />
            <a 
              href="https://instagram.com" 
              target="_blank" 
              rel="noreferrer"
              className="w-9 h-9 rounded-full bg-[var(--surface-color)] hover:bg-[var(--surface-muted)] text-[var(--text-primary)] flex items-center justify-center transition-colors"
              aria-label="Instagram"
            >
              <Instagram size={18} />
            </a>
            <span className="text-xs text-[var(--text-tertiary)] font-medium">© 2026 Dejz</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
