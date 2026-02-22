import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, Package, AlertTriangle, Search, Filter, ArrowUpCircle, ArrowDownCircle, 
  Box, Tag, Barcode, History, Eye, TrendingDown, TrendingUp, RotateCcw
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const CATEGORIES = [
  "SFP/GBIC",
  "Güç Kaynağı (PSU)",
  "Fan/Soğutma",
  "Bellek (RAM)",
  "Depolama (SSD/HDD)",
  "Kablo/Bağlantı",
  "Modül/Kart",
  "Anten",
  "Pil/Batarya",
  "Diğer"
];

export default function PartList() {
  const navigate = useNavigate();
  const [parts, setParts] = useState([]);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [stockMovements, setStockMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [stockDialogOpen, setStockDialogOpen] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("inventory");
  
  const [formData, setFormData] = useState({
    part_number: "",
    name: "",
    category: "",
    description: "",
    brand: "",
    model: "",
    quantity: 0,
    min_stock: 5,
    max_stock: null,
    unit_price: 0,
    currency: "TRY",
    supplier: "",
    supplier_part_number: "",
    location: "",
    shelf: "",
    has_serial: false
  });

  const [stockMovement, setStockMovement] = useState({
    part_id: "",
    movement_type: "in",
    quantity: 1,
    reason: "",
    notes: "",
    unit_cost: null,
    supplier: "",
    invoice_number: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [partsRes, alertsRes, movementsRes] = await Promise.all([
        axios.get(`${API}/parts`, { headers }),
        axios.get(`${API}/parts/alerts/low-stock`, { headers }),
        axios.get(`${API}/stock-movements`, { headers })
      ]);
      
      setParts(partsRes.data);
      setLowStockAlerts(alertsRes.data);
      setStockMovements(movementsRes.data);
    } catch (error) {
      toast.error("Veriler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/parts`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Parça başarıyla eklendi");
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Parça eklenirken hata oluştu");
    }
  };

  const handleStockMovement = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/stock-movements`, stockMovement, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Stok hareketi kaydedildi");
      setStockDialogOpen(false);
      setStockMovement({
        part_id: "",
        movement_type: "in",
        quantity: 1,
        reason: "",
        notes: "",
        unit_cost: null,
        supplier: "",
        invoice_number: ""
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Stok hareketi kaydedilirken hata oluştu");
    }
  };

  const resetForm = () => {
    setFormData({
      part_number: "",
      name: "",
      category: "",
      description: "",
      brand: "",
      model: "",
      quantity: 0,
      min_stock: 5,
      max_stock: null,
      unit_price: 0,
      currency: "TRY",
      supplier: "",
      supplier_part_number: "",
      location: "",
      shelf: "",
      has_serial: false
    });
  };

  const openStockDialog = (part, type) => {
    setStockMovement({
      ...stockMovement,
      part_id: part.id,
      movement_type: type
    });
    setSelectedPart(part);
    setStockDialogOpen(true);
  };

  const filteredParts = parts.filter(part => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!part.name.toLowerCase().includes(query) && 
          !part.part_number.toLowerCase().includes(query) &&
          !(part.brand || "").toLowerCase().includes(query)) {
        return false;
      }
    }
    if (categoryFilter !== "all" && part.category !== categoryFilter) return false;
    if (stockFilter === "low" && part.quantity > part.min_stock) return false;
    if (stockFilter === "out" && part.quantity > 0) return false;
    if (stockFilter === "available" && part.quantity <= part.min_stock) return false;
    return true;
  });

  const getStockBadge = (part) => {
    const available = part.quantity - (part.reserved_quantity || 0);
    if (available <= 0) {
      return <Badge variant="error">Stok Yok</Badge>;
    }
    if (available <= part.min_stock) {
      return <Badge variant="warning">Düşük Stok</Badge>;
    }
    return <Badge variant="success">Stokta</Badge>;
  };

  const getMovementTypeBadge = (type) => {
    const config = {
      in: { variant: "success", label: "Giriş", icon: ArrowDownCircle },
      out: { variant: "error", label: "Çıkış", icon: ArrowUpCircle },
      purchase: { variant: "success", label: "Satın Alma", icon: ArrowDownCircle },
      usage: { variant: "warning", label: "Kullanım", icon: ArrowUpCircle },
      return_from_field: { variant: "info", label: "Sahadan İade", icon: RotateCcw },
      scrap: { variant: "error", label: "Hurda", icon: TrendingDown },
      adjustment_plus: { variant: "success", label: "Sayım (+)", icon: TrendingUp },
      adjustment_minus: { variant: "error", label: "Sayım (-)", icon: TrendingDown }
    };
    const { variant, label, icon: Icon } = config[type] || { variant: "outline", label: type, icon: Box };
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };

  const getPartName = (partId) => {
    const part = parts.find(p => p.id === partId);
    return part ? `${part.part_number} - ${part.name}` : partId;
  };

  const categories = [...new Set(parts.map(p => p.category))];

  if (loading) {
    return <div className="flex items-center justify-center h-96">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6" data-testid="part-list-container">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight" style={{fontFamily: 'Chivo, sans-serif'}}>Parça / Depo Yönetimi</h1>
          <p className="text-muted-foreground mt-2">Stok ve parça takibi</p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-part-btn">
                <Plus className="w-5 h-5 mr-2" />
                Yeni Parça
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Yeni Parça Ekle</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="part_number">Parça Numarası *</Label>
                    <Input
                      id="part_number"
                      data-testid="part-number-input"
                      value={formData.part_number}
                      onChange={(e) => setFormData({...formData, part_number: e.target.value})}
                      placeholder="PN-001"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Parça Adı *</Label>
                    <Input
                      id="name"
                      data-testid="part-name-input"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category">Kategori *</Label>
                    <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})} required>
                      <SelectTrigger data-testid="part-category-select">
                        <SelectValue placeholder="Kategori seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="brand">Marka</Label>
                    <Input
                      id="brand"
                      value={formData.brand}
                      onChange={(e) => setFormData({...formData, brand: e.target.value})}
                      placeholder="Cisco, HP, vb."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Açıklama</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Başlangıç Stok</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="0"
                      value={formData.quantity}
                      onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="min_stock">Min. Stok</Label>
                    <Input
                      id="min_stock"
                      type="number"
                      min="0"
                      value={formData.min_stock}
                      onChange={(e) => setFormData({...formData, min_stock: parseInt(e.target.value) || 0})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="unit_price">Birim Fiyat (₺)</Label>
                    <Input
                      id="unit_price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.unit_price}
                      onChange={(e) => setFormData({...formData, unit_price: parseFloat(e.target.value) || 0})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="supplier">Tedarikçi</Label>
                    <Input
                      id="supplier"
                      value={formData.supplier}
                      onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Depo Lokasyonu</Label>
                    <Input
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({...formData, location: e.target.value})}
                      placeholder="Raf A-1"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="has_serial"
                    checked={formData.has_serial}
                    onCheckedChange={(checked) => setFormData({...formData, has_serial: checked})}
                  />
                  <Label htmlFor="has_serial">Seri numarası takibi yap (SFP, PSU vb.)</Label>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button data-testid="submit-part-btn" type="submit">Kaydet</Button>
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>İptal</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Low Stock Alerts */}
      {lowStockAlerts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2 text-orange-600">
              <AlertTriangle className="w-5 h-5" />
              Düşük Stok Uyarıları ({lowStockAlerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStockAlerts.slice(0, 5).map(alert => (
                <Badge 
                  key={alert.part_id} 
                  variant={alert.severity === "critical" ? "error" : "warning"}
                  className="cursor-pointer"
                  onClick={() => {
                    setSearchQuery(alert.part_number);
                    setActiveTab("inventory");
                  }}
                >
                  {alert.part_number}: {alert.available_quantity}/{alert.min_stock}
                </Badge>
              ))}
              {lowStockAlerts.length > 5 && (
                <Badge variant="outline">+{lowStockAlerts.length - 5} daha</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="inventory" data-testid="tab-inventory">
            <Package className="w-4 h-4 mr-2" />
            Envanter ({parts.length})
          </TabsTrigger>
          <TabsTrigger value="movements" data-testid="tab-movements">
            <History className="w-4 h-4 mr-2" />
            Stok Hareketleri
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          {/* Filters */}
          <Card className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  data-testid="search-input"
                  placeholder="Parça no, ad veya marka ara..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48" data-testid="category-filter">
                  <SelectValue placeholder="Kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tüm Kategoriler</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={stockFilter} onValueChange={setStockFilter}>
                <SelectTrigger className="w-40" data-testid="stock-filter">
                  <SelectValue placeholder="Stok Durumu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="available">Stokta</SelectItem>
                  <SelectItem value="low">Düşük Stok</SelectItem>
                  <SelectItem value="out">Stok Yok</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {filteredParts.length === 0 ? (
            <Card className="p-12">
              <div className="text-center">
                <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Parça bulunamadı</p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredParts.map((part) => {
                const available = part.quantity - (part.reserved_quantity || 0);
                return (
                  <Card key={part.id} data-testid={`part-card-${part.id}`} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-xs text-muted-foreground">{part.part_number}</p>
                          <CardTitle className="text-base truncate">{part.name}</CardTitle>
                        </div>
                        {getStockBadge(part)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Tag className="w-4 h-4 text-muted-foreground" />
                        <span>{part.category}</span>
                      </div>
                      
                      {part.brand && (
                        <div className="flex items-center gap-2 text-sm">
                          <Box className="w-4 h-4 text-muted-foreground" />
                          <span>{part.brand}</span>
                        </div>
                      )}
                      
                      {part.has_serial && (
                        <div className="flex items-center gap-2 text-sm text-blue-600">
                          <Barcode className="w-4 h-4" />
                          <span>Seri No Takipli</span>
                        </div>
                      )}

                      <div className="pt-3 border-t border-border">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">Kullanılabilir</span>
                          <span className="text-2xl font-bold" style={{fontFamily: 'Chivo, sans-serif'}}>
                            {available}
                          </span>
                        </div>
                        {part.reserved_quantity > 0 && (
                          <p className="text-xs text-muted-foreground">
                            ({part.quantity} toplam, {part.reserved_quantity} rezerve)
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Min: {part.min_stock} | Fiyat: ₺{part.unit_price.toFixed(2)}
                        </p>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => openStockDialog(part, "in")}
                          data-testid={`stock-in-${part.id}`}
                        >
                          <ArrowDownCircle className="w-4 h-4 mr-1 text-green-600" />
                          Giriş
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => openStockDialog(part, "out")}
                          disabled={available <= 0}
                          data-testid={`stock-out-${part.id}`}
                        >
                          <ArrowUpCircle className="w-4 h-4 mr-1 text-red-600" />
                          Çıkış
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="movements" className="space-y-4">
          {stockMovements.length === 0 ? (
            <Card className="p-12">
              <div className="text-center">
                <History className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Henüz stok hareketi yok</p>
              </div>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {stockMovements.slice(0, 50).map((movement) => (
                    <div key={movement.id} className="p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getMovementTypeBadge(movement.movement_type)}
                            <span className="font-medium">{getPartName(movement.part_id)}</span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Miktar: <span className={movement.movement_type.includes("in") || movement.movement_type === "return_from_field" || movement.movement_type === "adjustment_plus" ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                              {movement.movement_type.includes("in") || movement.movement_type === "return_from_field" || movement.movement_type === "adjustment_plus" ? "+" : "-"}{movement.quantity}
                            </span>
                          </div>
                          {movement.reason && (
                            <p className="text-sm text-muted-foreground mt-1">{movement.reason}</p>
                          )}
                          {movement.serial_numbers?.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Seri No: {movement.serial_numbers.join(", ")}
                            </p>
                          )}
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          {new Date(movement.created_at).toLocaleString('tr-TR')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Stock Movement Dialog */}
      <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {stockMovement.movement_type === "in" ? "Stok Girişi" : "Stok Çıkışı"}
              {selectedPart && ` - ${selectedPart.name}`}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleStockMovement} className="space-y-4">
            <div className="space-y-2">
              <Label>İşlem Tipi</Label>
              <Select 
                value={stockMovement.movement_type} 
                onValueChange={(v) => setStockMovement({...stockMovement, movement_type: v})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">Genel Giriş</SelectItem>
                  <SelectItem value="purchase">Satın Alma</SelectItem>
                  <SelectItem value="return_from_field">Sahadan İade</SelectItem>
                  <SelectItem value="adjustment_plus">Sayım Düzeltme (+)</SelectItem>
                  <SelectItem value="out">Genel Çıkış</SelectItem>
                  <SelectItem value="scrap">Hurda</SelectItem>
                  <SelectItem value="adjustment_minus">Sayım Düzeltme (-)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mov_quantity">Miktar *</Label>
              <Input
                id="mov_quantity"
                type="number"
                min="1"
                value={stockMovement.quantity}
                onChange={(e) => setStockMovement({...stockMovement, quantity: parseInt(e.target.value) || 1})}
                required
              />
            </div>

            {stockMovement.movement_type === "purchase" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="mov_supplier">Tedarikçi</Label>
                  <Input
                    id="mov_supplier"
                    value={stockMovement.supplier}
                    onChange={(e) => setStockMovement({...stockMovement, supplier: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mov_cost">Birim Maliyet</Label>
                    <Input
                      id="mov_cost"
                      type="number"
                      step="0.01"
                      value={stockMovement.unit_cost || ""}
                      onChange={(e) => setStockMovement({...stockMovement, unit_cost: parseFloat(e.target.value) || null})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mov_invoice">Fatura No</Label>
                    <Input
                      id="mov_invoice"
                      value={stockMovement.invoice_number}
                      onChange={(e) => setStockMovement({...stockMovement, invoice_number: e.target.value})}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="mov_reason">Açıklama</Label>
              <Textarea
                id="mov_reason"
                value={stockMovement.reason}
                onChange={(e) => setStockMovement({...stockMovement, reason: e.target.value})}
                rows={2}
                placeholder={stockMovement.movement_type === "scrap" ? "Hurda nedeni..." : "İşlem açıklaması..."}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit">Kaydet</Button>
              <Button type="button" variant="outline" onClick={() => setStockDialogOpen(false)}>İptal</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
