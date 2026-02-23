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

## Son Güncelleme (Şubat 2026)

### Cihaz Yönetimi (Tam CRUD) - YENİ
- [x] **Cihaz Listeleme**: İstatistik kartları (Toplam, Garantili, Garantisi Biten)
- [x] **Cihaz Arama**: Seri no, marka, model, müşteri ile filtreleme
- [x] **Cihaz Düzenleme**: Tüm alanlar düzenlenebilir (müşteri, seri no, tip, marka, model, lokasyon, tarihler)
- [x] **Cihaz Silme**: Admin yetkisi gerekli, açık ticketı olan cihazlar silinemez
- [x] **Cihaz Geçmişi**: Tüm değişiklikler kaydedilir

### Ticket Düzenleme (Genişletilmiş) - YENİ
- [x] **Başlık Düzenleme**: Ticket başlığı değiştirilebilir
- [x] **Açıklama Düzenleme**: Ticket açıklaması değiştirilebilir
- [x] **Kategori Değişimi**: network, hardware, software, security, other
- [x] **Öncelik Değişimi**: critical, high, medium, low
- [x] **Teknisyen Atama**: Ticket'a teknisyen atanabilir
- [x] **Cihaz Ekleme/Değiştirme**: Ticket'a sonradan cihaz eklenebilir veya değiştirilebilir
- [x] **Cihaz Kaldırma**: Ticket'tan cihaz çıkarılabilir
- [x] **Değişiklik Takibi**: Cihaz değişiklikleri zaman çizelgesinde gösterilir

### Kullanıcı Yönetimi (Tam CRUD)
- [x] **Kullanıcı Listeleme**: Arama, rol filtreleme, istatistik kartları
- [x] **Kullanıcı Düzenleme**: Ad, e-posta, rol değiştirme
- [x] **Şifre Sıfırlama**: Otomatik şifre üretici, min 6 karakter kontrolü
- [x] **Kullanıcı Silme**: Admin yetkisi gerekli, kendini silemez

### Ticket Yönetimi (Tam CRUD)
- [x] **Ticket Silme**: İlgili tüm verileri siler (yorumlar, dosyalar, geçmiş)
- [x] **Yetki Kontrolü**: Admin veya oluşturucu silebilir
- [x] **İstatistik Kartları**: Toplam, Açık, Devam Eden, Çözülen, Yüksek Öncelik

## API Endpoints

### Cihaz (Asset) Endpoints
- `GET /api/assets` - Cihaz listesi
- `GET /api/assets/{id}` - Cihaz detayı
- `POST /api/assets` - Yeni cihaz ekle
- `PATCH /api/assets/{id}` - Cihaz güncelle
- `DELETE /api/assets/{id}` - Cihaz sil (admin, açık ticket yoksa)
- `GET /api/assets/{id}/history` - Cihaz geçmişi

### Ticket Endpoints
- `GET /api/tickets` - Ticket listesi
- `GET /api/tickets/{id}` - Ticket detayı
- `POST /api/tickets` - Yeni ticket oluştur
- `PATCH /api/tickets/{id}` - Ticket güncelle (genişletilmiş)
- `DELETE /api/tickets/{id}` - Ticket sil
- `GET /api/tickets/{id}/history` - Ticket geçmişi (cihaz değişiklikleri dahil)

### Kullanıcı Endpoints
- `GET /api/users` - Kullanıcı listesi
- `GET /api/users/{id}` - Kullanıcı detayı
- `PATCH /api/users/{id}` - Kullanıcı güncelle
- `POST /api/users/{id}/reset-password` - Şifre sıfırla
- `DELETE /api/users/{id}` - Kullanıcı sil

## Test Sonuçları
- Backend: %100 (19/19 test geçti - iteration_9)
- Frontend: %100

## Test Bilgileri
- **Admin:** test@network.com / Test123!

## FAZ-2 (Gelecek Geliştirmeler) - ÖNCELİK SIRALI

### P0 - Kritik
- [ ] **server.py Refaktör**: 5000+ satırlık monolitik dosya modüllere ayrılmalı
  - routers/ klasörü
  - models/ klasörü
  - services/ klasörü

### P1 - Önemli
- [ ] PDF indirme özelliği (raporlar ve teklifler için)
- [ ] Teklif yaşam döngüsü (Gönderildi, Kabul Edildi, Reddedildi durumları)
- [ ] Kabul edilen tekliften otomatik iş emri oluşturma
- [ ] Teknisyen performans raporu frontend entegrasyonu

### P2 - Orta Öncelik
- [ ] Görüntü önizleme modal oturum sorunu düzeltme
- [ ] Teklif şablon sistemi (yeniden kullanılabilir şablonlar)
- [ ] E-posta ile teklif gönderme

### P3 - Backlog
- [ ] ERP entegrasyonu
- [ ] SNMP/monitoring alarm entegrasyonu (Zabbix/PRTG)
- [ ] Offline mobil uygulama

## Kod Mimarisi

```
/app/
├── backend/
│   ├── .env
│   ├── requirements.txt
│   ├── server.py (5000+ satır - REFAKTÖR GEREKLİ)
│   └── tests/
│       └── test_asset_ticket_edit.py (YENİ)
├── frontend/
│   ├── .env
│   ├── package.json
│   └── src/
│       ├── App.js
│       ├── components/
│       │   ├── DashboardLayout.js
│       │   └── TicketTimeline.js
│       └── pages/
│           ├── AssetList.js (GÜNCELLENDI - Tam CRUD)
│           ├── TicketDetail.js (GÜNCELLENDI - Düzenleme modalı)
│           ├── TicketList.js
│           ├── UserList.js
│           ├── PortalUserList.js
│           ├── QuoteCreate.js
│           ├── QuoteList.js
│           └── ServiceReportPrint.js
└── whatsapp-service/
    └── index.js
```

## 3. Parti Entegrasyonlar
- **Resend (Email):** RESEND_API_KEY gerekli
- **NetGSM (SMS):** Kullanıcı kimlik bilgileri gerekli
- **IMAP (Email Ticketing):** Python imaplib
- **WhatsApp:** Node.js microservice (@whiskeysockets/baileys)
