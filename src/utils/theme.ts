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

export function applyThemeColor(themeColorHex: string = 'neutral', isDark: boolean = false) {
  if (typeof document === 'undefined') return;

  const rawInput = (themeColorHex || 'neutral').trim();
  const isNeutral = rawInput.toLowerCase() === 'neutral' || rawInput.toLowerCase() === '#neutral' || rawInput.toLowerCase() === 'default' || rawInput === '';

  let hex: string;
  let hoverColor: string;
  let pressedColor: string;
  let onAccentColor: string;
  let activeIconColor: string;
  let r: number, g: number, b: number;

  if (isNeutral) {
    try {
      localStorage.setItem('dejz_theme_color', 'neutral');
    } catch {
      // Ignore storage errors
    }

    if (isDark) {
      // Dark / Black Theme - Dejz Neutral
      hex = '#F5F5F5';
      r = 245; g = 245; b = 245;
      onAccentColor = '#151718';
      hoverColor = '#E5E5E5';
      pressedColor = '#D5D5D5';
      activeIconColor = '#F5F5F5';
    } else {
      // Light Theme - Dejz Neutral
      hex = '#151718';
      r = 21; g = 23; b = 24;
      onAccentColor = '#FFFFFF';
      hoverColor = '#292C2E';
      pressedColor = '#080A0B';
      activeIconColor = '#151718';
    }
  } else {
    hex = rawInput;
    try {
      localStorage.setItem('dejz_theme_color', hex);
    } catch {
      // Ignore storage errors
    }

    const rgb = hexToRgb(hex);
    r = rgb.r; g = rgb.g; b = rgb.b;

    hoverColor = `color-mix(in srgb, ${hex} 88%, black)`;
    pressedColor = `color-mix(in srgb, ${hex} 75%, black)`;

    const isLightAccent = ['#ceb9ef', '#ffe0ce', '#f8c4df', '#8bdcc0', '#d4f1e3', '#cbecf2'].includes(hex.toLowerCase());
    onAccentColor = isLightAccent ? '#151718' : '#FFFFFF';
    activeIconColor = (!isDark && isLightAccent) ? `color-mix(in srgb, ${hex} 55%, #151718)` : hex;
  }

  const targets = [document.documentElement, document.body].filter(Boolean);

  targets.forEach((target) => {
    target.style.setProperty('--user-accent-hex', hex);
    target.style.setProperty('--user-accent-rgb', `${r}, ${g}, ${b}`);

    // Soft, premium, tinted ambient background for Light Mode (Peach - Pink - Lavender gradient)
    const lightBgGradient = 'linear-gradient(180deg, rgba(242, 240, 240, 0) 0%, #F2F0F0 400px), linear-gradient(120deg, #FFE0CE 0%, #F8C4DF 50%, #CEB9EF 100%)';

    target.style.setProperty('--app-bg-gradient', isDark ? 'none' : lightBgGradient);
    target.style.setProperty('--app-bg-top-tint', 'transparent');
    target.style.setProperty('--app-bg-bottom-tint', 'transparent');

    target.style.setProperty('--user-home-bg-from', 'transparent');
    target.style.setProperty('--user-home-bg-to', 'transparent');
    target.style.setProperty('--app-bg-tint', 'transparent');

    target.style.setProperty('--user-accent', hex);
    target.style.setProperty('--user-accent-soft', isDark ? `rgba(${r}, ${g}, ${b}, 0.18)` : `rgba(${r}, ${g}, ${b}, 0.08)`);
    target.style.setProperty('--user-accent-surface', isDark ? `rgba(${r}, ${g}, ${b}, 0.08)` : `rgba(${r}, ${g}, ${b}, 0.04)`);

    target.style.setProperty('--accent-color', hex);
    target.style.setProperty('--accent-hover', hoverColor);
    target.style.setProperty('--accent-pressed', pressedColor);
    target.style.setProperty('--accent-gradient', hex);
    target.style.setProperty('--accent-soft', isDark ? `rgba(${r}, ${g}, ${b}, 0.18)` : `rgba(${r}, ${g}, ${b}, 0.08)`);
    target.style.setProperty('--on-accent', onAccentColor);
    target.style.setProperty('--text-on-accent', onAccentColor);
    target.style.setProperty('--accent-container', isDark ? `rgba(${r}, ${g}, ${b}, 0.18)` : `rgba(${r}, ${g}, ${b}, 0.08)`);
    target.style.setProperty('--accent-secondary-color', isDark ? `rgba(${r}, ${g}, ${b}, 0.18)` : `rgba(${r}, ${g}, ${b}, 0.08)`);
    target.style.setProperty('--on-accent-container', isDark ? '#FFFFFF' : activeIconColor);
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
