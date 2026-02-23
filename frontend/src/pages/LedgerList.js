import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight,
  Plus,
  Eye,
  Receipt
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function LedgerList() {
  const navigate = useNavigate();
  const [ledgerSummary, setLedgerSummary] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [openingBalanceDialog, setOpeningBalanceDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [openingAmount, setOpeningAmount] = useState("");
  const [customerDetailDialog, setCustomerDetailDialog] = useState(false);
  const [customerLedger, setCustomerLedger] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [summaryRes, customersRes] = await Promise.all([
        axios.get(`${API}/ledger/summary`, { headers }),
        axios.get(`${API}/customers`, { headers })
      ]);
      
      setLedgerSummary(summaryRes.data);
      setCustomers(customersRes.data);
    } catch (error) {
      toast.error("Veri yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleOpeningBalance = async () => {
    if (!selectedCustomer || !openingAmount) {
      toast.error("Müşteri ve tutar gerekli");
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/ledger/opening-balance`, null, {
        params: {
          customer_id: selectedCustomer,
          amount: parseFloat(openingAmount)
        },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success("Açılış bakiyesi eklendi");
      setOpeningBalanceDialog(false);
      setSelectedCustomer("");
      setOpeningAmount("");
      fetchData();
    } catch (error) {
      const msg = error.response?.data?.detail || "İşlem başarısız";
      toast.error(msg);
    }
  };

  const viewCustomerLedger = async (customerId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API}/ledger/customer/${customerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomerLedger(res.data);
      setCustomerDetailDialog(true);
    } catch (error) {
      toast.error("Cari detayı yüklenemedi");
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const filteredCustomers = ledgerSummary?.customers?.filter(c => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      c.customer_name?.toLowerCase().includes(searchLower) ||
      c.company?.toLowerCase().includes(searchLower)
    );
  }) || [];

  if (loading) {
    return <div className="flex items-center justify-center h-96">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6" data-testid="ledger-list-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight" style={{fontFamily: 'Chivo, sans-serif'}}>Cariler</h1>
          <p className="text-muted-foreground mt-2">Müşteri cari hesaplarını yönetin</p>
        </div>
        <Button onClick={() => setOpeningBalanceDialog(true)} data-testid="add-opening-balance-btn">
          <Plus className="w-5 h-5 mr-2" />
          Açılış Bakiyesi
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Toplam Alacak</p>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(ledgerSummary?.total_receivable || 0)}
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-sm">Toplam Borç</p>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(ledgerSummary?.total_payable || 0)}
                </p>
              </div>
              <TrendingDown className="w-10 h-10 text-red-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Net Bakiye</p>
                <p className="text-2xl font-bold mt-1">
                  {formatCurrency(ledgerSummary?.net_balance || 0)}
                </p>
              </div>
              <Wallet className="w-10 h-10 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Aktif Cariler</p>
                <p className="text-2xl font-bold mt-1">
                  {ledgerSummary?.customers?.length || 0}
                </p>
              </div>
              <Receipt className="w-10 h-10 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Müşteri ara..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          data-testid="ledger-search"
        />
      </div>

      {/* Customer Balances Table */}
      <Card>
        <CardHeader>
          <CardTitle>Müşteri Bakiyeleri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Müşteri</th>
                  <th className="text-left py-3 px-4 font-medium">Firma</th>
                  <th className="text-right py-3 px-4 font-medium">Bakiye</th>
                  <th className="text-center py-3 px-4 font-medium">Durum</th>
                  <th className="text-right py-3 px-4 font-medium">İşlemler</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr 
                    key={customer.customer_id} 
                    className="border-b hover:bg-muted/50 transition-colors"
                    data-testid={`ledger-row-${customer.customer_id}`}
                  >
                    <td className="py-3 px-4 font-medium">{customer.customer_name}</td>
                    <td className="py-3 px-4 text-muted-foreground">{customer.company || '-'}</td>
                    <td className="py-3 px-4 text-right font-mono">
                      <span className={customer.balance > 0 ? "text-blue-600" : customer.balance < 0 ? "text-red-600" : ""}>
                        {formatCurrency(customer.balance)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {customer.balance > 0 ? (
                        <Badge variant="info" className="gap-1">
                          <ArrowUpRight className="w-3 h-3" />
                          Alacaklı
                        </Badge>
                      ) : customer.balance < 0 ? (
                        <Badge variant="warning" className="gap-1">
                          <ArrowDownRight className="w-3 h-3" />
                          Borçlu
                        </Badge>
                      ) : (
                        <Badge variant="outline">Dengeli</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewCustomerLedger(customer.customer_id)}
                          data-testid={`view-ledger-${customer.customer_id}`}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Detay
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/invoices?customer=${customer.customer_id}`)}
                        >
                          <Receipt className="w-4 h-4 mr-1" />
                          Faturalar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      {searchTerm ? "Arama sonucu bulunamadı" : "Henüz cari hareketi yok"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Opening Balance Dialog */}
      <Dialog open={openingBalanceDialog} onOpenChange={setOpeningBalanceDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Açılış Bakiyesi Ekle</DialogTitle>
            <DialogDescription>
              Müşteri için başlangıç bakiyesi girin. Pozitif değer alacak, negatif değer borç olarak kaydedilir.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Müşteri *</Label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger data-testid="opening-customer-select">
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
            </div>
            <div className="space-y-2">
              <Label>Tutar (TL) *</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="1000.00 veya -500.00"
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
                data-testid="opening-amount-input"
              />
              <p className="text-xs text-muted-foreground">
                Pozitif: Müşteri bize borçlu | Negatif: Biz müşteriye borçluyuz
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleOpeningBalance} data-testid="save-opening-balance">
                Kaydet
              </Button>
              <Button variant="outline" onClick={() => setOpeningBalanceDialog(false)}>
                İptal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Ledger Detail Dialog */}
      <Dialog open={customerDetailDialog} onOpenChange={setCustomerDetailDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {customerLedger?.customer?.name} - Cari Hareketleri
            </DialogTitle>
            <DialogDescription>
              {customerLedger?.customer?.company}
            </DialogDescription>
          </DialogHeader>
          
          {customerLedger && (
            <div className="space-y-4">
              {/* Balance Summary */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">Toplam Borç</p>
                    <p className="text-lg font-bold text-blue-600">
                      {formatCurrency(customerLedger.total_debit)}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">Toplam Alacak</p>
                    <p className="text-lg font-bold text-green-600">
                      {formatCurrency(customerLedger.total_credit)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-primary/5">
                  <CardContent className="p-4 text-center">
                    <p className="text-sm text-muted-foreground">Güncel Bakiye</p>
                    <p className={`text-lg font-bold ${customerLedger.balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {formatCurrency(customerLedger.balance)}
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left py-2 px-3">Tarih</th>
                      <th className="text-left py-2 px-3">Tip</th>
                      <th className="text-left py-2 px-3">Açıklama</th>
                      <th className="text-right py-2 px-3">Borç</th>
                      <th className="text-right py-2 px-3">Alacak</th>
                      <th className="text-right py-2 px-3">Bakiye</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerLedger.entries.map((entry) => (
                      <tr key={entry.id} className="border-t">
                        <td className="py-2 px-3">
                          {new Date(entry.created_at).toLocaleDateString('tr-TR')}
                        </td>
                        <td className="py-2 px-3">
                          <Badge variant={
                            entry.entry_type === 'invoice' ? 'default' :
                            entry.entry_type === 'payment' ? 'success' :
                            entry.entry_type === 'refund' ? 'warning' : 'outline'
                          }>
                            {entry.entry_type === 'invoice' ? 'Fatura' :
                             entry.entry_type === 'payment' ? 'Tahsilat' :
                             entry.entry_type === 'refund' ? 'İade' :
                             entry.entry_type === 'opening' ? 'Açılış' : entry.entry_type}
                          </Badge>
                        </td>
                        <td className="py-2 px-3">{entry.description}</td>
                        <td className="py-2 px-3 text-right font-mono text-blue-600">
                          {entry.debit > 0 ? formatCurrency(entry.debit) : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono text-green-600">
                          {entry.credit > 0 ? formatCurrency(entry.credit) : '-'}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-medium">
                          {formatCurrency(entry.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
