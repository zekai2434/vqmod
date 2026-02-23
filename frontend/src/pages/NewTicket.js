import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import axios from "axios";
import { ArrowLeft, Plus, UserPlus, HardDrive } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const initialCustomerForm = {
  name: "",
  company: "",
  email: "",
  phone: "",
  address: "",
  tax_number: "",
  tax_office: ""
};

const initialAssetForm = {
  serial_number: "",
  device_type: "",
  brand: "",
  model: "",
  location: "",
  purchase_date: "",
  warranty_end: ""
};

export default function NewTicket() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [assets, setAssets] = useState([]);
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    customer_id: "",
    asset_id: "",
    title: "",
    description: "",
    category: "",
    priority: "",
    assigned_to: ""
  });
  
  // New customer dialog state
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState(initialCustomerForm);
  const [savingCustomer, setSavingCustomer] = useState(false);
  
  // New asset dialog state
  const [assetDialogOpen, setAssetDialogOpen] = useState(false);
  const [assetForm, setAssetForm] = useState(initialAssetForm);
  const [savingAsset, setSavingAsset] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [customersRes, usersRes] = await Promise.all([
        axios.get(`${API}/customers`, { headers }),
        axios.get(`${API}/users`, { headers })
      ]);
      
      setCustomers(customersRes.data);
      setUsers(usersRes.data);
    } catch (error) {
      toast.error("Veri yüklenirken hata oluştu");
    }
  };

  const fetchAssets = async (customerId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/assets?customer_id=${customerId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAssets(response.data);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCustomerChange = (customerId) => {
    setFormData({ ...formData, customer_id: customerId, asset_id: "" });
    fetchAssets(customerId);
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
      setFormData(prev => ({ ...prev, customer_id: newCustomer.id, asset_id: "" }));
      setAssets([]); // New customer has no assets
      
      toast.success("Müşteri başarıyla eklendi ve seçildi");
      setCustomerDialogOpen(false);
      setCustomerForm(initialCustomerForm);
    } catch (error) {
      const msg = error.response?.data?.detail || "Müşteri eklenirken hata oluştu";
      toast.error(msg);
    } finally {
      setSavingCustomer(false);
    }
  };

  const handleAddAsset = async () => {
    if (!assetForm.serial_number || !assetForm.device_type || !assetForm.brand || !assetForm.model) {
      toast.error("Seri no, cihaz tipi, marka ve model zorunludur");
      return;
    }

    setSavingAsset(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API}/assets`, {
        ...assetForm,
        customer_id: formData.customer_id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const newAsset = response.data;
      
      // Add to assets list and select it
      setAssets(prev => [...prev, newAsset]);
      setFormData(prev => ({ ...prev, asset_id: newAsset.id }));
      
      toast.success("Cihaz başarıyla eklendi ve seçildi");
      setAssetDialogOpen(false);
      setAssetForm(initialAssetForm);
    } catch (error) {
      const msg = error.response?.data?.detail || "Cihaz eklenirken hata oluştu";
      toast.error(msg);
    } finally {
      setSavingAsset(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/tickets`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      toast.success("Ticket başarıyla oluşturuldu!");
      navigate('/tickets');
    } catch (error) {
      toast.error(error.response?.data?.detail || "Ticket oluşturulurken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl" data-testid="new-ticket-page">
      <Button
        data-testid="back-btn"
        variant="ghost"
        onClick={() => navigate('/tickets')}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Geri
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-3xl" style={{fontFamily: 'Chivo, sans-serif'}}>Yeni Ticket Oluştur</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="customer_id">Müşteri *</Label>
                <div className="flex gap-2">
                  <Select value={formData.customer_id} onValueChange={handleCustomerChange} required>
                    <SelectTrigger data-testid="customer-select" className="flex-1">
                      <SelectValue placeholder="Müşteri seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {customers.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name} - {c.company}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setCustomerDialogOpen(true)}
                    title="Yeni Müşteri Ekle"
                    data-testid="add-customer-btn"
                  >
                    <UserPlus className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="asset_id">Cihaz</Label>
                <Select value={formData.asset_id} onValueChange={(v) => setFormData({...formData, asset_id: v})} disabled={!formData.customer_id}>
                  <SelectTrigger data-testid="asset-select">
                    <SelectValue placeholder="Cihaz seçin (opsiyonel)" />
                  </SelectTrigger>
                  <SelectContent>
                    {assets.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.device_type} - {a.serial_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Başlık *</Label>
              <Input
                id="title"
                data-testid="title-input"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Açıklama *</Label>
              <Textarea
                id="description"
                data-testid="description-input"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="category">Kategori *</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})} required>
                  <SelectTrigger data-testid="category-select">
                    <SelectValue placeholder="Kategori seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hardware">Donanım</SelectItem>
                    <SelectItem value="software">Yazılım</SelectItem>
                    <SelectItem value="network">Ağ Sorunu</SelectItem>
                    <SelectItem value="configuration">Yapılandırma</SelectItem>
                    <SelectItem value="other">Diğer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Öncelik *</Label>
                <Select value={formData.priority} onValueChange={(v) => setFormData({...formData, priority: v})} required>
                  <SelectTrigger data-testid="priority-select">
                    <SelectValue placeholder="Öncelik seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Kritik</SelectItem>
                    <SelectItem value="high">Yüksek</SelectItem>
                    <SelectItem value="medium">Orta</SelectItem>
                    <SelectItem value="low">Düşük</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="assigned_to">Atanan Teknisyen</Label>
                <Select value={formData.assigned_to} onValueChange={(v) => setFormData({...formData, assigned_to: v})}>
                  <SelectTrigger data-testid="technician-select">
                    <SelectValue placeholder="Teknisyen seçin (opsiyonel)" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.filter(u => u.role === 'technician' || u.role === 'admin').map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-4">
              <Button data-testid="submit-ticket-btn" type="submit" disabled={loading}>
                {loading ? "Oluşturuluyor..." : "Ticket Oluştur"}
              </Button>
              <Button
                data-testid="cancel-btn"
                type="button"
                variant="outline"
                onClick={() => navigate('/tickets')}
              >
                İptal
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

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
                  data-testid="new-customer-name"
                />
              </div>
              <div className="space-y-2">
                <Label>Firma</Label>
                <Input
                  value={customerForm.company}
                  onChange={(e) => setCustomerForm({...customerForm, company: e.target.value})}
                  placeholder="ABC Teknoloji"
                  data-testid="new-customer-company"
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
                  data-testid="new-customer-email"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm({...customerForm, phone: e.target.value})}
                  placeholder="0532 123 4567"
                  data-testid="new-customer-phone"
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
                data-testid="new-customer-address"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vergi No</Label>
                <Input
                  value={customerForm.tax_number}
                  onChange={(e) => setCustomerForm({...customerForm, tax_number: e.target.value})}
                  placeholder="1234567890"
                  data-testid="new-customer-tax-number"
                />
              </div>
              <div className="space-y-2">
                <Label>Vergi Dairesi</Label>
                <Input
                  value={customerForm.tax_office}
                  onChange={(e) => setCustomerForm({...customerForm, tax_office: e.target.value})}
                  placeholder="Kadıköy VD"
                  data-testid="new-customer-tax-office"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button 
                onClick={handleAddCustomer} 
                disabled={savingCustomer}
                data-testid="save-new-customer-btn"
              >
                {savingCustomer ? "Ekleniyor..." : "Müşteri Ekle"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setCustomerDialogOpen(false);
                  setCustomerForm(initialCustomerForm);
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
