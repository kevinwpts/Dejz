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
Använd alltid de semantiska hörnradie-token som styrs centralt. Hårdkoda **aldrig** pixlar (t.ex. `rounded-[14px]`) i vyer eller kort!

| Token | CSS-variabel | Tailwind-motsvarighet | Användningsområde |
| :--- | :--- | :--- | :--- |
| `DS.radius.card` | `--radius-card` (14px) | `rounded-[var(--radius-card)]` | Standardkort, rader och containrar |
| `DS.radius.cardNested`| `--radius-card-nested` (10px)| `rounded-[var(--radius-card-nested)]` | Mindre kort/element inuti andra kort |
| `DS.radius.button` | `--radius-button` (14px) | `rounded-[var(--radius-button)]` | Standardknappar och stora knappar |
| `DS.radius.buttonSm` | `--radius-button-sm` (10px) | `rounded-[var(--radius-button-sm)]` | Små sekundära knappar |
| `DS.radius.input` | `--radius-input` (14px) | `rounded-[var(--radius-input)]` | Inmatningsfält (Inputs, Selects) |
| `DS.radius.modal` | `--radius-modal` (16px) | `rounded-[var(--radius-modal)]` | Modaler och paneler |
| `DS.radius.modalSheet`| `--radius-modal` (16px) | `rounded-t-[var(--radius-modal)]` | Bottom sheets (överkant på mobil, hel på desktop) |

---

### 2.2 Färgteman och Semantik
Dejz stöder **Light Mode**, **Dark Mode** och **Black Theme**. Färgerna hämtas dynamiskt via CSS-variabler, vilket gör att användargränssnittet anpassar sig sömlöst:

*   **Bakgrund/Ytor:**
    *   `var(--bg-color)` – Canvas (huvudbakgrunden för appen).
    *   `var(--surface-color)` – Standardkort och ytor.
    *   `var(--surface-high)` / `var(--surface-muted)` – Förhöjda eller dämpade ytor.
*   **Textfärger:**
    *   `var(--text-primary)` – Primär rubrik- och brödtext.
    *   `var(--text-secondary)` – Sekundär text, etiketter.
    *   `var(--text-tertiary)` / `var(--text-muted)` – Dämpad metadata, inaktiva val.
*   **Accentfärg (Användarvald):**
    *   `var(--accent-color)` – Dynamisk färg för aktiva knappar, highlights och selektioner.
    *   `var(--on-accent)` – Textfärg ovanpå accentfärgen (alltid kontrasterande vit/ljus).

---

### 2.3 Typografi
Dejz använder två distinkta typsnittsfamiljer med semantiska betydelser:
*   **Outfit** (`font-sans`) – Används för samtliga rubrikroller, knappar, modalöverskrifter och siffror för en modern och sofistikerad känsla.
*   **DM Sans** (`font-sans` för brödtext) – Används för löpande text, fältbeskrivningar, etiketter och finstilta data.

Hämta alltid storlekar och fontvikter via `DS.typography`:
*   `DS.typography.heroAmount` – Stora ekonomiska siffror (monospaced siffror för perfekt linjering).
*   `DS.typography.pageTitle` – Sidrubriker.
*   `DS.typography.body` – Standard brödtext.
*   `DS.typography.label` – Formuläretiketter.
*   `DS.typography.caption` – Undertexter och metadata.

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
4.  **SVG-Ikoner** – SVG-kod tillåts innehålla specifika geometriska former och fasta färger eftersom de utgör grafiska resurser snarare än komponentlayouter.
