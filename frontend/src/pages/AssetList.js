import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, HardDrive } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function AssetList() {
  const [assets, setAssets] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    customer_id: "",
    serial_number: "",
    device_type: "",
    brand: "",
    model: "",
    location: "",
    purchase_date: "",
    warranty_end: ""
  });

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
      setFormData({
        customer_id: "",
        serial_number: "",
        device_type: "",
        brand: "",
        model: "",
        location: "",
        purchase_date: "",
        warranty_end: ""
      });
      fetchData();
    } catch (error) {
      toast.error("Cihaz eklenirken hata oluştu");
    }
  };

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? `${customer.name} - ${customer.company}` : 'Bilinmeyen';
  };

  const isWarrantyActive = (warrantyEnd) => {
    if (!warrantyEnd) return false;
    return new Date(warrantyEnd) > new Date();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Yükleniyor...</div>;
  }

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
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer_id">Müşteri *</Label>
                <Select value={formData.customer_id} onValueChange={(v) => setFormData({...formData, customer_id: v})} required>
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
                    value={formData.serial_number}
                    onChange={(e) => setFormData({...formData, serial_number: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="device_type">Cihaz Tipi *</Label>
                  <Select value={formData.device_type} onValueChange={(v) => setFormData({...formData, device_type: v})} required>
                    <SelectTrigger data-testid="device-type-select">
                      <SelectValue placeholder="Tip seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Switch">Switch</SelectItem>
                      <SelectItem value="Router">Router</SelectItem>
                      <SelectItem value="Access Point">Access Point</SelectItem>
                      <SelectItem value="Firewall">Firewall</SelectItem>
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
                    value={formData.brand}
                    onChange={(e) => setFormData({...formData, brand: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="model">Model *</Label>
                  <Input
                    id="model"
                    data-testid="model-input"
                    value={formData.model}
                    onChange={(e) => setFormData({...formData, model: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Lokasyon</Label>
                <Input
                  id="location"
                  data-testid="location-input"
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchase_date">Satın Alma Tarihi</Label>
                  <Input
                    id="purchase_date"
                    data-testid="purchase-date-input"
                    type="date"
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({...formData, purchase_date: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="warranty_end">Garanti Bitiş</Label>
                  <Input
                    id="warranty_end"
                    data-testid="warranty-end-input"
                    type="date"
                    value={formData.warranty_end}
                    onChange={(e) => setFormData({...formData, warranty_end: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button data-testid="submit-asset-btn" type="submit">Ekle</Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {assets.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <p className="text-muted-foreground">Henüz cihaz yok</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assets.map((asset) => (
            <Card key={asset.id} data-testid={`asset-card-${asset.id}`} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-5 h-5 text-primary" />
                    <CardTitle className="text-xl">{asset.device_type}</CardTitle>
                  </div>
                  {asset.warranty_end && (
                    <Badge variant={isWarrantyActive(asset.warranty_end) ? "success" : "outline"}>
                      {isWarrantyActive(asset.warranty_end) ? "Garantili" : "Garantisiz"}
                    </Badge>
                  )}
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}