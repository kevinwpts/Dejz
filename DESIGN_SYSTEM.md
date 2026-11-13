# Dejz designsystem

Allt utseende i Dejz styrs från **ett ställe: `src/index.css`**. Komponenterna innehåller inga egna färger, textstorlekar eller hörnradier – de använder namn från designsystemet. Därför räcker det att ändra värdena här för att ge hela appen ny design.

`npm run lint` kör en **designvakt** (`scripts/lint-design-system.js`) som stoppar bygget om någon skriver in en hårdkodad färg, storlek eller radie.

---

## Byta design – så gör du

| Vill du ändra … | Ändra i `src/index.css` | Slår igenom i |
|---|---|---|
| Bakgrund, kort, text, linjer | `--bg-color`, `--surface-color`, `--text-primary/secondary/muted`, `--border-subtle` (i `:root` = ljust, `.dark` = mörkt) | Alla sidor, kort och ark |
| Huvudknappar ("gör det här") | `--cta-bg`, `--cta-fg`, `--cta-shadow` | Alla primära knappar |
| Varumärkets lila | `--brand`, `--brand-deep`, `--brand-gradient` | Logga, hemkortet, startsidan |
| Grönt / rött / gult | `--positive-*`, `--negative-*`, `--caution-*` | Inkomster, ta bort/fel, varningar |
| Hörn | `--radius-card`, `--radius-modal`, `--radius-button` … (i `@theme`) | Kort, dialoger, knappar |
| Typsnitt | `--font-sans`, `--font-display` (i `@theme`) | All text |
| Textstorlekar | `--text-micro` … `--text-subhead` (i `@theme`) | All småtext |
| Notiser | `--toast-bg`, `--toast-fg`, `--toast-action` | Ångra- och bekräftelsenotiser |
| Grupper i ark, linjer, tryck | `--fill-grouped`, `--separator`, `--press-overlay`, `--card-shadow` | Rader i ark, listkort, tryckkänsla |
| Segmentväljare och reglage | `--segment-track`, `--segment-thumb`, `--segment-thumb-shadow` | Alla/Utgifter/Inkomster, Utgift/Inkomst, av-läge för reglage |
| Valt läge (plattor, chips, dagar) | `--selected-bg`, `--selected-fg`, `--selected-ring` | Dagväljare, filterchips, ikonval, Utseende, val-kort |
| Sekundära knappar | `--btn-secondary-fill` | Alla grå knappar (`ui-btn-secondary`, `ui-btn-sm`, `ui-pill-btn`, dialogernas Avbryt) |
| Avstängd huvudknapp | `--cta-disabled-bg`, `--cta-disabled-fg` | Lila med 40 % täckning och vit text, samma i båda teman |
| Bottenmenyn och plusknappen | `--nav-glass-bg`, `--nav-glass-border`, `--nav-active-bg`, `--fab-shadow` | Glasmenyn längst ner |
| Toppradens knappar | `--header-btn-bg` | Sekretess, feedback, notiser, tillbaka |
| Kategorirutor | `--cat-tile-mix`, `--cat-glyph-mix`, `--cat-glyph-base` | Hur starkt kategorifärgen tonar rutan och ikonen |

Ett komplett nytt tema = ändra variablerna i `:root` (ljust) och `.dark` (mörkt). Inga komponentfiler behöver röras.

---

## Färger (betydelse, inte nyans)

Använd alltid namnet för vad färgen **betyder**:

| Klass | Betyder | Exempel |
|---|---|---|
| `text-positive` | Pengar in, klart, bra | `+24 800 kr`, "Betald" |
| `text-negative` | Ta bort, fel, övertrasserat | "Ta bort köp", felmeddelanden |
| `text-caution` | Varning, väntar | "Uppsagd", "Reserverat" |
| `bg-positive-solid` / `-negative-solid` / `-caution-solid` | Fyllda prickar, märken, kanter | Statusprick, notisbricka |
| `bg-brand`, `text-brand-deep`, `bg-[image:var(--brand-gradient)]` | Varumärket | Logga, hemkort |
| `text-[var(--text-primary)]` m.fl. | Ytor och text | Allt annat |

`positive/negative/caution` anpassar sig själva till ljust och mörkt tema – skriv aldrig `dark:` för dem.

## Utseendet i korthet (iOS "inset grouped")

- **Kort har inga kantlinjer.** Vit yta (`--surface-color`) på grå bakgrund + mycket mjuk skugga (`--card-shadow`). I mörkt läge: ljusare yta mot nästan svart bakgrund, ingen skugga.
- **Inga avdelare mellan rader** (som Revolut/iOS 18). Rader skiljs åt av luft: listrader (`ui-tx-row`) är minst 72 px, inställningsrader (`ui-admin-row`) 56 px. Kortet behåller sin rundade yta.
- **Grupper inne i ark** (`ui-sheet-group`, `ui-field-card`, `ui-action-tile`) har grå fyllning `--fill-grouped` – aldrig kantlinje. Skriv `bg-[var(--fill-grouped)]` för egna rutor i ark, inte `bg-[var(--bg-color)] border …`.
- **Tre textnivåer:** flikrubrik (`ui-header-title`, 20 px halvfet, i övre raden bredvid profilbilden) · radtext (`ui-row-title`, 15 px **normal vikt**) · sekundärtext (`ui-row-subtitle`, 13 px). Belopp i rader: `ui-row-amount` (15 px, normal vikt, inkomster gröna). Fet/halvfet bara för rubriker, datumrubriker, stora belopp (hemkortet 46 px, detaljvyer 34 px) och huvudknappar. Belopp alltid `tabular-nums`.
- **Etiketter skrivs i vanlig skiftläge** ("Namn", "Belopp") – inga VERSALER.
- **Tryckkänsla:** knappar krymper lite (`active:scale-[0.97]`), rader får en svag ton (`active:bg-[var(--press-overlay)]`). Allt stängs av vid "Reducera rörelse".
- **Loggor och kategoriikoner är runda** – samma cirkel överallt (40 px i listor, 64 px i detaljvyer). Butikslogor (`.ui-logo-tile`) fyller cirkeln på vit botten utan kant; ordbilder och okända får en bokstavscirkel (`MonogramTile`). Kategoriikoner (Phosphor, fylld) ligger i en cirkel tonad med kategorins färg (`.ui-cat-tile` + `categoryColorStyle()`).
- **Gränssnittsikoner:** Phosphor `regular` överallt (toppradens knappar, stäng, pilar, "+ Lägg till"). Undantag: vald flik i bottenmenyn och statusikoner är `fill`. Inga `bold`/`duotone`.
- **Detaljvyer** (köp, fast utgift, inkomst): rund ✕ till vänster, åtgärder till höger (`SheetHeader closeStart`). Huvud: stor rund logga, namnet i grått, beloppet stort och fett, datum litet. Infokort (`ui-detail-card`) – ett kort per grupp, inga avdelare. Korta värden: grå etikett till vänster, värdet till höger (`DetailLinkRow` i accentfärg om det går att trycka). Lång text (anteckning, banktext): etikett överst, värdet under (`DetailStackRow`).

## Arkhuvud – alltid `<SheetHeader />`

Alla ark och dialoger använder komponenten `src/components/ui/SheetHeader.tsx` (även `BottomSheet` med `title`). **Mönster:** `[‹] Rubrik` till vänster (17 px) · åtgärder till höger · rund ✕ sist. Undantag: detaljvyer (`closeStart`) har ✕ till vänster och ingen synlig rubrik. Huvudknappen ("Spara") ligger alltid längst ner i arket.

- `onBack` ger tillbakapil i undervyer.
- `variant="edit"` (redigering från en detaljvy) ser likadan ut – ✕ avbryter då redigeringen utan att spara (tillgängligt namn "Avbryt").
- Fasta huvuden är alltid täckande (ingen text syns igenom) och får en hårfin linje (`ui-header-scrolled`) när innehållet har scrollats under dem.

## Bottenmenyn

Menyn och plusknappen syns bara på de fyra flikarna (Hem, Historik, Analys, Fasta). **Undersidor med tillbakaknapp** (Inställningar och alla dess sidor, Sparmål, Kvitton, Paket, juridiska sidor) visar ingen meny – som i iOS. Då sätts `html[data-tabbar="hidden"]` och `ui-page` får mindre luft i nederkant. Bakom menyn ligger en täckande ton (`ui-tabbar-fade`, ca 100 px) så att ingen listtext syns runt den.

## Valt läge – två sätt, inga fler

- **Plattor, chips och rutnät** (dagväljare, filterchips, ikonval, Utseende, val-kort): `ui-selected` – mjuk lila ton + lila text och ring. Bildplattor (sparmålsbilder) får bara den lila ringen.
- **Listor** (väljare i ark): en bock (✓) längst till höger på den valda raden.
- **Segmentväljare** (`ui-segmented`) är undantaget: valt segment är neutralt – en ljusare upphöjd yta med skugga, ingen lila (se CLAUDE.md: "valda lägen (segment, dagar) är neutrala"). Dagrutnät och chips räknas som plattor och använder den mjuka lila tonen – den är dämpad nog att räknas som "neutral" men syns tydligt i båda teman.

## Knappar – en stil per nivå

| Nivå | Klass | Utseende |
|---|---|---|
| Primär | `ui-btn-primary` (+ `-flow`, `ui-dialog-btn-primary`, `ui-btn-sm-primary`) | Lila. Avstängd = lila 40 % + vit text |
| Sekundär | `ui-btn-secondary`, `ui-btn-sm`, `ui-pill-btn`, `ui-dialog-btn-secondary` | Neutral grå ton (`--btn-secondary-fill`) – inga vita, mörka eller lila piller |
| Tertiär | `ui-section-action` | Bara lila text |
| Farlig | `ui-btn-danger` | Röd text, centrerad, längst ner på detaljsidor ("Ta bort sparmål", "Koppla från …"). I bekräftelser: `ui-dialog-btn-danger` (röd fylld) – även för "Återställ …" |

Rader i Inställningar ("Logga ut", "Radera konto") får vara röda rader.

## Textstorlekar

| Klass | Storlek | Används till |
|---|---|---|
| `text-micro` | 11 px | Bara menyetiketter (halvfet) och små märken |
| `text-caption` | 12 px | Små etiketter, metadata |
| `text-meta` | 12 px | Sekundärtext (golv: ingen sekundärtext under 12 px) |
| `text-footnote` | 13 px | Radundertexter (golv för listor), länkar |
| `text-callout` | 14 px | Knappar, brödtext i listor |
| `text-subhead` | 15 px | Mellanrubriker |
| `text-base` och uppåt | Tailwind | Rubriker och belopp |

## Komponentklasser

Återkommande delar har **en** klass var. Byt deras utseende i `@layer components` i `index.css`:

- **Knappar:** `ui-btn-primary` (huvudknapp, 52 px), `ui-btn-primary-flow` (introduktionen), `ui-btn-secondary` (neutral ton), `ui-btn-danger` (röd text utan ram – "Ta bort …"), `ui-pill-btn` ("Redigera"), `ui-icon-btn` (grå rund, t.ex. stäng), `ui-header-btn` (toppraden), `ui-dialog-btn-primary` / `-secondary` / `-danger` (val i dialoger), `ui-clear-btn`
- **Valt läge:** `ui-selected` (plattor, chips), `ui-chip-active`, `ui-day-btn-active` – alla med samma mjuka lila ton
- **Sidor och ark:** `ui-header-title` (flikrubrik i övre raden, h1), `ui-sheet-header`, `ui-sheet-sub-header`, `ui-sheet-title`, `ui-sheet-group`, `ui-step-title`
- **Bottenmeny:** `ui-tabbar`, `ui-tabbar-item` / `-active`, `ui-fab` (plusknappen), `ui-tabbar-fade`
- **Listor och rader:** `ui-list-card`, `ui-row`, `ui-row-btn`, `ui-row-title`, `ui-row-subtitle`, `ui-row-amount`, `ui-tx-row`, `ui-list-row-title`
- **Detaljvyer:** `ui-detail-hero`, `ui-detail-title`, `ui-detail-amount` (+ `-income`), `ui-detail-meta`, `ui-detail-card`, `ui-detail-row`, `ui-detail-label`, `ui-detail-value`, `ui-detail-value-link`, `ui-detail-stack`
- **Bockrutor:** `ui-checkbox` + `ui-checkbox-on` (lila fylld cirkel) / `ui-checkbox-off` (ring)
- **Ikonrutor:** `ui-cat-tile` (kategorifärgad), `ui-cat-glyph`, `ui-logo-tile` (butikslogga)
- **Formulär:** `ui-field-card`, `ui-field-label`, `ui-field-input`, `ui-field-input-lg`, `ui-checkbox`, `ui-input-icon`, `ui-search-box`, `ui-switch`, `ui-segmented`
- **Kort och plattor:** `ui-card`, `ui-action-tile` (+ `-label`), `ui-shortcut-tile`, `ui-option-card`, `ui-chip`, `ui-chip-sm`
- **Tomma lägen och sektioner:** `ui-empty-state`, `ui-section-header`, `ui-section-title`, `ui-stat-label`, `ui-stat-value`

Ny komponent som ska finnas på flera ställen? Lägg en `ui-…`-klass i `index.css` i stället för att kopiera långa klasslistor – **i rätt familj** (rätt numrerat avsnitt i `@layer components`), inte sist i filen. Ändrar du en befintlig klass: ändra regeln där den står i stället för att lägga en ny regel längre ner som skriver över den.

Några regler ligger **avsiktligt utanför lager** (avsnittet "Utanför lager" direkt efter komponentlagret): avstängd huvudknapp, notiser (`ui-toast…`), fasta huvuden (`ui-header-scrolled`). Oskiktade regler vinner alltid över Tailwind-klasser i komponenterna – flytta dem inte in i `@layer components`.

## Regler (stoppas av designvakten)

1. Inga Tailwind-standardfärger (`text-emerald-600`, `bg-rose-500` …) → använd betydelsefärgerna ovan.
2. Inga hex-färger i klassnamn (`bg-[#5B3DF5]`) → lägg färgen som variabel.
3. Inga egna textstorlekar 10–15 px (`text-[13px]`) → använd textskalan.
4. Inga egna hörnradier ≥ 12 px (`rounded-[16px]`) → använd `rounded-card`, `rounded-modal`, `rounded-pill`, `rounded-t-sheet` …

Undantag (färgerna ÄR innehållet): sparmålsillustrationer (`VisualArtwork.tsx`), förhandsvisning av teman (`AppearanceSettingsView.tsx`) och startsidans marknadsföring (`WaitlistLanding.tsx`).

## Logga

Använd alltid `<BrandLogo />` (riktiga loggan). Se `CLAUDE.md`.
