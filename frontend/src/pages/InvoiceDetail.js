import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Printer, CreditCard, CheckCircle } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const statusLabels = {
  draft: { label: "Taslak", variant: "outline" },
  pending: { label: "Bekliyor", variant: "warning" },
  paid: { label: "Ödendi", variant: "success" },
  partial: { label: "Kısmi Ödeme", variant: "info" },
  cancelled: { label: "İptal", variant: "destructive" },
  overdue: { label: "Vadesi Geçmiş", variant: "error" }
};

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [invoiceRes, settingsRes] = await Promise.all([
        axios.get(`${API}/invoices/${id}`, { headers }),
        axios.get(`${API}/settings`, { headers })
      ]);
      
      setInvoice(invoiceRes.data);
      setSettings(settingsRes.data);
    } catch (error) {
      toast.error("Fatura yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Yükleniyor...</div>;
  }

  if (!invoice) {
    return <div className="flex items-center justify-center h-96">Fatura bulunamadı</div>;
  }

  const statusInfo = statusLabels[invoice.status] || statusLabels.draft;
  const customer = invoice.customer || {};

  return (
    <div className="max-w-4xl mx-auto" data-testid="invoice-detail-page">
      {/* Action Bar - Hidden in print */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <Button variant="ghost" onClick={() => navigate('/invoices')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Faturalara Dön
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Yazdır
          </Button>
        </div>
      </div>

      {/* Invoice Document */}
      <Card className="print:shadow-none print:border-none">
        <CardContent className="p-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-8 border-b pb-6">
            <div>
              {settings?.logo_url ? (
                <img src={settings.logo_url} alt="Logo" className="h-16 mb-2" />
              ) : (
                <h1 className="text-2xl font-bold text-slate-800">{settings?.company_name || 'Şirket Adı'}</h1>
              )}
              <p className="text-sm text-slate-600 mt-2">{settings?.company_address}</p>
              <p className="text-sm text-slate-600">{settings?.company_phone}</p>
            </div>
            <div className="text-right">
              <h2 className="text-3xl font-bold text-slate-800">FATURA</h2>
              <p className="text-lg font-mono text-slate-600 mt-2">{invoice.invoice_number}</p>
              <Badge variant={statusInfo.variant} className="mt-2 print:bg-slate-200">
                {statusInfo.label}
              </Badge>
            </div>
          </div>

          {/* Customer & Invoice Info */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-sm font-semibold text-slate-500 mb-2">FATURA EDİLEN</h3>
              <p className="font-medium text-slate-800">{customer.name}</p>
              {customer.company && <p className="text-slate-600">{customer.company}</p>}
              {customer.address && <p className="text-sm text-slate-600">{customer.address}</p>}
              {customer.tax_number && (
                <p className="text-sm text-slate-600 mt-1">
                  VKN: {customer.tax_number} {customer.tax_office && `- ${customer.tax_office}`}
                </p>
              )}
              <p className="text-sm text-slate-600">{customer.email}</p>
              <p className="text-sm text-slate-600">{customer.phone}</p>
            </div>
            <div className="text-right">
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500">Fatura Tarihi:</span>
                  <span className="text-sm text-slate-800">{new Date(invoice.created_at).toLocaleDateString('tr-TR')}</span>
                </div>
                {invoice.due_date && (
                  <div className="flex justify-between">
                    <span className="text-sm text-slate-500">Vade Tarihi:</span>
                    <span className="text-sm text-slate-800">{new Date(invoice.due_date).toLocaleDateString('tr-TR')}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-3 text-sm font-semibold text-slate-600">Açıklama</th>
                  <th className="text-right py-3 text-sm font-semibold text-slate-600 w-20">Miktar</th>
                  <th className="text-right py-3 text-sm font-semibold text-slate-600 w-28">Birim Fiyat</th>
                  <th className="text-right py-3 text-sm font-semibold text-slate-600 w-20">KDV %</th>
                  <th className="text-right py-3 text-sm font-semibold text-slate-600 w-28">Toplam</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items?.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-100">
                    <td className="py-3 text-slate-800">{item.description}</td>
                    <td className="py-3 text-right text-slate-600">{item.quantity}</td>
                    <td className="py-3 text-right text-slate-600 font-mono">{formatCurrency(item.unit_price)}</td>
                    <td className="py-3 text-right text-slate-600">%{item.tax_rate}</td>
                    <td className="py-3 text-right text-slate-800 font-mono font-medium">{formatCurrency(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-72">
              <div className="space-y-2">
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">Ara Toplam:</span>
                  <span className="font-mono text-slate-800">{formatCurrency(invoice.subtotal)}</span>
                </div>
                {invoice.discount_total > 0 && (
                  <div className="flex justify-between py-1">
                    <span className="text-slate-600">İskonto:</span>
                    <span className="font-mono text-red-600">-{formatCurrency(invoice.discount_total)}</span>
                  </div>
                )}
                <div className="flex justify-between py-1">
                  <span className="text-slate-600">KDV:</span>
                  <span className="font-mono text-slate-800">+{formatCurrency(invoice.tax_total)}</span>
                </div>
                <div className="flex justify-between py-2 border-t-2 border-slate-200 font-bold">
                  <span className="text-slate-800">Genel Toplam:</span>
                  <span className="font-mono text-slate-800">{formatCurrency(invoice.grand_total)}</span>
                </div>
                {invoice.paid_amount > 0 && (
                  <>
                    <div className="flex justify-between py-1 text-green-600">
                      <span>Ödenen:</span>
                      <span className="font-mono">-{formatCurrency(invoice.paid_amount)}</span>
                    </div>
                    <div className="flex justify-between py-2 border-t font-bold">
                      <span className="text-slate-800">Kalan:</span>
                      <span className="font-mono text-slate-800">{formatCurrency(invoice.grand_total - invoice.paid_amount)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Payments */}
          {invoice.payments?.length > 0 && (
            <div className="mb-8 print:hidden">
              <h3 className="text-sm font-semibold text-slate-500 mb-3">ÖDEME GEÇMİŞİ</h3>
              <div className="space-y-2">
                {invoice.payments.map((payment) => (
                  <div key={payment.id} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm">{payment.payment_number}</span>
                      <Badge variant="outline" className="text-xs">
                        {payment.payment_method === 'cash' ? 'Nakit' :
                         payment.payment_method === 'bank_transfer' ? 'Havale' :
                         payment.payment_method === 'credit_card' ? 'K.Kartı' : 
                         payment.payment_method}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-medium text-green-600">{formatCurrency(payment.amount)}</p>
                      <p className="text-xs text-slate-500">{new Date(payment.created_at).toLocaleDateString('tr-TR')}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {invoice.notes && (
            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold text-slate-500 mb-2">NOTLAR</h3>
              <p className="text-sm text-slate-600 whitespace-pre-wrap">{invoice.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t text-center text-sm text-slate-500">
            <p>Bu fatura elektronik ortamda oluşturulmuştur.</p>
            {settings?.company_name && <p className="mt-1">{settings.company_name}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
