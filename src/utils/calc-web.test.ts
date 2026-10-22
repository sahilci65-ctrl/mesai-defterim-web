import { describe, it, expect } from 'vitest';
import {
  calculateNetFromGross,
  calculateGrossFromNet,
  calculateSeverance,
  calculateNoticeSeverance,
  calculateOvertime,
  calculatePublicHolidayWork,
  calculateExtraPayNet,
  formatCurrency,
} from './calc-web';

describe('Brüt-Net Dönüşümü', () => {
  it('45.000 TL brütü doğru şekilde net\'e çevirir', () => {
    const result = calculateNetFromGross(45000);

    expect(result.gross).toBe(45000);
    expect(result.sgkDeduction).toBeGreaterThan(0); // SGK kesintisi olmalı
    expect(result.incomeTax).toBeGreaterThan(0); // Vergi olmalı
    expect(result.net).toBeLessThan(result.gross); // Net < brüt
    expect(result.net).toBeGreaterThan(0);
  });

  // DUZELTME: SGK isci payi TAM BRUT uzerinden kesilir; asgari ucret
  // istisnasi SGK'da degil, GELIR ve DAMGA vergisinde uygulanir. Onceki
  // testler SGK'yi yalniz asgari ustune uyguluyordu ve mobil uygulamayla
  // ayrisiyordu.
  it('SGK kesintisi tam brüt üzerinden %15 uygulanır', () => {
    expect(calculateNetFromGross(33030).sgkDeduction).toBeCloseTo(33030 * 0.15, 2);
    expect(calculateNetFromGross(50000).sgkDeduction).toBeCloseTo(50000 * 0.15, 2);
  });

  it('asgari ücret düzeyinde gelir ve damga vergisi çıkmaz (istisna)', () => {
    const asgari = calculateNetFromGross(33030);

    expect(asgari.incomeTax).toBe(0);
    expect(asgari.stampTax).toBe(0);
  });

  it('Net-brüt dönüşümü ters işlem sonucunu doğrular', () => {
    const net = 35000;
    const result = calculateGrossFromNet(net);

    expect(result.net).toBeCloseTo(net, 1); // ±0.01 TL
  });

  it('Vergi dilimi sınırını doğru hesaplar (95.000)', () => {
    // 95.000'de %15, üzeri %20
    const result95 = calculateNetFromGross(95000);
    const result96 = calculateNetFromGross(96000);

    // 96.000 daha az net vermelidir (1.000 TL fark, vergi dilimi yükseliyor)
    expect(result96.incomeTax).toBeGreaterThan(result95.incomeTax);
  });
});

// ==========================================================================
// KIDEM TAZMİNATI — KAPSAMLI DOĞRULAMA TESTLERİ
// --------------------------------------------------------------------------
// Yöntem MOBİL calc.ts kidemTazminati ile birebir aynıdır (tek doğruluk
// kaynağı mobildir; CLAUDE.md §2). Mobil kodla üretilmiş referanslar
// mobil-esitlik.test.ts'te ayrıca sabitlenir.
//
//   gün         = işten çıkış − işe giriş (takvim günü, artık yıllar dahil)
//   gün < 365   → tazminat hakkı yok (tüm tutarlar 0)
//   yıllıkTavan = çıkış tarihinin düştüğü dönemin tavanı
//   esasÜcret   = min(aylık brüt, yıllıkTavan)
//   brüt        = esasÜcret × gün / 365
//   damga       = brüt × 0,00759 ; net = brüt − damga
//   (ara değerler yuvarlanmaz, yalnız çıktılar kuruşa yuvarlanır)
//
// 2026 resmi kıdem tavanları (yıllık brüt):
//   1 Ocak – 30 Haziran 2026 : 64.948,77 TL
//   1 Temmuz – 31 Aralık 2026 : 73.729,84 TL
// ==========================================================================
describe('Kıdem Tazminatı — Doğrulanmış Referanslar', () => {
  it('5 yıl / 30.000 TL (çıkış 2026 II. yarı) → net 148.943,07 (Verginet ~148.943)', () => {
    // 15.07.2021 → 15.07.2026 = 1826 gün (2024 artık yılı dahil)
    const r = calculateSeverance('2021-07-15', '2026-07-15', 30000);
    expect(r.totalDays).toBe(1826);
    expect(r.grossAmount).toBe(150082.19);
    expect(r.netAmount).toBe(148943.07);
    // Dış referans (Verginet/Deloitte, 1826 gün): 148.943
    expect(Math.abs(r.netAmount - 148943)).toBeLessThan(1);
  });

  it('Tavan ALTI maaş (H2) → maaş aynen kullanılır', () => {
    const r = calculateSeverance('2021-08-15', '2026-08-15', 50000);
    expect(r.ceilingApplied).toBe(false);
    expect(r.cappedAnnual).toBe(50000);
    expect(r.grossAmount).toBe(Math.round(50000 * (r.totalDays / 365) * 100) / 100);
  });

  it('Tavan ÜSTÜ maaş (H2) → tavan (73.729,84) uygulanır', () => {
    const r = calculateSeverance('2021-08-15', '2026-08-15', 100000);
    expect(r.ceiling).toBe(73729.84);
    expect(r.ceilingApplied).toBe(true);
    expect(r.cappedAnnual).toBe(73729.84);
  });

  it('TAM TAVAN sınırı: maaş = tavan → tavan üstüyle aynı sonuç', () => {
    const atCap = calculateSeverance('2021-08-15', '2026-08-15', 73729.84);
    const overCap = calculateSeverance('2021-08-15', '2026-08-15', 100000);
    expect(atCap.ceilingApplied).toBe(false);
    expect(atCap.netAmount).toBe(overCap.netAmount);
  });

  it('Tavan sınırının 1 TL altı/üstü doğru ayrışır', () => {
    const justUnder = calculateSeverance('2021-08-15', '2026-08-15', 73729);
    const justOver = calculateSeverance('2021-08-15', '2026-08-15', 73731);
    expect(justUnder.cappedAnnual).toBe(73729);
    expect(justOver.cappedAnnual).toBe(73729.84);
  });

  it('1. DÖNEM çıkış (2026 I. yarı) → tavan 64.948,77', () => {
    const r = calculateSeverance('2021-03-15', '2026-03-15', 100000);
    expect(r.ceiling).toBe(64948.77);
    expect(r.cappedAnnual).toBe(64948.77);
  });

  it('dönem sınır günleri: 30 Haziran → I. dönem, 1 Temmuz → II. dönem', () => {
    expect(calculateSeverance('2020-01-01', '2026-06-30', 100000).ceiling).toBe(64948.77);
    expect(calculateSeverance('2020-01-01', '2026-07-01', 100000).ceiling).toBe(73729.84);
  });

  it('bilinen dönemler dışı: önce → ilk tavan, sonra → son tavan (mobil gibi)', () => {
    expect(calculateSeverance('2018-01-01', '2025-12-31', 100000).ceiling).toBe(64948.77);
    expect(calculateSeverance('2018-01-01', '2027-02-01', 100000).ceiling).toBe(73729.84);
  });

  it('1 YILDAN AZ (364 gün) → tazminat hakkı yok, 0 döner', () => {
    const r = calculateSeverance('2025-11-01', '2026-10-31', 40000);
    expect(r.totalDays).toBe(364);
    expect(r.entitled).toBe(false);
    expect(r.grossAmount).toBe(0);
    expect(r.netAmount).toBe(0);
  });

  it('TAM 1 YIL (365 gün) → hak doğar, brüt = 1 aylık ücret', () => {
    const r = calculateSeverance('2025-10-31', '2026-10-31', 40000);
    expect(r.entitled).toBe(true);
    expect(r.grossAmount).toBe(40000);
    expect(r.netAmount).toBe(39696.4);
  });

  it('çıkış girişten önceyse (hatalı giriş) → 0', () => {
    const r = calculateSeverance('2026-10-31', '2020-01-01', 40000);
    expect(r.entitled).toBe(false);
    expect(r.netAmount).toBe(0);
  });

  it("Damga vergisi brütün %0,759'u kadardır", () => {
    const r = calculateSeverance('2023-02-14', '2026-08-27', 45678.9);
    expect(r.stampTax).toBeCloseTo(r.grossAmount * 0.00759, 1);
    expect(r.netAmount).toBeCloseTo(r.grossAmount - r.stampTax, 1);
  });
});

describe('İhbar Tazminatı', () => {
  it('6 aydan az kıdem için 2 hafta ihbar', () => {
    const result = calculateNoticeSeverance(45000, 0.3);

    expect(result.noticeWeeks).toBe(2);
  });

  // İş K. m.17 kademeleri ve sınır değerleri
  it('tam 6 ay → 4 hafta (6 ay - 1,5 yıl)', () => {
    expect(calculateNoticeSeverance(45000, 0.5).noticeWeeks).toBe(4);
  });

  it('1 yıl → 4 hafta', () => {
    expect(calculateNoticeSeverance(45000, 1).noticeWeeks).toBe(4);
  });

  it('1,5 yılın hemen altı → 4 hafta, tam 1,5 yıl → 6 hafta', () => {
    expect(calculateNoticeSeverance(45000, 1.49).noticeWeeks).toBe(4);
    expect(calculateNoticeSeverance(45000, 1.5).noticeWeeks).toBe(6);
  });

  it('2 yıl → 6 hafta (1,5 - 3 yıl)', () => {
    expect(calculateNoticeSeverance(45000, 2).noticeWeeks).toBe(6);
  });

  it('3 yılın hemen altı → 6 hafta, tam 3 yıl → 8 hafta', () => {
    expect(calculateNoticeSeverance(45000, 2.99).noticeWeeks).toBe(6);
    expect(calculateNoticeSeverance(45000, 3).noticeWeeks).toBe(8);
  });

  it('5 yıl → 8 hafta', () => {
    expect(calculateNoticeSeverance(45000, 5).noticeWeeks).toBe(8);
  });

  it('haftalık ücret = aylık brüt / 30 × 7 (mobil ile aynı)', () => {
    expect(calculateNoticeSeverance(45000, 1).weeklyRate).toBe(10500);
  });

  it('net = brüt − %15 gelir vergisi − damga vergisi', () => {
    const r = calculateNoticeSeverance(45000, 0.3);
    expect(r.noticeAmount).toBe(21000);
    expect(r.incomeTax).toBe(3150);
    expect(r.stampTax).toBe(159.39);
    expect(r.netAmount).toBe(17690.61);
  });
});

describe('Ek ödemenin yaklaşık neti (tam kesintilerle)', () => {
  it('ek ödeme yoksa 0', () => {
    expect(calculateExtraPayNet(35721.94, 0)).toBe(0);
  });

  it('net, brütten küçüktür (SGK + gelir vergisi + damga)', () => {
    const net = calculateExtraPayNet(45000, 3000);
    expect(net).toBeGreaterThan(0);
    expect(net).toBeLessThan(3000);
  });

  it('maaş + ek ödemenin neti ile maaşın neti arasındaki farka eşittir', () => {
    const fark = calculateNetFromGross(48000).net - calculateNetFromGross(45000).net;
    expect(calculateExtraPayNet(45000, 3000)).toBe(Math.round(fark * 100) / 100);
  });
});

describe('Fazla Mesai', () => {
  it('Saatlik ücret doğru hesaplanır (aylık / 225)', () => {
    const result = calculateOvertime(45000, 0);

    const expectedHourly = Math.round((45000 / 225) * 100) / 100;
    expect(result.hourlyRate).toBeCloseTo(expectedHourly, 1);
  });

  it('Fazla mesai ücreti 1.5 çarpanı uygulanır', () => {
    const result = calculateOvertime(45000, 10);

    const hourly = 45000 / 225;
    const expectedGross = Math.round(hourly * 10 * 1.5 * 100) / 100;

    expect(result.grossAmount).toBeCloseTo(expectedGross, 1);
  });

  it('Damga vergisi kesintili net ödeme', () => {
    const result = calculateOvertime(45000, 10);

    expect(result.netAmount).toBeLessThan(result.grossAmount);
    expect(result.stampTax).toBeCloseTo(result.grossAmount * 0.00759, 1);
  });
});

describe('Resmi Tatil Mesaisi', () => {
  it('Günlük ücret doğru hesaplanır (aylık / 30)', () => {
    const result = calculatePublicHolidayWork(45000, 0);

    const expectedDaily = Math.round((45000 / 30) * 100) / 100;
    expect(result.dailyRate).toBeCloseTo(expectedDaily, 1);
  });

  it('Çalışılan gün sayısıyla ödeme çarpılır', () => {
    const result = calculatePublicHolidayWork(45000, 3);

    const daily = 45000 / 30;
    const expectedGross = Math.round(daily * 3 * 100) / 100;

    expect(result.grossAmount).toBeCloseTo(expectedGross, 1);
  });

  it('Damga vergisi uygulanır', () => {
    const result = calculatePublicHolidayWork(45000, 1);

    expect(result.stampTax).toBeCloseTo(result.grossAmount * 0.00759, 1);
    expect(result.netAmount).toBeCloseTo(
      result.grossAmount - result.stampTax,
      1
    );
  });
});

// ==========================================================================
// NET GİRİŞ TUTARLILIĞI
// --------------------------------------------------------------------------
// Site artık fazla mesai ve resmi tatilde varsayılan olarak NET maaş sorar.
// Akış: kullanıcı net girer → calculateGrossFromNet ile brüte çevrilir →
// hesap mevzuat gereği brüt üzerinden yapılır. Bu blok, bir maaşın net'ini
// girmenin, aynı maaşın brüt'ünü girmekle (yuvarlama toleransında) AYNI
// sonucu verdiğini doğrular — yani net→brüt→hesap zinciri tutarlıdır.
// ==========================================================================
describe('Net Giriş → Brüt Çevrim Tutarlılığı', () => {
  const salaries = [20000, 45000, 100000];

  for (const grossSalary of salaries) {
    it(`Fazla mesai: ${grossSalary} TL için net ve brüt giriş aynı sonucu verir`, () => {
      const hours = 10;

      // Brüt girişle doğrudan hesap (referans)
      const direct = calculateOvertime(grossSalary, hours);

      // Kullanıcı bu maaşın NET'ini bilir → araç net'i brüte geri çevirir
      const net = calculateNetFromGross(grossSalary).net;
      const recoveredGross = calculateGrossFromNet(net).gross;
      const viaNet = calculateOvertime(recoveredGross, hours);

      // Net→brüt çevrimi orijinal brütü ~kuruş hassasiyetle geri kazanmalı
      expect(recoveredGross).toBeCloseTo(grossSalary, 0);
      expect(viaNet.grossAmount).toBeCloseTo(direct.grossAmount, 0);
      expect(viaNet.netAmount).toBeCloseTo(direct.netAmount, 0);
    });

    it(`Resmi tatil: ${grossSalary} TL için net ve brüt giriş aynı sonucu verir`, () => {
      const days = 3;

      const direct = calculatePublicHolidayWork(grossSalary, days);

      const net = calculateNetFromGross(grossSalary).net;
      const recoveredGross = calculateGrossFromNet(net).gross;
      const viaNet = calculatePublicHolidayWork(recoveredGross, days);

      expect(recoveredGross).toBeCloseTo(grossSalary, 0);
      expect(viaNet.grossAmount).toBeCloseTo(direct.grossAmount, 0);
      expect(viaNet.netAmount).toBeCloseTo(direct.netAmount, 0);
    });
  }

  it('Somut senaryo: net 30.000 TL girişi → brüte çevrilip fazla mesai hesaplanır', () => {
    // Kullanıcı net 30.000 TL yazar, 10 saat fazla mesai
    const enteredNet = 30000;
    const hours = 10;

    const grossSalary = calculateGrossFromNet(enteredNet).gross;
    // Net 30.000 için brüt makul aralıkta olmalı (net'ten büyük)
    expect(grossSalary).toBeGreaterThan(enteredNet);

    const r = calculateOvertime(grossSalary, hours);
    // Saatlik ücret = brüt / 225, sonuç pozitif ve net < brüt
    expect(r.hourlyRate).toBeCloseTo(grossSalary / 225, 1);
    expect(r.netAmount).toBeGreaterThan(0);
    expect(r.netAmount).toBeLessThan(r.grossAmount);
  });

  it('Brüt modunda giriş, brüt değeri doğrudan kullanır (çevrim yok)', () => {
    // Brüt modunda kullanıcı 45.000 girerse, calculateOvertime doğrudan onu alır
    const r = calculateOvertime(45000, 10);
    const expectedHourly = 45000 / 225;
    expect(r.hourlyRate).toBeCloseTo(expectedHourly, 2);
  });
});

describe('Para Formatı', () => {
  it('Türkçe ₺ sembolü ile formatlar', () => {
    const formatted = formatCurrency(1000);

    expect(formatted).toContain('₺');
    expect(formatted).toContain('1.000');
  });

  it('2 ondalık basamağı gösterir', () => {
    const formatted = formatCurrency(1000.5);

    expect(formatted).toMatch(/,\d{2}/); // ,50 gibi
  });
});

describe('Kenar Durumları', () => {
  it('Sıfır maaş işler', () => {
    const result = calculateNetFromGross(0);

    expect(result.net).toBe(0);
    expect(result.sgkDeduction).toBe(0);
    expect(result.incomeTax).toBe(0);
  });

  it('Negatif net hiçbir zaman döndürülmez', () => {
    const result = calculateNetFromGross(0);

    expect(result.net).toBeGreaterThanOrEqual(0);
  });

  it('Çok yüksek maaş işler', () => {
    const result = calculateNetFromGross(1000000);

    expect(result.net).toBeGreaterThan(0);
    expect(result.net).toBeLessThan(result.gross);
  });
});
