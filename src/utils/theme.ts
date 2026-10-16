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
  const legacyRemovedHexes = ['#ceb9ef', '#ec5f8d', '#f8c4df', '#ffe0ce', '#f4d3bc', '#183b2e', '#133a2b', '#312261', '#cee876', '#c5e86c', '#ff5226', '#ff5a30'];
  const isNeutral = rawInput.toLowerCase() === 'neutral' || rawInput.toLowerCase() === '#neutral' || rawInput.toLowerCase() === 'default' || rawInput === '' || legacyRemovedHexes.includes(rawInput.toLowerCase());

  let hex: string;
  let hoverColor: string;
  let pressedColor: string;
  let onAccentColor: string;
  let activeIconColor: string;
  let brandSignatureColor: string;
  let r: number, g: number, b: number;

  if (isNeutral) {
    try {
      localStorage.setItem('dejz_theme_color', 'neutral');
    } catch {
      // Ignore storage errors
    }

    brandSignatureColor = '#E85D34';

    if (isDark) {
      // Dark / Warm Espresso Theme - Luminous Warm Terracotta (#F06A42)
      hex = '#F06A42';
      brandSignatureColor = '#F06A42';
      r = 240; g = 106; b = 66;
      onAccentColor = '#FFFDF9';
      hoverColor = '#F57B56';
      pressedColor = '#D9552E';
      activeIconColor = '#F06A42';
    } else {
      // Light / Warm Oat Linen Theme - Sun-Baked Terracotta (#E85D34)
      hex = '#E85D34';
      brandSignatureColor = '#E85D34';
      r = 232; g = 93; b = 52;
      onAccentColor = '#FFFDF9';
      hoverColor = '#D44D26';
      pressedColor = '#BC401C';
      activeIconColor = '#E85D34';
    }
  } else {
    hex = rawInput;
    brandSignatureColor = hex;
    try {
      localStorage.setItem('dejz_theme_color', hex);
    } catch {
      // Ignore storage errors
    }

    const rgb = hexToRgb(hex);
    r = rgb.r; g = rgb.g; b = rgb.b;

    hoverColor = `color-mix(in srgb, ${hex} 88%, black)`;
    pressedColor = `color-mix(in srgb, ${hex} 75%, black)`;

    const isLightAccent = ['#c5e86c', '#dce5d8', '#dfe6e9', '#e8e1d5', '#cee876', '#d8eaac', '#dfecc6', '#c8e29b', '#f4cb6e', '#f3c86b', '#c5d4f7', '#9ec6e8', '#cfe0ee', '#8bdcc0', '#d4f1e3', '#cbecf2'].includes(hex.toLowerCase());
    onAccentColor = isLightAccent ? '#1E1814' : '#FFFDF9';
    activeIconColor = (!isDark && isLightAccent) ? '#1E1814' : hex;
  }

  const targets = [document.documentElement, document.body].filter(Boolean);

  targets.forEach((target) => {
    target.style.setProperty('--user-accent-hex', hex);
    target.style.setProperty('--user-accent-rgb', `${r}, ${g}, ${b}`);
    target.style.setProperty('--brand-signature', brandSignatureColor);
    target.style.setProperty('--logo-color', isDark ? '#F7F1E8' : '#1E1814');

    // 100% Flat Matte Nordic Canvas — Zero Gradients
    target.style.setProperty('--app-bg-gradient', 'none');
    target.style.setProperty('--app-bg-top-tint', 'transparent');
    target.style.setProperty('--app-bg-bottom-tint', 'transparent');

    target.style.setProperty('--user-home-bg-from', 'transparent');
    target.style.setProperty('--user-home-bg-to', 'transparent');
    target.style.setProperty('--app-bg-tint', 'transparent');

    target.style.setProperty('--user-accent', hex);
    target.style.setProperty('--user-accent-soft', isDark ? `rgba(${r}, ${g}, ${b}, 0.18)` : `rgba(${r}, ${g}, ${b}, 0.09)`);
    target.style.setProperty('--user-accent-surface', isDark ? `rgba(${r}, ${g}, ${b}, 0.08)` : `rgba(${r}, ${g}, ${b}, 0.04)`);

    target.style.setProperty('--accent-color', hex);
    target.style.setProperty('--accent-hover', hoverColor);
    target.style.setProperty('--accent-pressed', pressedColor);
    target.style.setProperty('--accent-gradient', hex);
    target.style.setProperty('--accent-soft', isDark ? `rgba(${r}, ${g}, ${b}, 0.18)` : `rgba(${r}, ${g}, ${b}, 0.09)`);
    target.style.setProperty('--on-accent', onAccentColor);
    target.style.setProperty('--text-on-accent', onAccentColor);
    target.style.setProperty('--accent-container', isDark ? `rgba(${r}, ${g}, ${b}, 0.18)` : `rgba(${r}, ${g}, ${b}, 0.09)`);
    target.style.setProperty('--accent-secondary-color', isDark ? `rgba(${r}, ${g}, ${b}, 0.18)` : `rgba(${r}, ${g}, ${b}, 0.09)`);
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
