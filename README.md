# Mesai Defterim — Web Hesaplayıcıları

[mesaidefterim.com](https://mesaidefterim.com) adresinde yayınlanan, Türk işçileri için ücretsiz ücret hesaplayıcıları. Sitenin görevi Google'dan gelen ziyaretçinin sorusunu anında çözmek ve onu **Mesai Defterim** mobil uygulamasına yönlendirmektir.

Tüm hesaplar tarayıcıda yapılır; hiçbir veri sunucuya gönderilmez.

> Proje kuralları, strateji ve tasarım ilkeleri için **[CLAUDE.md](CLAUDE.md)** tek doğruluk kaynağıdır. Bu README yalnızca geliştirme ve yayın adımlarını anlatır.

## Sayfalar

| URL | Hesaplayıcı |
|---|---|
| `/` | Ana sayfa |
| `/kidem-tazminati-hesaplama/` | Kıdem tazminatı |
| `/ihbar-tazminati-hesaplama/` | İhbar tazminatı |
| `/net-brut-maas-hesaplama/` | Net ↔ brüt maaş |
| `/fazla-mesai-hesaplama/` | Fazla mesai ücreti |
| `/resmi-tatil-mesaisi-hesaplama/` | Resmi tatil çalışması |
| `/gizlilik/` | Gizlilik politikası |

Tüm adresler sondaki `/` ile biter (`trailingSlash: 'always'`). Yeni link eklerken bu biçimi kullanın.

## Kurulum

Gereksinim: Node.js 20+ (geliştirmede 24 kullanılıyor).

```bash
npm install
npm run dev       # http://localhost:4321
```

## Komutlar

| Komut | Ne yapar |
|---|---|
| `npm run dev` | Geliştirme sunucusu |
| `npm run build` | `dist/` klasörüne statik site üretir |
| `npm run preview` | Üretilen siteyi yerelde sunar |
| `npm test` | Vitest birim testleri (izleme modunda; tek sefer için `npx vitest run`) |
| `npm run deploy` | Derler ve `dist/`'i `gh-pages` dalına iter (GitHub Pages) |

## Proje yapısı

```
src/
  constants/parameters.ts   Yıllık mevzuat değerleri (asgari ücret, vergi dilimleri, kıdem tavanı…)
  utils/calc-web.ts         Saf hesap fonksiyonları — UI'dan bağımsız
  utils/calc-web.test.ts    Hesap testleri (dilim sınırları dahil)
  utils/mobil-esitlik.test.ts  Web = mobil uygulama denklik testi
  utils/format.ts           ₺ / sayı / yüzde biçimlendirme
  styles/tokens.ts          Renk, tipografi, boşluk token'ları
  styles/global.css
  layouts/BaseLayout.astro  <head>, SEO meta, ortak çerçeve
  components/               Hesaplayıcı kabuğu, SSS, uygulama kutusu, ilgili araçlar, beyan
  pages/                    Her hesaplayıcı kendi sayfasında
public/                     CNAME, robots.txt, sitemap.xml, og-cover.png, doğrulama dosyaları
design/                     Uygulama ekran görüntüleri (renk referansı)
```

## Hesap mantığı ve mobil uygulamayla eşitlik

Site ile uygulama **asla farklı sonuç vermemelidir**. Bu yüzden:

- Hesaplar `src/utils/calc-web.ts` içinde saf fonksiyonlar olarak durur ve testlidir.
- `mobil-esitlik.test.ts`, aynı referans senaryonun mobil taraftaki aynası (`Mesai-Defterim/src/services/calc.test.ts` → "web = mobil" bloğu) ile aynı sonucu verdiğini sabitler. Bir tarafta formül değişirse **diğerini de güncelleyin**, yoksa bu test kırılır.
- Sonuçlar her zaman "tahmini" olarak gösterilir.

## Yıllık güncelleme (her yıl başı / tavan değişiminde)

1. `src/constants/parameters.ts` içinde güncelleyin:
   - `YEAR`
   - `MINIMUM_WAGE` — mobil uygulamadaki `ASGARI_UCRET_<YIL>` ile **aynı** olmalı
   - `TAX_BRACKETS`
   - `SEVERANCE_CEILINGS` — yeni dönem (Ocak / Temmuz) açıklandıkça listeye ekleyin
2. Aynı değişiklikleri mobil uygulamanın `calc.ts` dosyasına yapın.
3. `npx vitest run` — beklenen değerleri yeni parametrelere göre güncelleyin.
4. Sayfa başlıklarında, açıklamalarda ve SSS metinlerinde sabit yazılmış yıl kalmadığını kontrol edin.
5. `public/sitemap.xml` içindeki `lastmod` tarihlerini güncelleyin.

## Yayın

Site GitHub Pages'te, `gh-pages` dalından yayınlanır; özel alan adı `public/CNAME` ile ayarlanır.

```bash
npx vitest run     # önce testler geçmeli
npm run deploy
```

Yayın sonrası kontrol:

- Tüm sayfalar açılıyor, hesaplayıcılar yazarken sonuç veriyor (mobilde de)
- Lighthouse performans 95+
- `sitemap.xml` ve `robots.txt` erişilebilir
- Google Search Console'da sitemap gönderili

> `sitemap.xml` elle tutulur. Sayfa eklediğinizde veya adres değiştirdiğinizde bu dosyayı da güncelleyin.

## Yeni hesaplayıcı eklemek

1. Hesap fonksiyonunu `calc-web.ts`'e ekleyin, testini yazın (mevzuat değerleri `parameters.ts`'ten gelsin).
2. `src/pages/<anahtar-kelime>-hesaplama.astro` oluşturun; mevcut bir sayfayı şablon alın. Üç katman zorunlu: hesaplayıcı → açıklama + SSS (özgün metin) → uygulama kutusu.
3. Uygulama kutusundaki Play Store linkine `utm_source=web&utm_campaign=<sayfa-adi>` ekleyin.
4. Özgün `<title>` (55–60 karakter, yıl içerir) ve `meta description` (140–155 karakter) yazın; SSS için FAQPage şeması ekleyin.
5. Ana sayfaya ve diğer sayfaların "İlgili araçlar" bölümüne link verin; `sitemap.xml`'e ekleyin.

## Yasal not

Bu site bağımsız bir hesaplama aracıdır; T.C. Çalışma ve Sosyal Güvenlik Bakanlığı, SGK veya herhangi bir resmi kurumla ilişkisi yoktur. Hesaplamalar bilgilendirme amaçlıdır ve hukuki tavsiye yerine geçmez.
