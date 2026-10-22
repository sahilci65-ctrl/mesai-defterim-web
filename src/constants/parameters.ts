// 2026 Türkiye ücret parametreleri
// Her yıl güncellenir; tüm hesaplamalar buradan beslenme

export const YEAR = 2026;

// Asgari ücret (brüt aylık)
// 2026 brüt asgari ücret. Mobil uygulamayla (calc.ts ASGARI_UCRET_2026)
// AYNI değer olmalı — ikisi ayrışırsa net/brüt sonuçları tutmaz.
export const MINIMUM_WAGE = 33030; // TL — 2026 brüt asgari ücret

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
  employee: 0.14,     // %14 SGK işçi payı (emeklilik + sağlık) — mobil SGK_ISCI_ORANI
  total: 0.15,        // Toplam %15 (ancak hesaplama sırasında kontrol edilir)
};

// Damga vergisi oranı
export const STAMP_TAX_RATE = 0.00759; // %0.759

// Kıdem tazminatı tavanı — DÖNEM BAZLI.
// Her TAM YIL için ödenen kıdeme esas ücret bu tavanla sınırlanır (brüt).
// İşten çıkış tarihi hangi döneme düşüyorsa o dönemin tavanı geçerlidir.
// Resmî değerler; yeni dönem açıklandıkça buraya eklenir.
export const SEVERANCE_CEILINGS: {
  start: string; // dahil (YYYY-MM-DD)
  end: string;   // dahil (YYYY-MM-DD)
  annualCap: number; // yıllık (bir tam yıl için) brüt tavan, TL
}[] = [
  { start: '2026-01-01', end: '2026-06-30', annualCap: 64948.77 },
  { start: '2026-07-01', end: '2026-12-31', annualCap: 73729.84 },
];

// Verilen işten çıkış tarihine göre geçerli kıdem tavanını döndürür.
// Mobil kidemTavani ile aynı: tarih bilinen dönemlerin dışındaysa en yakın
// uçtaki tavan (ilk dönemden önce → ilk, son dönemden sonra → son).
// Tarih verilmemişse en güncel dönemin tavanı kullanılır.
export function getSeveranceCeiling(exitDate?: string): number {
  const first = SEVERANCE_CEILINGS[0]!;
  const last = SEVERANCE_CEILINGS[SEVERANCE_CEILINGS.length - 1]!;
  if (!exitDate) return last.annualCap;
  for (const period of SEVERANCE_CEILINGS) {
    if (exitDate >= period.start && exitDate <= period.end) {
      return period.annualCap;
    }
  }
  return exitDate < first.start ? first.annualCap : last.annualCap;
}

// Kıdem tazminatı: her tam yıl için 30 günlük ücret (metinlerde kullanılır)
export const SEVERANCE_DAYS_PER_YEAR = 30;

// Kıdemde 1 yıl = 365 takvim günü (mobil KIDEM_YIL_GUN).
// Brüt = esas ücret × çalışılan gün / 365; 365 günden az kıdemde hak doğmaz.
export const SEVERANCE_YEAR_DAYS = 365;

// İhbar süreleri (İş Kanunu m.17) — kıdem yılına göre hafta
// Mobil: calc.ts ihbarSuresiHafta (<6 ay 2, 6-18 ay 4, 18-36 ay 6, 36+ ay 8)
export const NOTICE_PERIODS = {
  lessThan6Months: 2,        // 6 aydan az: 2 hafta
  sixMonthsTo18Months: 4,    // 6 ay - 1,5 yıl: 4 hafta
  eighteenMonthsTo3Years: 6, // 1,5 - 3 yıl: 6 hafta
  threeYearsPlus: 8,         // 3 yıl ve üzeri: 8 hafta
};

// İhbar tazminatında haftalık ücret = aylık brüt / 30 × 7 (mobil ile aynı)
export const DAYS_PER_WEEK = 7;

// Fazla mesai çarpanı (İş Kanunu m.41)
export const OVERTIME_MULTIPLIER = 1.5;

// Fazla mesai saatlik ücret hesaplaması: aylık brüt / 225
export const WORKING_DAYS_PER_MONTH = 225;

// Resmi tatil çalışma: aylık / 30
export const DAYS_PER_MONTH_CALCULATION = 30;

// Asgari ücret istisnası (net-brüt hesaplamada)
// Asgari ücrete kadar SGK kesintisi uygulanmaz
export const MINIMUM_WAGE_EXEMPTION = true;

// Fazla sürelerle çalışma artışı (İş Kanunu m.41): sözleşmedeki haftalık süre
// 45 saatin altındaysa, o süreyi aşıp 45 saate kadar yapılan çalışma %25 zamlı ödenir
export const FAZLA_SURELER_ARTIS = 0.25;
