# Mesai Defterim Web — Hesaplayıcı Sitesi Anayasası (CLAUDE.md)

Bu dosya, Mesai Defterim uygulamasının web trafiği kanalı olan hesaplayıcı sitesinin tek doğruluk kaynağıdır. Kod yazan herkes (Claude Code dahil) bu kurallara uyar.

## 1. Amaç ve strateji

Site iki iş yapar, sırasıyla:
1. **Uygulamaya kullanıcı taşır:** Google'da hesap arayan işçiyi ("kıdem tazminatı hesaplama" vb.) yakalar, sorusunu ANINDA ve ücretsiz çözer, sonra tek bir kapı gösterir: "Bu hesabı her ay otomatik yapan uygulama: Mesai Defterim."
2. **İleride kendi gelirini üretir:** Trafik oturunca (faz 2) AdSense eklenir. v1'de REKLAM YOK — hız ve güven önce gelir.

Başarı ölçüsü: organik arama trafiği ve uygulama mağazasına tıklama. Süs değil, musluk.

## 2. Teknoloji kararları (değiştirilemez)

| Karar | Seçim | Gerekçe |
|---|---|---|
| Yapı | Statik site — Astro | Sıfır sunucu, maksimum hız (SEO şartı), bileşen düzeni |
| Hesaplar | Tamamen tarayıcıda, TypeScript | Veri hiçbir yere gitmez (gizlilik = güven), maliyet sıfır |
| Hesap mantığı | Uygulamanın `calc.ts` dosyasından BİREBİR taşınır, testleriyle birlikte | Site ile uygulama asla farklı sonuç veremez; mevzuat değişince iki projede aynı dosya güncellenir |
| Barındırma | GitHub Pages (özel domain'e hazır yapı) | Bedava, HTTPS otomatik |
| Domain | mesaidefterim.com (ya da .com.tr) — alınana kadar github.io alt alanı | Marka + anahtar kelime uyumu |
| Analitik | Yok (v1). Faz 2'de çerezsiz hafif analitik değerlendirilir | Hız ve KVKK sadeliği |
| Dil/format | Tamamen Türkçe, ₺, Europe/Istanbul | |

## 3. Sayfa listesi (v1)

Her hesaplayıcı sayfası kendi URL'inde yaşar (SEO'nun temel kuralı — tek sayfalık uygulama YASAK):

| URL | Sayfa | Hedef aramalar |
|---|---|---|
| / | Ana sayfa: kısa tanıtım + 5 hesaplayıcı kartı + uygulama tanıtım bölümü | mesai defterim, maaş hesaplama araçları |
| /kidem-tazminati-hesaplama | Kıdem tazminatı hesaplayıcı | kıdem tazminatı hesaplama, kıdem tazminatı nasıl hesaplanır |
| /ihbar-tazminati-hesaplama | İhbar tazminatı hesaplayıcı | ihbar tazminatı hesaplama, ihbar süresi |
| /net-brut-maas-hesaplama | Net-brüt çevirici | net brüt maaş hesaplama, brütten nete |
| /fazla-mesai-hesaplama | Fazla mesai ücreti hesaplayıcı | fazla mesai hesaplama, fazla mesai ücreti 2026 |
| /resmi-tatil-mesaisi-hesaplama | Resmi tatil çalışması hesaplayıcı | resmi tatil mesaisi, bayramda çalışma ücreti |

Faz 2 adayları (v1'de YAPILMAZ): asgari ücret bilgi sayfası, yıllık izin hesaplayıcı, rehber yazıları.

## 4. Sayfa şablonu (her hesaplayıcıda aynı üç katman)

1. **Hesaplayıcı** — sayfanın en üstünde, kaydırmadan görünür. Form + anında sonuç (buton gerekmez, yazarken hesaplanır). Sonuç büyük ve net: "Tahmini kıdem tazminatın: 186.500 ₺".
2. **Açıklama + SSS** — "Nasıl hesaplanır" bölümü (formül düz Türkçe anlatılır, örnekli), ardından 4-6 soruluk SSS. Bu katman Google'ın sayfayı "derinlikli" sayması için şart; her sayfada özgün metin olur, şablon metin kopyalanmaz.
3. **Uygulama kutusu** — tek tasarım, her sayfada aynı: kısa cümle ("Bu hesabı her ay otomatik yapan, bordronla karşılaştıran uygulama") + Google Play rozeti. Mağaza linki UTM parametreli olur (hangi sayfanın kaç kullanıcı taşıdığını Play Console'dan görebilmek için): `utm_source=web&utm_campaign=SAYFA_ADI`.

Her sayfanın en altında bağımsızlık beyanı (Play ret dersimiz, burada da geçerli):
"Bu site bağımsız bir hesaplama aracıdır; T.C. Çalışma ve Sosyal Güvenlik Bakanlığı, SGK veya herhangi bir resmi kurumla ilişkisi yoktur. Hesaplamalar bilgilendirme amaçlıdır ve hukuki tavsiye yerine geçmez."

## 5. SEO kuralları

- Her sayfada özgün `<title>` (55-60 karakter, yıl içerir: "Kıdem Tazminatı Hesaplama 2026 — Ücretsiz Araç") ve `meta description` (140-155 karakter).
- SSS bölümü FAQPage schema.org yapılandırılmış verisiyle işaretlenir; hesaplayıcılar WebApplication şemasıyla.
- sitemap.xml ve robots.txt üretilir. Site yayına girince Google Search Console'a eklenir (kullanıcı işi — rehberde).
- Görseller minimum; Lighthouse performans hedefi 95+. Harici font tek aile ile sınırlı, JS bütçesi sayfa başı < 50 KB.
- Sayfalar arası çapraz bağlantı: her hesaplayıcının altında "İlgili araçlar" bölümü diğer sayfalara link verir.
- Yıl güncelliği: 2026 parametreleri (asgari ücret, vergi dilimleri, kıdem tavanı) `constants/parametreler.ts` içinde TEK dosyada tutulur; her yıl güncellenir, metinlerdeki yıl ifadeleri de buradan beslenir.

## 6. Hesap kuralları

- Kıdem: her tam yıl için 30 günlük giydirilmiş brüt ücret; kıdem tazminatı tavanı uygulanır; damga vergisi kesintisi gösterilir. Artık aylar/günler oransal hesaplanır.
- İhbar: kıdeme göre 2/4/6/8 hafta; brüt üzerinden gelir + damga vergisi kesintili net sonuç da gösterilir.
- Net-brüt: 2026 vergi dilimleri, SGK işçi payı (%14 + %1 işsizlik), asgari ücret istisnası dahil; kümülatif matrah basitleştirmesi açıklama metninde belirtilir.
- Fazla mesai: saatlik ücret = aylık brüt / 225, çarpan 1,5 (İş K. m.41).
- Resmi tatil: çalışılan gün başına +1 günlük ücret (aylık / 30).
- Tüm sonuçların yanında "tahmini" ibaresi durur. Kesinlik iddiası YASAK.
- Uygulamadaki calc.ts ile çakışan her fonksiyon oradan alınır; web'e özgü olanlar (net-brüt, kıdem) aynı dosya düzeninde `calc-web.ts` olarak yazılır ve birim testleri şarttır (vergi dilimi sınır değerleri dahil).

## 7. Tasarım kuralları

- Kimlik uygulamayla ortak: lacivert temel, para/sonuç yeşili, uyarı kırmızısı — `design/` klasöründeki uygulama ekran görüntüleri renk referansıdır. Kullanıcı siteden uygulamaya geçtiğinde aynı ürünün devamını hissetmeli.
- Mobil öncelikli: trafiğin büyük çoğunluğu telefondan gelecek. Hesaplayıcı formları tek sütun, büyük girdi alanları (min 48px dokunma), gövde yazısı min 16px.
- Sayfa yapısı sade ve hızlı; animasyon ve süs minimum. Güven veren, "resmi görünmeyen ama ciddi" ton — abartılı pazarlama dili yok.
- Karanlık desen YASAK: pop-up, geri sayım, "son şans" dili, zorla bildirim izni — hiçbiri olmaz. Güven, bu sitenin tek pazarlamasıdır.

## 8. Yapım sırası

Her adım tek başına çalışır durumda biter ve commit edilir.

1. Astro projesi + tema (renk/typografi token'ları) + sayfa şablonu bileşenleri (hesaplayıcı kabuğu, SSS, uygulama kutusu, alt bilgi)
2. `constants/parametreler.ts` (2026 değerleri) + calc fonksiyonları + birim testleri (uygulamadan taşınanlar + web'e özgüler)
3. Fazla mesai sayfası (uygulamayla en doğrudan bağlantılı sayfa — şablonun ilk gerçek örneği)
4. Kıdem tazminatı sayfası
5. İhbar tazminatı sayfası
6. Net-brüt sayfası
7. Resmi tatil mesaisi sayfası
8. Ana sayfa + sayfalar arası bağlantılar
9. SEO katmanı: title/description'lar, FAQPage şemaları, sitemap, robots
10. GitHub Pages yayını + yayın sonrası kontrol listesi (Lighthouse, mobil test, Search Console talimatı)

## 9. Kod standartları

- TypeScript strict, `any` yasak.
- Hesap fonksiyonları saf (pure), UI'dan tamamen ayrık, testli.
- Metinler bileşenlere gömülmez; sayfa içerikleri content dosyalarında durur.
- Renk/spacing değerleri tek token dosyasından gelir.
