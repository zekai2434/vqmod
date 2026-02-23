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
import { Plus, FileText, Package, Truck, CheckCircle, XCircle, Clock, Search, Edit, Eye, Calendar, Building2 } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function RMAList() {
  const navigate = useNavigate();
  const [rmaList, setRmaList] = useState([]);
  const [assets, setAssets] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedRMA, setSelectedRMA] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  
  const [formData, setFormData] = useState({
    asset_id: "",
    ticket_id: "",
    reason: "",
    manufacturer: ""
  });

  const [updateData, setUpdateData] = useState({
    status: "",
    manufacturer_rma_number: "",
    tracking_number: "",
    replacement_serial: "",
    notes: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [rmaRes, assetsRes, ticketsRes, customersRes] = await Promise.all([
        axios.get(`${API}/rma`, { headers }),
        axios.get(`${API}/assets`, { headers }),
        axios.get(`${API}/tickets`, { headers }),
        axios.get(`${API}/customers`, { headers })
      ]);
      setRmaList(rmaRes.data);
      setAssets(assetsRes.data);
      setTickets(ticketsRes.data);
      setCustomers(customersRes.data);
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
      await axios.post(`${API}/rma`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("RMA başarıyla oluşturuldu");
      setDialogOpen(false);
      setFormData({ asset_id: "", ticket_id: "", reason: "", manufacturer: "" });
      fetchData();
    } catch (error) {
      toast.error("RMA oluşturulurken hata oluştu");
    }
  };

  const handleUpdate = async () => {
    try {
      const token = localStorage.getItem('token');
      const payload = {};
      Object.keys(updateData).forEach(key => {
        if (updateData[key]) payload[key] = updateData[key];
      });
      
      await axios.patch(`${API}/rma/${selectedRMA.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("RMA güncellendi");
      setDetailDialogOpen(false);
      setSelectedRMA(null);
      fetchData();
    } catch (error) {
      toast.error("Güncelleme başarısız");
    }
  };

  const openDetail = (rma) => {
    setSelectedRMA(rma);
    setUpdateData({
      status: rma.status,
      manufacturer_rma_number: rma.manufacturer_rma_number || "",
      tracking_number: rma.tracking_number || "",
      replacement_serial: rma.replacement_serial || "",
      notes: rma.notes || ""
    });
    setDetailDialogOpen(true);
  };

  const getAssetInfo = (assetId) => {
    const asset = assets.find(a => a.id === assetId);
    return asset || null;
  };

  const getCustomerName = (assetId) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return 'Bilinmeyen';
    const customer = customers.find(c => c.id === asset.customer_id);
    return customer ? customer.name : 'Bilinmeyen';
  };

  const getTicketNumber = (ticketId) => {
    const ticket = tickets.find(t => t.id === ticketId);
    return ticket ? ticket.ticket_number : null;
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: { variant: "warning", label: "Beklemede", icon: Clock },
      approved: { variant: "info", label: "Onaylandı", icon: CheckCircle },
      shipped: { variant: "secondary", label: "Kargoda", icon: Truck },
      received: { variant: "default", label: "Teslim Alındı", icon: Package },
      completed: { variant: "success", label: "Tamamlandı", icon: CheckCircle },
      rejected: { variant: "error", label: "Reddedildi", icon: XCircle }
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

  const getStatusProgress = (status) => {
    const steps = ['pending', 'approved', 'shipped', 'received', 'completed'];
    const currentIndex = steps.indexOf(status);
    if (status === 'rejected') return 0;
    return ((currentIndex + 1) / steps.length) * 100;
  };

  const filteredRMAList = rmaList.filter(rma => {
    const asset = getAssetInfo(rma.asset_id);
    const matchesSearch = 
      rma.rma_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rma.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (asset && asset.serial_number.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "all" || rma.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: rmaList.length,
    pending: rmaList.filter(r => r.status === 'pending').length,
    inProgress: rmaList.filter(r => ['approved', 'shipped', 'received'].includes(r.status)).length,
    completed: rmaList.filter(r => r.status === 'completed').length
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6" data-testid="rma-list-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight" style={{fontFamily: 'Chivo, sans-serif'}}>RMA Yönetimi</h1>
          <p className="text-muted-foreground mt-2">Garanti ve iade süreçlerini takip edin</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-rma-btn">
              <Plus className="w-5 h-5 mr-2" />
              Yeni RMA
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Yeni RMA Oluştur</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="asset_id">Cihaz *</Label>
                <Select value={formData.asset_id} onValueChange={(v) => setFormData({...formData, asset_id: v})} required>
                  <SelectTrigger data-testid="rma-asset-select">
                    <SelectValue placeholder="Cihaz seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {assets.map(a => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.device_type} - {a.brand} {a.model} ({a.serial_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ticket_id">İlgili Ticket</Label>
                <Select value={formData.ticket_id} onValueChange={(v) => setFormData({...formData, ticket_id: v})}>
                  <SelectTrigger data-testid="rma-ticket-select">
                    <SelectValue placeholder="Ticket seçin (opsiyonel)" />
                  </SelectTrigger>
                  <SelectContent>
                    {tickets.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.ticket_number} - {t.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="manufacturer">Üretici</Label>
                <Input
                  id="manufacturer"
                  value={formData.manufacturer}
                  onChange={(e) => setFormData({...formData, manufacturer: e.target.value})}
                  placeholder="Örn: Cisco, HP, Dell"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">İade Nedeni *</Label>
                <Textarea
                  id="reason"
                  data-testid="rma-reason-input"
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  rows={4}
                  required
                  placeholder="Arıza detayını açıklayın..."
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button data-testid="submit-rma-btn" type="submit">Oluştur</Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <FileText className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Toplam RMA</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">Beklemede</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Truck className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
                <p className="text-sm text-muted-foreground">İşlemde</p>
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
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-sm text-muted-foreground">Tamamlandı</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="RMA ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Durum filtrele" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Durumlar</SelectItem>
            <SelectItem value="pending">Beklemede</SelectItem>
            <SelectItem value="approved">Onaylandı</SelectItem>
            <SelectItem value="shipped">Kargoda</SelectItem>
            <SelectItem value="received">Teslim Alındı</SelectItem>
            <SelectItem value="completed">Tamamlandı</SelectItem>
            <SelectItem value="rejected">Reddedildi</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* RMA List */}
      {filteredRMAList.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Henüz RMA kaydı yok</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredRMAList.map((rma) => {
            const asset = getAssetInfo(rma.asset_id);
            const ticketNumber = getTicketNumber(rma.ticket_id);
            
            return (
              <Card key={rma.id} data-testid={`rma-card-${rma.rma_number}`} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <span className="font-mono text-lg font-bold">{rma.rma_number}</span>
                        {getStatusBadge(rma.status)}
                        {ticketNumber && (
                          <Badge variant="outline" className="gap-1">
                            <FileText className="w-3 h-3" />
                            {ticketNumber}
                          </Badge>
                        )}
                      </div>
                      
                      {/* Progress Bar */}
                      {rma.status !== 'rejected' && (
                        <div className="mb-4">
                          <div className="flex justify-between text-xs text-muted-foreground mb-1">
                            <span>Beklemede</span>
                            <span>Onay</span>
                            <span>Kargo</span>
                            <span>Teslim</span>
                            <span>Tamamlandı</span>
                          </div>
                          <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500"
                              style={{ width: `${getStatusProgress(rma.status)}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Cihaz</p>
                          <p className="font-medium">
                            {asset ? `${asset.device_type} - ${asset.brand} ${asset.model}` : 'Bilinmeyen'}
                          </p>
                          {asset && <p className="text-xs text-muted-foreground font-mono">{asset.serial_number}</p>}
                        </div>
                        <div>
                          <p className="text-muted-foreground">Müşteri</p>
                          <p className="font-medium flex items-center gap-1">
                            <Building2 className="w-4 h-4" />
                            {getCustomerName(rma.asset_id)}
                          </p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Üretici RMA No</p>
                          <p className="font-medium font-mono">{rma.manufacturer_rma_number || '-'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Takip No</p>
                          <p className="font-medium font-mono">{rma.tracking_number || '-'}</p>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <p className="text-sm text-muted-foreground">İade Nedeni</p>
                        <p className="text-sm">{rma.reason}</p>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Oluşturulma: {new Date(rma.created_at).toLocaleDateString('tr-TR')}
                        </span>
                        {rma.sent_date && (
                          <span>Gönderilme: {new Date(rma.sent_date).toLocaleDateString('tr-TR')}</span>
                        )}
                        {rma.completed_at && (
                          <span>Tamamlanma: {new Date(rma.completed_at).toLocaleDateString('tr-TR')}</span>
                        )}
                      </div>
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDetail(rma)}
                      className="ml-4"
                      data-testid={`view-rma-${rma.id}`}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Detay
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail/Update Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>RMA Detayı - {selectedRMA?.rma_number}</DialogTitle>
          </DialogHeader>
          {selectedRMA && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Durum</Label>
                  <Select value={updateData.status} onValueChange={(v) => setUpdateData({...updateData, status: v})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Beklemede</SelectItem>
                      <SelectItem value="approved">Onaylandı</SelectItem>
                      <SelectItem value="shipped">Kargoda</SelectItem>
                      <SelectItem value="received">Teslim Alındı</SelectItem>
                      <SelectItem value="completed">Tamamlandı</SelectItem>
                      <SelectItem value="rejected">Reddedildi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Üretici RMA Numarası</Label>
                  <Input
                    value={updateData.manufacturer_rma_number}
                    onChange={(e) => setUpdateData({...updateData, manufacturer_rma_number: e.target.value})}
                    placeholder="Üreticiden alınan RMA no"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Kargo Takip Numarası</Label>
                  <Input
                    value={updateData.tracking_number}
                    onChange={(e) => setUpdateData({...updateData, tracking_number: e.target.value})}
                    placeholder="Kargo takip no"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Yedek Cihaz Seri No</Label>
                  <Input
                    value={updateData.replacement_serial}
                    onChange={(e) => setUpdateData({...updateData, replacement_serial: e.target.value})}
                    placeholder="Değişim cihazının seri numarası"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Notlar</Label>
                <Textarea
                  value={updateData.notes}
                  onChange={(e) => setUpdateData({...updateData, notes: e.target.value})}
                  rows={3}
                  placeholder="İşlem notları..."
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button onClick={handleUpdate}>Güncelle</Button>
                <Button variant="outline" onClick={() => setDetailDialogOpen(false)}>Kapat</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
