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
16. ✅ Cari Hesap Yönetimi
17. ✅ Faturalama Sistemi
18. ✅ Tahsilat Yönetimi
19. ✅ **PDF İndirme Özelliği (YENİ)**
20. ✅ **Tekliften Otomatik Fatura Oluşturma (YENİ)**
21. ✅ **BizimHesap E-Fatura Entegrasyonu (YENİ)**

## Son Güncelleme (23 Şubat 2026)

### PDF İndirme Özelliği - YENİ ✅
- [x] **Fatura PDF**: Profesyonel fatura dökümanı oluşturma ve indirme
- [x] **Teklif PDF**: Teklif dökümanı oluşturma ve indirme
- [x] **Servis Raporu PDF**: Ticket için teknik servis raporu oluşturma
- [x] **fpdf2 Kütüphanesi**: Türkçe karakter desteği ile PDF oluşturma

### Tekliften Otomatik Fatura Oluşturma - YENİ ✅
- [x] **Kabul Et Butonu**: Gönderildi durumundaki tekliflerde "Kabul Et" butonu
- [x] **Otomatik Fatura**: Teklif kabul edildiğinde otomatik fatura oluşturma
- [x] **Kalem Aktarımı**: Teklif kalemleri faturaya otomatik aktarılır
- [x] **Reddet Butonu**: Teklifi reddetme seçeneği

### BizimHesap E-Fatura Entegrasyonu - YENİ ✅
- [x] **E-Fatura Gönder Butonu**: Fatura detay sayfasında
- [x] **Firm ID Yapılandırma**: Sistem ayarlarından yapılandırma
- [x] **API Endpoint Hazır**: `/api/invoices/{id}/send-efatura`
- [ ] **Aktif Kullanım**: BizimHesap Firm ID gerekli

## Önceki Güncellemeler

### Cari Hesap Yönetimi
- [x] Müşteri Bakiyeleri
- [x] Cari Özeti
- [x] Cari Hareketler
- [x] Açılış Bakiyesi

### Faturalama Sistemi
- [x] Fatura Oluşturma
- [x] Fatura Durumları
- [x] Fatura Onaylama
- [x] Vade Takibi

### Tahsilat Yönetimi
- [x] Tahsilat Kaydetme
- [x] Ödeme Yöntemleri
- [x] Otomatik Cari Güncelleme

## API Endpoints

### PDF Endpoints - YENİ
- `GET /api/invoices/{id}/pdf` - Fatura PDF indir
- `GET /api/quotes/{id}/pdf` - Teklif PDF indir
- `GET /api/tickets/{id}/service-report/pdf` - Servis raporu PDF indir

### Teklif Yaşam Döngüsü - YENİ
- `POST /api/quotes/{id}/accept` - Teklifi kabul et ve fatura oluştur

### E-Fatura - YENİ
- `POST /api/invoices/{id}/send-efatura` - BizimHesap'a e-fatura gönder
- `GET /api/settings/bizimhesap` - BizimHesap ayarlarını al
- `POST /api/settings/bizimhesap` - BizimHesap Firm ID kaydet

## Test Sonuçları
- Backend: %100 (11/11 test geçti - iteration_11)
- Frontend: %100

## Test Bilgileri
- **Admin:** test@network.com / Test123!

## FAZ-2 (Gelecek Geliştirmeler) - ÖNCELİK SIRALI

### P0 - Kritik
- [ ] **server.py Refaktör**: 5900+ satırlık monolitik dosya modüllere ayrılmalı

### P1 - Önemli
- [ ] **iyzico Aktif Entegrasyon**: API anahtarları ile tam entegrasyon
- [ ] **BizimHesap Aktif Kullanım**: Firm ID ile tam entegrasyon
- [ ] Teknisyen performans raporu frontend entegrasyonu

### P2 - Orta Öncelik
- [ ] Görüntü önizleme modal oturum sorunu düzeltme
- [ ] Teklif şablon sistemi
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
│   ├── server.py (5900+ satır - REFAKTÖR GEREKLİ)
│   └── tests/
│       ├── test_asset_ticket_edit.py
│       ├── test_ledger_invoice_payment.py
│       └── test_pdf_efatura.py (YENİ)
├── frontend/
│   ├── .env
│   ├── package.json
│   └── src/
│       ├── App.js
│       ├── components/
│       │   └── DashboardLayout.js
│       └── pages/
│           ├── QuoteList.js (GÜNCELLENDI - PDF ve Kabul/Red butonları)
│           ├── InvoiceDetail.js (GÜNCELLENDI - PDF ve E-Fatura butonları)
│           ├── TicketDetail.js (GÜNCELLENDI - Servis Raporu PDF butonu)
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
- **BizimHesap (E-Fatura):** Firm ID gerekli (HAZIR)
- **fpdf2 (PDF):** Aktif kullanımda ✅
