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

## Textstorlekar

| Klass | Storlek | Används till |
|---|---|---|
| `text-micro` | 10 px | Små märken |
| `text-caption` | 11 px | Etiketter i versaler, metadata |
| `text-meta` | 12 px | Undertexter i rader |
| `text-footnote` | 13 px | Radtitlar, länkar |
| `text-callout` | 14 px | Knappar, brödtext i listor |
| `text-subhead` | 15 px | Mellanrubriker |
| `text-base` och uppåt | Tailwind | Rubriker och belopp |

## Komponentklasser

Återkommande delar har **en** klass var. Byt deras utseende i `@layer components` i `index.css`:

- **Knappar:** `ui-btn-primary` (huvudknapp), `ui-btn-primary-flow` (introduktionen), `ui-btn-secondary`, `ui-btn-danger`, `ui-pill-btn` ("Redigera"), `ui-text-btn` ("Avbryt"), `ui-icon-btn`, `ui-dialog-btn-primary` / `-secondary` (val i dialoger), `ui-clear-btn`
- **Ark och rubriker:** `ui-sheet-header`, `ui-sheet-sub-header`, `ui-sheet-title`, `ui-sheet-group`, `ui-step-title`
- **Listor och rader:** `ui-list-card`, `ui-row`, `ui-row-btn`, `ui-row-title`, `ui-row-subtitle`, `ui-row-amount`, `ui-tx-row`, `ui-list-row-title`
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
