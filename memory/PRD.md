# NetworkOps Pro - Teknik Servis Yönetim Sistemi PRD

## Orijinal Problem Tanımı
Network cihazları (switch, router vb.) için kapsamlı teknik servis yönetim yazılımı.

## Temel Özellikler (MVP)
1. Müşteri ve Sözleşme Yönetimi ✅
2. Cihaz Envanteri (Seri No bazlı) ✅
3. Ticket Yönetimi ✅
4. İş Emri / Saha Servis Yönetimi ✅
5. SLA Takibi ve Bildirimler (temel) ✅
6. Parça / Stok Yönetimi ✅
7. RMA / Garanti Süreci ✅
8. Temel Raporlama ✅

## Tamamlanan Özellikler

### Aralık 2025 - Parça / Depo / Sarf Yönetimi
- [x] Parça kartları + stok seviyeleri
- [x] İş emrine parça talebi / rezervasyon
- [x] Stok giriş-çıkış (iş emrine bağlanarak)
- [x] Seri no'lu parça takibi (SFP, PSU, cihaz vb.)
- [x] İade / değişim / hurda akışı
- [x] Min stok uyarıları
- [x] Stok hareketleri geçmişi
- [x] Kategori ve stok bazlı filtreleme

### Aralık 2025 - İş Emri ve Saha Servis Yönetimi
- [x] Ticket → İş emri üretimi (uzaktan/yerinde/atölye)
- [x] Teknisyen/ekip atama
- [x] Randevu planlama + takvim görünümü
- [x] Check-list / adım adım servis prosedürü
- [x] Servis formu (yapılan işlem, süre, fotoğraf)
- [x] Müşteri onayı / imza (opsiyon)
- [x] İş emirleri listesi (liste + takvim görünümü)
- [x] İş emri detay sayfası
- [x] Ticket detay sayfasından iş emri oluşturma

### Önceki İmplementasyonlar
- [x] JWT tabanlı kimlik doğrulama
- [x] Gelişmiş CRM (müşteri detayları, iletişim kişileri, lokasyonlar, döküman arşivi)
- [x] Bilet yönetimi (timeline, yorumlar, dosya yükleme)
- [x] Raporlama modülü (grafikler ve analizler)
- [x] Modern flat tasarım UI

## Bekleyen/Planlanan Görevler

### P1: Gelişmiş SLA ve Sözleşme Kuralları
- [ ] SLA profilleri (P1/P2/P3)
- [ ] İş saatleri takvimleri
- [ ] SLA sayacını durdurup başlatma (müşteri beklemede vb.)

### P2: Gelişmiş Cihaz Envanteri
- [ ] Detaylı cihaz geçmişi (tüm ticket'lar, bakımlar, parça değişimleri)
- [ ] Garanti ve destek sözleşmesi bitiş tarihi takibi

### P3: İletişim ve Bildirimler
- [ ] E-posta entegrasyonu (SendGrid/Resend)
- [ ] Ticket güncellemeleri için otomatik bildirimler
- [ ] SLA ihlali uyarıları

### Gelecek Görevler
- [ ] RMA/Garanti detaylı iş akışı
- [ ] Teknisyen için takvim bazlı planlama
- [ ] Müşteri self-servis portalı
- [ ] ERP entegrasyonu
- [ ] Mail-to-Ticket
- [ ] Monitoring araçları (Zabbix/PRTG) entegrasyonu

## Teknik Mimari

### Backend
- FastAPI, Pydantic
- MongoDB (pymongo motor)
- JWT kimlik doğrulama

### Frontend
- React 19
- React Router
- Tailwind CSS
- Shadcn/UI
- Recharts
- Axios

### API Endpoint'leri
- `/api/auth/*` - Kimlik doğrulama
- `/api/customers/*` - Müşteri yönetimi
- `/api/contacts/*` - İletişim kişileri
- `/api/locations/*` - Lokasyonlar
- `/api/tickets/*` - Ticket yönetimi
- `/api/work-orders/*` - İş emri yönetimi
- `/api/assets/*` - Cihaz envanteri
- `/api/parts/*` - Parça yönetimi
- `/api/stock-movements/*` - Stok hareketleri
- `/api/part-reservations/*` - Parça rezervasyonları
- `/api/part-usage/*` - Parça kullanımı
- `/api/part-returns/*` - Parça iadeleri
- `/api/serialized-parts/*` - Seri no'lu parçalar
- `/api/rma/*` - RMA işlemleri
- `/api/reports/*` - Raporlama
- `/api/attachments/*` - Dosya yönetimi

## Test Bilgileri
- Email: test@network.com
- Şifre: Test123!

## Bilinen Sorunlar
- Dialog componentlerinde accessibility uyarısı (aria-describedby) - düşük öncelik
