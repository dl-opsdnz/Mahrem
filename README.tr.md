# Mahrem

**Metnini paylaş. Sırlarını değil.** Mahrem; bir metni issue, destek talebi, belge veya yapay zekâ sohbetine yapıştırmadan önce yaygın kişisel bilgi ve sırları bulmaya çalışan küçük, açık kaynaklı bir metin temizleyicidir.

[English README](README.md) · [Gizlilik notları](PRIVACY.md) · [Güvenlik politikası](SECURITY.md) · [Katkı rehberi](CONTRIBUTING.md)

## Neden Mahrem?

Hızlı maskeleme araçlarının çoğu korumak istediğin metni önce sunucuya yükletir. Mahrem taramayı tarayıcıda, ayrı bir Web Worker içinde yapar. Metin sekmenin belleğinde kalır; uygulama sunucusuna gönderilmez ve yerel depolamaya yazılmaz. Cihazda saklanan tek veriler dil, etkin kurallar, değiştirme biçimi ve özel regex kurallarıdır.

Hesap gerekmez. Uygulamada üçüncü taraf font, uzak görsel, uygulama analitiği veya API yoktur. İlk çevrimiçi yükleme ve service worker etkinleşmesinden sonra uygulama kabuğu ile aynı kaynaktaki dosyalar çevrimdışı kullanılabilir.

## Neleri bulur?

- E-posta ve telefon numarası kalıpları
- T.C. kimlik numarası (kontrol hanesi doğrulamasıyla)
- IBAN (mod-97 kontrolüyle)
- IPv4 ve IPv6 adresleri
- URL'ler
- Yaygın API anahtarı ve sır kalıpları
- Kullanıcının eklediği düzenli ifadeler

Eşleşmeler `[EMAIL]` gibi tür etiketiyle değiştirilebilir, `••••` olarak maskelenebilir veya kaldırılabilir. Orijinal metin, eşleşmeler vurgulanmış halde temiz metinle yan yana gösterilir. Temiz metin ancak sen seçersen kopyalanır veya indirilir.

## Yerelde çalıştır

Gereksinimler: Node.js 20.19+ ve pnpm 10.18.0.

```sh
pnpm install --frozen-lockfile
pnpm dev
```

`http://localhost:3000` adresini aç. Test, tür denetimi ve üretim build'i:

```sh
pnpm test
pnpm check
pnpm build
```

`pnpm build`, `dist/public` klasöründe statik site üretir; sunucu, veritabanı, hesap veya gizli anahtar gerekmez. Bu klasör herhangi bir statik HTTPS barındırma hizmetinde yayınlanabilir. Service worker/çevrimdışı destek için HTTPS gerekir.

## Gizlilik modeli ve sınırlar

Metinden sonuca giden tarama tamamen istemci tarafındadır. Worker, metni açık olan sayfadan alır ve eşleşme aralıklarıyla temizlenmiş metni döndürür; ağ isteği yapmaz. Mahrem giriş metnini kaydetmez. Sayfa kapanıp yenilendiğinde tarayıcı belleğindeki metin silinir. Tercih kaydında metin bulunmaz.

Bu sezgisel bir tarayıcıdır; her hassas değerin bulunacağını garanti etmez. Önemli metinleri paylaşmadan önce sonuçları kendin doğrula. Karmaşık özel regex'ler maliyetli olabilir; ayrı bir worker'da çalışır, giriş 100.000 karakterle sınırlıdır ve tarama zaman sınırını aşarsa worker sonlandırılır. Yalnızca anladığın özel desenleri kullan.

Her barındırılan web sitesinde olduğu gibi statik sunucu, ağ sağlayıcısı veya CDN IP adresi ve istenen dosya yolu gibi olağan istek üst verilerini işleyebilir. Mahrem yazdığın metni bu isteklere eklemez. Ayrıntı için [PRIVACY.md](PRIVACY.md) dosyasına bak.

## Teknoloji

React, TypeScript, Vite, Vitest ve Lucide ikonları. Arayüz sistem fontlarını ve yerel paketlenmiş dosyaları kullanır; uzak font veya görsel isteği yoktur.

## Lisans

MIT. Ayrıntılar [LICENSE](LICENSE) dosyasında.
