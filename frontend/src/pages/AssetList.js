import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, HardDrive, Pencil, Trash2, Search, AlertTriangle } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const initialFormData = {
  customer_id: "",
  serial_number: "",
  device_type: "",
  brand: "",
  model: "",
  location: "",
  purchase_date: "",
  warranty_end: ""
};

export default function AssetList() {
  const [assets, setAssets] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [formData, setFormData] = useState(initialFormData);
  const [editFormData, setEditFormData] = useState(initialFormData);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [assetsRes, customersRes] = await Promise.all([
        axios.get(`${API}/assets`, { headers }),
        axios.get(`${API}/customers`, { headers })
      ]);
      setAssets(assetsRes.data);
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
      await axios.post(`${API}/assets`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Cihaz başarıyla eklendi");
      setDialogOpen(false);
      setFormData(initialFormData);
      fetchData();
    } catch (error) {
      toast.error("Cihaz eklenirken hata oluştu");
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedAsset) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API}/assets/${selectedAsset.id}`, editFormData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Cihaz başarıyla güncellendi");
      setEditDialogOpen(false);
      setSelectedAsset(null);
      fetchData();
    } catch (error) {
      toast.error("Cihaz güncellenirken hata oluştu");
    }
  };

  const handleDelete = async () => {
    if (!selectedAsset) return;
    
    setDeleting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/assets/${selectedAsset.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Cihaz başarıyla silindi");
      setDeleteDialogOpen(false);
      setSelectedAsset(null);
      fetchData();
    } catch (error) {
      const errorMsg = error.response?.data?.detail || "Cihaz silinirken hata oluştu";
      toast.error(errorMsg);
    } finally {
      setDeleting(false);
    }
  };

  const openEditDialog = (asset) => {
    setSelectedAsset(asset);
    setEditFormData({
      customer_id: asset.customer_id || "",
      serial_number: asset.serial_number || "",
      device_type: asset.device_type || "",
      brand: asset.brand || "",
      model: asset.model || "",
      location: asset.location || "",
      purchase_date: asset.purchase_date || "",
      warranty_end: asset.warranty_end || ""
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (asset) => {
    setSelectedAsset(asset);
    setDeleteDialogOpen(true);
  };

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? `${customer.name} - ${customer.company}` : 'Bilinmeyen';
  };

  const isWarrantyActive = (warrantyEnd) => {
    if (!warrantyEnd) return false;
    return new Date(warrantyEnd) > new Date();
  };

  const filteredAssets = assets.filter(asset => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      asset.serial_number?.toLowerCase().includes(searchLower) ||
      asset.device_type?.toLowerCase().includes(searchLower) ||
      asset.brand?.toLowerCase().includes(searchLower) ||
      asset.model?.toLowerCase().includes(searchLower) ||
      asset.location?.toLowerCase().includes(searchLower) ||
      getCustomerName(asset.customer_id).toLowerCase().includes(searchLower)
    );
  });

  // Stats
  const totalAssets = assets.length;
  const warrantyActive = assets.filter(a => isWarrantyActive(a.warranty_end)).length;
  const warrantyExpired = totalAssets - warrantyActive;

  if (loading) {
    return <div className="flex items-center justify-center h-96">Yükleniyor...</div>;
  }

  const AssetForm = ({ data, setData, onSubmit, submitLabel }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="customer_id">Müşteri *</Label>
        <Select value={data.customer_id} onValueChange={(v) => setData({...data, customer_id: v})} required>
          <SelectTrigger data-testid="asset-customer-select">
            <SelectValue placeholder="Müşteri seçin" />
          </SelectTrigger>
          <SelectContent>
            {customers.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.name} - {c.company}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="serial_number">Seri Numarası *</Label>
          <Input
            id="serial_number"
            data-testid="serial-number-input"
            value={data.serial_number}
            onChange={(e) => setData({...data, serial_number: e.target.value})}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="device_type">Cihaz Tipi *</Label>
          <Select value={data.device_type} onValueChange={(v) => setData({...data, device_type: v})} required>
            <SelectTrigger data-testid="device-type-select">
              <SelectValue placeholder="Tip seçin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Switch">Switch</SelectItem>
              <SelectItem value="Router">Router</SelectItem>
              <SelectItem value="Access Point">Access Point</SelectItem>
              <SelectItem value="Firewall">Firewall</SelectItem>
              <SelectItem value="Server">Server</SelectItem>
              <SelectItem value="UPS">UPS</SelectItem>
              <SelectItem value="Other">Diğer</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="brand">Marka *</Label>
          <Input
            id="brand"
            data-testid="brand-input"
            value={data.brand}
            onChange={(e) => setData({...data, brand: e.target.value})}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="model">Model *</Label>
          <Input
            id="model"
            data-testid="model-input"
            value={data.model}
            onChange={(e) => setData({...data, model: e.target.value})}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="location">Lokasyon</Label>
        <Input
          id="location"
          data-testid="location-input"
          value={data.location}
          onChange={(e) => setData({...data, location: e.target.value})}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="purchase_date">Satın Alma Tarihi</Label>
          <Input
            id="purchase_date"
            data-testid="purchase-date-input"
            type="date"
            value={data.purchase_date}
            onChange={(e) => setData({...data, purchase_date: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="warranty_end">Garanti Bitiş</Label>
          <Input
            id="warranty_end"
            data-testid="warranty-end-input"
            type="date"
            value={data.warranty_end}
            onChange={(e) => setData({...data, warranty_end: e.target.value})}
          />
        </div>
      </div>
      <div className="flex gap-2 pt-4">
        <Button data-testid="submit-asset-btn" type="submit">{submitLabel}</Button>
        <Button type="button" variant="outline" onClick={() => {
          setDialogOpen(false);
          setEditDialogOpen(false);
        }}>İptal</Button>
      </div>
    </form>
  );

  return (
    <div className="space-y-6" data-testid="asset-list-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight" style={{fontFamily: 'Chivo, sans-serif'}}>Cihazlar</h1>
          <p className="text-muted-foreground mt-2">Cihaz envanterini yönetin</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-asset-btn">
              <Plus className="w-5 h-5 mr-2" />
              Yeni Cihaz
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Yeni Cihaz Ekle</DialogTitle>
            </DialogHeader>
            <AssetForm 
              data={formData} 
              setData={setFormData} 
              onSubmit={handleSubmit} 
              submitLabel="Ekle" 
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Toplam Cihaz</p>
                <p className="text-2xl font-bold">{totalAssets}</p>
              </div>
              <HardDrive className="w-8 h-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Garantili</p>
                <p className="text-2xl font-bold text-green-600">{warrantyActive}</p>
              </div>
              <Badge variant="success" className="h-8 w-8 rounded-full flex items-center justify-center p-0">✓</Badge>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Garantisi Biten</p>
                <p className="text-2xl font-bold text-orange-600">{warrantyExpired}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Cihaz ara (seri no, marka, model, müşteri...)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          data-testid="asset-search-input"
        />
      </div>

      {filteredAssets.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <p className="text-muted-foreground">
              {searchTerm ? "Arama sonucu bulunamadı" : "Henüz cihaz yok"}
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAssets.map((asset) => (
            <Card key={asset.id} data-testid={`asset-card-${asset.id}`} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-5 h-5 text-primary" />
                    <CardTitle className="text-xl">{asset.device_type}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    {asset.warranty_end && (
                      <Badge variant={isWarrantyActive(asset.warranty_end) ? "success" : "outline"}>
                        {isWarrantyActive(asset.warranty_end) ? "Garantili" : "Garantisiz"}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Marka/Model</p>
                  <p className="font-medium">{asset.brand} {asset.model}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Seri No</p>
                  <p className="font-mono text-sm">{asset.serial_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Müşteri</p>
                  <p className="text-sm">{getCustomerName(asset.customer_id)}</p>
                </div>
                {asset.location && (
                  <div>
                    <p className="text-sm text-muted-foreground">Lokasyon</p>
                    <p className="text-sm">{asset.location}</p>
                  </div>
                )}
                
                {/* Action Buttons */}
                <div className="flex gap-2 pt-3 border-t mt-3">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => openEditDialog(asset)}
                    data-testid={`edit-asset-${asset.id}`}
                  >
                    <Pencil className="w-4 h-4 mr-1" />
                    Düzenle
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => openDeleteDialog(asset)}
                    data-testid={`delete-asset-${asset.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cihaz Düzenle</DialogTitle>
            <DialogDescription>
              {selectedAsset?.brand} {selectedAsset?.model} - {selectedAsset?.serial_number}
            </DialogDescription>
          </DialogHeader>
          <AssetForm 
            data={editFormData} 
            setData={setEditFormData} 
            onSubmit={handleEditSubmit} 
            submitLabel="Kaydet" 
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Cihaz Sil
            </DialogTitle>
            <DialogDescription>
              Bu işlem geri alınamaz. Aşağıdaki cihazı silmek istediğinizden emin misiniz?
            </DialogDescription>
          </DialogHeader>
          {selectedAsset && (
            <div className="py-4 space-y-2">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-medium">{selectedAsset.brand} {selectedAsset.model}</p>
                <p className="text-sm text-muted-foreground">Seri No: {selectedAsset.serial_number}</p>
                <p className="text-sm text-muted-foreground">Tip: {selectedAsset.device_type}</p>
              </div>
              <p className="text-sm text-amber-600">
                Not: Açık ticketları olan cihazlar silinemez.
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <Button 
              variant="destructive" 
              onClick={handleDelete}
              disabled={deleting}
              data-testid="confirm-delete-asset"
            >
              {deleting ? "Siliniyor..." : "Evet, Sil"}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
            >
              İptal
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
