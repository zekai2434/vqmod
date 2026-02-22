# NetworkOps Pro - Teknik Servis Yönetim Sistemi PRD

## Orijinal Problem Tanımı
Network cihazları (switch, router, firewall, access point vb.) için kapsamlı teknik servis yönetim yazılımı.

## MVP Tamamlanma Durumu: %100 ✅

### Tüm Fonksiyonel Modüller
1. ✅ Müşteri & Sözleşme Yönetimi
2. ✅ Cihaz Envanteri & Seri No Takibi
3. ✅ Ticket (Arıza Kaydı) Yönetimi
4. ✅ SLA Yönetimi (Profiller, İş Saatleri, Sayaç Kontrolü)
5. ✅ İş Emri & Saha Servis Yönetimi
6. ✅ Parça / Depo Yönetimi
7. ✅ RMA / Garanti Süreci
8. ✅ Dashboard & Raporlama
9. ✅ Rol & Yetkilendirme
10. ✅ E-posta & SMS Bildirimleri
11. ✅ **YENİ: Müşteri Self-Service Portalı**
12. ✅ **YENİ: E-posta IMAP Entegrasyonu (Otomatik Ticket Oluşturma)**

## Son Eklenen Özellikler (Aralık 2025)

### Müşteri Self-Service Portalı
- [x] Ayrı login sistemi (`/portal/login`)
- [x] Müşteri dashboard'u
- [x] Ticket oluşturma ve takip
- [x] Yorum ekleme
- [x] Cihaz görüntüleme
- [x] Modern, kullanıcı dostu arayüz

### E-posta IMAP Entegrasyonu
- [x] IMAP yapılandırma yönetimi
- [x] Gmail, Outlook, Yahoo, Yandex hazır ayarları
- [x] Bağlantı testi
- [x] Gelen e-postalardan otomatik ticket oluşturma
- [x] E-posta durumu takibi

## Teknik Mimari

### Backend
- FastAPI, Pydantic, MongoDB
- JWT kimlik doğrulama (admin ve portal için ayrı)
- Resend (e-posta), NetGSM (SMS)
- IMAP entegrasyonu (Python imaplib)
- Fernet şifreleme (IMAP şifreleri için)

### Frontend
- React 19, Tailwind CSS, Shadcn/UI
- React Router, Axios, Recharts
- Müşteri portalı ayrı layout

### Yeni API Endpoint'leri
**Müşteri Portalı:**
- `/api/portal/login` - Portal girişi
- `/api/portal/register` - Portal kayıt
- `/api/portal/me` - Kullanıcı bilgisi
- `/api/portal/tickets` - Ticket listesi
- `/api/portal/tickets/{id}` - Ticket detayı
- `/api/portal/tickets/{id}/comments` - Yorumlar
- `/api/portal/assets` - Cihazlar
- `/api/portal/customer` - Müşteri bilgisi

**IMAP Entegrasyonu:**
- `/api/imap-configs` - IMAP yapılandırmaları
- `/api/imap-configs/{id}/test` - Bağlantı testi
- `/api/imap-configs/check-emails` - E-posta kontrolü
- `/api/email-tickets` - E-posta ticket'ları

### Yeni DB Koleksiyonları
- `portal_users` - Müşteri portal kullanıcıları
- `imap_configs` - IMAP yapılandırmaları
- `email_tickets` - E-postalardan oluşturulan ticket kayıtları

## Devam Eden / Bekleyen Özellikler

### P0 - WhatsApp Entegrasyonu (BEKLEMEDE)
- WhatsApp Business API için Node.js microservice gerekli
- Baileys kütüphanesi ile WhatsApp Web entegrasyonu
- QR kod ile bağlantı
- **Not:** Ayrı bir Node.js servisi kurulması gerekiyor

### P1 - Diğer Bekleyen Özellikler
- [ ] Ticket zaman çizelgesi (timeline view)
- [ ] Detaylı RMA yönetimi UI
- [ ] Teknisyen performans raporu
- [ ] Açık ticket analizi derinleştirme

## FAZ-2 (Gelecek Geliştirmeler)
- [ ] WhatsApp Business API (Node.js microservice)
- [ ] ERP entegrasyonu
- [ ] SNMP/Monitoring entegrasyonu
- [ ] Offline mobil uygulama

## Test Bilgileri
- **Admin:** test@network.com / Test123!
- **Portal:** Müşteri oluşturup portal kullanıcısı eklenmeli

## Dosya Yapısı
```
/app/
├── backend/
│   └── server.py (Portal ve IMAP endpoint'leri eklendi)
└── frontend/
    └── src/
        ├── App.js (Portal route'ları eklendi)
        ├── components/
        │   └── CustomerPortalLayout.js
        └── pages/
            ├── CustomerPortalLogin.js
            ├── CustomerPortalDashboard.js
            ├── CustomerPortalTickets.js
            ├── CustomerPortalTicketDetail.js
            ├── CustomerPortalNewTicket.js
            ├── CustomerPortalAssets.js
            └── EmailSettings.js
```
