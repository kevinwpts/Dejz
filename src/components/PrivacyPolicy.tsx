import React, { useEffect } from 'react';
import { X } from '@phosphor-icons/react';

/* ------------------------------------------------------------------ */
/*  Integritetspolicy – visas som ett blad över startsidan.           */
/*  Håll innehållet i synk med PRIVACY.md i projektroten.              */
/* ------------------------------------------------------------------ */

export const PRIVACY_UPDATED = '2026-11-11';
export const PRIVACY_CONTACT = 'hej@dejz.se';

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="space-y-2">
    <h3 className="font-display font-semibold text-subhead text-[var(--text-primary)]">{title}</h3>
    <div className="space-y-2 text-sm leading-relaxed text-[var(--text-secondary)]">{children}</div>
  </section>
);

export const PrivacyPolicyContent: React.FC = () => (
  <div className="space-y-6">
    <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
      Här förklarar vi enkelt vilka uppgifter Dejz sparar, varför och hur länge. Vi säljer aldrig dina uppgifter.
    </p>

    <Section title="Vem ansvarar för dina uppgifter?">
      <p>
        Dejz är personuppgiftsansvarig. Har du frågor eller vill använda dina rättigheter når du oss på{' '}
        <a href={`mailto:${PRIVACY_CONTACT}`} className="font-medium text-[var(--accent-color)] underline">
          {PRIVACY_CONTACT}
        </a>
        .
      </p>
    </Section>

    <Section title="Ditt konto och appen">
      <p>
        När du skapar ett konto sparar vi din e-postadress och ditt namn. Lösenordet sparas krypterat – vi kan aldrig
        se det.
      </p>
      <p>
        I appen sparar vi det du själv lägger in, till exempel lön, fasta räkningar, sparmål och köp. Uppgifterna
        används bara för att Dejz ska fungera för dig. Grunden är vårt avtal med dig om att leverera appen.
      </p>
      <p>
        Kom du till Dejz via en länk från oss, till exempel en annons på TikTok, sparar vi var du kom ifrån (bara
        kanalens namn, som ”tiktok”). Det hjälper oss att förstå vilken marknadsföring som fungerar. Grunden är vårt
        berättigade intresse, och uppgiften raderas tillsammans med ditt konto.
      </p>
      <p>
        Vi sparar uppgifterna så länge du har ett konto. Du kan radera ditt konto och all data när som helst i appen
        under Inställningar → Data & säkerhet → Radera konto. Då raderas allt direkt och kan inte återställas.
      </p>
    </Section>

    <Section title="Väntelistan">
      <p>Om du skrev upp dig på väntelistan sparade vi:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>din e-postadress,</li>
        <li>dina svar på de frivilliga frågorna (var du hittade Dejz och vad som är svårast med ekonomin),</li>
        <li>vilken länk du kom från, till exempel en TikTok-länk,</li>
        <li>när du skrev upp dig.</li>
      </ul>
      <p>
        Vi använder uppgifterna för att skicka ett bekräftelsemejl, höra av oss när Dejz öppnar och förstå vad vi ska
        bygga. Grunden är ditt samtycke, som du ger när du skriver upp dig. Du kan ta tillbaka det när du vill.
      </p>
      <p>
        Vi sparar uppgifterna tills du har fått din inbjudan till Dejz, dock längst 24 månader, eller tills du ber oss
        ta bort dem. Svara bara på något av våra mejl eller skriv till {PRIVACY_CONTACT}.
      </p>
      <p>
        För att stoppa spam sparar vi en krypterad kod av din IP-adress i högst 24 timmar. Vi kan inte se din
        IP-adress utifrån koden.
      </p>
    </Section>

    <Section title="Hur appen används">
      <p>
        För att förstå om Dejz är till nytta sparar vi när du senast använde appen, hur många gånger du öppnat den
        och vilken typ av enhet du använder (till exempel iPhone). Vi sparar inte vad du gör i appen eller var du
        befinner dig.
      </p>
    </Section>

    <Section title="Mejl från oss">
      <p>
        Vi kan mejla dig om ditt konto och om tjänsten, till exempel om du fastnat, om ett fel som påverkat dig
        eller om viktiga ändringar.
      </p>
      <p>
        Tips och nyheter skickar vi bara om du själv har kryssat i rutan för det. Du kan ändra dig när som helst
        under Profil → Nyheter på mejl, eller genom att svara på mejlet. Vi sparar ditt svar och när du gav det.
      </p>
    </Section>

    <Section title="Vilka hjälper oss?">
      <p>Vi använder några leverantörer som bara får behandla uppgifterna för vår räkning:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li>Supabase – databas och inloggning, lagrat inom EU/EES.</li>
        <li>
          Google (Gemini) – AI som känner igen butiksnamn och väljer kategori och logga. Vi skickar bara namnet på
          butiken, aldrig vem du är.
        </li>
        <li>Resend – skickar våra mejl.</li>
        <li>Google och Apple – om du väljer att logga in med dem får vi ditt namn och din e-postadress.</li>
        <li>Vercel – driftar webbplatsen.</li>
        <li>
          Sentry – tar emot tekniska felrapporter när appen kraschar (felmeddelande, telefon/webbläsare). Aldrig ditt
          namn, din e-post eller dina belopp.
        </li>
      </ul>
      <p>Bankkoppling via Enable Banking kommer senare. Policyn uppdateras innan den blir tillgänglig.</p>
    </Section>

    <Section title="Dina rättigheter">
      <p>
        Du har rätt att få veta vilka uppgifter vi har om dig, få dem rättade eller raderade och att ta tillbaka ditt
        samtycke. Tycker du att vi hanterar dina uppgifter fel kan du klaga hos Integritetsskyddsmyndigheten (IMY).
      </p>
    </Section>

    <p className="text-xs text-[var(--text-muted)]">Senast uppdaterad: {PRIVACY_UPDATED}</p>
  </div>
);

export const PrivacyPolicySheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" role="dialog" aria-modal="true" aria-label="Integritetspolicy">
      <div className="absolute inset-0 bg-[var(--scrim-color)] animate-fade-in" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg max-h-[88dvh] overflow-y-auto bg-[var(--surface-color)] rounded-t-modal sm:rounded-modal px-5 sm:px-7 pt-5 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))] shadow-[var(--shadow-modal)] animate-scale-in">
        <div className="sticky top-0 -mx-5 sm:-mx-7 px-5 sm:px-7 pb-3 mb-4 bg-[var(--surface-color)] border-b border-[var(--border-subtle)] flex items-center justify-between">
          <h2 className="font-display font-semibold text-lg text-[var(--text-primary)]">Integritetspolicy</h2>
          <button type="button" onClick={onClose} aria-label="Stäng" className="ui-icon-btn">
            <X size={16} />
          </button>
        </div>
        <PrivacyPolicyContent />
      </div>
    </div>
  );
};
