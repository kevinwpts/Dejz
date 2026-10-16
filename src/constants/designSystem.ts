/**
 * Dejz Design System - Central Semantic Design Tokens (Phase 1)
 * Single source of truth for design measurements, styles, colors, typography, and layout.
 * Controlled via CSS custom properties in index.css with strict fallback values.
 */

export const DEJZ_COLORS = {
  light: {
    canvas: 'var(--bg-color, #F4F5F7)',
    surface: 'var(--surface-color, #FFFFFF)',
    surfaceRaised: 'var(--surface-raised, #FFFFFF)',
    surfaceHigh: 'var(--surface-high, #ECEEF2)',
    surfaceMuted: 'var(--surface-muted, #ECEEF2)',
    surfaceNested: 'var(--surface-nested, #ECEEF2)',
    surfaceInput: 'var(--surface-input, #ECEEF2)',
    surfaceHover: 'var(--bg-hover, #E4E7EC)',
    textPrimary: 'var(--text-primary, #0B0B0F)',
    textMetricLabel: 'var(--text-metric-label, #1F2229)',
    textSecondary: 'var(--text-secondary, #5A606E)',
    textTertiary: 'var(--text-tertiary, #626979)',
    textMuted: 'var(--text-muted, #626979)',
    textDisabled: 'var(--text-disabled, #A8AEB9)',
    textInactive: 'var(--text-inactive, #A8AEB9)',
    borderSubtle: 'var(--border-subtle, rgba(11, 11, 15, 0.065))',
    border: 'var(--border-color, rgba(11, 11, 15, 0.065))',
    borderStrong: 'var(--border-strong, rgba(11, 11, 15, 0.14))',
    borderControl: 'var(--border-control, #737B8C)',
    borderDivider: 'var(--border-divider, rgba(11, 11, 15, 0.065))',
    focusColor: 'var(--focus-color, #0B0B0F)',
    accent: 'var(--accent-color, #0B0B0F)',
    accentHover: 'var(--accent-hover, color-mix(in srgb, #0B0B0F 94%, #000000 6%))',
    accentPressed: 'var(--accent-pressed, color-mix(in srgb, #0B0B0F 90%, #000000 10%))',
    accentSoft: 'var(--accent-soft, rgba(11, 11, 15, 0.08))',
    accentContainer: 'var(--accent-container, #ECEEF2)',
    onAccent: 'var(--on-accent, #FFFFFF)',
    onAccentContainer: 'var(--on-accent-container, #0B0B0F)',
    danger: 'var(--danger-color, #BE123C)',
    dangerContainer: 'var(--danger-container, #FDECEF)',
    warning: 'var(--warning-color, #B45309)',
    warningContainer: 'var(--warning-container, #FFF3D6)',
    success: 'var(--success-color, #15804A)',
    successContainer: 'var(--success-container, #E8F4EC)',
    info: 'var(--info-color, #1F2229)',
    infoContainer: 'var(--info-container, #ECEEF2)',
    scrim: 'var(--scrim-color, rgba(11, 11, 15, 0.58))',
  },
  dark: {
    canvas: 'var(--bg-color, #0B0C0E)',
    surface: 'var(--surface-color, #15181E)',
    surfaceRaised: 'var(--surface-raised, #1D2129)',
    surfaceHigh: 'var(--surface-high, #252A34)',
    surfaceMuted: 'var(--surface-muted, #252A34)',
    surfaceNested: 'var(--surface-nested, #252A34)',
    surfaceInput: 'var(--surface-input, #252A34)',
    surfaceHover: 'var(--bg-hover, #2E3440)',
    textPrimary: 'var(--text-primary, #F7F8FA)',
    textMetricLabel: 'var(--text-metric-label, #E2E5EC)',
    textSecondary: 'var(--text-secondary, #B5BDCC)',
    textTertiary: 'var(--text-tertiary, #A0A8B8)',
    textMuted: 'var(--text-muted, #A0A8B8)',
    textDisabled: 'var(--text-disabled, #4B5563)',
    textInactive: 'var(--text-inactive, #4B5563)',
    borderSubtle: 'var(--border-subtle, rgba(255, 255, 255, 0.04))',
    border: 'var(--border-color, rgba(255, 255, 255, 0.04))',
    borderStrong: 'var(--border-strong, rgba(255, 255, 255, 0.14))',
    borderControl: 'var(--border-control, #7D8798)',
    borderDivider: 'var(--border-divider, rgba(255, 255, 255, 0.08))',
    focusColor: 'var(--focus-color, #F7F8FA)',
    accent: 'var(--accent-color, #FFFFFF)',
    accentHover: 'var(--accent-hover, color-mix(in srgb, #FFFFFF 94%, #000000 6%))',
    accentPressed: 'var(--accent-pressed, color-mix(in srgb, #FFFFFF 90%, #000000 10%))',
    accentSoft: 'var(--accent-soft, rgba(255, 255, 255, 0.16))',
    accentContainer: 'var(--accent-container, #252A34)',
    onAccent: 'var(--on-accent, #0B0B0F)',
    onAccentContainer: 'var(--on-accent-container, #FFFFFF)',
    danger: 'var(--danger-color, #FF8080)',
    dangerContainer: 'var(--danger-container, #381F1F)',
    warning: 'var(--warning-color, #FBBF24)',
    warningContainer: 'var(--warning-container, #342A16)',
    success: 'var(--success-color, #4ADE80)',
    successContainer: 'var(--success-container, #163025)',
    info: 'var(--info-color, #E2E5EC)',
    infoContainer: 'var(--info-container, #252A34)',
    scrim: 'var(--scrim-color, rgba(8, 9, 12, 0.68))',
  },
  black: {
    canvas: 'var(--bg-color, #0A0A0A)',
    surface: 'var(--surface-color, #121212)',
    surfaceRaised: 'var(--surface-raised, #181818)',
    surfaceHigh: 'var(--surface-high, #202020)',
    surfaceMuted: 'var(--surface-muted, #1A1A1A)',
    surfaceNested: 'var(--surface-nested, #1A1A1A)',
    surfaceInput: 'var(--surface-input, #202020)',
    surfaceHover: 'var(--bg-hover, #222222)',
    textPrimary: 'var(--text-primary, #FFFFFF)',
    textMetricLabel: 'var(--text-metric-label, #E2E2E2)',
    textSecondary: 'var(--text-secondary, #B8B8B8)',
    textTertiary: 'var(--text-tertiary, #999999)',
    textMuted: 'var(--text-muted, #999999)',
    textDisabled: 'var(--text-disabled, #707070)',
    textInactive: 'var(--text-inactive, #707070)',
    borderSubtle: 'var(--border-subtle, rgba(255, 255, 255, 0.04))',
    border: 'var(--border-color, rgba(255, 255, 255, 0.04))',
    borderStrong: 'var(--border-strong, #333333)',
    borderControl: 'var(--border-control, #808080)',
    borderDivider: 'var(--border-divider, rgba(255, 255, 255, 0.08))',
    focusColor: 'var(--focus-color, #FFFFFF)',
    accent: 'var(--accent-color, #FFFFFF)',
    accentHover: 'var(--accent-hover, color-mix(in srgb, #FFFFFF 94%, #000000 6%))',
    accentPressed: 'var(--accent-pressed, color-mix(in srgb, #FFFFFF 90%, #000000 10%))',
    accentSoft: 'var(--accent-soft, rgba(255, 255, 255, 0.16))',
    accentContainer: 'var(--accent-container, #1A1A1A)',
    onAccent: 'var(--on-accent, #0B0B0F)',
    onAccentContainer: 'var(--on-accent-container, #FFFFFF)',
    danger: 'var(--danger-color, #FF8080)',
    dangerContainer: 'var(--danger-container, #301A1A)',
    warning: 'var(--warning-color, #FBBF24)',
    warningContainer: 'var(--warning-container, #2C2413)',
    success: 'var(--success-color, #4ADE80)',
    successContainer: 'var(--success-container, #12271C)',
    info: 'var(--info-color, #E2E2E2)',
    infoContainer: 'var(--info-container, #202020)',
    scrim: 'var(--scrim-color, rgba(0, 0, 0, 0.60))',
  },
} as const;

export const DS = {
  colors: DEJZ_COLORS,

  /**
   * Semantic Corner Radii tokens
   * Any change in index.css CSS variables will automatically propagate.
   */
  radius: {
    card: 'rounded-[var(--radius-card,24px)]',
    cardNested: 'rounded-[var(--radius-card-nested,16px)]',
    button: 'rounded-[var(--radius-button,9999px)]',
    buttonSm: 'rounded-[var(--radius-button-sm,9999px)]',
    buttonLg: 'rounded-[var(--radius-button-lg,9999px)]',
    input: 'rounded-[var(--radius-input,16px)]',
    modal: 'rounded-[var(--radius-modal,28px)]',
    modalSheet: 'rounded-t-[var(--radius-modal,28px)] sm:rounded-[var(--radius-modal,28px)]',
    chip: 'rounded-[var(--radius-chip,9999px)]',
    badge: 'rounded-[var(--radius-badge,9999px)]',
    sm: 'rounded-[var(--radius-sm,8px)]',
    xs: 'rounded-[var(--radius-xs,8px)]',
    icon: 'rounded-[var(--radius-icon-button,9999px)]',
    pill: 'rounded-[var(--radius-pill,9999px)]',
    bottomNav: 'rounded-[var(--radius-modal,28px)]',
    container: 'rounded-[var(--radius-container,24px)]',
  },

  /**
   * Component Dimensions / Heights
   */
  heights: {
    input: 'h-[var(--height-input,46px)]',
    button: 'h-[var(--height-button,46px)]',
    buttonSm: 'h-[var(--height-button-sm,32px)]',
    buttonLg: 'h-[var(--height-button-lg,48px)]',
    buttonPill: 'h-8',
    search: 'h-[var(--height-search,46px)]',
    iconButtonSm: 'w-7 h-7',
    iconButton: 'w-8 h-8',
    iconButtonLg: 'w-10 h-10',
    iconContainerSm: 'w-8 h-8',
    iconContainer: 'w-10 h-10',
    iconContainerLg: 'w-12 h-12',
    header: 'h-[var(--height-header,64px)]',
    bottomNav: 'h-[var(--height-bottom-nav,64px)]',
  },

  /**
   * Standard Typography token classes
   */
  typography: {
    heroAmount: 'text-hero-amount',
    largeAmount: 'text-large-amount',
    listAmount: 'text-list-amount',
    pageTitle: 'text-page-title',
    sectionTitle: 'text-section-title',
    cardTitle: 'text-card-title',
    metricLabel: 'text-metric-label',
    body: 'text-body',
    bodyMedium: 'text-body-medium',
    secondary: 'text-secondary',
    label: 'text-label',
    micro: 'text-micro-label',
    // Keep existing utility roles mapped to new scale as needed
    amount: 'text-list-amount tabular-nums',
    metadata: 'text-micro-label',
    button: 'text-body-medium',
    input: 'text-body',
  },

  weights: {
    regular: 'font-normal',
    ui: 'font-medium',
    emphasis: 'font-semibold',
    strong: 'font-semibold',
  },

  /**
   * Border, Divide, Shadow & Ring Tokens
   */
  borders: {
    subtle: 'border-subtle',
    control: 'border-control',
    strong: 'border-strong',
    divider: 'border-divider',
  },
  shadows: {
    none: 'shadow-none',
    subtle: 'shadow-subtle',
    modal: 'shadow-modal',
  },
  divides: {
    subtle: 'divide-subtle',
    divider: 'divide-divider',
  },
  rings: {
    focus: 'ring-focus',
    control: 'ring-control',
    accent: 'ring-accent',
  },

  /**
   * Spacing & Layout Tokens
   */
  spacing: {
    pageContainer: 'page-container',
    pagePx: 'page-px',
    pageMax: 'page-max',
    cardPadding: 'card-p',
    cardPaddingSm: 'card-p-sm',
    cardPaddingLg: 'card-p-lg',
    rowPadding: 'row-p',
    elementGap: 'gap-element',
    sectionGap: 'gap-section',
    sectionSpace: 'space-y-section',
    elementSpace: 'space-y-element',
    modalPadding: 'modal-p',
  },

  /**
   * Layering & Z-Index constants
   */
  zIndex: {
    base: 1,
    dropdown: 20,
    sticky: 30,
    header: 40,
    bottomNav: 40,
    backdrop: 90,
    modal: 100,
    sheet: 110,
    toast: 120,
    tooltip: 130,
  },

  /**
   * Transitions & Motion
   */
  transitions: {
    default: 'transition-all duration-150 ease-out',
    fast: 'transition-all duration-100 ease-out',
    bounce: 'transition-transform active:scale-[0.98]',
  },
} as const;

export const designSystem = DS;
