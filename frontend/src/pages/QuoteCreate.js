import { useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, FileText, Printer, ArrowLeft, Save, Building2, Package, Calculator, Calendar, CreditCard } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function QuoteCreate() {
  const navigate = useNavigate();
  const { quoteId } = useParams();
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
        axios.get(`${API}/system-settings`, { headers }).catch(() => ({ data: null }))
      ]);
      
      setCustomers(customersRes.data);
      setParts(partsRes.data);
      setSettings(settingsRes.data);
      
      // Generate quote number
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Controls - Hidden on print */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b shadow-sm p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Geri Dön
          </Button>
          <div className="flex gap-2">
            <Button onClick={handlePrint} disabled={formData.items.length === 0}>
              <Printer className="w-4 h-4 mr-2" />
              Yazdır / PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-8 print:p-4 print:max-w-full">
        {/* Form Section - Hidden on print */}
        <div className="print:hidden space-y-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Teklif Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Teklif No</Label>
                  <Input value={formData.quote_number} readOnly className="font-mono" />
                </div>
                <div className="space-y-2">
                  <Label>Müşteri *</Label>
                  <Select value={formData.customer_id} onValueChange={(v) => setFormData({...formData, customer_id: v})}>
                    <SelectTrigger data-testid="quote-customer-select">
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
                  <Label>Geçerlilik (Gün)</Label>
                  <Input
                    type="number"
                    value={formData.validity_days}
                    onChange={(e) => setFormData({...formData, validity_days: parseInt(e.target.value) || 30})}
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Ödeme Koşulu</Label>
                  <Select value={formData.payment_terms} onValueChange={(v) => setFormData({...formData, payment_terms: v})}>
                    <SelectTrigger>
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
                <Label>Konu</Label>
                <Input
                  value={formData.subject}
                  onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  placeholder="Teklif konusu..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Add Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Ürün/Hizmet Ekle
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div className="md:col-span-2 space-y-2">
                  <Label>Açıklama</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newItem.description}
                      onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                      placeholder="Ürün veya hizmet"
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
                  <Label>Miktar</Label>
                  <Input
                    type="number"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value) || 1})}
                    min="1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Birim Fiyat (₺)</Label>
                  <Input
                    type="number"
                    value={newItem.unit_price}
                    onChange={(e) => setNewItem({...newItem, unit_price: parseFloat(e.target.value) || 0})}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label>KDV (%)</Label>
                  <Select value={newItem.vat_rate.toString()} onValueChange={(v) => setNewItem({...newItem, vat_rate: parseInt(v)})}>
                    <SelectTrigger>
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
                  <Label>&nbsp;</Label>
                  <Button onClick={addItem} className="w-full">
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
                      <TableHead>Açıklama</TableHead>
                      <TableHead className="text-right">Miktar</TableHead>
                      <TableHead className="text-right">Birim Fiyat</TableHead>
                      <TableHead className="text-right">KDV</TableHead>
                      <TableHead className="text-right">Toplam</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formData.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-right">{item.quantity} {item.unit}</TableCell>
                        <TableCell className="text-right">{item.unit_price.toLocaleString('tr-TR')} ₺</TableCell>
                        <TableCell className="text-right">%{item.vat_rate}</TableCell>
                        <TableCell className="text-right font-medium">{item.total.toLocaleString('tr-TR')} ₺</TableCell>
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
            <Label>Notlar</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              placeholder="Ek notlar, şartlar..."
              rows={3}
            />
          </div>
        </div>

        {/* Print Preview */}
        <div ref={printRef} className={`bg-white rounded-lg shadow-lg print:shadow-none p-8 print:p-4 ${isPrintMode || formData.items.length > 0 ? '' : 'print:hidden'}`}>
          {/* Header */}
          <div className="flex items-start justify-between border-b pb-6 mb-6">
            <div className="flex items-center gap-4">
              {settings?.logo_url ? (
                <img src={settings.logo_url} alt="Logo" className="h-16 object-contain" />
              ) : (
                <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-8 h-8 text-primary" />
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold">{settings?.company_name || "Firma Adı"}</h1>
                <p className="text-muted-foreground">TEKLİF</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Teklif No</p>
              <p className="font-mono font-bold text-lg">{formData.quote_number}</p>
              <p className="text-sm text-muted-foreground mt-2">Tarih</p>
              <p className="font-medium">{new Date().toLocaleDateString('tr-TR')}</p>
            </div>
          </div>

          {/* Customer Info */}
          {getCustomer() && (
            <div className="mb-6 p-4 bg-slate-50 rounded-lg">
              <h2 className="font-semibold mb-2 flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Müşteri Bilgileri
              </h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p><span className="text-muted-foreground">Firma:</span> {getCustomer().company || getCustomer().name}</p>
                  <p><span className="text-muted-foreground">Yetkili:</span> {getCustomer().name}</p>
                </div>
                <div>
                  <p><span className="text-muted-foreground">Telefon:</span> {getCustomer().phone || "-"}</p>
                  <p><span className="text-muted-foreground">E-posta:</span> {getCustomer().email || "-"}</p>
                </div>
              </div>
            </div>
          )}

          {/* Subject */}
          {formData.subject && (
            <div className="mb-6">
              <p className="text-sm text-muted-foreground">Konu</p>
              <p className="font-medium">{formData.subject}</p>
            </div>
          )}

          {/* Items Table */}
          <Table className="mb-6">
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="w-[40%]">Açıklama</TableHead>
                <TableHead className="text-right">Miktar</TableHead>
                <TableHead className="text-right">Birim Fiyat</TableHead>
                <TableHead className="text-right">KDV</TableHead>
                <TableHead className="text-right">Toplam</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {formData.items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell className="text-right">{item.quantity} {item.unit}</TableCell>
                  <TableCell className="text-right">{item.unit_price.toLocaleString('tr-TR')} ₺</TableCell>
                  <TableCell className="text-right">%{item.vat_rate}</TableCell>
                  <TableCell className="text-right font-medium">{item.total.toLocaleString('tr-TR')} ₺</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Totals */}
          <div className="flex justify-end mb-6">
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ara Toplam:</span>
                <span>{totals.subtotal.toLocaleString('tr-TR')} ₺</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">KDV Toplam:</span>
                <span>{totals.totalVat.toLocaleString('tr-TR')} ₺</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>Genel Toplam:</span>
                <span className="text-primary">{totals.grandTotal.toLocaleString('tr-TR')} ₺</span>
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Geçerlilik
              </h3>
              <p>Bu teklif <strong>{formData.validity_days}</strong> gün geçerlidir.</p>
              <p className="text-muted-foreground">
                Son geçerlilik: {new Date(Date.now() + formData.validity_days * 24 * 60 * 60 * 1000).toLocaleDateString('tr-TR')}
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Ödeme Koşulları
              </h3>
              <p><strong>{paymentTermsLabels[formData.payment_terms]}</strong></p>
              {formData.payment_notes && <p className="text-muted-foreground">{formData.payment_notes}</p>}
            </div>
          </div>

          {/* Notes */}
          {formData.notes && (
            <div className="mb-6 p-4 bg-slate-50 rounded-lg">
              <h3 className="font-semibold mb-2">Notlar</h3>
              <p className="text-sm whitespace-pre-wrap">{formData.notes}</p>
            </div>
          )}

          {/* Signature */}
          <div className="grid grid-cols-2 gap-8 pt-8 border-t">
            <div className="space-y-4">
              <h3 className="font-semibold text-center">Teklifi Veren</h3>
              <div className="h-20 border-b-2 border-slate-300"></div>
              <p className="text-center text-sm text-muted-foreground">
                {settings?.company_name || "Firma"}
              </p>
            </div>
            <div className="space-y-4">
              <h3 className="font-semibold text-center">Onaylayan</h3>
              <div className="h-20 border-b-2 border-slate-300"></div>
              <p className="text-center text-sm text-muted-foreground">
                {getCustomer()?.name || "Müşteri"}
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground pt-6 mt-6 border-t">
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
