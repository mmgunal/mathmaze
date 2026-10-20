# Matematik Labirenti — Tasarım

## Amaç
6–8 yaş arası, dünyanın her yerindeki çocuklar için mağazaya (iOS / Android) çıkacak, sanatı ön planda bir matematik labirent oyunu.

## Level tasarımı = kitap (kullanıcı kararı, 2026-10-18)
43 level, referans kitabın 43 labirentinin **birebir yapısıdır**: aynı işlem kutuları, aynı sayılar, aynı kavşaklar ve
koridor bağlantıları, aynı başlangıç/bitiş, kitap sırasıyla (s.4 → s.88). Görsel dünya (karakter, tema, çizim) özgündür.
Önceki "üretilmiş labirent" denemesi kullanıcı tarafından reddedildi.

- Veri: `src/level/book/LNN.json` — her sayfanın grafı (düğüm = kutu / kavşak / başlangıç / bitiş / çıkmaz,
  kenar = koridor, kenar etiketi = koridordaki sayı veya işlem). Şema ve kurallar: `src/level/book.ts`.
- Aktarım kuralları: `tools/TRANSCRIBE.md`. Kontrol: `node tools/check-book.ts` (her sayfa için kurala uyan bir
  rota bitişe ulaşmalı; rota kitabın çözüm sayfalarındaki kırmızı çizgiyle karşılaştırıldı).
- Kitaptaki tek baskı hatası (s.72-73'te "28−40", sonucu negatif, çözüm yolunda değil) oyunda "28−20" yapıldı.

## Mekanikler (kitaptaki üç tür)
- **b** — kutuda işlem, kollarda sonuç sayıları: doğru sonucun yazdığı kola dokun.
- **c** — kutuda eksik sayılı eşitlik (`□+5=10`), kollarda sayılar.
- **a** — kutu yok, koridorlarda işlemler; hedefi (10 / 20 / 100) yapan işlemi seç.

## Oynanış kuralları
- Karakter düğümden düğüme ilerler. Kavşakta çıkan koridorlardan biri doğru işaretliyse çocuk seçer (taşa dokunur);
  değilse yol sadece devam ediyordur ve karakter kendi yürür.
- Kutusuz kavşaklarda otomatik yürüyüş kitabın amaçladığı yolu tercih eder: kutulara arkadan girmeyen, sonra en çok
  kutudan geçen rota. Kurala uyan başka rotalar da geçerlidir.
- Yanlış seçim: taş sallanır, koridor çitle kapanır, hata sayılır. Yıldız: 0 hata = 3, 1–2 = 2, 3+ = 1.
- İpucu: konuya özel kısa mesaj + doğru taş parlar. Level 1'de el animasyonu kuralı gösterir.

## Teknik
Vite + TypeScript + Three.js; DOM overlay ile HUD/menüler; Web Audio ile sentetik ses; Vitest.
Sayfa dikey telefona sığsın diye 90° döndürülür (kitabın sol kenarı kameraya yakın). Paketleme: Capacitor (sonraki aşama).
Geliştirme kısayolları: `?level=N`, `?speed=N` (yalnızca dev).

## Dünyalar (özgün temalar)
1 Çayır · 2 Karlı Tepeler · 3 Mercan Resifi · 4 Kanyon · 5 Şeker Bahçesi · 6 Yıldız Adası

## Claude'un verdiği kararlar (kullanıcı onaylamadı, itiraz edilebilir)
Can sistemi yerine hata sayacı; yanlışta karakter yürümez; tema/karakter tasarımı; baskı hatası düzeltmesi.
