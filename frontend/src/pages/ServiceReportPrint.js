import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Printer, Download, CheckCircle, Clock, User, Phone, Mail, MapPin, Calendar, Wrench, Package } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ServiceReportPrint() {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const printRef = useRef();
  const [report, setReport] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [customerNotes, setCustomerNotes] = useState("");
  const [nextMaintenanceDate, setNextMaintenanceDate] = useState("");

  useEffect(() => {
    fetchData();
  }, [ticketId]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [reportRes, settingsRes] = await Promise.all([
        axios.get(`${API}/reports/service-report/${ticketId}`, { headers }),
        axios.get(`${API}/system-settings`, { headers }).catch(() => ({ data: null }))
      ]);
      
      setReport(reportRes.data);
      setSettings(settingsRes.data);
    } catch (error) {
      toast.error("Rapor yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusLabel = (status) => {
    const labels = {
      open: "Açık",
      in_progress: "Devam Ediyor",
      on_hold: "Beklemede",
      resolved: "Çözüldü",
      closed: "Kapalı",
      completed: "Tamamlandı"
    };
    return labels[status] || status;
  };

  const getPriorityLabel = (priority) => {
    const labels = { low: "Düşük", medium: "Orta", high: "Yüksek", critical: "Kritik" };
    return labels[priority] || priority;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Rapor bulunamadı</p>
        <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Geri Dön
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Print Controls - Hidden on print */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b shadow-sm p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Geri Dön
          </Button>
          <div className="flex gap-2">
            <Button onClick={handlePrint} data-testid="print-report-btn">
              <Printer className="w-4 h-4 mr-2" />
              Yazdır
            </Button>
          </div>
        </div>
      </div>

      {/* Print Content */}
      <div ref={printRef} className="max-w-4xl mx-auto p-8 print:p-4 print:max-w-full">
        <div className="bg-white rounded-lg shadow-lg print:shadow-none p-8 print:p-4 space-y-6">
          
          {/* Header with Logo */}
          <div className="flex items-start justify-between border-b pb-6">
            <div className="flex items-center gap-4">
              {settings?.logo_url ? (
                <img src={settings.logo_url} alt="Logo" className="h-16 object-contain" />
              ) : (
                <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Wrench className="w-8 h-8 text-primary" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold">{settings?.company_name || "Teknik Servis"}</h1>
                <p className="text-muted-foreground">Teknik Servis Raporu</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Rapor No</p>
              <p className="font-mono font-bold text-lg">{report.ticket.ticket_number}</p>
              <p className="text-sm text-muted-foreground mt-2">Tarih</p>
              <p className="font-medium">{formatDate(new Date().toISOString())}</p>
            </div>
          </div>

          {/* Customer & Device Info - Two columns */}
          <div className="grid grid-cols-2 gap-6">
            {/* Customer Info */}
            <div className="space-y-3">
              <h2 className="font-semibold text-lg flex items-center gap-2 border-b pb-2">
                <User className="w-5 h-5 text-primary" />
                Müşteri Bilgileri
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Firma/Ad:</span>
                  <span className="font-medium">{report.customer?.company || report.customer?.name || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Yetkili:</span>
                  <span className="font-medium">{report.customer?.name || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Telefon:</span>
                  <span className="font-medium">{report.customer?.phone || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">E-posta:</span>
                  <span className="font-medium">{report.customer?.email || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Adres:</span>
                  <span className="font-medium text-right max-w-[200px]">{report.customer?.address || "-"}</span>
                </div>
              </div>
            </div>

            {/* Device Info */}
            <div className="space-y-3">
              <h2 className="font-semibold text-lg flex items-center gap-2 border-b pb-2">
                <Package className="w-5 h-5 text-primary" />
                Cihaz Bilgileri
              </h2>
              {report.asset ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cihaz Tipi:</span>
                    <span className="font-medium">{report.asset.device_type || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Marka/Model:</span>
                    <span className="font-medium">{report.asset.brand} {report.asset.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Seri No:</span>
                    <span className="font-mono font-medium">{report.asset.serial_number || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IP Adresi:</span>
                    <span className="font-mono font-medium">{report.asset.ip_address || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hostname:</span>
                    <span className="font-mono font-medium">{report.asset.hostname || "-"}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Cihaz bilgisi yok</p>
              )}
            </div>
          </div>

          {/* Ticket Details */}
          <div className="space-y-3">
            <h2 className="font-semibold text-lg flex items-center gap-2 border-b pb-2">
              <CheckCircle className="w-5 h-5 text-primary" />
              Arıza / Talep Detayı
            </h2>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Kategori</p>
                <p className="font-medium">{report.ticket.category || "-"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Öncelik</p>
                <p className="font-medium">{getPriorityLabel(report.ticket.priority)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Durum</p>
                <Badge variant="outline">{getStatusLabel(report.ticket.status)}</Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Açılış Tarihi</p>
                <p className="font-medium">{formatDate(report.ticket.created_at)}</p>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-muted-foreground text-sm mb-1">Açıklama</p>
              <div className="bg-slate-50 p-3 rounded border text-sm">
                {report.ticket.description || "-"}
              </div>
            </div>
          </div>

          {/* Work Orders */}
          {report.work_orders && report.work_orders.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-semibold text-lg flex items-center gap-2 border-b pb-2">
                <Wrench className="w-5 h-5 text-primary" />
                Yapılan İşlemler
              </h2>
              {report.work_orders.map((wo, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <Badge variant="outline" className="mb-2">
                        {wo.work_type === 'onsite' ? 'Yerinde' : wo.work_type === 'remote' ? 'Uzaktan' : 'Atölye'}
                      </Badge>
                      <p className="text-sm text-muted-foreground">Teknisyen: <span className="font-medium text-foreground">{wo.technician || "-"}</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Süre</p>
                      <p className="font-bold text-lg">{wo.time_spent_minutes || 0} dk</p>
                    </div>
                  </div>
                  
                  {wo.service_report && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Servis Notu</p>
                      <div className="bg-slate-50 p-3 rounded border text-sm whitespace-pre-wrap">
                        {wo.service_report}
                      </div>
                    </div>
                  )}
                  
                  {wo.checklist && wo.checklist.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Kontrol Listesi</p>
                      <div className="grid grid-cols-2 gap-2">
                        {wo.checklist.map((item, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${item.completed ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300'}`}>
                              {item.completed && <CheckCircle className="w-3 h-3" />}
                            </div>
                            <span className={item.completed ? 'text-foreground' : 'text-muted-foreground'}>{item.item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Summary */}
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-primary">{report.summary?.total_work_orders || 0}</p>
                <p className="text-sm text-muted-foreground">İş Emri</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{report.summary?.total_time_spent_minutes || 0} dk</p>
                <p className="text-sm text-muted-foreground">Toplam Süre</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-primary">{report.summary?.parts_used_count || 0}</p>
                <p className="text-sm text-muted-foreground">Kullanılan Parça</p>
              </div>
            </div>
          </div>

          {/* Warranty Info */}
          <div className="border rounded-lg p-4 space-y-3">
            <h2 className="font-semibold text-lg">Garanti Bilgileri</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Garanti Durumu</p>
                <p className="font-medium">
                  {report.asset?.warranty_end_date ? (
                    new Date(report.asset.warranty_end_date) > new Date() ? 
                    <span className="text-green-600">Garanti Kapsamında</span> : 
                    <span className="text-red-600">Garanti Süresi Dolmuş</span>
                  ) : "Bilgi Yok"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Garanti Bitiş</p>
                <p className="font-medium">{report.asset?.warranty_end_date ? formatDate(report.asset.warranty_end_date) : "-"}</p>
              </div>
            </div>
          </div>

          {/* Next Maintenance */}
          <div className="border rounded-lg p-4 space-y-3 print:hidden">
            <h2 className="font-semibold text-lg">Sonraki Bakım Tarihi</h2>
            <input 
              type="date" 
              className="border rounded p-2 w-full"
              value={nextMaintenanceDate}
              onChange={(e) => setNextMaintenanceDate(e.target.value)}
            />
          </div>
          {nextMaintenanceDate && (
            <div className="hidden print:block border rounded-lg p-4">
              <h2 className="font-semibold">Sonraki Bakım Tarihi</h2>
              <p className="font-medium">{formatDate(nextMaintenanceDate)}</p>
            </div>
          )}

          {/* Customer Notes */}
          <div className="border rounded-lg p-4 space-y-3 print:hidden">
            <h2 className="font-semibold text-lg">Müşteri Notları</h2>
            <Textarea 
              placeholder="Müşteriye iletilecek notlar..."
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              rows={3}
            />
          </div>
          {customerNotes && (
            <div className="hidden print:block border rounded-lg p-4">
              <h2 className="font-semibold">Müşteri Notları</h2>
              <p className="whitespace-pre-wrap">{customerNotes}</p>
            </div>
          )}

          {/* Signature Section */}
          <div className="grid grid-cols-2 gap-8 pt-8 mt-8 border-t">
            <div className="space-y-4">
              <h3 className="font-semibold text-center">Teknisyen</h3>
              <div className="h-24 border-b-2 border-slate-300"></div>
              <div className="text-center text-sm">
                <p>Ad Soyad: ................................</p>
                <p className="mt-2">Tarih: {new Date().toLocaleDateString('tr-TR')}</p>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold text-center">Müşteri</h3>
              <div className="h-24 border-b-2 border-slate-300"></div>
              <div className="text-center text-sm">
                <p>Ad Soyad: ................................</p>
                <p className="mt-2">Tarih: {new Date().toLocaleDateString('tr-TR')}</p>
              </div>
            </div>
          </div>

          {/* Customer Satisfaction */}
          <div className="border rounded-lg p-4 space-y-3">
            <h2 className="font-semibold text-lg text-center">Müşteri Memnuniyet Değerlendirmesi</h2>
            <div className="flex justify-center gap-4">
              {['Çok Memnun', 'Memnun', 'Orta', 'Memnun Değil'].map((label, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-2 rounded-full"></div>
                  <span className="text-xs text-center">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground pt-4 border-t">
            <p>Bu belge {settings?.company_name || "Teknik Servis"} tarafından düzenlenmiştir.</p>
            <p>© {new Date().getFullYear()} - Tüm hakları saklıdır.</p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
