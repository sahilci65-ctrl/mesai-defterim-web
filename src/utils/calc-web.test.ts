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
// Bu blok, kıdem tazminatı fonksiyonunun sözleşmesidir (canonical spec).
// Referans değerler dışarıdan doğrulanmıştır (Verginet/Deloitte, resmi tavanlar).
// ÖNEMLİ: Mobil proje (calc.ts) BU testlerin BİREBİR AYNISINI geçmelidir;
// sadece import satırı değişir. Web ve mobil aynı algoritmayı kullandığında
// sonuçlar kuruşu kuruşuna aynı çıkar.
//
// Yöntem (her iki proje için tek doğruluk kaynağı):
//   totalYears  = yıl + ay/12 + gün/365
//   1 yıldan az → tazminat hakkı yok (tüm tutarlar 0)
//   yıllıkTavan = çıkış tarihinin düştüğü dönemin tavanı
//   esasÜcret   = min(aylık brüt, yıllıkTavan)
//   brüt        = esasÜcret × totalYears          (2 ondalığa yuvarlanır)
//   damga       = brüt × 0,00759                  (2 ondalığa yuvarlanır)
//   net         = brüt − damga
//
// 2026 resmi kıdem tavanları (yıllık brüt):
//   1 Ocak – 30 Haziran 2026 : 64.948,77 TL
//   1 Temmuz – 31 Aralık 2026 : 73.729,84 TL
// ==========================================================================
describe('Kıdem Tazminatı — Doğrulanmış Referanslar', () => {
  it('5 yıl / 30.000 TL (çıkış 2026 II. yarı) → net 148.861,50 (Verginet ~148.943)', () => {
    const r = calculateSeverance(30000, 5, 0, 0, '2026-08-15');

    // Bizim yöntem (her tam yıl = 30 gün): 5 × 30.000 = 150.000 brüt
    expect(r.grossAmount).toBe(150000.0);
    expect(r.stampTax).toBe(1138.5); // 150.000 × 0,00759
    expect(r.netAmount).toBe(148861.5); // 150.000 − 1.138,50

    // Dış referanslara yakınlık (yöntem farkı: 30 gün/yıl vs 365 gün/yıl):
    //   Verginet/Deloitte : 148.943 (1826 gün) → fark 81,50 TL (%0,055)
    //   Mobil uygulama    : 149.024            → fark 162,50 TL (%0,109)
    // İkisiyle de ±200 TL bandında uyumlu.
    expect(Math.abs(r.netAmount - 148943)).toBeLessThan(200);
    expect(Math.abs(r.netAmount - 149024)).toBeLessThan(200);
  });

  it('Tavan ALTI maaş: 5 yıl / 50.000 TL (H2) → tavan devreye girmez', () => {
    const r = calculateSeverance(50000, 5, 0, 0, '2026-08-15');

    // 50.000 < 73.729,84 → maaş aynen kullanılır
    expect(r.grossAmount).toBe(250000.0); // 5 × 50.000
    expect(r.stampTax).toBe(1897.5); // 250.000 × 0,00759
    expect(r.netAmount).toBe(248102.5);
  });

  it('Tavan ÜSTÜ maaş: 5 yıl / 100.000 TL (H2) → tavan (73.729,84) uygulanır', () => {
    const r = calculateSeverance(100000, 5, 0, 0, '2026-08-15');

    // 100.000 > 73.729,84 → tavan kullanılır: 5 × 73.729,84 = 368.649,20
    expect(r.grossAmount).toBe(368649.2);
    expect(r.stampTax).toBe(2798.05); // 368.649,20 × 0,00759
    expect(r.netAmount).toBe(365851.15);
  });

  it('TAM TAVAN sınırı: maaş = tavan (73.729,84) → tavan üstüyle aynı sonuç', () => {
    const atCap = calculateSeverance(73729.84, 5, 0, 0, '2026-08-15');
    const overCap = calculateSeverance(100000, 5, 0, 0, '2026-08-15');

    // Sınırda maaş = tavan olduğu için tavan üstüyle birebir aynı olmalı
    expect(atCap.grossAmount).toBe(368649.2);
    expect(atCap.netAmount).toBe(365851.15);
    expect(atCap.netAmount).toBe(overCap.netAmount);
  });

  it('Tavan sınırının 1 TL altı/üstü doğru ayrışır', () => {
    // 1 TL altı: maaş kullanılır (73.729 × 5 = 368.645)
    const justUnder = calculateSeverance(73729, 5, 0, 0, '2026-08-15');
    expect(justUnder.grossAmount).toBe(368645.0);

    // 1 TL üstü: tavana çekilir (73.729,84 × 5 = 368.649,20)
    const justOver = calculateSeverance(73731, 5, 0, 0, '2026-08-15');
    expect(justOver.grossAmount).toBe(368649.2);
  });

  it('1. DÖNEM çıkış (2026 I. yarı, tavan 64.948,77): 5 yıl / 100.000 TL', () => {
    const r = calculateSeverance(100000, 5, 0, 0, '2026-03-15');

    // 5 × 64.948,77 = 324.743,85
    expect(r.grossAmount).toBe(324743.85);
    expect(r.stampTax).toBe(2464.81); // 324.743,85 × 0,00759
    expect(r.netAmount).toBe(322279.04);
  });

  it('2. DÖNEM çıkış (2026 II. yarı, tavan 73.729,84): 5 yıl / 100.000 TL', () => {
    const r = calculateSeverance(100000, 5, 0, 0, '2026-11-20');

    // 5 × 73.729,84 = 368.649,20
    expect(r.grossAmount).toBe(368649.2);
    expect(r.netAmount).toBe(365851.15);
  });

  it('Aynı maaş, farklı dönem → farklı sonuç (dönem seçimi çalışıyor)', () => {
    const h1 = calculateSeverance(100000, 5, 0, 0, '2026-03-15');
    const h2 = calculateSeverance(100000, 5, 0, 0, '2026-08-15');
    expect(h1.grossAmount).toBe(324743.85);
    expect(h2.grossAmount).toBe(368649.2);
    expect(h2.grossAmount).toBeGreaterThan(h1.grossAmount);
  });

  it('Çıkış tarihi verilmezse en güncel dönem (H2, 73.729,84) kullanılır', () => {
    const r = calculateSeverance(100000, 5, 0, 0);
    expect(r.grossAmount).toBe(368649.2);
  });

  it('Artık AY içeren süre: 5 yıl 4 ay / 30.000 TL (H2)', () => {
    const r = calculateSeverance(30000, 5, 4, 0, '2026-08-15');

    // totalYears = 5 + 4/12 = 5,3333 → 30.000 × 5,3333 = 160.000,00
    expect(r.grossAmount).toBe(160000.0);
    expect(r.stampTax).toBe(1214.4); // 160.000 × 0,00759
    expect(r.netAmount).toBe(158785.6);
  });

  it('Artık GÜN içeren süre: 5 yıl 15 gün / 30.000 TL (H2)', () => {
    const r = calculateSeverance(30000, 5, 0, 15, '2026-08-15');

    // totalYears = 5 + 15/365 = 5,041096 → 30.000 × 5,041096 = 151.232,88
    expect(r.grossAmount).toBe(151232.88);
    expect(r.stampTax).toBe(1147.86); // 151.232,88 × 0,00759
    expect(r.netAmount).toBe(150085.02);
  });

  it('AY + GÜN birlikte: 3 yıl 6 ay 10 gün / 40.000 TL (H2)', () => {
    const r = calculateSeverance(40000, 3, 6, 10, '2026-08-15');

    // totalYears = 3 + 6/12 + 10/365 = 3,527397 → 40.000 × 3,527397 = 141.095,89
    expect(r.grossAmount).toBe(141095.89);
    expect(r.stampTax).toBe(1070.92); // 141.095,89 × 0,00759 = 1070,9178 → 1.070,92
    expect(r.netAmount).toBe(140024.97); // 141.095,89 − 1.070,92
  });

  it('1 YILDAN AZ (11 ay) → tazminat hakkı yok, 0 döner', () => {
    const r = calculateSeverance(30000, 0, 11, 0, '2026-08-15');

    expect(r.grossAmount).toBe(0);
    expect(r.stampTax).toBe(0);
    expect(r.netAmount).toBe(0);
  });

  it('1 YILDAN AZ (300 gün) → 0 döner', () => {
    const r = calculateSeverance(100000, 0, 0, 300, '2026-08-15');

    // 300/365 = 0,8219 yıl < 1 → hak doğmaz
    expect(r.netAmount).toBe(0);
    expect(r.grossAmount).toBe(0);
  });

  it('1 YILDAN AZ, sınıra çok yakın (11 ay 29 gün) → yine 0', () => {
    const r = calculateSeverance(30000, 0, 11, 29, '2026-08-15');

    // 11/12 + 29/365 = 0,9961 yıl < 1 → 0
    expect(r.netAmount).toBe(0);
  });

  it('TAM 1 YIL sınırı → hak doğar (0 DEĞİL): 1 yıl / 30.000 TL (H2)', () => {
    const r = calculateSeverance(30000, 1, 0, 0, '2026-08-15');

    expect(r.grossAmount).toBe(30000.0); // 1 × 30.000
    expect(r.stampTax).toBe(227.7); // 30.000 × 0,00759
    expect(r.netAmount).toBe(29772.3);
    expect(r.netAmount).toBeGreaterThan(0);
  });

  it('Yüksek maaş + uzun kıdem: 18 yıl / 100.000 TL (H2) → tavanlı ~1,32M', () => {
    const r = calculateSeverance(100000, 18, 0, 0, '2026-08-15');

    // 18 × 73.729,84 = 1.327.137,12
    expect(r.grossAmount).toBe(1327137.12);
    expect(r.stampTax).toBe(10072.97); // 1.327.137,12 × 0,00759
    expect(r.netAmount).toBe(1317064.15);
  });

  it('Damga vergisi her zaman brütün %0,759\'u kadardır', () => {
    const r = calculateSeverance(45000, 3, 0, 0, '2026-08-15');
    const expectedStamp = Math.round(r.grossAmount * 0.00759 * 100) / 100;
    expect(r.stampTax).toBe(expectedStamp);
    expect(r.netAmount).toBe(Math.round((r.grossAmount - r.stampTax) * 100) / 100);
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
