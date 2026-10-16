export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16) || 0x151718;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export interface AccentColorSpec {
  id: string;
  nameSv: string;
  nameEn: string;
  light: { bg: string; text: string };
  dark: { bg: string; text: string };
}

export const DEJZ_ACCENTS: Record<string, AccentColorSpec> = {
  neutral: {
    id: 'neutral',
    nameSv: 'Monokrom',
    nameEn: 'Monochrome',
    light: { bg: '#0B0B0F', text: '#FFFFFF' },
    dark: { bg: '#FFFFFF', text: '#0B0B0F' },
  },
  coral: {
    id: 'coral',
    nameSv: 'Dejz Signatur',
    nameEn: 'Dejz Signature',
    light: { bg: '#F0485E', text: '#FFFFFF' },
    dark: { bg: '#FB6074', text: '#FFFFFF' },
  },
  cobalt: {
    id: 'cobalt',
    nameSv: 'Koboltblå',
    nameEn: 'Nordic Cobalt',
    light: { bg: '#2B5CE6', text: '#FFFFFF' },
    dark: { bg: '#8FAEFF', text: '#0B0B0F' },
  },
  fjord: {
    id: 'fjord',
    nameSv: 'Fjordblå',
    nameEn: 'Fjord Blue',
    light: { bg: '#2B5B84', text: '#FFFFFF' },
    dark: { bg: '#91B7D6', text: '#0B0B0F' },
  },
  sky: {
    id: 'sky',
    nameSv: 'Himmelsblå',
    nameEn: 'Nordic Sky',
    light: { bg: '#9EC5E8', text: '#0B0B0F' },
    dark: { bg: '#9EC5E8', text: '#0B0B0F' },
  },
  sage: {
    id: 'sage',
    nameSv: 'Salvia',
    nameEn: 'Nordic Sage',
    light: { bg: '#4B6B5A', text: '#FFFFFF' },
    dark: { bg: '#A5C5AF', text: '#0B0B0F' },
  },
  emerald: {
    id: 'emerald',
    nameSv: 'Smaragd',
    nameEn: 'Emerald',
    light: { bg: '#15804A', text: '#FFFFFF' },
    dark: { bg: '#65D994', text: '#0B0B0F' },
  },
  amber: {
    id: 'amber',
    nameSv: 'Bärnsten',
    nameEn: 'Warm Amber',
    light: { bg: '#E5A93B', text: '#0B0B0F' },
    dark: { bg: '#E5A93B', text: '#0B0B0F' },
  },
  terracotta: {
    id: 'terracotta',
    nameSv: 'Terrakotta',
    nameEn: 'Terracotta',
    light: { bg: '#B8543B', text: '#FFFFFF' },
    dark: { bg: '#F1AA96', text: '#0B0B0F' },
  },
};

/**
 * Normalizes any stored hex or identifier into a canonical accent key.
 */
export function resolveAccentKey(themeColorHex: string | undefined): string {
  const raw = (themeColorHex || 'neutral').trim().toLowerCase();
  if (!raw || raw === 'neutral' || raw === '#neutral' || raw === 'default') return 'neutral';
  if (raw === 'coral' || raw === '#f0485e' || raw === '#fb6074') return 'coral';
  if (raw === 'cobalt' || raw === '#2b5ce6' || raw === '#8faeff') return 'cobalt';
  if (raw === 'fjord' || raw === '#2b5b84' || raw === '#91b7d6') return 'fjord';
  if (raw === 'sky' || raw === '#9ec5e8') return 'sky';
  if (raw === 'sage' || raw === '#4b6b5a' || raw === '#a5c5af') return 'sage';
  if (raw === 'emerald' || raw === '#15804a' || raw === '#65d994') return 'emerald';
  if (raw === 'amber' || raw === '#e5a93b') return 'amber';
  if (raw === 'terracotta' || raw === '#b8543b' || raw === '#f1aa96') return 'terracotta';
  return 'neutral';
}

export function getThemeColorLabel(themeColorHex: string | undefined, isEn: boolean = false): string {
  const key = resolveAccentKey(themeColorHex);
  const spec = DEJZ_ACCENTS[key] || DEJZ_ACCENTS.neutral;
  return isEn ? spec.nameEn : spec.nameSv;
}

export function applyThemeColor(
  themeColorHex: string = 'neutral',
  isDark: boolean = false,
  persist: boolean = true
) {
  if (typeof document === 'undefined') return;

  const key = resolveAccentKey(themeColorHex);
  const spec = DEJZ_ACCENTS[key] || DEJZ_ACCENTS.neutral;

  if (persist) {
    try {
      // Store standard key or representative hex
      localStorage.setItem('dejz_theme_color', key === 'neutral' ? 'neutral' : spec.light.bg);
    } catch {
      // Ignore storage errors
    }
  }

  const activePair = isDark ? spec.dark : spec.light;
  const hex = activePair.bg;
  const onAccentColor = activePair.text;

  // Hover: blanda knappbakgrunden med 6 % svart
  // Pressed: blanda knappbakgrunden med 10 % svart
  // Behåll samma textfärg i dessa tillstånd
  const hoverColor = `color-mix(in srgb, ${hex} 94%, #000000 6%)`;
  const pressedColor = `color-mix(in srgb, ${hex} 90%, #000000 10%)`;

  const rgb = hexToRgb(hex);
  const { r, g, b } = rgb;

  // Korall och brand-signatur
  const brandSignatureColor = isDark ? '#FB6074' : '#F0485E';
  // Små korallfärgade länkar eller texter på ljusa ytor: #BE2943. På mörka ytor: #FB6074.
  const brandSignatureTextColor = isDark ? '#FB6074' : '#BE2943';
  // Text och ikoner på fyllda korallknappar: #FFFFFF i samtliga teman
  const brandSignatureBtnText = '#FFFFFF';

  // Fokusfärg
  const focusColor = isDark ? '#F7F8FA' : '#0B0B0F';

  const targets = [document.documentElement, document.body].filter(Boolean);

  targets.forEach((target) => {
    target.style.setProperty('--user-accent-hex', hex);
    target.style.setProperty('--user-accent-rgb', `${r}, ${g}, ${b}`);
    target.style.setProperty('--brand-signature', brandSignatureColor);
    target.style.setProperty('--brand-signature-text', brandSignatureTextColor);
    target.style.setProperty('--brand-signature-btn-text', brandSignatureBtnText);
    target.style.setProperty('--text-on-coral', '#FFFFFF');
    target.style.setProperty('--brand-peach', '#FFD8CE');
    target.style.setProperty('--brand-peach-text', '#0B0B0F');
    target.style.setProperty('--logo-color', isDark ? '#FFFFFF' : '#0B0B0F');
    target.style.setProperty('--focus-color', focusColor);

    // 100% Flat Matte Nordic Canvas — Inga dekorativa glows
    target.style.setProperty('--app-bg-gradient', 'none');
    target.style.setProperty('--app-bg-top-tint', 'transparent');
    target.style.setProperty('--app-bg-bottom-tint', 'transparent');
    target.style.setProperty('--user-home-bg-from', 'transparent');
    target.style.setProperty('--user-home-bg-to', 'transparent');
    target.style.setProperty('--app-bg-tint', 'transparent');

    target.style.setProperty('--user-accent', hex);
    target.style.setProperty('--accent-color', hex);
    target.style.setProperty('--accent-hover', hoverColor);
    target.style.setProperty('--accent-pressed', pressedColor);
    target.style.setProperty('--accent-gradient', hex);
    target.style.setProperty('--on-accent', onAccentColor);
    target.style.setProperty('--text-on-accent', onAccentColor);
    target.style.setProperty('--accent-soft', isDark ? `rgba(${r}, ${g}, ${b}, 0.16)` : `rgba(${r}, ${g}, ${b}, 0.08)`);
    target.style.setProperty('--accent-container', isDark ? `var(--surface-nested)` : `var(--surface-nested)`);
    target.style.setProperty('--accent-secondary-color', isDark ? `var(--surface-nested)` : `var(--surface-nested)`);
    target.style.setProperty('--on-accent-container', isDark ? '#FFFFFF' : '#0B0B0F');
    target.style.setProperty('--accent-on-solid', onAccentColor);
    target.style.setProperty('--dejz-accent', hex);

    // Primary button mapping
    target.style.setProperty('--btn-primary-bg', hex);
    target.style.setProperty('--btn-primary-text', onAccentColor);
    target.style.setProperty('--btn-primary-hover', hoverColor);
    target.style.setProperty('--btn-primary-pressed', pressedColor);

    // Valda chips: accentbakgrund med motsvarande on-accent enligt tabellen
    target.style.setProperty('--chip-active-bg', hex);
    target.style.setProperty('--chip-active-text', onAccentColor);

    // Valda datum/navigation
    target.style.setProperty('--date-active-bg', hex);
    target.style.setProperty('--date-active-color', onAccentColor);
    target.style.setProperty('--nav-plus-bg', hex);
    target.style.setProperty('--nav-plus-color', onAccentColor);
    target.style.setProperty('--nav-active-color', hex);
  });
}
