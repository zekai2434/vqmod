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

## Tamamlanan Özellikler (Detay)

### SLA Yönetimi
- [x] SLA profilleri (P1/P2/P3/P4) tanımlama
- [x] İlk yanıt ve çözüm süreleri
- [x] İş saatleri takvimi (günlük saatler, tatiller)
- [x] SLA sayacı durdurma/başlatma (müşteri bekliyor vb.)
- [x] SLA deadline otomatik uzatma

### Cihaz Envanteri
- [x] Seri no bazlı kayıt
- [x] Garanti bitiş tarihi takibi
- [x] Support sözleşme bitiş takibi
- [x] Yaklaşan garanti bitişi uyarıları
- [x] Detaylı cihaz geçmişi (ticket, iş emri, RMA)

### Rol & Yetkilendirme
- [x] 4 sistem rolü (Admin, Müdür, Teknisyen, İzleyici)
- [x] 29 detaylı izin tanımı
- [x] Modül bazlı yetki grupları
- [x] Özel rol oluşturma

### İletişim & Bildirimler
- [x] E-posta şablonları (ticket açıldı/atandı/kapanış/SLA risk)
- [x] SMS entegrasyonu (NetGSM)
- [x] @mention sistemi (yorumlarda)
- [x] Otomatik bildirimler

### Parça & Depo
- [x] Parça kartları
- [x] Stok giriş/çıkış
- [x] İş emrine parça bağlama
- [x] Seri no'lu takip
- [x] Kritik stok uyarıları

### İş Emri
- [x] Ticket'tan iş emri (uzaktan/yerinde/atölye)
- [x] Teknisyen atama
- [x] Takvim görünümü
- [x] Checklist prosedürü
- [x] Servis formu + fotoğraf
- [x] Müşteri imzası

## Teknik Mimari

### Backend
- FastAPI, Pydantic, MongoDB
- JWT kimlik doğrulama
- Resend (e-posta), NetGSM (SMS)

### Frontend
- React 19, Tailwind CSS, Shadcn/UI
- React Router, Axios, Recharts

### API Endpoint'leri
- `/api/auth/*` - Kimlik doğrulama
- `/api/customers/*` - Müşteriler
- `/api/tickets/*` - Ticketlar
- `/api/work-orders/*` - İş emirleri
- `/api/assets/*` - Cihazlar
- `/api/parts/*` - Parçalar
- `/api/stock-movements/*` - Stok hareketleri
- `/api/sla-profiles/*` - SLA profilleri
- `/api/business-hours/*` - İş saatleri
- `/api/roles/*` - Roller
- `/api/permissions` - İzinler
- `/api/notifications/*` - Bildirimler
- `/api/reports/*` - Raporlar
- `/api/rma/*` - RMA

## FAZ-2 (Opsiyonel Gelecek Geliştirmeler)
- [ ] Müşteri self-service portalı
- [ ] ERP entegrasyonu
- [ ] SNMP/Monitoring entegrasyonu
- [ ] WhatsApp Business API
- [ ] Mail-to-Ticket
- [ ] Offline mobil uygulama

## Test Bilgileri
- Email: test@network.com
- Şifre: Test123!
