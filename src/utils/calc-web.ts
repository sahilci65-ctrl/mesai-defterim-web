// Web'e özgü hesaplama fonksiyonları
// Tüm sonuçlar "tahmini" olarak etiketlenir

import {
  TAX_BRACKETS,
  SGK_RATES,
  STAMP_TAX_RATE,
  getSeveranceCeiling,
  SEVERANCE_DAYS_PER_YEAR,
  NOTICE_PERIODS,
  OVERTIME_MULTIPLIER,
  WORKING_DAYS_PER_MONTH,
  DAYS_PER_MONTH_CALCULATION,
  DAYS_PER_WEEK,
  MINIMUM_WAGE,
} from '../constants/parameters';

// Kurus hassasiyetine yuvarlama (mobil calc.ts yuvarla ile ayni)
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * MOBIL UYGULAMAYLA AYNI MODEL (Mesai-Defterim/src/services/calc.ts).
 * Iki taraf ayrisirsa ayni girdi farkli sonuc verir; bu yuzden formuller
 * birebir ayni tutulur ve calc-web.test.ts'teki senaryo testi bunu korur.
 *
 * - SGK isci payi %15 (emeklilik+saglik %14 + issizlik %1) TAM BRUT uzerinden.
 *   Asgari ucret istisnasi SGK'da UYGULANMAZ (mevzuat boyle).
 * - Gelir vergisi tek dilim %15; matrahtan asgari ucret matrahi dusulur
 *   (asgari ucret istisnasi).
 * - Damga vergisi asgari ucreti asan kisma uygulanir.
 */

// Brüt maaştan net maaş hesapla — mobil bruttenNete ile BIREBIR ayni islem
// sirasi: ara degerler yuvarlanmaz, yalniz ciktilar yuvarlanir. (Eskiden SGK
// vergiden once yuvarlaniyordu; bu mobil ile kurusluk ayrisma yaratiyordu.)
export function calculateNetFromGross(
  grossIncome: number
): {
  gross: number;
  sgkDeduction: number;
  incomeTax: number;
  stampTax: number;
  net: number;
} {
  // SGK isci payi %14 + issizlik %1, tam brut uzerinden
  const sgk = grossIncome * SGK_RATES.employee;
  const unemployment = grossIncome * SGK_RATES.unemployment;
  const taxableIncome = grossIncome - sgk - unemployment;

  // Gelir vergisi: tek dilim, asgari ucret matrahi istisna
  const exemptBase = MINIMUM_WAGE * (1 - SGK_RATES.employee - SGK_RATES.unemployment);
  const incomeTax = Math.max(0, (taxableIncome - exemptBase) * TAX_BRACKETS[0]!.rate);

  // Damga vergisi: asgari ücreti aşan kısma
  const stampTax = Math.max(0, (grossIncome - MINIMUM_WAGE) * STAMP_TAX_RATE);

  const net = round2(grossIncome - sgk - unemployment - incomeTax - stampTax);

  return {
    gross: round2(grossIncome),
    sgkDeduction: round2(sgk + unemployment),
    incomeTax: round2(incomeTax),
    stampTax: round2(stampTax),
    net: Math.max(net, 0), // Net negatif olamaz
  };
}

// Net maaştan brüt maaş hesapla (iteratif çözüm)
export function calculateGrossFromNet(
  netIncome: number
): {
  gross: number;
  sgkDeduction: number;
  incomeTax: number;
  stampTax: number;
  net: number;
} {
  // Ikili arama — MOBIL ile birebir ayni (calc.ts nettenBrute):
  // 60 adim, erken cikis YOK, sonuc alt/ust ortasi. Erken cikis veya farkli
  // adim sayisi kurusluk ayrisma yaratiyordu.
  let low = netIncome;
  let high = netIncome * 2.5;

  for (let i = 0; i < 60; i++) {
    const mid = (low + high) / 2;
    if (calculateNetFromGross(mid).net < netIncome) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return calculateNetFromGross(Math.round(((low + high) / 2) * 100) / 100);
}

// Kıdem tazminatı hesapla
export function calculateSeverance(
  monthlyGrossIncome: number,
  senioryYears: number,
  senioryMonths: number = 0,
  senioryDays: number = 0,
  exitDate?: string
): {
  totalDays: number;
  dailyGross: number;
  grossAmount: number;
  stampTax: number;
  netAmount: number;
} {
  // Kıdem süresi yıl cinsinden (artık ay ve günler oranlı)
  const totalYears = senioryYears + senioryMonths / 12 + senioryDays / 365;

  // Ödemeye esas gün (her tam yıl = 30 gün)
  const totalDays = Math.round(totalYears * SEVERANCE_DAYS_PER_YEAR * 100) / 100;

  // İş Kanunu: kıdem tazminatı hakkı için en az 1 tam yıl çalışma şarttır.
  // 1 yıldan az kıdemde tazminat hakkı doğmaz → tutar 0.
  if (totalYears < 1) {
    return {
      totalDays,
      dailyGross: 0,
      grossAmount: 0,
      stampTax: 0,
      netAmount: 0,
    };
  }

  // Kıdeme esas yıllık ücret tavanla sınırlanır (çıkış tarihinin dönemine göre)
  const annualCap = getSeveranceCeiling(exitDate);
  const cappedAnnual = Math.min(monthlyGrossIncome, annualCap);

  // Günlük brüt = kıdeme esas yıllık / 30
  const dailyGross = Math.round((cappedAnnual / SEVERANCE_DAYS_PER_YEAR) * 100) / 100;

  // Brüt tazminat = kıdeme esas yıllık ücret × tam yıl (+ artık gün oranı)
  const grossAmount = Math.round(cappedAnnual * totalYears * 100) / 100;

  // Damga vergisi
  const stampTax = Math.round(grossAmount * STAMP_TAX_RATE * 100) / 100;

  // Net = brüt - damga vergisi
  const netAmount = Math.round((grossAmount - stampTax) * 100) / 100;

  return {
    totalDays: Math.round(totalDays * 100) / 100,
    dailyGross,
    grossAmount: Math.round(grossAmount * 100) / 100,
    stampTax,
    netAmount,
  };
}

// Kıdem yılına göre ihbar süresi (İş K. m.17)
export function noticeWeeksForYears(senioryYears: number): number {
  if (senioryYears < 0.5) return NOTICE_PERIODS.lessThan6Months;
  if (senioryYears < 1.5) return NOTICE_PERIODS.sixMonthsTo18Months;
  if (senioryYears < 3) return NOTICE_PERIODS.eighteenMonthsTo3Years;
  return NOTICE_PERIODS.threeYearsPlus;
}

// İhbar tazminatı hesapla — MOBIL ile ayni model (calc.ts ihbarTazminati):
// brüt = aylık brüt / 30 × 7 × hafta; gelir vergisi (%15) + damga kesilir, SGK kesilmez.
// Ara degerler yuvarlanmaz (mobil gibi), yalniz cikti yuvarlanir.
export function calculateNoticeSeverance(
  monthlyGrossIncome: number,
  senioryYears: number
): {
  noticeWeeks: number;
  weeklyRate: number;
  noticeAmount: number;
  incomeTax: number;
  stampTax: number;
  netAmount: number;
} {
  const noticeWeeks = noticeWeeksForYears(senioryYears);

  const weeklyExact = (monthlyGrossIncome / DAYS_PER_MONTH_CALCULATION) * DAYS_PER_WEEK;
  const grossExact = weeklyExact * noticeWeeks;
  const taxExact = grossExact * TAX_BRACKETS[0]!.rate;
  const stampExact = grossExact * STAMP_TAX_RATE;

  return {
    noticeWeeks,
    weeklyRate: round2(weeklyExact),
    noticeAmount: round2(grossExact),
    incomeTax: round2(taxExact),
    stampTax: round2(stampExact),
    netAmount: round2(grossExact - taxExact - stampExact),
  };
}

// Fazla mesai ücreti hesapla
export function calculateOvertime(
  monthlyGrossIncome: number,
  overtimeHours: number
): {
  hourlyRate: number;
  grossAmount: number;
  stampTax: number;
  netAmount: number;
} {
  // Saatlik ücret = aylık brüt / 225.
  // DIKKAT: tutar hesaplanirken YUVARLANMAMIS saatlik kullanilir; onceden
  // yuvarlanmis deger carpiliyordu ve mobil ile kurusluk fark cikiyordu.
  const hourlyExact = monthlyGrossIncome / WORKING_DAYS_PER_MONTH;
  const hourlyRate = Math.round(hourlyExact * 100) / 100;

  // Fazla mesai ücreti = saatlik × saat × 1.5
  const grossAmount = Math.round(hourlyExact * overtimeHours * OVERTIME_MULTIPLIER * 100) / 100;

  // Damga vergisi
  const stampTax = Math.round(grossAmount * STAMP_TAX_RATE * 100) / 100;

  // Net
  const netAmount = Math.round((grossAmount - stampTax) * 100) / 100;

  return {
    hourlyRate,
    grossAmount,
    stampTax,
    netAmount,
  };
}

// Resmi tatil mesaisi ücreti hesapla
export function calculatePublicHolidayWork(
  monthlyGrossIncome: number,
  daysWorked: number
): {
  dailyRate: number;
  grossAmount: number;
  stampTax: number;
  netAmount: number;
} {
  // Günlük ücret = aylık brüt / 30 (yuvarlanmamis deger carpilir — mobil ile ayni)
  const dailyExact = monthlyGrossIncome / DAYS_PER_MONTH_CALCULATION;
  const dailyRate = Math.round(dailyExact * 100) / 100;

  // Resmi tatilde çalışma = günlük × gün sayısı (ek ödeme)
  const grossAmount = Math.round(dailyExact * daysWorked * 100) / 100;

  // Damga vergisi
  const stampTax = Math.round(grossAmount * STAMP_TAX_RATE * 100) / 100;

  // Net
  const netAmount = Math.round((grossAmount - stampTax) * 100) / 100;

  return {
    dailyRate,
    grossAmount,
    stampTax,
    netAmount,
  };
}

// Ek ödemenin (fazla mesai, resmi tatil) tam kesintilerle yaklaşık neti.
// Mobil özet ekranı "yaklaşık net" satırını bruttenNete(maaş + ilaveler) ile
// gösterir; web yalnız ilaveyi hesapladığı için aynı modelle ilavenin nete
// katkısını verir: net(maaş + ilave) − net(maaş).
export function calculateExtraPayNet(monthlyGrossIncome: number, extraGross: number): number {
  if (extraGross <= 0) return 0;
  const withExtra = calculateNetFromGross(monthlyGrossIncome + extraGross).net;
  const without = calculateNetFromGross(monthlyGrossIncome).net;
  return round2(withExtra - without);
}

// Format para (₺ cinsinden)
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
