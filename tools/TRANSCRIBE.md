# Kitap sayfasını level verisine aktarma

Her level, kitaptaki bir çift sayfa labirentin **birebir yapısıdır**: aynı işlem kutuları, aynı sayılar,
aynı kavşaklar, aynı koridor bağlantıları, aynı başlangıç ve bitiş. Görseller oyunda yeniden çizilecek; senin işin
sayfanın yapısını eksiksiz ve doğru bir grafa dökmek.

## Dosyalar
- Fotoğraflar (tam çözünürlük, değiştirme): `C:\Claude_Development\matematik-labirenti\kitap_gorselleri\IMG_XXXX.JPG`
- Küçültülmüş tam fotoğraflar (genel bakış): `C:\Users\meo_1\AppData\Local\Temp\claude\C--Claude-Development-matematik-labirenti\153778f1-7d2b-45a6-93fa-ca93a3ac644a\scratchpad\small\IMG_XXXX.JPG` (1200 px)
- Yakın okuma için kırpma (tam çözünürlükten, EXIF döndürmeli):
  ```
  powershell -NoProfile -File C:\Claude_Development\matematik-labirenti\tools\crop.ps1 -File IMG_2215.JPG -X0 0 -Y0 0.15 -X1 0.55 -Y1 0.9 -Out <crops klasörün>\x.jpg
  ```
  X0..Y1 fotoğrafın 0..1 kesirleri. Çıktı en fazla 1600 px. Kırptığın görüntüdeki piksel (px,py) →
  fotoğraf kesri: `x = X0 + (X1-X0)*px/genişlik`, `y = Y0 + (Y1-Y0)*py/yükseklik`.
  Sayfayı en az 4–6 parçada (çakışmalı) yakından oku; küçük sayılar küçük görselde kaçar.
- Kırpmaları kendi klasörüne yaz: `...\scratchpad\crops\<level>\` (yoksa oluştur).
- Çıktı: `C:\Claude_Development\matematik-labirenti\src\level\book\LNN.json` (NN = iki haneli level no).
  **Başka hiçbir dosyayı değiştirme.**
- Örnek (tamamlanmış, doğrulanmış): `src/level/book/L02.json`. Şema: `src/level/book.ts`.

## Koordinatlar
Tüm x,y değerleri **fotoğrafın** 0..1 kesirleri (küçük ya da büyük görüntüde aynı). `frame`: basılı çift sayfanın
fotoğraf içindeki kutusu `[x0,y0,x1,y1]`.

## Grafa dökme kuralları
- **Düğümler (nodes)**
  - `type: "start"` Başlangıç (yolun başladığı yer), `type: "finish"` Bitiş (yolun bittiği yer), tam bir tane.
  - **İşlem kutusu** (`7+2`, `10−3`, `3+4+5`, eksik sayılı `□+5=10`): `label` taşıyan düğüm. Kutunun hemen ardından
    numaralı kollar ayrılır; düğümü o ayrılma noktasına/kutunun üstüne koy.
  - Kutusuz kavşak (koridorların birleştiği/ayrıldığı yer): label'sız düğüm (`j1`, `j2`...).
  - Çıkmaz uçlar: `type: "deadend"`.
- **Kenarlar (edges)**: iki düğüm arasındaki her koridor bir kenar. `via`: koridorun kıvrımlarını izleyen 1–5 nokta
  (from→to sırasıyla); kabaca şekli versin.
  - Koridor üzerindeki **sayı**: `label` + `at` (yazının konumu). Bu sayı `from` düğümündeki kutunun seçeneğidir,
    yani `from` = sayının ait olduğu kutu (sayının hemen gerisindeki kutu).
  - İki kutu arasındaki bir koridorda her iki uçta da sayı varsa: `label/at` from tarafının, `labelBack/atBack` to tarafının.
  - Bir kutudan çıkan her koridorun kutuya yakın ucunda o kutunun seçeneği olan bir sayı olur; sayısız çıkış bırakma
    (sayfada gerçekten sayısızsa bırak, oyunda kapalı sayılır).
- **Mekanik**
  - `"b"`: kutuda işlem, kollarda sonuç sayıları (çoğu sayfa).
  - `"c"`: kutuda eksik sayılı eşitlik (`□+5=10`, `9−□=4`), kollarda sayılar. Boşluk için `□` kullan.
  - `"a"`: kutu yok; işlemler koridorların üstünde yazılı, `target` (ör. 10, 20, 100) yapan işlemleri izle.
    O zaman işlemler kenar `label`'ı olur (`"7+3"`), kararlar label'sız kavşaklarda verilir. Bir koridorda art arda
    iki işlem varsa araya label'sız bir düğüm koy.
- **Sayfadaki her kutuyu ve her sayıyı aktar** (yalnızca çözüm yolunu değil). Yanlış kolların nereye bağlandığı
  da kitaptaki gibi olmalı. Emin olmadığın bağlantıyı en olası haliyle kur ve raporda belirt.
- Eksi için `−` ya da `-` olur.

## Kontrol (zorunlu)
```
cd C:\Claude_Development\matematik-labirenti && node tools/check-book.ts src/level/book/LNN.json
```
`✓` ve bir `route` basmalı. Rota kitabın amaçladığı yol olmalı: her kutuda doğru cevabın yazdığı kol. Kitabın
çözüm sayfalarında (IMG_2256 sağ sayfa: s.4–11, IMG_2257: s.12–35, IMG_2258: s.36–59, IMG_2259: s.60–83,
IMG_2260: s.84–88) her labirentin küçük resmi kırmızı çözüm çizgisiyle var; okunabiliyorsa rotanı onunla karşılaştır.
Hata varsa düzelt, tekrar çalıştır. `warn  ... allowed exits` uyarısı, çözüm üzerinde birden fazla doğru çıkış
olduğu anlamına gelir; kitapta gerçekten öyle değilse okumanı düzelt.

## Rapor
Her level için: dosya, ✓/✗, check çıktısındaki route satırı, kutu/sayı adedi, emin olmadığın yerler (kısa).
