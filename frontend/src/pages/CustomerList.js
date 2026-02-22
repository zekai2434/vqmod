import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Mail, Phone } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function CustomerList() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    address: "",
    tax_number: "",
    tax_office: "",
    contract_type: "standard",
    sla_level: "standard",
    tags: [],
    notes: ""
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/customers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomers(response.data);
    } catch (error) {
      toast.error("Müşteriler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/customers`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Müşteri başarıyla eklendi");
      setDialogOpen(false);
      setFormData({
        name: "",
        company: "",
        email: "",
        phone: "",
        address: "",
        tax_number: "",
        tax_office: "",
        contract_type: "standard",
        sla_level: "standard",
        tags: [],
        notes: ""
      });
      fetchCustomers();
    } catch (error) {
      toast.error("Müşteri eklenirken hata oluştu");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6" data-testid="customer-list-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight" style={{fontFamily: 'Chivo, sans-serif'}}>Müşteriler</h1>
          <p className="text-muted-foreground mt-2">Müşteri bilgilerini yönetin</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-customer-btn">
              <Plus className="w-5 h-5 mr-2" />
              Yeni Müşteri
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Yeni Müşteri Ekle</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Ad Soyad *</Label>
                  <Input
                    id="name"
                    data-testid="customer-name-input"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company">Şirket/Firma *</Label>
                  <Input
                    id="company"
                    data-testid="customer-company-input"
                    value={formData.company}
                    onChange={(e) => setFormData({...formData, company: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-posta *</Label>
                  <Input
                    id="email"
                    data-testid="customer-email-input"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon *</Label>
                  <Input
                    id="phone"
                    data-testid="customer-phone-input"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Adres</Label>
                <Input
                  id="address"
                  data-testid="customer-address-input"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tax_number">Vergi Numarası</Label>
                  <Input
                    id="tax_number"
                    data-testid="customer-tax-number-input"
                    value={formData.tax_number}
                    onChange={(e) => setFormData({...formData, tax_number: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax_office">Vergi Dairesi</Label>
                  <Input
                    id="tax_office"
                    data-testid="customer-tax-office-input"
                    value={formData.tax_office}
                    onChange={(e) => setFormData({...formData, tax_office: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contract_type">Sözleşme Tipi</Label>
                  <Select value={formData.contract_type} onValueChange={(v) => setFormData({...formData, contract_type: v})}>
                    <SelectTrigger data-testid="contract-type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standart</SelectItem>
                      <SelectItem value="premium">Premium</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sla_level">SLA Seviyesi</Label>
                  <Select value={formData.sla_level} onValueChange={(v) => setFormData({...formData, sla_level: v})}>
                    <SelectTrigger data-testid="sla-level-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standart</SelectItem>
                      <SelectItem value="gold">Gold</SelectItem>
                      <SelectItem value="platinum">Platinum</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notlar</Label>
                <Input
                  id="notes"
                  data-testid="customer-notes-input"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Müşteri hakkında notlar..."
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button data-testid="submit-customer-btn" type="submit">Ekle</Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {customers.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <p className="text-muted-foreground">Henüz müşteri yok</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {customers.map((customer) => (
            <Card 
              key={customer.id} 
              data-testid={`customer-card-${customer.id}`} 
              className="hover:shadow-lg transition-all cursor-pointer border-l-4 overflow-hidden"
              style={{borderLeftColor: customer.sla_level === 'platinum' ? '#8B5CF6' : customer.sla_level === 'gold' ? '#F59E0B' : '#3B82F6'}}
              onClick={() => navigate(`/customers/${customer.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl mb-1">{customer.name}</CardTitle>
                    {customer.company && (
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <Building2 className="w-3 h-3" />
                        {customer.company}
                      </p>
                    )}
                  </div>
                  <Badge 
                    variant={customer.sla_level === 'platinum' ? 'secondary' : customer.sla_level === 'gold' ? 'warning' : 'info'}
                  >
                    {customer.sla_level}
                  </Badge>
                </div>
                {customer.tags && customer.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap mt-2">
                    {customer.tags.map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                )}
              </CardHeader>
              <CardContent className="space-y-2 pt-3 border-t">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground truncate">{customer.email}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-muted-foreground">{customer.phone}</span>
                </div>
                {customer.address && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <span className="text-muted-foreground line-clamp-2">{customer.address}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-border text-xs flex items-center justify-between">
                  <span className="text-muted-foreground">Sözleşme:</span>
                  <span className="font-medium capitalize">{customer.contract_type}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}