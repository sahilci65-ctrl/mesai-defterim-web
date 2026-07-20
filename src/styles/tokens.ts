// Tema renkleri — uygulamayla aynı kimlik
export const colors = {
  // Lacivert temel
  primary: '#003D7A',
  primaryLight: '#004C99',
  primaryDark: '#002451',

  // Para/sonuç yeşili
  success: '#10B981',
  successLight: '#34D399',
  successDark: '#059669',

  // Uyarı kırmızısı
  danger: '#EF4444',
  dangerLight: '#F87171',
  dangerDark: '#DC2626',

  // Nötr
  gray50: '#F9FAFB',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  gray700: '#374151',
  gray800: '#1F2937',
  gray900: '#111827',

  // Fonlar
  background: '#FFFFFF',
  surface: '#F9FAFB',
  text: '#1F2937',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
};

// Tipografi
export const typography = {
  fontFamily: {
    // Sistem fontu — harici kaynak yok (hız)
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  fontSize: {
    xs: '12px',
    sm: '14px',
    base: '16px', // Min gövde yazısı
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
    '4xl': '36px',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  lineHeight: {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
  },
};

// Spacing — mobile-first, 8px grid
export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  '2xl': '48px',
  '3xl': '64px',
};

// Touch target minimum 48px
export const touchTarget = '48px';

// Breakpoint'ler
export const breakpoints = {
  mobile: '320px',
  tablet: '768px',
  desktop: '1024px',
  wide: '1280px',
};
