import React from 'react';
import { PrivacyPolicyContent } from '../PrivacyPolicy';

/* Juridiska sidor i Inställningar. Flyttade från SettingsTab.tsx. */

/** Samma integritetspolicy som på dejz.se (PRIVACY.md) – en enda text att hålla uppdaterad */
export const PrivacySettingsPage: React.FC = () => (
  <div className="ui-page animate-slide-in-right">
    <div className="ui-group-card p-5">
      <PrivacyPolicyContent />
    </div>
  </div>
);

export const TermsPage: React.FC = () => (
  <div className="ui-page animate-slide-in-right">
    <div className="ui-group-card text-xs text-[var(--text-secondary)] leading-relaxed divide-y divide-[var(--border-subtle)]">
      <div className="p-5 space-y-2">
        <h3 className="font-display font-bold text-[13px] sm:text-sm text-[var(--text-primary)]">
          1. Om tjänsten & avtalets omfattning
        </h3>
        <p>
          Dejz är en digital tjänst för personlig ekonomiöversikt,
          löneperiodsbudgetering och utgiftsuppföljning för privat bruk. Genom att
          skapa ett konto eller använda Dejz godkänner du dessa användarvillkor.
        </p>
      </div>

      <div className="p-5 space-y-2">
        <h3 className="font-display font-bold text-[13px] sm:text-sm text-[var(--text-primary)]">
          2. Bankkoppling & tredjepartsleverantörer
        </h3>
        <p>
          Inhämtning av kontoinformation via Open Banking tillhandahålls i samarbete
          med Enable Banking Oy (auktoriserat kontoinformationsinstitut under PSD2).
          Dejz har endast läsrättigheter till de bankkonton du själv väljer att
          ansluta och kan aldrig initiera betalningar eller överföringar.
        </p>
      </div>

      <div className="p-5 space-y-2">
        <h3 className="font-display font-bold text-[13px] sm:text-sm text-[var(--text-primary)]">
          3. Ingen finansiell rådgivning & beräkningsansvar
        </h3>
        <p>
          Beräkningar i Dejz – inklusive ”Kvar att spendera”, identifiering av fasta
          kostnader, reserverade belopp, interna överföringar och AI-baserad
          kategorisering – är automatiserade sammanställningar avsedda som beslutsstöd
          i vardagen. De utgör inte finansiell, juridisk eller skattemässig rådgivning
          enligt lagen (2003:862) om finansiell rådgivning till konsumenter. Du
          ansvarar själv för att kontrollera att räkningar och betalningar utförs i
          tid hos din bank.
        </p>
      </div>

      <div className="p-5 space-y-2">
        <h3 className="font-display font-bold text-[13px] sm:text-sm text-[var(--text-primary)]">
          4. Ditt konto & användaransvar
        </h3>
        <p>
          Du ansvarar för att hålla din inloggning säker och för att uppgifterna du
          lägger in stämmer. Dejz visar en uppskattning baserad på dem.
        </p>
      </div>

      <div className="p-5 space-y-2">
        <h3 className="font-display font-bold text-[13px] sm:text-sm text-[var(--text-primary)]">
          5. Uppsägning, radering & tillämplig lag
        </h3>
        <p>
          Du kan när som helst avsluta ditt konto utan uppsägningstid genom att
          radera kontot under{' '}
          <span className="font-semibold text-[var(--text-primary)]">
            Inställningar → Data & säkerhet → Radera konto
          </span>
          . Vid radering tas all din sparade kontodata bort permanent. Svensk lag
          tillämpas på dessa villkor och eventuell tvist prövas av svensk allmän
          domstol.
        </p>
      </div>
    </div>
  </div>
);

export const CookiesPage: React.FC = () => (
  <div className="ui-page animate-slide-in-right">
    <div className="ui-group-card text-xs text-[var(--text-secondary)] leading-relaxed divide-y divide-[var(--border-subtle)]">
      <div className="p-5 space-y-2">
        <h3 className="font-display font-bold text-[13px] sm:text-sm text-[var(--text-primary)]">
          1. Tekniskt nödvändig lokal lagring
        </h3>
        <p>
          Dejz använder webbläsarens lokala lagring (<span className="font-mono">localStorage</span>)
          och autentiseringstoken från Supabase uteslutande för att hålla dig
          inloggad, cacha din krypterade vy lokalt på din enhet för snabb laddning
          samt spara dina inställningar (lönedag, tema, egna kategorier och
          betalsätt).
        </p>
      </div>

      <div className="p-5 space-y-2">
        <h3 className="font-display font-bold text-[13px] sm:text-sm text-[var(--text-primary)]">
          2. Isolering mellan konton & rensning vid utloggning
        </h3>
        <p>
          Vid utloggning, kontobyte eller radering av konto töms all lokal cache på
          enheten automatiskt så att ingen efterföljande användare på samma enhet kan
          se eller ärva tidigare kontouppgifter.
        </p>
      </div>

      <div className="p-5 space-y-2">
        <h3 className="font-display font-bold text-[13px] sm:text-sm text-[var(--text-primary)]">
          3. Inga annons- eller spårningscookies
        </h3>
        <p>
          Dejz använder inga tredjepartscookies för annonsering, beteendeprofilering
          eller kommersiell spårning över andra webbplatser.
        </p>
      </div>
    </div>
  </div>
);

export const OpenBankingInfoPage: React.FC = () => (
  <div className="ui-page animate-slide-in-right">
    <div className="ui-group-card text-xs text-[var(--text-secondary)] leading-relaxed divide-y divide-[var(--border-subtle)]">
      <div className="p-5 space-y-2">
        <h3 className="font-display font-bold text-[13px] sm:text-sm text-[var(--text-primary)]">
          1. Reglerad Open Banking via Enable Banking (PSD2)
        </h3>
        <p>
          Dejz använder{' '}
          <span className="font-semibold text-[var(--text-primary)]">
            Enable Banking Oy
          </span>{' '}
          (The Connectivity Engine) för säker bankanslutning enligt EU:s andra
          betaltjänstdirektiv (PSD2, Direktiv 2015/2366). Enable Banking är ett
          auktoriserat kontoinformationsinstitut (AISP) under tillsyn av finska
          Finansinspektionen (FIN-FSA) med gränsöverskridande tillstånd i Sverige och
          EU/EES.
        </p>
        <p>
          Autentisering sker alltid direkt mot din egen bank med Mobilt BankID eller
          bankens säkerhetsdosa. Dejz ser eller lagrar aldrig dina bankkoder.
        </p>
      </div>

      <div className="p-5 space-y-2">
        <h3 className="font-display font-bold text-[13px] sm:text-sm text-[var(--text-primary)]">
          2. Personuppgiftsansvar & biträdesavtal
        </h3>
        <p>
          När dina bankuppgifter har hämtats och överförts till Dejz är{' '}
          <span className="font-semibold text-[var(--text-primary)]">
            Dejz personuppgiftsansvarig
          </span>{' '}
          för lagring, bearbetning och visning av uppgifterna i appen. Enable
          Bankings regulatoriska ansvar för bankkopplingen ersätter inte Dejz eget
          personuppgiftsansvar enligt GDPR.
        </p>
      </div>

      <div className="p-5 space-y-2">
        <h3 className="font-display font-bold text-[13px] sm:text-sm text-[var(--text-primary)]">
          3. Endast läsrättigheter (Read-Only)
        </h3>
        <p>
          Anslutningen ger uteslutande läsrättigheter till de konton du själv väljer
          att aktivera (kontonamn, IBAN/BBAN, saldo samt bokförda och reserverade
          transaktioner). Det är tekniskt omöjligt för Dejz att flytta pengar, ändra
          uppdrag eller genomföra betalningar på dina konton.
        </p>
      </div>

      <div className="p-5 space-y-2">
        <h3 className="font-display font-bold text-[13px] sm:text-sm text-[var(--text-primary)]">
          4. Giltighetstid & hur du avslutar bankkopplingen
        </h3>
        <p>
          Ett banksamtycke gäller i högst 90–180 dagar beroende på bankens
          PSD2-regler. Du kan när som helst bryta kopplingen med omedelbar verkan
          under{' '}
          <span className="font-semibold text-[var(--text-primary)]">
            Inställningar → Bankkonton → Koppla från
          </span>{' '}
          eller via din internetbanks inställningar för tredjepartsbehörigheter.
        </p>
      </div>
    </div>
  </div>
);
