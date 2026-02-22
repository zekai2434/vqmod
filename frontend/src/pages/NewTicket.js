import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import axios from "axios";
import { ArrowLeft } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

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
                <Select value={formData.customer_id} onValueChange={handleCustomerChange} required>
                  <SelectTrigger data-testid="customer-select">
                    <SelectValue placeholder="Müşteri seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name} - {c.company}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
    </div>
  );
}