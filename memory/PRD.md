# NetworkOps Pro - Teknik Servis Yönetim Sistemi PRD

## Orijinal Problem Tanımı
Network cihazları için kapsamlı teknik servis yönetim yazılımı.

## MVP Tamamlanma Durumu: %100 ✅

### Tüm Fonksiyonel Modüller
1. ✅ Müşteri & Sözleşme Yönetimi
2. ✅ Cihaz Envanteri & Seri No Takibi (Tam CRUD)
3. ✅ Ticket Yönetimi (Tam CRUD + Düzenleme)
4. ✅ SLA Yönetimi
5. ✅ İş Emri & Saha Servis Yönetimi
6. ✅ Parça / Depo Yönetimi
7. ✅ RMA / Garanti Süreci
8. ✅ Dashboard & Raporlama
9. ✅ Kullanıcı Yönetimi (Tam CRUD)
10. ✅ E-posta & SMS Bildirimleri
11. ✅ Müşteri Self-Service Portalı
12. ✅ Portal Kullanıcı Yönetimi (Tam CRUD)
13. ✅ Ticket Timeline/Zaman Çizelgesi
14. ✅ Yazdırılabilir Teknik Servis Raporu
15. ✅ Teklif Yönetimi (Tam CRUD)
16. ✅ **CARİ HESAP YÖNETİMİ (YENİ)**
17. ✅ **FATURALAMA SİSTEMİ (YENİ)**
18. ✅ **TAHSİLAT YÖNETİMİ (YENİ)**

## Son Güncelleme (Şubat 2026)

### Cari Hesap Yönetimi - YENİ
- [x] **Müşteri Bakiyeleri**: Tüm müşterilerin borç/alacak durumu
- [x] **Cari Özeti**: Toplam Alacak, Toplam Borç, Net Bakiye kartları
- [x] **Cari Hareketler**: Fatura, tahsilat, iade, açılış bakiyesi
- [x] **Açılış Bakiyesi**: Yeni müşteriler için başlangıç bakiyesi girişi
- [x] **Cari Detay**: Müşteri bazlı hareket listesi ve güncel bakiye

### Faturalama Sistemi - YENİ
- [x] **Fatura Oluşturma**: Çoklu kalem desteği, KDV ve iskonto hesaplama
- [x] **Fatura Durumları**: Taslak, Bekliyor, Kısmi Ödeme, Ödendi, Gecikmiş
- [x] **Fatura Onaylama**: Taslak faturayı onaylayınca cariye otomatik borç işleme
- [x] **Fatura İstatistikleri**: Toplam fatura, tahsil edilen, bekleyen, tahsilat oranı
- [x] **Fatura Yazdırma**: Profesyonel fatura çıktısı (logo, müşteri bilgileri, kalemler)
- [x] **Vade Takibi**: Vade tarihi belirleme

### Tahsilat Yönetimi - YENİ
- [x] **Tahsilat Kaydetme**: Faturaya bağlı veya serbest tahsilat
- [x] **Ödeme Yöntemleri**: Nakit, Havale/EFT, Kredi Kartı, iyzico
- [x] **Otomatik Cari Güncelleme**: Tahsilat kaydedilince cariye alacak işleme
- [x] **Fatura Durumu Güncelleme**: Kısmi veya tam ödeme durumu

### iyzico Entegrasyonu - HAZIR (API KEY GEREKLİ)
- [x] **Endpoint Hazır**: `/api/payments/iyzico/create`
- [ ] **Aktif Kullanım**: `IYZICO_API_KEY` ve `IYZICO_SECRET_KEY` gerekli

## Önceki Güncellemeler

### Cihaz Yönetimi (Tam CRUD)
- [x] Cihaz Düzenleme/Silme
- [x] Garanti takibi
- [x] Müşteri bazlı filtreleme

### Ticket Düzenleme (Genişletilmiş)
- [x] Başlık, açıklama, kategori, öncelik düzenleme
- [x] Cihaz ekleme/değiştirme (ticketa sonradan cihaz ekleme)
- [x] Teknisyen atama
- [x] Değişiklik takibi (zaman çizelgesi)

## API Endpoints

### Cari (Ledger) Endpoints - YENİ
- `GET /api/ledger/summary` - Tüm müşteri bakiyeleri özeti
- `GET /api/ledger/customer/{id}` - Müşteri cari hareketleri
- `POST /api/ledger/opening-balance` - Açılış bakiyesi ekle

### Fatura (Invoice) Endpoints - YENİ
- `GET /api/invoices` - Fatura listesi
- `GET /api/invoices/{id}` - Fatura detayı
- `POST /api/invoices` - Yeni fatura oluştur
- `PATCH /api/invoices/{id}` - Fatura güncelle
- `POST /api/invoices/{id}/finalize` - Faturayı onayla (cariye işle)
- `DELETE /api/invoices/{id}` - Taslak fatura sil
- `GET /api/invoices/stats/summary` - Fatura istatistikleri

### Ödeme (Payment) Endpoints - YENİ
- `GET /api/payments` - Tahsilat listesi
- `GET /api/payments/{id}` - Tahsilat detayı
- `POST /api/payments` - Tahsilat kaydet
- `POST /api/payments/iyzico/create` - iyzico ile ödeme (API key gerekli)

## Test Sonuçları
- Backend: %100 (19/19 test geçti - iteration_10)
- Frontend: %100

## Test Bilgileri
- **Admin:** test@network.com / Test123!

## FAZ-2 (Gelecek Geliştirmeler) - ÖNCELİK SIRALI

### P0 - Kritik
- [ ] **server.py Refaktör**: 5500+ satırlık monolitik dosya modüllere ayrılmalı

### P1 - Önemli
- [ ] **iyzico Aktif Entegrasyon**: API anahtarları ile tam entegrasyon
- [ ] PDF indirme özelliği (faturalar için)
- [ ] Teklif yaşam döngüsü (Gönderildi, Kabul Edildi, Reddedildi)
- [ ] Kabul edilen tekliften otomatik fatura oluşturma
- [ ] Teknisyen performans raporu frontend entegrasyonu

### P2 - Orta Öncelik
- [ ] Görüntü önizleme modal oturum sorunu düzeltme
- [ ] Teklif şablon sistemi
- [ ] E-fatura/E-arşiv entegrasyonu
- [ ] Otomatik vade uyarıları

### P3 - Backlog
- [ ] ERP entegrasyonu
- [ ] SNMP/monitoring alarm entegrasyonu
- [ ] Offline mobil uygulama

## Kod Mimarisi

```
/app/
├── backend/
│   ├── .env
│   ├── requirements.txt
│   ├── server.py (5500+ satır - REFAKTÖR GEREKLİ)
│   └── tests/
│       ├── test_asset_ticket_edit.py
│       └── test_ledger_invoice_payment.py (YENİ)
├── frontend/
│   ├── .env
│   ├── package.json
│   └── src/
│       ├── App.js
│       ├── components/
│       │   └── DashboardLayout.js (GÜNCELLENDI - Finans menüsü)
│       └── pages/
│           ├── LedgerList.js (YENİ - Cariler)
│           ├── InvoiceList.js (YENİ - Faturalar)
│           ├── InvoiceDetail.js (YENİ - Fatura Detay/Yazdır)
│           └── ... diğer sayfalar
└── whatsapp-service/
    └── index.js
```

## 3. Parti Entegrasyonlar
- **Resend (Email):** RESEND_API_KEY gerekli
- **NetGSM (SMS):** Kullanıcı kimlik bilgileri gerekli
- **IMAP (Email Ticketing):** Python imaplib
- **WhatsApp:** Node.js microservice
- **iyzico (Ödeme):** IYZICO_API_KEY, IYZICO_SECRET_KEY gerekli (HAZIR)
