import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Plus, FileText, Calendar, DollarSign, Clock, AlertTriangle, CheckCircle, XCircle, Building2, Edit, Trash2, Search } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function ContractList() {
  const navigate = useNavigate();
  const [contracts, setContracts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [slaProfiles, setSlaProfiles] = useState([]);
  const [expiringContracts, setExpiringContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingContract, setEditingContract] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const [formData, setFormData] = useState({
    customer_id: "",
    name: "",
    contract_type: "standard",
    start_date: "",
    end_date: "",
    auto_renew: false,
    monthly_fee: 0,
    currency: "TRY",
    sla_profile_id: "",
    max_tickets_per_month: null,
    max_response_hours: null,
    includes_remote_support: true,
    includes_onsite_support: false,
    includes_parts: false,
    terms: "",
    notes: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [contractsRes, customersRes, slaRes, expiringRes] = await Promise.all([
        axios.get(`${API}/contracts`, { headers }),
        axios.get(`${API}/customers`, { headers }),
        axios.get(`${API}/sla-profiles`, { headers }),
        axios.get(`${API}/contracts/expiring/list?days=30`, { headers })
      ]);
      
      setContracts(contractsRes.data);
      setCustomers(customersRes.data);
      setSlaProfiles(slaRes.data);
      setExpiringContracts(expiringRes.data);
    } catch (error) {
      toast.error("Veri yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const payload = {
        ...formData,
        monthly_fee: parseFloat(formData.monthly_fee) || 0,
        max_tickets_per_month: formData.max_tickets_per_month ? parseInt(formData.max_tickets_per_month) : null,
        max_response_hours: formData.max_response_hours ? parseInt(formData.max_response_hours) : null
      };
      
      if (editingContract) {
        await axios.patch(`${API}/contracts/${editingContract.id}`, payload, { headers });
        toast.success("Sözleşme güncellendi");
      } else {
        await axios.post(`${API}/contracts`, payload, { headers });
        toast.success("Sözleşme oluşturuldu");
      }
      
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error("İşlem sırasında hata oluştu");
    }
  };

  const handleDelete = async (contractId) => {
    if (!window.confirm("Bu sözleşmeyi silmek istediğinize emin misiniz?")) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/contracts/${contractId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Sözleşme silindi");
      fetchData();
    } catch (error) {
      toast.error("Silme işlemi başarısız");
    }
  };

  const handleEdit = (contract) => {
    setEditingContract(contract);
    setFormData({
      customer_id: contract.customer_id,
      name: contract.name,
      contract_type: contract.contract_type,
      start_date: contract.start_date,
      end_date: contract.end_date,
      auto_renew: contract.auto_renew,
      monthly_fee: contract.monthly_fee,
      currency: contract.currency,
      sla_profile_id: contract.sla_profile_id || "",
      max_tickets_per_month: contract.max_tickets_per_month || "",
      max_response_hours: contract.max_response_hours || "",
      includes_remote_support: contract.includes_remote_support,
      includes_onsite_support: contract.includes_onsite_support,
      includes_parts: contract.includes_parts,
      terms: contract.terms || "",
      notes: contract.notes || ""
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setEditingContract(null);
    setFormData({
      customer_id: "",
      name: "",
      contract_type: "standard",
      start_date: "",
      end_date: "",
      auto_renew: false,
      monthly_fee: 0,
      currency: "TRY",
      sla_profile_id: "",
      max_tickets_per_month: null,
      max_response_hours: null,
      includes_remote_support: true,
      includes_onsite_support: false,
      includes_parts: false,
      terms: "",
      notes: ""
    });
  };

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.name : 'Bilinmeyen';
  };

  const getStatusBadge = (status) => {
    const variants = {
      active: { variant: "success", label: "Aktif", icon: CheckCircle },
      expired: { variant: "error", label: "Süresi Doldu", icon: XCircle },
      cancelled: { variant: "secondary", label: "İptal Edildi", icon: XCircle },
      pending: { variant: "warning", label: "Beklemede", icon: Clock }
    };
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  const getContractTypeBadge = (type) => {
    const variants = {
      standard: { variant: "outline", label: "Standart" },
      premium: { variant: "info", label: "Premium" },
      enterprise: { variant: "default", label: "Kurumsal" }
    };
    const config = variants[type] || variants.standard;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getDaysRemaining = (endDate) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const filteredContracts = contracts.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.contract_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         getCustomerName(c.customer_id).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return <div className="flex items-center justify-center h-96">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6" data-testid="contract-list-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight" style={{fontFamily: 'Chivo, sans-serif'}}>Sözleşme Yönetimi</h1>
          <p className="text-muted-foreground mt-2">Müşteri sözleşmelerini takip edin ve yönetin</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="add-contract-btn">
              <Plus className="w-5 h-5 mr-2" />
              Yeni Sözleşme
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingContract ? 'Sözleşme Düzenle' : 'Yeni Sözleşme Oluştur'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Müşteri *</Label>
                  <Select value={formData.customer_id} onValueChange={(v) => setFormData({...formData, customer_id: v})} required>
                    <SelectTrigger data-testid="contract-customer-select">
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
                  <Label>Sözleşme Adı *</Label>
                  <Input
                    data-testid="contract-name-input"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="Örn: Yıllık Bakım Sözleşmesi"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Sözleşme Tipi</Label>
                  <Select value={formData.contract_type} onValueChange={(v) => setFormData({...formData, contract_type: v})}>
                    <SelectTrigger data-testid="contract-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standart</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="enterprise">Kurumsal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Başlangıç Tarihi *</Label>
                  <Input
                    type="date"
                    data-testid="contract-start-date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bitiş Tarihi *</Label>
                  <Input
                    type="date"
                    data-testid="contract-end-date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Aylık Ücret</Label>
                  <Input
                    type="number"
                    data-testid="contract-fee-input"
                    value={formData.monthly_fee}
                    onChange={(e) => setFormData({...formData, monthly_fee: e.target.value})}
                    min="0"
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Para Birimi</Label>
                  <Select value={formData.currency} onValueChange={(v) => setFormData({...formData, currency: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TRY">TRY</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>SLA Profili</Label>
                  <Select value={formData.sla_profile_id} onValueChange={(v) => setFormData({...formData, sla_profile_id: v})}>
                    <SelectTrigger data-testid="contract-sla-select">
                      <SelectValue placeholder="Seçiniz" />
                    </SelectTrigger>
                    <SelectContent>
                      {slaProfiles.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Max Ticket/Ay</Label>
                  <Input
                    type="number"
                    value={formData.max_tickets_per_month || ""}
                    onChange={(e) => setFormData({...formData, max_tickets_per_month: e.target.value})}
                    placeholder="Sınırsız"
                    min="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Yanıt Süresi (saat)</Label>
                  <Input
                    type="number"
                    value={formData.max_response_hours || ""}
                    onChange={(e) => setFormData({...formData, max_response_hours: e.target.value})}
                    placeholder="SLA'ya göre"
                    min="0"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <Label>Kapsam</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <Label htmlFor="remote" className="cursor-pointer">Uzaktan Destek</Label>
                    <Switch
                      id="remote"
                      checked={formData.includes_remote_support}
                      onCheckedChange={(v) => setFormData({...formData, includes_remote_support: v})}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <Label htmlFor="onsite" className="cursor-pointer">Yerinde Destek</Label>
                    <Switch
                      id="onsite"
                      checked={formData.includes_onsite_support}
                      onCheckedChange={(v) => setFormData({...formData, includes_onsite_support: v})}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <Label htmlFor="parts" className="cursor-pointer">Parça Dahil</Label>
                    <Switch
                      id="parts"
                      checked={formData.includes_parts}
                      onCheckedChange={(v) => setFormData({...formData, includes_parts: v})}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <Label htmlFor="autorenew" className="cursor-pointer">Otomatik Yenileme</Label>
                    <Switch
                      id="autorenew"
                      checked={formData.auto_renew}
                      onCheckedChange={(v) => setFormData({...formData, auto_renew: v})}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Şartlar ve Koşullar</Label>
                <Textarea
                  value={formData.terms}
                  onChange={(e) => setFormData({...formData, terms: e.target.value})}
                  rows={3}
                  placeholder="Sözleşme şartları..."
                />
              </div>

              <div className="space-y-2">
                <Label>Notlar</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={2}
                  placeholder="Ek notlar..."
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" data-testid="submit-contract-btn">
                  {editingContract ? 'Güncelle' : 'Oluştur'}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>
                  İptal
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <FileText className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{contracts.length}</p>
                <p className="text-sm text-muted-foreground">Toplam Sözleşme</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{contracts.filter(c => c.status === 'active').length}</p>
                <p className="text-sm text-muted-foreground">Aktif Sözleşme</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{expiringContracts.length}</p>
                <p className="text-sm text-muted-foreground">Yakında Dolacak</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <DollarSign className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {contracts.filter(c => c.status === 'active').reduce((sum, c) => sum + (c.monthly_fee || 0), 0).toLocaleString('tr-TR')} ₺
                </p>
                <p className="text-sm text-muted-foreground">Aylık Gelir</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expiring Contracts Alert */}
      {expiringContracts.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5" />
              Süresi Dolmak Üzere Olan Sözleşmeler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expiringContracts.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center justify-between p-2 rounded bg-white dark:bg-slate-800">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm">{c.contract_number}</span>
                    <span className="font-medium">{c.name}</span>
                    <span className="text-sm text-muted-foreground">({getCustomerName(c.customer_id)})</span>
                  </div>
                  <Badge variant="warning">{c.days_remaining} gün kaldı</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Sözleşme ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="contract-search"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Durum filtrele" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Durumlar</SelectItem>
            <SelectItem value="active">Aktif</SelectItem>
            <SelectItem value="expired">Süresi Doldu</SelectItem>
            <SelectItem value="cancelled">İptal Edildi</SelectItem>
            <SelectItem value="pending">Beklemede</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Contracts List */}
      {filteredContracts.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Henüz sözleşme yok</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredContracts.map((contract) => {
            const daysRemaining = getDaysRemaining(contract.end_date);
            const isExpiringSoon = daysRemaining > 0 && daysRemaining <= 30;
            
            return (
              <Card 
                key={contract.id} 
                data-testid={`contract-card-${contract.contract_number}`}
                className={`hover:shadow-md transition-shadow ${isExpiringSoon ? 'border-amber-300 dark:border-amber-700' : ''}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className="font-mono text-lg font-bold">{contract.contract_number}</span>
                        {getStatusBadge(contract.status)}
                        {getContractTypeBadge(contract.contract_type)}
                        {contract.auto_renew && (
                          <Badge variant="outline" className="gap-1">
                            <Clock className="w-3 h-3" />
                            Otomatik Yenileme
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-lg font-semibold mb-2">{contract.name}</h3>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Müşteri</p>
                          <p className="font-medium flex items-center gap-1">
                            <Building2 className="w-4 h-4" />
                            {getCustomerName(contract.customer_id)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Süre</p>
                          <p className="font-medium flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(contract.start_date).toLocaleDateString('tr-TR')} - {new Date(contract.end_date).toLocaleDateString('tr-TR')}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Aylık Ücret</p>
                          <p className="font-medium flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            {contract.monthly_fee?.toLocaleString('tr-TR')} {contract.currency}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Kalan Süre</p>
                          <p className={`font-medium ${daysRemaining <= 0 ? 'text-red-500' : isExpiringSoon ? 'text-amber-500' : ''}`}>
                            {daysRemaining > 0 ? `${daysRemaining} gün` : 'Süresi doldu'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 mt-3 text-xs">
                        {contract.includes_remote_support && <Badge variant="outline">Uzaktan Destek</Badge>}
                        {contract.includes_onsite_support && <Badge variant="outline">Yerinde Destek</Badge>}
                        {contract.includes_parts && <Badge variant="outline">Parça Dahil</Badge>}
                        {contract.max_tickets_per_month && <Badge variant="outline">Max {contract.max_tickets_per_month} ticket/ay</Badge>}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(contract)}
                        data-testid={`edit-contract-${contract.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-500 hover:text-red-700"
                        onClick={() => handleDelete(contract.id)}
                        data-testid={`delete-contract-${contract.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
