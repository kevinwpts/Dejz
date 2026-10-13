# Dejz Design System – Riktlinjer och Arkitektur

Välkommen till Dejz centrala designsystem. Dejz är utvecklad med en enhetlig designfilosofi som garanterar konsekvens över samtliga vyer, modaler och teman (Light mode, Dark mode, Black theme) samt stödjer dynamiska accentfärger valda av användaren.

Denna fil dokumenterar hur designsystemet är uppbyggt, hur du använder det vid vidareutveckling, samt hur de automatiska kontrollerna skyddar appen mot framtida designavvikelser (design system drift).

---

## 1. Single Source of Truth (SST)

Designsystemet i Dejz styrs från två samverkande källor:

1. **`src/index.css`** – Innehåller alla CSS-variabler (`--bg-color`, `--radius-card`, `--radius-modal`, etc.) uppdelade per färgtema.
2. **`src/constants/designSystem.ts`** – Exporterar ett centralt `DS`-objekt (och `designSystem`) som mappar CSS-variabler till Tailwind-vänliga klassnamn och mått för användning i TypeScript/React.

---

## 2. Centrala Design Tokens

### 2.1 Hörnradier (Border Radii)
Använd alltid de semantiska hörnradie-token som styrs centralt. Hårdkoda **aldrig** pixlar (t.ex. `rounded-[16px]`) i vyer eller kort!

| Token / Utility | CSS-variabel | Target-värde | Användningsområde |
| :--- | :--- | :--- | :--- |
| `rounded-card` / `DS.radius.card` | `--radius-card` | **20px** | Standardkort, rader och huvudsakliga moduler |
| `rounded-card-nested` / `DS.radius.cardNested` | `--radius-card-nested` | **12px** | Nästlade kort, rader och element inuti andra kort |
| `rounded-btn` / `DS.radius.button` | `--radius-button` | **12px** | Primära och sekundära standardknappar |
| `rounded-btn-sm` / `DS.radius.buttonSm` | `--radius-button-sm` | **10px** | Små knappar, pills och filterknappar |
| `rounded-btn-lg` / `DS.radius.buttonLg` | `--radius-button-lg` | **12px** | Stora primära aktiveringsknappar |
| `rounded-input` / `DS.radius.input` | `--radius-input` | **12px** | Inmatningsfält (Inputs, Selects, Sökfält) |
| `rounded-modal` / `DS.radius.modal` | `--radius-modal` | **24px** | Modaler, dialoger och överlagrade paneler |
| `rounded-icon-button` / `DS.radius.icon` | `--radius-icon-button` | **10px** | Ikonknappar, logotypcontainrar och verktygsknappar |
| `rounded-container` / `DS.radius.container` | `--radius-container` | **24px** | Sektionscontainrar och stora produktblock |
| `rounded-chip` / `rounded-badge` / `rounded-pill` | `--radius-chip` | **9999px** | Cirkulära badges, pills, avatarer och statuspiller |

---

### 2.2 Färgteman och Semantik
Dejz stöder **Light Mode**, **Dark Mode** och **Black Theme**. Färgerna hämtas dynamiskt via CSS-variabler, vilket gör att användargränssnittet anpassar sig sömlöst:

*   **Bakgrund/Ytor:**
    *   `var(--bg-color)` – Canvas (huvudbakgrunden för appen: `#ECEFF3` i Light, `#141414` i Dark, `#0A0A0A` i Black).
    *   `var(--surface-color)` – Standardkort och moduler (`#FFFFFF` i Light, `#1C1C1C` i Dark, `#121212` i Black för distinkt OLED-separation).
    *   `var(--surface-high)` / `var(--surface-muted)` – Förhöjda eller dämpade ytor.
*   **Dividers & Linjer:**
    *   `var(--border-divider)` – Subtila 16px indragna skiljelinjer via `.divide-subtle` (`rgba(0,0,0,0.05)` i Light, `rgba(255,255,255,0.05)` i Dark, `rgba(255,255,255,0.06)` i Black).
*   **Textfärger:**
    *   `var(--text-primary)` – Primär rubrik- och brödtext.
    *   `var(--text-secondary)` – Sekundär text, etiketter (11.5px).
    *   `var(--text-tertiary)` / `var(--text-muted)` – Dämpad metadata, inaktiva val.
*   **Accentfärg (Användarvald & Färgmixad):**
    *   `var(--accent-color)` – Dynamisk färg för aktiva knappar, highlights och selektioner.
    *   `var(--accent-soft)` & `var(--accent-container)` – Automatiskt harmoniserade containers beräknade via CSS `color-mix`, som sömlöst matchar oavsett vald accentfärg.
    *   `var(--on-accent)` – Textfärg ovanpå accentfärgen (alltid kontrasterande vit).

### 2.3 Komponenthöjder & Interaktioner (Touch & Heights)
*   `--height-input` & `--height-button`: Båda harmoniserade till **46px** för perfekt visuell linjering sida-vid-sida.
*   `touch-press` & `touch-press-subtle`: Centrala utilities för naturlig haptisk/fysisk tryckrespons (`active:scale-[0.98]` / `active:scale-[0.99]`).

### 2.4 Layout, Spacing & Ikonstandard (100% Enhetlighet)
*   **Kort- & Behållarpadding:**
    *   `.card-p`: Standard (16px mobil / 20px desktop).
    *   `.card-p-sm`: Kompakt (12px mobil / 14px desktop).
    *   `.card-p-lg`: Utökad (20px mobil / 24px desktop).
    *   `.row-p`: Standard listrad-padding (14px 16px).
    *   `.modal-p`: Modal- och sheet-padding (20px mobil / 24px desktop).
*   **Ikonstorlekar i Cirkulära Ikonbehållare:**
    *   Liten / Kompakt listrad: **32px** (`w-8 h-8 rounded-[var(--radius-icon-button,10px)]`).
    *   Standard listrad & kort: **40px** (`w-10 h-10 rounded-[var(--radius-icon-button,10px)]`).
    *   Stor / Hero: **48px** (`w-12 h-12 rounded-[var(--radius-icon-button,10px)]`).
*   **Radie-Harmoni:**
    *   Kort och huvudcontainrar: `var(--radius-card, 20px)`.
    *   Inre kort och grupperade val (`SelectionRow`): `var(--radius-card-nested, 12px)`.
    *   Knappar och inmatningsfält: `var(--radius-button, 12px)` och `var(--radius-input, 12px)`.
    *   Modaler och BottomSheets: `var(--radius-modal, 24px)`.
*   **Listrad Touch-mått (Min-heights):**
    *   Standard ListRow: Minst `56–60px`.
    *   Kompakt ListRow & SelectionRow: Minst `50–54px`.
*   **Sektions- och Elementavstånd:**
    *   Mellan element i en grupp: `.gap-element` / `.space-y-element` (12px).
    *   Mellan huvudsektioner på en sida: `.gap-section` / `.space-y-section` (24px).
    *   Sidomarginal till skärmkant (mobil): `.page-px` (16px).

---

### 2.5 Typografi – Outfit, DM Sans och Central Semantisk Skala
Dejz använder **Outfit** (`--font-display` / `--font-amount`) för rubriker (`h1`–`h4`), hero-titlar och alla ekonomiska belopp/siffror, samt **DM Sans** (`--font-sans`) för brödtext, knappar, inmatningsfält, etiketter och listrader. All typografi styrs via en central semantisk skala:

| Typografisk roll | CSS Utility-klass | Storlek | Vikt | Radavstånd | Bokstavsavstånd | Användning |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Hero Amount** | `.text-hero-amount` | 30px | 700 | 1.1 | -0.03em | Appens viktigaste ekonomiska huvudbelopp (Kvar att spendera) |
| **Large Amount** | `.text-large-amount` | 24px | 600 | 1.15 | -0.03em | Större ekonomiska delsummor och summeringar |
| **List Amount** | `.text-list-amount` | 15px | 600 | 1.25 | -0.02em | Belopp i transaktionslistor och rader |
| **Page Title** | `.text-page-title` | 18px | 600 | 1.25 | -0.025em | Sidrubriker, huvudvyer |
| **Section Title** | `.text-section-title` | 15.5px | 600 | 1.3 | -0.015em | Sektionsrubriker, modaltitlar |
| **Card Title** | `.text-card-title` | 12.5px | 600 | 1.35 | 0em | Korttitlar, listrubriker, dialog-delrubriker |
| **Metric Label** | `.text-metric-label` | 12.5px | 500 | 1.35 | 0em | Nyckeltalsetiketter ovanför ekonomiska belopp (Hem, Analys, Ekonomi) |
| **Body** | `.text-body` | 13px | 400 | 1.5 | 0em | Standard brödtext, inmatningsfält |
| **Body Medium** | `.text-body-medium` | 13px | 500 | 1.45 | -0.01em | Transaktionsrader, knappar, viktad brödtext |
| **Secondary** | `.text-secondary` | 11.5px | 400 | 1.45 | 0em | Sekundärtext, förklarande text, transaktionsrader |
| **Label** | `.text-label` | 11px | 500 | 1.35 | 0.01em | Fältetiketter, filterknappar, statusindikatorer |
| **Micro Label** | `.text-micro-label` | 10px | 400 | 1.35 | 0.01em | Badges, pills, små diagrametiketter, datumstämplar, bottenmenyflikar |

Dessa klasser är definierade som centrala `@utility` i `src/index.css` och tillgängliga via `DS.typography` i `src/constants/designSystem.ts`. Hårdkoda **aldrig** godtyckliga textstorlekar som `text-[13px]` eller `text-[17px]` i nya komponenter.

---

## 3. Återanvändbara UI-komponenter

När du bygger nya sidor eller funktioner ska du **alltid** prioritera komponenterna i `src/components/ui/` framför att skriva egna gränssnittselement:
*   **`Card`** och **`ListRow`** – För informationsstruktur och listor.
*   **`Button`** och **`IconButton`** – För interaktioner och klickbara ikoner.
*   **`Input`** och **`SmartInput`** – För inmatning och numeriska fält (med inbyggd valutaformatering).
*   **`SegmentedControl`** och **`FilterButtonGroup`** – För filter och flikbyten.
*   **`Modal`** och **`BottomSheet`** – För överlagrade dialogrutor och mobilanpassade paneler.

---

## 4. Automatiska Kontroller (Kvalitetssäkring)

För att garantera att designsystemet inte glider över tid eller blir fullt av hårdkodade pixel- och färgavvikelser har vi infört ett **tvåstegs automatiserat skyddsystem**:

### 4.1 Standalone Design System Linter (`scripts/lint-design-system.js`)
Detta är en skräddarsydd kodskanner utvecklad specifikt för Dejz. Den läser alla `.tsx`, `.ts` och `.css`-filer i `src/` och delar in designavvikelser i två nivåer:

1.  **CRITICAL ERRORS (Blocks Build / Exit code 1):**
    *   Hårdkodade layout-hörnradier (`rounded-[12px]`, `rounded-[14px]`, `rounded-[16px]` etc.) som borde styras av centrala tokens.
    *   Hårdkodade primära ytfärger och accentfärger (t.ex. `#FAF8F5`, `#1C1C1C`, `#0A0A0A`, `#3B82F6`) direkt i vyerna.
2.  **WARNINGS (Developer Guidance / Exit code 0):**
    *   Små hårdkodade hörnradier för detaljkomponenter (`rounded-[4px]`, `rounded-[8px]`, etc.).
    *   Mindre dämpade färgfallbacks eller gråtoner (t.ex. `#777168`).

*Linter-skriptet kan köras lokalt med:*
```bash
node scripts/lint-design-system.js
```
*För att tvinga fram strikt kontroll vid Continuous Integration (CI):*
```bash
node scripts/lint-design-system.js --fail-on-errors
```

### 4.2 ESLint AST-Regler (`.eslintrc.json`)
Vi har integrerat statisk AST-analys (Abstract Syntax Tree) i ESLint via regeln `"no-restricted-syntax"`. Detta upptäcker otillåtna mönster direkt i din kodredigerare i realtid:
*   Stoppar hårdkodade Tailwind-klasser i strängar (`className="... rounded-[14px] ..."`) och template literals (`className={`... rounded-[14px] ...`}`).
*   Stoppar hårdkodade inline React-stilar (`style={{ borderRadius: '14px' }}`).

### 4.3 Hur du kör verifieringen
Båda dessa kontroller är integrerade i Dejz standard-lint-pipeline. När du kör:
```bash
npm run lint
```
...så körs design-linter-skannern och ESLint sekventiellt. Om en utvecklare försöker checka in kod med otillåtna hårdkodade layout-värden kommer bygget att varna och visa exakt vilken fil och rad som måste åtgärdas.

---

## 5. Legitima Undantag i Kodbasen

Vissa delar av källkoden är undantagna från de automatiska kontrollerna av tekniska skäl:
1.  **`src/components/ui/`** – Innehåller de grundläggande primitiva komponenterna (såsom `Skeleton.tsx` och `Button.tsx`). Eftersom dessa filer är *definitionen* av systemet tillåts de ha interna fallback-värden för standardstorlekar.
2.  **`src/utils/demoData.ts` och `src/constants.ts`** – Innehåller statisk testdata samt definitioner för transaktionskategorier. Databasen sparar fasta färg-hexar för användarens personliga kategorier, vilket representerar användardata och inte layout-styling.
3.  **`src/components/AnalysisView.tsx`** – Innehåller diagram (Recharts) och visualiseringar där färgpaletter definieras i minnesarrayer för diagramceller.
4.  **SVG-Ikoner & Logotyper** – SVG-kod och mikroradier (`rounded-[6px]`/`rounded-[8px]`) för små ikoner och logotyprelationer tillåts som kontrollerade undantag.

---

## 6. Aktuell Status
* **Kritiska fel:** 0
* **Varningar:** 0 (både i `scripts/lint-design-system.js` och `eslint --max-warnings 0`)
* **Publika vyer (`LandingPage`, `Auth`, `PublicLegalPage`):** Konsekvent låsta till ljust tema (`.landing-light`) och använder samma `LanguagePicker` (`variant="compact"`).
* **Central styrning:** Fullt implementerad för knappar, flikar, filter, modaler, listrader, skeletons och semantiska färger/radier i hela kodbasen.
