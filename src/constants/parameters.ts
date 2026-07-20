// 2026 Türkiye ücret parametreleri
// Her yıl güncellenir; tüm hesaplamalar buradan beslenme

export const YEAR = 2026;

// Asgari ücret (brüt aylık)
export const MINIMUM_WAGE = 16500; // TL — 2026 tahmini (güncelle)

// Gelir vergisi dilimleri (2026 — enflasyona göre ayarlanmış)
// Kümülatif matrah esası
export const TAX_BRACKETS = [
  { limit: 95000, rate: 0.15 },    // 0-95.000: %15
  { limit: 540000, rate: 0.2 },    // 95.001-540.000: %20
  { limit: 1800000, rate: 0.27 },  // 540.001-1.800.000: %27
  { limit: Infinity, rate: 0.35 }, // 1.800.001+: %35
];

// SGK sosyal sigorta işçi payları
export const SGK_RATES = {
  pension: 0.09,      // %9 emekli sandığı
  health: 0.05,       // %5 sağlık
  unemployment: 0.01, // %1 işsizlik
  total: 0.15,        // Toplam %15 (ancak hesaplama sırasında kontrol edilir)
};

// Damga vergisi oranı
export const STAMP_TAX_RATE = 0.00759; // %0.759

// Kıdem tazminatı tavanı (günlük, brüt)
export const SEVERANCE_CAP_DAILY = 343.33; // TL — 2026 (yıllık ~10.300 TL = 30 gün × 343.33)

// Kıdem tazminatı hesaplanırken kullanılan gün sayısı
export const SEVERANCE_DAYS_PER_YEAR = 30;

// İhbar süresi kuralları (hafta cinsinden, kıdem yılı şartına göre)
export const NOTICE_PERIODS = {
  lessThan6Months: 2,   // 6 ay altı: 2 hafta
  sixMonthsToYear: 2,   // 6 ay - 1 yıl: 2 hafta
  yearToThreeYears: 4,  // 1-3 yıl: 4 hafta
  threeYearsPlus: 8,    // 3 yıl+: 8 hafta
};

// Fazla mesai çarpanı (İş Kanunu m.41)
export const OVERTIME_MULTIPLIER = 1.5;

// Fazla mesai saatlik ücret hesaplaması: aylık brüt / 225
export const WORKING_DAYS_PER_MONTH = 225;

// Resmi tatil çalışma: aylık / 30
export const DAYS_PER_MONTH_CALCULATION = 30;

// Asgari ücret istisnası (net-brüt hesaplamada)
// Asgari ücrete kadar SGK kesintisi uygulanmaz
export const MINIMUM_WAGE_EXEMPTION = true;
