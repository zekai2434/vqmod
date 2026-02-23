import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  Plus, 
  FileText, 
  Eye,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  CreditCard,
  Printer,
  DollarSign,
  UserPlus
} from "lucide-react";
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

export default function InvoiceList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  // Create invoice dialog
  const [createDialog, setCreateDialog] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: searchParams.get('customer') || "",
    due_date: "",
    notes: "",
    items: [{ description: "", quantity: 1, unit_price: 0, tax_rate: 20, discount: 0 }]
  });
  
  // Payment dialog
  const [paymentDialog, setPaymentDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    payment_method: "cash",
    notes: ""
  });
  
  // New customer dialog
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    address: "",
    tax_number: "",
    tax_office: ""
  });
  const [savingCustomer, setSavingCustomer] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const customerId = searchParams.get('customer');
      const invoiceUrl = customerId 
        ? `${API}/invoices?customer_id=${customerId}` 
        : `${API}/invoices`;
      
      const [invoicesRes, customersRes, statsRes] = await Promise.all([
        axios.get(invoiceUrl, { headers }),
        axios.get(`${API}/customers`, { headers }),
        axios.get(`${API}/invoices/stats/summary`, { headers })
      ]);
      
      setInvoices(invoicesRes.data);
      setCustomers(customersRes.data);
      setStats(statsRes.data);
    } catch (error) {
      toast.error("Veri yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: "", quantity: 1, unit_price: 0, tax_rate: 20, discount: 0 }]
    });
  };

  const removeItem = (index) => {
    if (formData.items.length === 1) return;
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = field === 'description' ? value : parseFloat(value) || 0;
    setFormData({ ...formData, items: newItems });
  };

  const calculateItemTotal = (item) => {
    const subtotal = item.quantity * item.unit_price;
    const discountAmount = subtotal * (item.discount / 100);
    const taxableAmount = subtotal - discountAmount;
    const tax = taxableAmount * (item.tax_rate / 100);
    return taxableAmount + tax;
  };

  const calculateTotals = () => {
    let subtotal = 0;
    let taxTotal = 0;
    let discountTotal = 0;

    formData.items.forEach(item => {
      const lineSubtotal = item.quantity * item.unit_price;
      const lineDiscount = lineSubtotal * (item.discount / 100);
      const lineTaxable = lineSubtotal - lineDiscount;
      const lineTax = lineTaxable * (item.tax_rate / 100);

      subtotal += lineSubtotal;
      discountTotal += lineDiscount;
      taxTotal += lineTax;
    });

    return {
      subtotal,
      discountTotal,
      taxTotal,
      grandTotal: subtotal - discountTotal + taxTotal
    };
  };

  const handleCreateInvoice = async () => {
    if (!formData.customer_id) {
      toast.error("Müşteri seçimi gerekli");
      return;
    }
    if (formData.items.some(item => !item.description || item.unit_price <= 0)) {
      toast.error("Tüm kalemlerin açıklaması ve fiyatı olmalı");
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/invoices`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success("Fatura oluşturuldu");
      setCreateDialog(false);
      setFormData({
        customer_id: "",
        due_date: "",
        notes: "",
        items: [{ description: "", quantity: 1, unit_price: 0, tax_rate: 20, discount: 0 }]
      });
      fetchData();
    } catch (error) {
      toast.error("Fatura oluşturulurken hata oluştu");
    }
  };

  const handleFinalizeInvoice = async (invoiceId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/invoices/${invoiceId}/finalize`, null, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success("Fatura onaylandı ve cariye işlendi");
      fetchData();
    } catch (error) {
      const msg = error.response?.data?.detail || "İşlem başarısız";
      toast.error(msg);
    }
  };

  const handleAddCustomer = async () => {
    if (!customerForm.name || !customerForm.email) {
      toast.error("Ad ve e-posta zorunludur");
      return;
    }

    setSavingCustomer(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API}/customers`, customerForm, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const newCustomer = response.data;
      
      // Add to customers list and select it
      setCustomers(prev => [...prev, newCustomer]);
      setFormData(prev => ({ ...prev, customer_id: newCustomer.id }));
      
      toast.success("Müşteri başarıyla eklendi ve seçildi");
      setCustomerDialogOpen(false);
      setCustomerForm({
        name: "",
        company: "",
        email: "",
        phone: "",
        address: "",
        tax_number: "",
        tax_office: ""
      });
    } catch (error) {
      const msg = error.response?.data?.detail || "Müşteri eklenirken hata oluştu";
      toast.error(msg);
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (!confirm("Bu faturayı silmek istediğinizden emin misiniz?")) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/invoices/${invoiceId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success("Fatura silindi");
      fetchData();
    } catch (error) {
      const msg = error.response?.data?.detail || "Silme başarısız";
      toast.error(msg);
    }
  };

  const openPaymentDialog = (invoice) => {
    setSelectedInvoice(invoice);
    setPaymentData({
      amount: invoice.grand_total - invoice.paid_amount,
      payment_method: "cash",
      notes: ""
    });
    setPaymentDialog(true);
  };

  const handlePayment = async () => {
    if (paymentData.amount <= 0) {
      toast.error("Geçerli bir tutar girin");
      return;
    }

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/payments`, {
        customer_id: selectedInvoice.customer_id,
        invoice_id: selectedInvoice.id,
        amount: paymentData.amount,
        payment_method: paymentData.payment_method,
        notes: paymentData.notes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success("Ödeme kaydedildi");
      setPaymentDialog(false);
      fetchData();
    } catch (error) {
      toast.error("Ödeme kaydedilemedi");
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = !searchTerm || 
      inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totals = calculateTotals();

  if (loading) {
    return <div className="flex items-center justify-center h-96">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6" data-testid="invoice-list-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight" style={{fontFamily: 'Chivo, sans-serif'}}>Faturalar</h1>
          <p className="text-muted-foreground mt-2">Fatura ve tahsilat yönetimi</p>
        </div>
        <Button onClick={() => setCreateDialog(true)} data-testid="create-invoice-btn">
          <Plus className="w-5 h-5 mr-2" />
          Yeni Fatura
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Toplam Fatura</p>
                <p className="text-2xl font-bold">{formatCurrency(stats?.total_invoiced || 0)}</p>
              </div>
              <FileText className="w-8 h-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tahsil Edilen</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(stats?.total_paid || 0)}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Bekleyen</p>
                <p className="text-2xl font-bold text-yellow-600">{formatCurrency(stats?.total_pending || 0)}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Geciken</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(stats?.total_overdue || 0)}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tahsilat Oranı</p>
                <p className="text-2xl font-bold">%{stats?.collection_rate || 0}</p>
              </div>
              <DollarSign className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Fatura no veya müşteri ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="invoice-search"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40" data-testid="status-filter">
            <SelectValue placeholder="Durum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tümü</SelectItem>
            <SelectItem value="draft">Taslak</SelectItem>
            <SelectItem value="pending">Bekliyor</SelectItem>
            <SelectItem value="paid">Ödendi</SelectItem>
            <SelectItem value="partial">Kısmi</SelectItem>
            <SelectItem value="overdue">Gecikmiş</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left py-3 px-4 font-medium">Fatura No</th>
                  <th className="text-left py-3 px-4 font-medium">Müşteri</th>
                  <th className="text-left py-3 px-4 font-medium">Tarih</th>
                  <th className="text-right py-3 px-4 font-medium">Tutar</th>
                  <th className="text-right py-3 px-4 font-medium">Ödenen</th>
                  <th className="text-center py-3 px-4 font-medium">Durum</th>
                  <th className="text-right py-3 px-4 font-medium">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredInvoices.map((invoice) => {
                  const statusInfo = statusLabels[invoice.status] || statusLabels.draft;
                  return (
                    <tr 
                      key={invoice.id} 
                      className="border-b hover:bg-muted/50 transition-colors"
                      data-testid={`invoice-row-${invoice.id}`}
                    >
                      <td className="py-3 px-4 font-mono font-medium">{invoice.invoice_number}</td>
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">{invoice.customer_name}</p>
                          <p className="text-sm text-muted-foreground">{invoice.company}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">
                        {new Date(invoice.created_at).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="py-3 px-4 text-right font-mono">{formatCurrency(invoice.grand_total)}</td>
                      <td className="py-3 px-4 text-right font-mono text-green-600">
                        {formatCurrency(invoice.paid_amount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/invoices/${invoice.id}`)}
                            title="Görüntüle"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {invoice.status === "draft" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleFinalizeInvoice(invoice.id)}
                                title="Onayla"
                                className="text-green-600"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteInvoice(invoice.id)}
                                title="Sil"
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </>
                          )}
                          {(invoice.status === "pending" || invoice.status === "partial") && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openPaymentDialog(invoice)}
                              title="Tahsilat"
                              className="text-blue-600"
                            >
                              <CreditCard className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      Fatura bulunamadı
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Create Invoice Dialog */}
      <Dialog open={createDialog} onOpenChange={setCreateDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni Fatura Oluştur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Müşteri *</Label>
                <div className="flex gap-2">
                  <Select 
                    value={formData.customer_id} 
                    onValueChange={(v) => setFormData({...formData, customer_id: v})}
                  >
                    <SelectTrigger data-testid="invoice-customer-select" className="flex-1">
                      <SelectValue placeholder="Müşteri seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(c => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} {c.company && `- ${c.company}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setCustomerDialogOpen(true)}
                    title="Yeni Müşteri Ekle"
                    data-testid="invoice-add-customer-btn"
                  >
                    <UserPlus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Vade Tarihi</Label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData({...formData, due_date: e.target.value})}
                  data-testid="invoice-due-date"
                />
              </div>
            </div>

            {/* Invoice Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Fatura Kalemleri</Label>
                <Button variant="outline" size="sm" onClick={addItem}>
                  <Plus className="w-4 h-4 mr-1" />
                  Kalem Ekle
                </Button>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left py-2 px-3">Açıklama</th>
                      <th className="text-right py-2 px-3 w-20">Miktar</th>
                      <th className="text-right py-2 px-3 w-28">Birim Fiyat</th>
                      <th className="text-right py-2 px-3 w-20">KDV %</th>
                      <th className="text-right py-2 px-3 w-20">İsk. %</th>
                      <th className="text-right py-2 px-3 w-28">Toplam</th>
                      <th className="w-10"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.items.map((item, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="py-2 px-2">
                          <Input
                            value={item.description}
                            onChange={(e) => updateItem(idx, 'description', e.target.value)}
                            placeholder="Hizmet/Ürün açıklaması"
                            className="h-8"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                            className="h-8 text-right"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => updateItem(idx, 'unit_price', e.target.value)}
                            className="h-8 text-right"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={item.tax_rate}
                            onChange={(e) => updateItem(idx, 'tax_rate', e.target.value)}
                            className="h-8 text-right"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={item.discount}
                            onChange={(e) => updateItem(idx, 'discount', e.target.value)}
                            className="h-8 text-right"
                          />
                        </td>
                        <td className="py-2 px-2 text-right font-mono">
                          {formatCurrency(calculateItemTotal(item))}
                        </td>
                        <td className="py-2 px-2">
                          {formData.items.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-600"
                              onClick={() => removeItem(idx)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ara Toplam:</span>
                  <span className="font-mono">{formatCurrency(totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">İskonto:</span>
                  <span className="font-mono text-red-600">-{formatCurrency(totals.discountTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">KDV:</span>
                  <span className="font-mono">+{formatCurrency(totals.taxTotal)}</span>
                </div>
                <div className="flex justify-between font-bold border-t pt-2">
                  <span>Genel Toplam:</span>
                  <span className="font-mono">{formatCurrency(totals.grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notlar</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                placeholder="Fatura notları..."
                rows={2}
              />
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={handleCreateInvoice} data-testid="save-invoice-btn">
                Taslak Olarak Kaydet
              </Button>
              <Button variant="outline" onClick={() => setCreateDialog(false)}>
                İptal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialog} onOpenChange={setPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tahsilat Kaydet</DialogTitle>
            <DialogDescription>
              {selectedInvoice?.invoice_number} - Kalan: {formatCurrency((selectedInvoice?.grand_total || 0) - (selectedInvoice?.paid_amount || 0))}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Ödeme Tutarı (TL) *</Label>
              <Input
                type="number"
                step="0.01"
                value={paymentData.amount}
                onChange={(e) => setPaymentData({...paymentData, amount: parseFloat(e.target.value) || 0})}
                data-testid="payment-amount"
              />
            </div>
            <div className="space-y-2">
              <Label>Ödeme Yöntemi</Label>
              <Select 
                value={paymentData.payment_method} 
                onValueChange={(v) => setPaymentData({...paymentData, payment_method: v})}
              >
                <SelectTrigger data-testid="payment-method-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Nakit</SelectItem>
                  <SelectItem value="bank_transfer">Havale/EFT</SelectItem>
                  <SelectItem value="credit_card">Kredi Kartı</SelectItem>
                  <SelectItem value="iyzico">iyzico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Not</Label>
              <Textarea
                value={paymentData.notes}
                onChange={(e) => setPaymentData({...paymentData, notes: e.target.value})}
                placeholder="Ödeme notu..."
                rows={2}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handlePayment} data-testid="save-payment-btn">
                Tahsilatı Kaydet
              </Button>
              <Button variant="outline" onClick={() => setPaymentDialog(false)}>
                İptal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Customer Dialog */}
      <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Hızlı Müşteri Ekle
            </DialogTitle>
            <DialogDescription>
              Yeni müşteri bilgilerini girin. Müşteri eklendikten sonra otomatik seçilecektir.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ad Soyad *</Label>
                <Input
                  value={customerForm.name}
                  onChange={(e) => setCustomerForm({...customerForm, name: e.target.value})}
                  placeholder="Ahmet Yılmaz"
                  data-testid="invoice-new-customer-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Firma</Label>
                <Input
                  value={customerForm.company}
                  onChange={(e) => setCustomerForm({...customerForm, company: e.target.value})}
                  placeholder="ABC Teknoloji"
                  data-testid="invoice-new-customer-company"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>E-posta *</Label>
                <Input
                  type="email"
                  value={customerForm.email}
                  onChange={(e) => setCustomerForm({...customerForm, email: e.target.value})}
                  placeholder="ahmet@firma.com"
                  data-testid="invoice-new-customer-email"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm({...customerForm, phone: e.target.value})}
                  placeholder="0532 123 4567"
                  data-testid="invoice-new-customer-phone"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Adres</Label>
              <Textarea
                value={customerForm.address}
                onChange={(e) => setCustomerForm({...customerForm, address: e.target.value})}
                placeholder="Firma adresi"
                rows={2}
                data-testid="invoice-new-customer-address"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vergi No</Label>
                <Input
                  value={customerForm.tax_number}
                  onChange={(e) => setCustomerForm({...customerForm, tax_number: e.target.value})}
                  placeholder="1234567890"
                  data-testid="invoice-new-customer-tax-number"
                />
              </div>
              <div className="space-y-2">
                <Label>Vergi Dairesi</Label>
                <Input
                  value={customerForm.tax_office}
                  onChange={(e) => setCustomerForm({...customerForm, tax_office: e.target.value})}
                  placeholder="Kadıköy VD"
                  data-testid="invoice-new-customer-tax-office"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button 
                onClick={handleAddCustomer} 
                disabled={savingCustomer}
                data-testid="invoice-save-new-customer-btn"
              >
                {savingCustomer ? "Ekleniyor..." : "Müşteri Ekle"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setCustomerDialogOpen(false);
                  setCustomerForm({
                    name: "",
                    company: "",
                    email: "",
                    phone: "",
                    address: "",
                    tax_number: "",
                    tax_office: ""
                  });
                }}
              >
                İptal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
