/**
 * Dejz Design System - Central Semantic Design Tokens (Phase 1)
 * Single source of truth for design measurements, styles, colors, typography, and layout.
 * Controlled via CSS custom properties in index.css with strict fallback values.
 */

export const DEJZ_COLORS = {
  light: {
    canvas: 'var(--bg-color, #F8F9FA)',
    surface: 'var(--surface-color, #FFFFFF)',
    surfaceRaised: 'var(--surface-raised, #FFFFFF)',
    surfaceHigh: 'var(--surface-high, #F6F7F9)',
    surfaceMuted: 'var(--surface-muted, #F2F4F7)',
    surfaceHover: 'var(--bg-hover, #F2F4F7)',
    textPrimary: 'var(--text-primary, #211F1C)',
    textMetricLabel: 'var(--text-metric-label, #4A463F)',
    textSecondary: 'var(--text-secondary, #6D6962)',
    textTertiary: 'var(--text-tertiary, #777168)',
    textMuted: 'var(--text-muted, #777168)',
    textDisabled: 'var(--text-disabled, #A8A39D)',
    textInactive: 'var(--text-inactive, #A8A39D)',
    borderSubtle: 'var(--border-subtle, #E9E9E9)',
    border: 'var(--border-color, #E9E9E9)',
    borderStrong: 'var(--border-strong, #B8B8B8)',
    borderControl: 'var(--border-control, #D8D8D8)',
    borderDivider: 'var(--border-divider, rgba(0, 0, 0, 0.05))',
    accent: 'var(--accent-color, #3B82F6)',
    accentHover: 'var(--accent-hover, #2563EB)',
    accentPressed: 'var(--accent-pressed, #1D4ED8)',
    accentSoft: 'var(--accent-soft, color-mix(in srgb, var(--accent-color) 10%, transparent))',
    accentContainer: 'var(--accent-container, color-mix(in srgb, var(--accent-color) 12%, var(--surface-color)))',
    onAccent: 'var(--on-accent, #FFFFFF)',
    onAccentContainer: 'var(--on-accent-container, #3B82F6)',
    danger: 'var(--danger-color, #EF4444)',
    dangerContainer: 'var(--danger-container, #FEE2E2)',
    warning: 'var(--warning-color, #F59E0B)',
    warningContainer: 'var(--warning-container, #FEF3C7)',
    success: 'var(--success-color, #05B862)',
    successContainer: 'var(--success-container, #DCFCE7)',
    info: 'var(--info-color, #1C1917)',
    infoContainer: 'var(--info-container, #DBEAFE)',
    scrim: 'var(--scrim-color, rgba(0, 0, 0, 0.60))',
  },
  dark: {
    canvas: 'var(--bg-color, #191919)',
    surface: 'var(--surface-color, #1C1C1C)',
    surfaceRaised: 'var(--surface-raised, #1C1C1C)',
    surfaceHigh: 'var(--surface-high, rgba(255, 255, 255, 0.06))',
    surfaceMuted: 'var(--surface-muted, rgba(255, 255, 255, 0.05))',
    surfaceHover: 'var(--bg-hover, rgba(255, 255, 255, 0.08))',
    textPrimary: 'var(--text-primary, #FFFFFF)',
    textMetricLabel: 'var(--text-metric-label, #D6D6D6)',
    textSecondary: 'var(--text-secondary, #B8B8B8)',
    textTertiary: 'var(--text-tertiary, #999999)',
    textMuted: 'var(--text-muted, #999999)',
    textDisabled: 'var(--text-disabled, #707070)',
    textInactive: 'var(--text-inactive, #707070)',
    borderSubtle: 'var(--border-subtle, rgba(255, 255, 255, 0.08))',
    border: 'var(--border-color, rgba(255, 255, 255, 0.08))',
    borderStrong: 'var(--border-strong, rgba(255, 255, 255, 0.35))',
    borderControl: 'var(--border-control, rgba(255, 255, 255, 0.18))',
    borderDivider: 'var(--border-divider, rgba(255, 255, 255, 0.05))',
    accent: 'var(--accent-color, #3B82F6)',
    accentHover: 'var(--accent-hover, #2563EB)',
    accentPressed: 'var(--accent-pressed, #1D4ED8)',
    accentSoft: 'var(--accent-soft, color-mix(in srgb, var(--accent-color) 18%, transparent))',
    accentContainer: 'var(--accent-container, color-mix(in srgb, var(--accent-color) 20%, var(--surface-color)))',
    onAccent: 'var(--on-accent, #FFFFFF)',
    onAccentContainer: 'var(--on-accent-container, #FFFFFF)',
    danger: 'var(--danger-color, #FF8080)',
    dangerContainer: 'var(--danger-container, #381F1F)',
    warning: 'var(--warning-color, #FBBF24)',
    warningContainer: 'var(--warning-container, #342A16)',
    success: 'var(--success-color, #4ADE80)',
    successContainer: 'var(--success-container, #163025)',
    info: 'var(--info-color, #FFFFFF)',
    infoContainer: 'var(--info-container, #1C1C1C)',
    scrim: 'var(--scrim-color, rgba(0, 0, 0, 0.60))',
  },
  black: {
    canvas: 'var(--bg-color, #0A0A0A)',
    surface: 'var(--surface-color, #121212)',
    surfaceRaised: 'var(--surface-raised, #181818)',
    surfaceHigh: 'var(--surface-high, #202020)',
    surfaceMuted: 'var(--surface-muted, #1A1A1A)',
    surfaceHover: 'var(--bg-hover, #222222)',
    textPrimary: 'var(--text-primary, #FFFFFF)',
    textSecondary: 'var(--text-secondary, #B8B8B8)',
    textTertiary: 'var(--text-tertiary, #999999)',
    textMuted: 'var(--text-muted, #999999)',
    textDisabled: 'var(--text-disabled, #707070)',
    textInactive: 'var(--text-inactive, #707070)',
    borderSubtle: 'var(--border-subtle, rgba(255, 255, 255, 0.06))',
    border: 'var(--border-color, rgba(255, 255, 255, 0.06))',
    borderStrong: 'var(--border-strong, #333333)',
    borderControl: 'var(--border-control, #2A2A2A)',
    borderDivider: 'var(--border-divider, rgba(255, 255, 255, 0.06))',
    accent: 'var(--accent-color, #3B82F6)',
    accentHover: 'var(--accent-hover, #2563EB)',
    accentPressed: 'var(--accent-pressed, #1D4ED8)',
    accentSoft: 'var(--accent-soft, color-mix(in srgb, var(--accent-color) 18%, transparent))',
    accentContainer: 'var(--accent-container, color-mix(in srgb, var(--accent-color) 20%, var(--surface-color)))',
    onAccent: 'var(--on-accent, #FFFFFF)',
    onAccentContainer: 'var(--on-accent-container, #FFFFFF)',
    danger: 'var(--danger-color, #FF8080)',
    dangerContainer: 'var(--danger-container, #381F1F)',
    warning: 'var(--warning-color, #FBBF24)',
    warningContainer: 'var(--warning-container, #342A16)',
    success: 'var(--success-color, #4ADE80)',
    successContainer: 'var(--success-container, #163025)',
    info: 'var(--info-color, #FFFFFF)',
    infoContainer: 'var(--info-container, #1C1C1C)',
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
    card: 'rounded-[var(--radius-card,20px)]',
    cardNested: 'rounded-[var(--radius-card-nested,12px)]',
    button: 'rounded-[var(--radius-button,12px)]',
    buttonSm: 'rounded-[var(--radius-button-sm,10px)]',
    buttonLg: 'rounded-[var(--radius-button-lg,12px)]',
    input: 'rounded-[var(--radius-input,12px)]',
    modal: 'rounded-[var(--radius-modal,24px)]',
    modalSheet: 'rounded-t-[var(--radius-modal,24px)] sm:rounded-[var(--radius-modal,24px)]',
    chip: 'rounded-[var(--radius-chip,9999px)]',
    badge: 'rounded-[var(--radius-badge,9999px)]',
    sm: 'rounded-[var(--radius-sm,6px)]',
    xs: 'rounded-[var(--radius-xs,8px)]',
    icon: 'rounded-[var(--radius-icon-button,10px)]',
    pill: 'rounded-[var(--radius-pill,9999px)]',
    bottomNav: 'rounded-[var(--radius-modal,24px)]',
    container: 'rounded-[var(--radius-container,20px)]',
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
