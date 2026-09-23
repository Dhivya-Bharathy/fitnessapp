const palette = {
  // ── Brand greens (CalFit primary — coach, nav, CTA) ────────
  green400: '#34D98A',
  green500: '#2DDC8C',
  green600: '#0DAE6C',
  green900: '#065F46',

  // ── Indigo / navy (hero card, dark surfaces) ───────────────
  indigo950: '#0D0A2E',   // deepest — dark mode bg
  indigo900: '#1A1445',   // calorie hero card bg
  indigo800: '#0a0911',   // dark mode surface
  indigo700: '#0b0b0c',   // dark mode card
  indigo600: '#060508',   // dark mode border

  // ── Lavender (light mode backgrounds) ──────────────────────
  lavender50:  '#F9F7FF',  // lightest — modal bg
  lavender100: '#F4F0FF',  // main app background
  lavender200: '#EAE3FF',  // surface / section bg
  lavender300: '#D8CEFF',  // borders, dividers

  // ── Gradient stops — Pink → Orange → Yellow ────────────────
  // Used on: Scan Food banner, streak badge, primary CTA buttons
  gradPink:   '#F0427C',
  gradOrange: '#FF6B35',
  gradYellow: '#FFB830',
  gradPinkLight: '#FF6EB0',  // lighter pink for card overlays

  // ── Day ring colours (weekly calendar) ─────────────────────
  ringTeal:   '#2BBCB0',   // SUN
  ringBlue:   '#4A90E2',   // MON
  ringPurple: '#9B6FE8',   // TUE
  ringOrange: '#FF8C42',   // WED
  ringCoral:  '#FF6B6B',   // THU
  ringPink:   '#F0427C',   // FRI (today — filled)
  ringGrey:   '#C8C8D8',   // SAT (future — muted)

  // ── Stat card backgrounds ───────────────────────────────────
  waterCardBg:  '#D6EEFF',  // light blue tint
  stepsCardBg:  '#EEF5E8',  // soft sage/cream
  sleepCardBg:  '#EDE8FF',  // soft lavender

  waterCardBgDark:  '#0F2A3F',
  stepsCardBgDark:  '#1A2F15',
  sleepCardBgDark:  '#1E1540',

  // ── Semantic colours ───────────────────────────────────────
  red400:    '#FF6B6B',
  red600:    '#C0392B',
  amber400:  '#FFB830',
  amber600:  '#F59E0B',
  purple400: '#B280FF',
  purple600: '#7B3FE4',

  // ── Neutrals ───────────────────────────────────────────────
  white:       '#FFFFFF',
  black:       '#000000',
  transparent: 'transparent',

  // ── Text — light mode ──────────────────────────────────────
  textL100: '#12101F',   // headings
  textL200: '#4A4670',   // body
  textL300: '#9490B0',   // muted / placeholder

  // ── Text — dark mode ───────────────────────────────────────
  textD100: '#F0EEF8',   // headings
  textD200: '#9B96C0',   // body
  textD300: '#5C5880',   // muted / placeholder
};

// ─────────────────────────────────────────────────────────────
// GRADIENT DEFINITIONS
// Import these wherever you use LinearGradient
// ─────────────────────────────────────────────────────────────
export const gradients = {
  // Scan Food banner + primary CTA
  pinkOrange: [palette.gradPink, palette.gradOrange],
  // Streak badge + earnings highlights
  orangeYellow: [palette.gradOrange, palette.gradYellow],
  // Full warm sweep (3-stop)
  pinkOrangeYellow: [palette.gradPink, palette.gradOrange, palette.gradYellow],
  // Calorie hero card overlay (subtle, on top of indigo bg)
  heroOverlay: ['rgba(26,20,69,0)', 'rgba(13,10,46,0.95)'],
  // Lavender page header fade
  lavenderFade: [palette.lavender100, palette.lavender50],
  // Water card
  waterCard: ['#C8E6FF', '#E8F4FF'],
  // Steps card
  stepsCard: ['#D8EDCC', '#F0F7E8'],
  // Sleep card
  sleepCard: ['#D8CEFF', '#EDE8FF'],
  // CalFit green (coach button, primary actions)
  green: [palette.green500, palette.green600],
};

// ─────────────────────────────────────────────────────────────
// DAY RING COLOURS — weekly calendar strip
// Index 0 = Sunday
// ─────────────────────────────────────────────────────────────
export const dayRingColors = [
  palette.ringTeal,    // 0 SUN
  palette.ringBlue,    // 1 MON
  palette.ringPurple,  // 2 TUE
  palette.ringOrange,  // 3 WED
  palette.ringCoral,   // 4 THU
  palette.ringPink,    // 5 FRI
  palette.ringGrey,    // 6 SAT
];

// ─────────────────────────────────────────────────────────────
// THEME COLOURS — light / dark
// ─────────────────────────────────────────────────────────────
export const colors = {

  light: {
    // ── Backgrounds ─────────────────────────────────────────
    bg:      palette.lavender100,   // #F4F0FF — soft lavender page bg
    surface: palette.lavender50,    // #F9F7FF — modal / sheet bg
    card:    palette.white,         // #FFFFFF — standard cards

    // ── Hero / calorie card ──────────────────────────────────
    heroCard: palette.indigo900,    // #1A1445 — deep indigo

    // ── Stat card backgrounds ────────────────────────────────
    waterCard: palette.waterCardBg,
    stepsCard: palette.stepsCardBg,
    sleepCard: palette.sleepCardBg,

    // ── Borders ─────────────────────────────────────────────
    border:  palette.lavender300,   // #D8CEFF

    // ── Brand accent (CalFit green) ──────────────────────────
    accent:      palette.green600,
    accentDim:   'rgba(13,174,108,0.12)',
    accentSecond: '#4A90E2',

    // ── Gradient accent (pink→orange→yellow) ─────────────────
    gradStart:  palette.gradPink,
    gradMid:    palette.gradOrange,
    gradEnd:    palette.gradYellow,

    // ── Text ────────────────────────────────────────────────
    textPrimary:   palette.textL100,
    textSecondary: palette.textL200,
    textMuted:     palette.textL300,
    textOnHero:    palette.white,    // text on indigo hero card
    textOnGrad:    palette.white,    // text on gradient banners

    // ── Semantic ────────────────────────────────────────────
    red:    palette.red600,
    amber:  palette.amber600,
    purple: palette.purple600,
    gold:   '#B7770D',

    // ── Tab bar ─────────────────────────────────────────────
    tabBar:         palette.white,
    tabBarActive:   palette.green600,
    tabBarInactive: palette.textL300,

    // ── Overlays ────────────────────────────────────────────
    overlay:      'rgba(18,16,31,0.40)',
    glassStrong:  'rgba(255,255,255,0.90)',
    glassMedium:  'rgba(255,255,255,0.70)',
    glassSubtle:  'rgba(255,255,255,0.45)',
  },

  dark: {
    bg:      '#08061A',
    surface: '#0D0A2E',
    card:    '#120E3A',
    heroCard: '#0D0A2E',
    waterCard: palette.waterCardBgDark,
    stepsCard: palette.stepsCardBgDark,
    sleepCard: palette.sleepCardBgDark,
    border:  '#1E1A4A',
    accent:      '#34D98A',
    accentDim:   'rgba(52,217,138,0.15)',
    accentSecond: '#7BA7FF',
    gradStart:  '#FF6EB0',
    gradMid:    '#FF8C42',
    gradEnd:    '#FFD133',
    textPrimary:   '#F0EEF8',
    textSecondary: '#B0ABD0',
    textMuted:     '#6A6690',
    textOnHero:    '#FFFFFF',
    textOnGrad:    '#FFFFFF',
    red:    '#FF6B6B',
    amber:  '#FFD133',
    purple: '#B280FF',
    gold:   '#FFD133',
    tabBar:         '#0D0A2ECC',
    tabBarActive:   '#34D98A',
    tabBarInactive: '#6A6690',
    overlay:      'rgba(0,0,0,0.70)',
    glassStrong:  'rgba(255,255,255,0.12)',
    glassMedium:  'rgba(255,255,255,0.07)',
    glassSubtle:  'rgba(255,255,255,0.04)',
  },

  // ── Subscription tier badges ──────────────────────────────
  tiers: {
    free:    '#6B7280',
    pro:     palette.amber600,
    premium: palette.green600,
  },

  // ── CalFit Points ─────────────────────────────────────────
  points: {
    primary:   palette.amber400,
    secondary: palette.amber600,
  },
};

export type ColorScheme = 'dark' | 'light';
export type ThemeColors = typeof colors.light;