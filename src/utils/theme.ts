export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let clean = hex.replace('#', '');
  if (clean.length === 3) {
    clean = clean.split('').map((c) => c + c).join('');
  }
  const num = parseInt(clean, 16) || 0x3b82f6;
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function applyThemeColor(themeColorHex: string = '#3B82F6', isDark: boolean = false) {
  if (typeof document === 'undefined') return;
  const hex = (themeColorHex || '#3B82F6').trim();
  try {
    localStorage.setItem('dejz_theme_color', hex);
  } catch {
    // Ignore storage errors
  }
  const targets = [document.documentElement, document.body].filter(Boolean);
  const { r, g, b } = hexToRgb(hex);

  targets.forEach((target) => {
    target.style.setProperty('--user-accent-hex', hex);
    target.style.setProperty('--user-accent-rgb', `${r}, ${g}, ${b}`);

    // Soft, premium, tinted ambient background for Light Mode
    // Starts with a subtle top accent tint (0.075), gently transitions through a faint mist (0.035),
    // and settles into a serene, airy tinted off-white (0.015).
    const lightBgGradient = 'linear-gradient(180deg, rgba(247, 248, 250, 0) 0%, #F7F8FA 400px), linear-gradient(120deg, #D4F1E3 0%, #CBECF2 50%, #C7D8FF 100%)';

    target.style.setProperty('--app-bg-gradient', isDark ? 'none' : lightBgGradient);
    target.style.setProperty('--app-bg-top-tint', 'transparent');
    target.style.setProperty('--app-bg-bottom-tint', 'transparent');

    target.style.setProperty('--user-home-bg-from', 'transparent');
    target.style.setProperty('--user-home-bg-to', 'transparent');
    target.style.setProperty('--app-bg-tint', 'transparent');

    target.style.setProperty('--user-accent', hex);
    target.style.setProperty('--user-accent-soft', isDark ? `rgba(${r}, ${g}, ${b}, 0.18)` : `rgba(${r}, ${g}, ${b}, 0.10)`);
    target.style.setProperty('--user-accent-surface', isDark ? `rgba(${r}, ${g}, ${b}, 0.08)` : `rgba(${r}, ${g}, ${b}, 0.04)`);

    const hoverColor = `color-mix(in srgb, ${hex} 88%, black)`;
    const pressedColor = `color-mix(in srgb, ${hex} 75%, black)`;

    const isLightAccent = hex.toLowerCase() === '#8bdcc0' || hex.toLowerCase() === '#d4f1e3' || hex.toLowerCase() === '#cbecf2';
    const onAccentColor = isLightAccent ? '#151718' : '#FFFFFF';

    target.style.setProperty('--accent-color', hex);
    target.style.setProperty('--accent-hover', hoverColor);
    target.style.setProperty('--accent-pressed', pressedColor);
    target.style.setProperty('--accent-gradient', hex);
    target.style.setProperty('--accent-soft', isDark ? `rgba(${r}, ${g}, ${b}, 0.18)` : `rgba(${r}, ${g}, ${b}, 0.12)`);
    target.style.setProperty('--on-accent', onAccentColor);
    target.style.setProperty('--text-on-accent', onAccentColor);
    target.style.setProperty('--accent-container', isDark ? `rgba(${r}, ${g}, ${b}, 0.22)` : `rgba(${r}, ${g}, ${b}, 0.12)`);
    target.style.setProperty('--accent-secondary-color', isDark ? `rgba(${r}, ${g}, ${b}, 0.22)` : `rgba(${r}, ${g}, ${b}, 0.12)`);
    target.style.setProperty('--on-accent-container', isDark ? '#FFFFFF' : hex);
    target.style.setProperty('--accent-on-solid', onAccentColor);
    target.style.setProperty('--dejz-accent', hex);

    target.style.setProperty('--btn-primary-bg', hex);
    target.style.setProperty('--btn-primary-text', '#FFFFFF');
    target.style.setProperty('--btn-primary-hover', hoverColor);
    target.style.setProperty('--btn-primary-pressed', pressedColor);

    target.style.setProperty('--nav-plus-bg', hex);
    target.style.setProperty('--nav-plus-color', '#FFFFFF');
    target.style.setProperty('--nav-active-color', hex);
  });
}
