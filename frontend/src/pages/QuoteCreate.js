import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, FileText, Printer, ArrowLeft, Building2, Package, Calendar, CreditCard } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function QuoteCreate() {
  const navigate = useNavigate();
  const printRef = useRef();
  const [settings, setSettings] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isPrintMode, setIsPrintMode] = useState(false);

  const [formData, setFormData] = useState({
    customer_id: "",
    quote_number: "",
    subject: "",
    validity_days: 30,
    payment_terms: "pesin",
    payment_notes: "",
    notes: "",
    items: []
  });

  const [newItem, setNewItem] = useState({
    description: "",
    quantity: 1,
    unit_price: 0,
    unit: "adet",
    vat_rate: 20
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [customersRes, partsRes, settingsRes] = await Promise.all([
        axios.get(`${API}/customers`, { headers }),
        axios.get(`${API}/parts`, { headers }),
        axios.get(`${API}/settings/system`).catch(() => ({ data: null }))
      ]);
      
      setCustomers(customersRes.data);
      setParts(partsRes.data);
      setSettings(settingsRes.data);
      
      const quoteNum = `TKL-${Date.now().toString().slice(-6)}`;
      setFormData(prev => ({ ...prev, quote_number: quoteNum }));
    } catch (error) {
      toast.error("Veri yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    if (!newItem.description || newItem.quantity <= 0 || newItem.unit_price <= 0) {
      toast.error("Lütfen tüm alanları doldurun");
      return;
    }
    
    const itemTotal = newItem.quantity * newItem.unit_price;
    const vatAmount = itemTotal * (newItem.vat_rate / 100);
    
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, {
        ...newItem,
        id: Date.now(),
        subtotal: itemTotal,
        vat_amount: vatAmount,
        total: itemTotal + vatAmount
      }]
    }));
    
    setNewItem({
      description: "",
      quantity: 1,
      unit_price: 0,
      unit: "adet",
      vat_rate: 20
    });
  };

  const removeItem = (itemId) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  };

  const selectPart = (partId) => {
    const part = parts.find(p => p.id === partId);
    if (part) {
      setNewItem(prev => ({
        ...prev,
        description: `${part.name} (${part.part_number})`,
        unit_price: part.unit_price || 0
      }));
    }
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.subtotal, 0);
    const totalVat = formData.items.reduce((sum, item) => sum + item.vat_amount, 0);
    const grandTotal = subtotal + totalVat;
    return { subtotal, totalVat, grandTotal };
  };

  const handlePrint = () => {
    setIsPrintMode(true);
    setTimeout(() => {
      window.print();
      setIsPrintMode(false);
    }, 100);
  };

  const getCustomer = () => customers.find(c => c.id === formData.customer_id);
  const totals = calculateTotals();

  const paymentTermsLabels = {
    pesin: "Peşin",
    vadeli_15: "15 Gün Vadeli",
    vadeli_30: "30 Gün Vadeli",
    vadeli_45: "45 Gün Vadeli",
    vadeli_60: "60 Gün Vadeli",
    taksit_3: "3 Taksit",
    taksit_6: "6 Taksit",
    taksit_12: "12 Taksit"
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Controls */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b shadow-sm p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Geri Dön
          </Button>
          <Button onClick={handlePrint} disabled={formData.items.length === 0} className="bg-blue-600 hover:bg-blue-700 text-white">
            <Printer className="w-4 h-4 mr-2" />
            Yazdır / PDF
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-8 print:p-4 print:max-w-full">
        {/* Form Section */}
        <div className="print:hidden space-y-6 mb-8">
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <FileText className="w-5 h-5 text-blue-600" />
                Teklif Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-700">Teklif No</Label>
                  <Input value={formData.quote_number} readOnly className="font-mono bg-gray-50 text-gray-900" />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">Müşteri *</Label>
                  <Select value={formData.customer_id} onValueChange={(v) => setFormData({...formData, customer_id: v})}>
                    <SelectTrigger className="text-gray-900">
                      <SelectValue placeholder="Müşteri seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">Geçerlilik (Gün)</Label>
                  <Input
                    type="number"
                    value={formData.validity_days}
                    onChange={(e) => setFormData({...formData, validity_days: parseInt(e.target.value) || 30})}
                    min="1"
                    className="text-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">Ödeme Koşulu</Label>
                  <Select value={formData.payment_terms} onValueChange={(v) => setFormData({...formData, payment_terms: v})}>
                    <SelectTrigger className="text-gray-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pesin">Peşin</SelectItem>
                      <SelectItem value="vadeli_15">15 Gün Vadeli</SelectItem>
                      <SelectItem value="vadeli_30">30 Gün Vadeli</SelectItem>
                      <SelectItem value="vadeli_45">45 Gün Vadeli</SelectItem>
                      <SelectItem value="vadeli_60">60 Gün Vadeli</SelectItem>
                      <SelectItem value="taksit_3">3 Taksit</SelectItem>
                      <SelectItem value="taksit_6">6 Taksit</SelectItem>
                      <SelectItem value="taksit_12">12 Taksit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-gray-700">Konu</Label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  placeholder="Teklif konusu..."
                  className="text-gray-900"
                />
              </div>
            </CardContent>
          </Card>

          {/* Add Items */}
          <Card className="bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-gray-900">
                <Package className="w-5 h-5 text-blue-600" />
                Ürün/Hizmet Ekle
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label className="text-gray-700">Açıklama</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newItem.description}
                      onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                      placeholder="Ürün veya hizmet"
                      className="text-gray-900"
                    />
                    <Select onValueChange={selectPart}>
                      <SelectTrigger className="w-12">
                        <Package className="w-4 h-4" />
                      </SelectTrigger>
                      <SelectContent>
                        {parts.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} - {p.unit_price?.toLocaleString('tr-TR')} ₺
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">Miktar</Label>
                  <Input
                    type="number"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value) || 1})}
                    min="1"
                    className="text-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">Birim Fiyat (₺)</Label>
                  <Input
                    type="number"
                    value={newItem.unit_price}
                    onChange={(e) => setNewItem({...newItem, unit_price: parseFloat(e.target.value) || 0})}
                    min="0"
                    step="0.01"
                    className="text-gray-900"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">KDV (%)</Label>
                  <Select value={newItem.vat_rate.toString()} onValueChange={(v) => setNewItem({...newItem, vat_rate: parseInt(v)})}>
                    <SelectTrigger className="text-gray-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">%0</SelectItem>
                      <SelectItem value="1">%1</SelectItem>
                      <SelectItem value="10">%10</SelectItem>
                      <SelectItem value="20">%20</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-700">&nbsp;</Label>
                  <Button onClick={addItem} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Ekle
                  </Button>
                </div>
              </div>

              {/* Items Table */}
              {formData.items.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-gray-700">Açıklama</TableHead>
                      <TableHead className="text-right text-gray-700">Miktar</TableHead>
                      <TableHead className="text-right text-gray-700">Birim Fiyat</TableHead>
                      <TableHead className="text-right text-gray-700">KDV</TableHead>
                      <TableHead className="text-right text-gray-700">Toplam</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="text-gray-900">{item.description}</TableCell>
                        <TableCell className="text-right text-gray-900">{item.quantity} {item.unit}</TableCell>
                        <TableCell className="text-right text-gray-900">{item.unit_price.toLocaleString('tr-TR')} ₺</TableCell>
                        <TableCell className="text-right text-gray-900">%{item.vat_rate}</TableCell>
                        <TableCell className="text-right font-medium text-gray-900">{item.total.toLocaleString('tr-TR')} ₺</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => removeItem(item.id)}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label className="text-gray-700">Notlar</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Ek notlar, şartlar..."
              rows={3}
              className="text-gray-900 bg-white"
            />
          </div>
        </div>

        {/* Print Preview */}
        <div ref={printRef} className={`bg-white rounded-lg shadow-lg print:shadow-none p-8 print:p-4 text-gray-900 ${isPrintMode || formData.items.length > 0 ? '' : 'print:hidden'}`}>
          {/* Header */}
          <div className="flex items-start justify-between border-b border-gray-300 pb-6 mb-6">
            <div className="flex items-center gap-4">
              {settings?.logo_url ? (
                <img src={settings.logo_url} alt="Logo" className="h-16 object-contain" />
              ) : (
                <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center">
                  <FileText className="w-8 h-8 text-blue-600" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{settings?.company_name || "Firma Adı"}</h1>
                <p className="text-gray-600">TEKLİF</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Teklif No</p>
              <p className="font-mono font-bold text-lg text-gray-900">{formData.quote_number}</p>
              <p className="text-sm text-gray-500 mt-2">Tarih</p>
              <p className="font-medium text-gray-900">{new Date().toLocaleDateString('tr-TR')}</p>
            </div>
          </div>

          {/* Customer Info */}
          {getCustomer() && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h2 className="font-semibold mb-2 flex items-center gap-2 text-gray-900">
                <Building2 className="w-4 h-4 text-blue-600" />
                Müşteri Bilgileri
              </h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-900"><span className="text-gray-600">Firma:</span> {getCustomer().company || getCustomer().name}</p>
                  <p className="text-gray-900"><span className="text-gray-600">Yetkili:</span> {getCustomer().name}</p>
                </div>
                <div>
                  <p className="text-gray-900"><span className="text-gray-600">Telefon:</span> {getCustomer().phone || "-"}</p>
                  <p className="text-gray-900"><span className="text-gray-600">E-posta:</span> {getCustomer().email || "-"}</p>
                </div>
              </div>
            </div>
          )}

          {/* Subject */}
          {formData.subject && (
            <div className="mb-6">
              <p className="text-sm text-gray-600">Konu</p>
              <p className="font-medium text-gray-900">{formData.subject}</p>
            </div>
          )}

          {/* Items Table */}
          <table className="w-full mb-6 border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="text-left p-3 border border-gray-300 text-gray-900 w-[40%]">Açıklama</th>
                <th className="text-right p-3 border border-gray-300 text-gray-900">Miktar</th>
                <th className="text-right p-3 border border-gray-300 text-gray-900">Birim Fiyat</th>
                <th className="text-right p-3 border border-gray-300 text-gray-900">KDV</th>
                <th className="text-right p-3 border border-gray-300 text-gray-900">Toplam</th>
              </tr>
            </thead>
            <tbody>
              {formData.items.map((item, index) => (
                <tr key={index}>
                  <td className="p-3 border border-gray-300 text-gray-900">{item.description}</td>
                  <td className="text-right p-3 border border-gray-300 text-gray-900">{item.quantity} {item.unit}</td>
                  <td className="text-right p-3 border border-gray-300 text-gray-900">{item.unit_price.toLocaleString('tr-TR')} ₺</td>
                  <td className="text-right p-3 border border-gray-300 text-gray-900">%{item.vat_rate}</td>
                  <td className="text-right p-3 border border-gray-300 font-medium text-gray-900">{item.total.toLocaleString('tr-TR')} ₺</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-6">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Ara Toplam:</span>
                <span className="text-gray-900">{totals.subtotal.toLocaleString('tr-TR')} ₺</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">KDV Toplam:</span>
                <span className="text-gray-900">{totals.totalVat.toLocaleString('tr-TR')} ₺</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t border-gray-300 pt-2">
                <span className="text-gray-900">Genel Toplam:</span>
                <span className="text-blue-600">{totals.grandTotal.toLocaleString('tr-TR')} ₺</span>
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold mb-2 flex items-center gap-2 text-gray-900">
                <Calendar className="w-4 h-4 text-blue-600" />
                Geçerlilik
              </h3>
              <p className="text-gray-900">Bu teklif <strong>{formData.validity_days}</strong> gün geçerlidir.</p>
              <p className="text-gray-600">
                Son geçerlilik: {new Date(Date.now() + formData.validity_days * 24 * 60 * 60 * 1000).toLocaleDateString('tr-TR')}
              </p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <h3 className="font-semibold mb-2 flex items-center gap-2 text-gray-900">
                <CreditCard className="w-4 h-4 text-blue-600" />
                Ödeme Koşulları
              </h3>
              <p className="text-gray-900"><strong>{paymentTermsLabels[formData.payment_terms]}</strong></p>
              {formData.payment_notes && <p className="text-gray-600">{formData.payment_notes}</p>}
            </div>
          </div>

          {/* Notes */}
          {formData.notes && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="font-semibold mb-2 text-gray-900">Notlar</h3>
              <p className="text-sm whitespace-pre-wrap text-gray-900">{formData.notes}</p>
            </div>
          )}

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-8 border-t border-gray-300">
            <div className="space-y-4">
              <h3 className="font-semibold text-center text-gray-900">Teklifi Veren</h3>
              <div className="h-20 border-b-2 border-gray-400"></div>
              <p className="text-center text-sm text-gray-600">
                {settings?.company_name || "Firma"}
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold text-center text-gray-900">Onaylayan</h3>
              <div className="h-20 border-b-2 border-gray-400"></div>
              <p className="text-center text-sm text-gray-600">
                {getCustomer()?.name || "Müşteri"}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-500 pt-6 mt-6 border-t border-gray-200">
            <p>Bu teklif {settings?.company_name || "Firma"} tarafından hazırlanmıştır.</p>
            <p>© {new Date().getFullYear()} - Tüm hakları saklıdır.</p>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 10mm; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
