// Türkçe biçimlendirme yardımcıları (içerik metinlerinde kullanılır)

// 1.234,56 gibi (iki ondalık, para tutarı — sembolsüz)
export function formatTL(n: number): string {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

// 1.234 gibi (tam sayı, binlik ayraçlı)
export function formatInt(n: number): string {
  return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(n);
}

// Oranı yüzdeye çevirir: 0,00759 -> "0,759" ; 0,15 -> "15"
export function formatPercent(rate: number, maxDigits = 3): string {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDigits,
  }).format(rate * 100);
}
