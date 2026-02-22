import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, User, MapPin, Phone, Mail, Building2, FileText, Upload, Paperclip } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [locations, setLocations] = useState([]);
  const [assets, setAssets] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  
  const [contactForm, setContactForm] = useState({
    name: "",
    title: "",
    email: "",
    phone: "",
    is_primary: false
  });
  
  const [locationForm, setLocationForm] = useState({
    name: "",
    address: "",
    city: ""
  });

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [customerRes, contactsRes, locationsRes, assetsRes, ticketsRes] = await Promise.all([
        axios.get(`${API}/customers/${id}`, { headers }),
        axios.get(`${API}/contacts?customer_id=${id}`, { headers }),
        axios.get(`${API}/locations?customer_id=${id}`, { headers }),
        axios.get(`${API}/assets?customer_id=${id}`, { headers }),
        axios.get(`${API}/tickets`, { headers })
      ]);
      
      setCustomer(customerRes.data);
      setContacts(contactsRes.data);
      setLocations(locationsRes.data);
      setAssets(assetsRes.data);
      setTickets(ticketsRes.data.filter(t => t.customer_id === id));
    } catch (error) {
      toast.error("Veri yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/contacts`, { ...contactForm, customer_id: id }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("İrtibat kişisi eklendi");
      setContactDialogOpen(false);
      setContactForm({ name: "", title: "", email: "", phone: "", is_primary: false });
      fetchData();
    } catch (error) {
      toast.error("İrtibat eklenirken hata oluştu");
    }
  };

  const handleAddLocation = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/locations`, { ...locationForm, customer_id: id }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Lokasyon eklendi");
      setLocationDialogOpen(false);
      setLocationForm({ name: "", address: "", city: "" });
      fetchData();
    } catch (error) {
      toast.error("Lokasyon eklenirken hata oluştu");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Yükleniyor...</div>;
  }

  if (!customer) {
    return <div className="flex items-center justify-center h-96">Müşteri bulunamadı</div>;
  }

  return (
    <div className="max-w-7xl" data-testid="customer-detail-page">
      <Button
        variant="ghost"
        onClick={() => navigate('/customers')}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Müşterilere Dön
      </Button>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-3xl mb-2" style={{fontFamily: 'Chivo, sans-serif'}}>{customer.name}</CardTitle>
                {customer.company && <p className="text-xl text-muted-foreground">{customer.company}</p>}
                <div className="flex gap-2 mt-3">
                  {customer.tags && customer.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary">{tag}</Badge>
                  ))}
                </div>
              </div>
              <Badge variant="info">{customer.sla_level}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span>{customer.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <span>{customer.phone}</span>
              </div>
              {customer.tax_number && (
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                  <span>VKN: {customer.tax_number}</span>
                </div>
              )}
              {customer.tax_office && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Vergi Dairesi: {customer.tax_office}</span>
                </div>
              )}
            </div>
            {customer.notes && (
              <div className="pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground mb-1">Notlar</p>
                <p className="text-sm">{customer.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Tabs defaultValue="contacts" className="w-full">
          <TabsList>
            <TabsTrigger value="contacts">İrtibat Kişileri ({contacts.length})</TabsTrigger>
            <TabsTrigger value="locations">Lokasyonlar ({locations.length})</TabsTrigger>
            <TabsTrigger value="assets">Cihazlar ({assets.length})</TabsTrigger>
            <TabsTrigger value="tickets">Ticketlar ({tickets.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="contacts" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="add-contact-btn">
                    <Plus className="w-4 h-4 mr-2" />
                    İrtibat Ekle
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Yeni İrtibat Kişisi</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddContact} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Ad Soyad *</Label>
                      <Input value={contactForm.name} onChange={(e) => setContactForm({...contactForm, name: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Ünvan</Label>
                      <Input value={contactForm.title} onChange={(e) => setContactForm({...contactForm, title: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>E-posta</Label>
                        <Input type="email" value={contactForm.email} onChange={(e) => setContactForm({...contactForm, email: e.target.value})} />
                      </div>
                      <div className="space-y-2">
                        <Label>Telefon</Label>
                        <Input value={contactForm.phone} onChange={(e) => setContactForm({...contactForm, phone: e.target.value})} />
                      </div>
                    </div>
                    <Button type="submit">Ekle</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            
            {contacts.length === 0 ? (
              <Card className="p-8"><p className="text-center text-muted-foreground">İrtibat kişisi yok</p></Card>
            ) : (
              <div className="grid gap-4">
                {contacts.map((contact) => (
                  <Card key={contact.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">{contact.name}</p>
                            {contact.title && <p className="text-sm text-muted-foreground">{contact.title}</p>}
                            <div className="flex gap-4 mt-1 text-sm">
                              {contact.email && <span>{contact.email}</span>}
                              {contact.phone && <span>{contact.phone}</span>}
                            </div>
                          </div>
                        </div>
                        {contact.is_primary && <Badge>Birincil</Badge>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="locations" className="space-y-4 mt-4">
            <div className="flex justify-end">
              <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="add-location-btn">
                    <Plus className="w-4 h-4 mr-2" />
                    Lokasyon Ekle
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Yeni Lokasyon</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleAddLocation} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Lokasyon Adı *</Label>
                      <Input value={locationForm.name} onChange={(e) => setLocationForm({...locationForm, name: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Adres *</Label>
                      <Input value={locationForm.address} onChange={(e) => setLocationForm({...locationForm, address: e.target.value})} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Şehir</Label>
                      <Input value={locationForm.city} onChange={(e) => setLocationForm({...locationForm, city: e.target.value})} />
                    </div>
                    <Button type="submit">Ekle</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
            
            {locations.length === 0 ? (
              <Card className="p-8"><p className="text-center text-muted-foreground">Lokasyon yok</p></Card>
            ) : (
              <div className="grid gap-4">
                {locations.map((location) => (
                  <Card key={location.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <MapPin className="w-5 h-5 text-primary mt-1" />
                        <div>
                          <p className="font-semibold">{location.name}</p>
                          <p className="text-sm text-muted-foreground">{location.address}</p>
                          {location.city && <p className="text-sm text-muted-foreground">{location.city}</p>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="assets" className="mt-4">
            {assets.length === 0 ? (
              <Card className="p-8"><p className="text-center text-muted-foreground">Cihaz yok</p></Card>
            ) : (
              <div className="grid gap-4">
                {assets.map((asset) => (
                  <Card key={asset.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold">{asset.device_type} - {asset.brand} {asset.model}</p>
                          <p className="text-sm text-muted-foreground font-mono">{asset.serial_number}</p>
                          {asset.location && <p className="text-sm text-muted-foreground mt-1">{asset.location}</p>}
                        </div>
                        <Badge variant={asset.status === 'active' ? 'success' : 'outline'}>{asset.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="tickets" className="mt-4">
            {tickets.length === 0 ? (
              <Card className="p-8"><p className="text-center text-muted-foreground">Ticket yok</p></Card>
            ) : (
              <div className="grid gap-3">
                {tickets.map((ticket) => (
                  <Card key={ticket.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/tickets/${ticket.id}`)}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-mono text-sm font-semibold">{ticket.ticket_number}</p>
                          <p className="font-medium">{ticket.title}</p>
                          <p className="text-sm text-muted-foreground">{new Date(ticket.created_at).toLocaleDateString('tr-TR')}</p>
                        </div>
                        <Badge>{ticket.status}</Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}