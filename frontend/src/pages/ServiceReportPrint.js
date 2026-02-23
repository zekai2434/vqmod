import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Printer, CheckCircle, User, Wrench, Package } from "lucide-react";
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
        axios.get(`${API}/settings/system`).catch(() => ({ data: null }))
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
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-8 text-center bg-white min-h-screen">
        <p className="text-gray-600">Rapor bulunamadı</p>
        <Button variant="outline" onClick={() => navigate(-1)} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Geri Dön
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Print Controls */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b shadow-sm p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Geri Dön
          </Button>
          <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Printer className="w-4 h-4 mr-2" />
            Yazdır
          </Button>
        </div>
      </div>

      {/* Print Content */}
      <div ref={printRef} className="max-w-4xl mx-auto p-8 print:p-4 print:max-w-full">
        <div className="bg-white rounded-lg shadow-lg print:shadow-none p-8 print:p-4 space-y-6 text-gray-900">
          
          {/* Header */}
          <div className="flex items-start justify-between border-b border-gray-300 pb-6">
            <div className="flex items-center gap-4">
              {settings?.logo_url ? (
                <img src={settings.logo_url} alt="Logo" className="h-16 object-contain" />
              ) : (
                <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Wrench className="w-8 h-8 text-blue-600" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{settings?.company_name || "Teknik Servis"}</h1>
                <p className="text-gray-600">Teknik Servis Raporu</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Rapor No</p>
              <p className="font-mono font-bold text-lg text-gray-900">{report.ticket.ticket_number}</p>
              <p className="text-sm text-gray-500 mt-2">Tarih</p>
              <p className="font-medium text-gray-900">{formatDate(new Date().toISOString())}</p>
            </div>
          </div>

          {/* Customer & Device Info */}
          <div className="grid grid-cols-2 gap-6">
            {/* Customer */}
            <div className="space-y-3">
              <h2 className="font-semibold text-lg flex items-center gap-2 border-b border-gray-200 pb-2 text-gray-900">
                <User className="w-5 h-5 text-blue-600" />
                Müşteri Bilgileri
              </h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Firma/Ad:</span>
                  <span className="font-medium text-gray-900">{report.customer?.company || report.customer?.name || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Yetkili:</span>
                  <span className="font-medium text-gray-900">{report.customer?.name || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Telefon:</span>
                  <span className="font-medium text-gray-900">{report.customer?.phone || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">E-posta:</span>
                  <span className="font-medium text-gray-900">{report.customer?.email || "-"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Adres:</span>
                  <span className="font-medium text-gray-900 text-right max-w-[200px]">{report.customer?.address || "-"}</span>
                </div>
              </div>
            </div>

            {/* Device */}
            <div className="space-y-3">
              <h2 className="font-semibold text-lg flex items-center gap-2 border-b border-gray-200 pb-2 text-gray-900">
                <Package className="w-5 h-5 text-blue-600" />
                Cihaz Bilgileri
              </h2>
              {report.asset ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cihaz Tipi:</span>
                    <span className="font-medium text-gray-900">{report.asset.device_type || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Marka/Model:</span>
                    <span className="font-medium text-gray-900">{report.asset.brand} {report.asset.model}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Seri No:</span>
                    <span className="font-mono font-medium text-gray-900">{report.asset.serial_number || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">IP Adresi:</span>
                    <span className="font-mono font-medium text-gray-900">{report.asset.ip_address || "-"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Hostname:</span>
                    <span className="font-mono font-medium text-gray-900">{report.asset.hostname || "-"}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Cihaz bilgisi yok</p>
              )}
            </div>
          </div>

          {/* Ticket Details */}
          <div className="space-y-3">
            <h2 className="font-semibold text-lg flex items-center gap-2 border-b border-gray-200 pb-2 text-gray-900">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              Arıza / Talep Detayı
            </h2>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Kategori</p>
                <p className="font-medium text-gray-900">{report.ticket.category || "-"}</p>
              </div>
              <div>
                <p className="text-gray-600">Öncelik</p>
                <p className="font-medium text-gray-900">{getPriorityLabel(report.ticket.priority)}</p>
              </div>
              <div>
                <p className="text-gray-600">Durum</p>
                <span className="inline-block px-2 py-1 bg-gray-100 rounded text-gray-900 text-xs font-medium">{getStatusLabel(report.ticket.status)}</span>
              </div>
              <div>
                <p className="text-gray-600">Açılış Tarihi</p>
                <p className="font-medium text-gray-900">{formatDate(report.ticket.created_at)}</p>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-gray-600 text-sm mb-1">Açıklama</p>
              <div className="bg-gray-50 p-3 rounded border border-gray-200 text-sm text-gray-900">
                {report.ticket.description || "-"}
              </div>
            </div>
          </div>

          {/* Work Orders */}
          {report.work_orders && report.work_orders.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-semibold text-lg flex items-center gap-2 border-b border-gray-200 pb-2 text-gray-900">
                <Wrench className="w-5 h-5 text-blue-600" />
                Yapılan İşlemler
              </h2>
              {report.work_orders.map((wo, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium mb-2">
                        {wo.work_type === 'onsite' ? 'Yerinde' : wo.work_type === 'remote' ? 'Uzaktan' : 'Atölye'}
                      </span>
                      <p className="text-sm text-gray-600">Teknisyen: <span className="font-medium text-gray-900">{wo.technician || "-"}</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600">Süre</p>
                      <p className="font-bold text-lg text-gray-900">{wo.time_spent_minutes || 0} dk</p>
                    </div>
                  </div>
                  
                  {wo.service_report && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Servis Notu</p>
                      <div className="bg-gray-50 p-3 rounded border border-gray-200 text-sm text-gray-900 whitespace-pre-wrap">
                        {wo.service_report}
                      </div>
                    </div>
                  )}
                  
                  {wo.checklist && wo.checklist.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">Kontrol Listesi</p>
                      <div className="grid grid-cols-2 gap-2">
                        {wo.checklist.map((item, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${item.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-400'}`}>
                              {item.completed && <CheckCircle className="w-3 h-3" />}
                            </div>
                            <span className={item.completed ? 'text-gray-900' : 'text-gray-500'}>{item.item || item.task}</span>
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
          <div className="bg-gray-100 rounded-lg p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-blue-600">{report.summary?.total_work_orders || 0}</p>
                <p className="text-sm text-gray-600">İş Emri</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{report.summary?.total_time_spent_minutes || 0} dk</p>
                <p className="text-sm text-gray-600">Toplam Süre</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">{report.summary?.parts_used_count || 0}</p>
                <p className="text-sm text-gray-600">Kullanılan Parça</p>
              </div>
            </div>
          </div>

          {/* Warranty */}
          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <h2 className="font-semibold text-lg text-gray-900">Garanti Bilgileri</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Garanti Durumu</p>
                <p className="font-medium text-gray-900">
                  {report.asset?.warranty_end_date ? (
                    new Date(report.asset.warranty_end_date) > new Date() ? 
                    <span className="text-green-600 font-semibold">Garanti Kapsamında</span> : 
                    <span className="text-red-600 font-semibold">Garanti Süresi Dolmuş</span>
                  ) : "Bilgi Yok"}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Garanti Bitiş</p>
                <p className="font-medium text-gray-900">{report.asset?.warranty_end_date ? formatDate(report.asset.warranty_end_date) : "-"}</p>
              </div>
            </div>
          </div>

          {/* Next Maintenance - Only on screen */}
          <div className="border border-gray-200 rounded-lg p-4 space-y-3 print:hidden">
            <h2 className="font-semibold text-lg text-gray-900">Sonraki Bakım Tarihi</h2>
            <input 
              type="date" 
              className="border border-gray-300 rounded p-2 w-full text-gray-900"
              value={nextMaintenanceDate}
              onChange={(e) => setNextMaintenanceDate(e.target.value)}
            />
          </div>
          {nextMaintenanceDate && (
            <div className="hidden print:block border border-gray-200 rounded-lg p-4">
              <h2 className="font-semibold text-gray-900">Sonraki Bakım Tarihi</h2>
              <p className="font-medium text-gray-900">{formatDate(nextMaintenanceDate)}</p>
            </div>
          )}

          {/* Customer Notes - Only on screen */}
          <div className="border border-gray-200 rounded-lg p-4 space-y-3 print:hidden">
            <h2 className="font-semibold text-lg text-gray-900">Müşteri Notları</h2>
            <Textarea 
              placeholder="Müşteriye iletilecek notlar..."
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              rows={3}
              className="text-gray-900"
            />
          </div>
          {customerNotes && (
            <div className="hidden print:block border border-gray-200 rounded-lg p-4">
              <h2 className="font-semibold text-gray-900">Müşteri Notları</h2>
              <p className="whitespace-pre-wrap text-gray-900">{customerNotes}</p>
            </div>
          )}

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-8 mt-8 border-t border-gray-300">
            <div className="space-y-4">
              <h3 className="font-semibold text-center text-gray-900">Teknisyen</h3>
              <div className="h-24 border-b-2 border-gray-400"></div>
              <div className="text-center text-sm text-gray-700">
                <p>Ad Soyad: ................................</p>
                <p className="mt-2">Tarih: {new Date().toLocaleDateString('tr-TR')}</p>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold text-center text-gray-900">Müşteri</h3>
              <div className="h-24 border-b-2 border-gray-400"></div>
              <div className="text-center text-sm text-gray-700">
                <p>Ad Soyad: ................................</p>
                <p className="mt-2">Tarih: {new Date().toLocaleDateString('tr-TR')}</p>
              </div>
            </div>
          </div>

          {/* Satisfaction Survey */}
          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <h2 className="font-semibold text-lg text-center text-gray-900">Müşteri Memnuniyet Değerlendirmesi</h2>
            <div className="flex justify-center gap-6">
              {['Çok Memnun', 'Memnun', 'Orta', 'Memnun Değil'].map((label, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-2 border-gray-400 rounded-full"></div>
                  <span className="text-xs text-center text-gray-700">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-500 pt-4 border-t border-gray-200">
            <p>Bu belge {settings?.company_name || "Teknik Servis"} tarafından düzenlenmiştir.</p>
            <p>© {new Date().getFullYear()} - Tüm hakları saklıdır.</p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
        }
      `}</style>
    </div>
  );
}
