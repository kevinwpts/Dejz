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
| Grupper i ark, avdelare, tryck | `--fill-grouped`, `--separator`, `--press-overlay`, `--card-shadow` | Rader i ark, listkort, tryckkänsla |
| Segmentväljare och reglage | `--segment-track`, `--segment-thumb`, `--segment-thumb-shadow` | Alla/Utgifter/Inkomster, Utgift/Inkomst, av-läge för reglage |
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
- **Avdelare börjar efter ikonen** (`.ui-list-card`: 52 px, `.ui-inset-divide`: 68 px, `.ui-list-card-check`: 92 px). Sätt `--row-inset` om en lista behöver annat.
- **Grupper inne i ark** (`ui-sheet-group`, `ui-field-card`, `ui-action-tile`) har grå fyllning `--fill-grouped` – aldrig kantlinje. Skriv `bg-[var(--fill-grouped)]` för egna rutor i ark, inte `bg-[var(--bg-color)] border …`.
- **Tre textnivåer:** sidrubrik (`ui-large-title`, 30 px fet) · radtext (`ui-row-title`, 15 px medium) · sekundärtext (`ui-row-subtitle`, 13 px). Belopp: `ui-row-amount` (15 px), detaljvyer 34 px, hemkortet 46 px – alltid `tabular-nums` och tät spärrning.
- **Etiketter skrivs i vanlig skiftläge** ("Namn", "Belopp") – inga VERSALER.
- **Tryckkänsla:** knappar krymper lite (`active:scale-[0.97]`), rader får en svag ton (`active:bg-[var(--press-overlay)]`). Allt stängs av vid "Reducera rörelse".
- **Kategoriikoner** är en ikonfamilj (Phosphor, fylld) i en ruta tonad med kategorins färg (`.ui-cat-tile` + `categoryColorStyle()` från `CategoryIcon.tsx`). Små ikoner i undertexter tar textens färg. Butikslogor ligger i `.ui-logo-tile` – samma form och storlek.

## Arkhuvud – alltid `<SheetHeader />`

Alla ark och dialoger använder komponenten `src/components/ui/SheetHeader.tsx` (även `BottomSheet` med `title`):

- **Visa / välj / lägg till** (standard): `[‹] Rubrik` till vänster (17 px) · åtgärder till höger · rund stängknapp sist. `onBack` ger tillbakapil i undervyer.
- **Redigera** (`variant="edit"`, när man kommer från en detaljvy): `Avbryt` · rubrik i mitten · valfri åtgärd.
- Fristående formulär (ny kategori, nytt betalsätt, introduktionens ark) räknas som "lägg till" och har stängknapp.

## Textstorlekar

| Klass | Storlek | Används till |
|---|---|---|
| `text-micro` | 10 px | Små märken |
| `text-caption` | 11 px | Små etiketter, metadata |
| `text-meta` | 12 px | Undertexter i rader |
| `text-footnote` | 13 px | Radtitlar, länkar |
| `text-callout` | 14 px | Knappar, brödtext i listor |
| `text-subhead` | 15 px | Mellanrubriker |
| `text-base` och uppåt | Tailwind | Rubriker och belopp |

## Komponentklasser

Återkommande delar har **en** klass var. Byt deras utseende i `@layer components` i `index.css`:

- **Knappar:** `ui-btn-primary` (huvudknapp, 52 px), `ui-btn-primary-flow` (introduktionen), `ui-btn-secondary` (grå), `ui-btn-danger` (röd text utan ram – "Ta bort …"), `ui-pill-btn` ("Redigera"), `ui-text-btn` ("Avbryt"), `ui-icon-btn` (grå rund, t.ex. stäng), `ui-header-btn` (toppraden), `ui-dialog-btn-primary` / `-secondary` (val i dialoger), `ui-clear-btn`
- **Sidor och ark:** `ui-large-title` (stor rubrik på flikarna), `ui-sheet-header`, `ui-sheet-sub-header`, `ui-sheet-title`, `ui-sheet-group`, `ui-step-title`
- **Bottenmeny:** `ui-tabbar`, `ui-tabbar-item` / `-active`, `ui-fab` (plusknappen), `ui-tabbar-fade`
- **Listor och rader:** `ui-list-card`, `ui-inset-divide`, `ui-row`, `ui-row-btn`, `ui-row-title`, `ui-row-subtitle`, `ui-row-amount`, `ui-tx-row`, `ui-list-row-title`
- **Bockrutor:** `ui-checkbox` + `ui-checkbox-on` (lila fylld cirkel) / `ui-checkbox-off` (ring)
- **Ikonrutor:** `ui-cat-tile` (kategorifärgad), `ui-cat-glyph`, `ui-logo-tile` (butikslogga)
- **Formulär:** `ui-field-card`, `ui-field-label`, `ui-field-input`, `ui-field-input-lg`, `ui-checkbox`, `ui-input-icon`, `ui-search-box`, `ui-switch`, `ui-segmented`
- **Kort och plattor:** `ui-card`, `ui-action-tile` (+ `-label`), `ui-shortcut-tile`, `ui-option-card`, `ui-chip`, `ui-chip-sm`
- **Tomma lägen och sektioner:** `ui-empty-state`, `ui-section-header`, `ui-section-title`, `ui-stat-label`, `ui-stat-value`

Ny komponent som ska finnas på flera ställen? Lägg en `ui-…`-klass i `index.css` i stället för att kopiera långa klasslistor.

## Regler (stoppas av designvakten)

1. Inga Tailwind-standardfärger (`text-emerald-600`, `bg-rose-500` …) → använd betydelsefärgerna ovan.
2. Inga hex-färger i klassnamn (`bg-[#5B3DF5]`) → lägg färgen som variabel.
3. Inga egna textstorlekar 10–15 px (`text-[13px]`) → använd textskalan.
4. Inga egna hörnradier ≥ 12 px (`rounded-[16px]`) → använd `rounded-card`, `rounded-modal`, `rounded-pill`, `rounded-t-sheet` …

Undantag (färgerna ÄR innehållet): sparmålsillustrationer (`VisualArtwork.tsx`), förhandsvisning av teman (`AppearanceSettingsView.tsx`) och startsidans marknadsföring (`WaitlistLanding.tsx`).

## Logga

Använd alltid `<BrandLogo />` (riktiga loggan). Se `CLAUDE.md`.
