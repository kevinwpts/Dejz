export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16) || 0xFF385C;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export const DEJZ_SIGNATURE_COLOR = '#FF385C';
export const LIGHT_TOP_TINT_COLOR = '#FFD9E2';
export const DARK_TOP_TINT_COLOR = '#141414';

export function getThemeColorLabel(_colorHex?: string, isEn: boolean = false): string {
  return isEn ? 'Default' : 'Standard';
}

export function applyThemeColor(_themeColorHex: string = 'neutral', isDark: boolean = false) {
  if (typeof document === 'undefined') return;

  // Always enforce the single Dejz signature coral-pink/red identity, ignoring any legacy saved theme colors
  const hex = DEJZ_SIGNATURE_COLOR;
  const r = 255, g = 56, b = 92;
  const onAccentColor = '#FFFFFF';

  let hoverColor: string;
  let pressedColor: string;
  let activeIconColor: string;

  try {
    localStorage.setItem('dejz_theme_color', DEJZ_SIGNATURE_COLOR);
  } catch {
    // Ignore storage errors
  }

  if (isDark) {
    hoverColor = '#FF5976';
    pressedColor = '#E0294A';
    activeIconColor = '#FF6B85';
  } else {
    hoverColor = '#E0294A';
    pressedColor = '#C41E3D';
    activeIconColor = '#FF385C';
  }

  const targets = [document.documentElement, document.body].filter(Boolean);

  targets.forEach((target) => {
    target.style.setProperty('--user-accent-hex', hex);
    target.style.setProperty('--user-accent-rgb', `${r}, ${g}, ${b}`);

    // Pure vertical (180deg) gradient starting with a uniform solid top color (#FFD9E2)
    // so the iOS Dynamic Island / status bar and the top of the viewport match 100% seamlessly across the entire width.
    const lightBgGradient = `linear-gradient(180deg, ${LIGHT_TOP_TINT_COLOR} 0px, ${LIGHT_TOP_TINT_COLOR} 28px, #FFE4DC 160px, #F2F0F0 400px)`;

    target.style.setProperty('--app-bg-gradient', isDark ? 'none' : lightBgGradient);
    target.style.setProperty('--app-bg-top-tint', 'transparent');
    target.style.setProperty('--app-bg-bottom-tint', 'transparent');

    target.style.setProperty('--user-home-bg-from', 'transparent');
    target.style.setProperty('--user-home-bg-to', 'transparent');
    target.style.setProperty('--app-bg-tint', 'transparent');

    target.style.setProperty('--user-accent', hex);
    target.style.setProperty('--user-accent-soft', isDark ? `rgba(${r}, ${g}, ${b}, 0.18)` : `rgba(${r}, ${g}, ${b}, 0.10)`);
    target.style.setProperty('--user-accent-surface', isDark ? `rgba(${r}, ${g}, ${b}, 0.08)` : `rgba(${r}, ${g}, ${b}, 0.04)`);

    target.style.setProperty('--accent-color', hex);
    target.style.setProperty('--accent-hover', hoverColor);
    target.style.setProperty('--accent-pressed', pressedColor);
    target.style.setProperty('--accent-gradient', hex);
    target.style.setProperty('--accent-soft', isDark ? `rgba(${r}, ${g}, ${b}, 0.18)` : `rgba(${r}, ${g}, ${b}, 0.10)`);
    target.style.setProperty('--on-accent', onAccentColor);
    target.style.setProperty('--text-on-accent', onAccentColor);
    target.style.setProperty('--accent-container', isDark ? `rgba(${r}, ${g}, ${b}, 0.18)` : `rgba(${r}, ${g}, ${b}, 0.10)`);
    target.style.setProperty('--accent-secondary-color', isDark ? `rgba(${r}, ${g}, ${b}, 0.18)` : `rgba(${r}, ${g}, ${b}, 0.10)`);
    target.style.setProperty('--on-accent-container', isDark ? '#FF6B85' : activeIconColor);
    target.style.setProperty('--accent-on-solid', onAccentColor);
    target.style.setProperty('--dejz-accent', hex);

    target.style.setProperty('--btn-primary-bg', hex);
    target.style.setProperty('--btn-primary-text', onAccentColor);
    target.style.setProperty('--btn-primary-hover', hoverColor);
    target.style.setProperty('--btn-primary-pressed', pressedColor);

    target.style.setProperty('--nav-plus-bg', hex);
    target.style.setProperty('--nav-plus-color', onAccentColor);
    target.style.setProperty('--nav-active-color', activeIconColor);
    target.style.setProperty('--accent-active-icon', activeIconColor);
  });
}
