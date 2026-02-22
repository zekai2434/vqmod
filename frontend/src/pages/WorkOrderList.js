import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Wrench, Calendar, User } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function WorkOrderList() {
  const [workOrders, setWorkOrders] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    ticket_id: "",
    assigned_technician: "",
    scheduled_date: "",
    notes: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [workOrdersRes, ticketsRes, usersRes] = await Promise.all([
        axios.get(`${API}/work-orders`, { headers }),
        axios.get(`${API}/tickets`, { headers }),
        axios.get(`${API}/users`, { headers })
      ]);
      setWorkOrders(workOrdersRes.data);
      setTickets(ticketsRes.data);
      setUsers(usersRes.data);
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
      await axios.post(`${API}/work-orders`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("İş emri başarıyla oluşturuldu");
      setDialogOpen(false);
      setFormData({ ticket_id: "", assigned_technician: "", scheduled_date: "", notes: "" });
      fetchData();
    } catch (error) {
      toast.error("İş emri oluşturulurken hata oluştu");
    }
  };

  const getTicketInfo = (ticketId) => {
    const ticket = tickets.find(t => t.id === ticketId);
    return ticket ? `${ticket.ticket_number} - ${ticket.title}` : 'Bilinmeyen';
  };

  const getTechnicianName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? user.full_name : 'Bilinmeyen';
  };

  const getStatusBadge = (status) => {
    const variants = {
      scheduled: { variant: "info", label: "Planlandı" },
      in_progress: { variant: "warning", label: "Devam Ediyor" },
      completed: { variant: "success", label: "Tamamlandı" },
      cancelled: { variant: "outline", label: "İptal Edildi" }
    };
    const config = variants[status] || variants.scheduled;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6" data-testid="work-order-list-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight" style={{fontFamily: 'Chivo, sans-serif'}}>İş Emirleri</h1>
          <p className="text-muted-foreground mt-2">Saha servis operasyonlarını yönetin</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-work-order-btn">
              <Plus className="w-5 h-5 mr-2" />
              Yeni İş Emri
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Yeni İş Emri Oluştur</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ticket_id">Ticket *</Label>
                <Select value={formData.ticket_id} onValueChange={(v) => setFormData({...formData, ticket_id: v})} required>
                  <SelectTrigger data-testid="wo-ticket-select">
                    <SelectValue placeholder="Ticket seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {tickets.filter(t => t.status !== 'closed').map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.ticket_number} - {t.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="assigned_technician">Teknisyen *</Label>
                <Select value={formData.assigned_technician} onValueChange={(v) => setFormData({...formData, assigned_technician: v})} required>
                  <SelectTrigger data-testid="wo-technician-select">
                    <SelectValue placeholder="Teknisyen seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.filter(u => u.role === 'technician' || u.role === 'admin').map(u => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="scheduled_date">Planlanan Tarih</Label>
                <Input
                  id="scheduled_date"
                  data-testid="wo-date-input"
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) => setFormData({...formData, scheduled_date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notlar</Label>
                <Textarea
                  id="notes"
                  data-testid="wo-notes-input"
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={3}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button data-testid="submit-wo-btn" type="submit">Oluştur</Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {workOrders.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <p className="text-muted-foreground">Henüz iş emri yok</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {workOrders.map((wo) => (
            <Card key={wo.id} data-testid={`work-order-card-${wo.id}`} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-3">
                      <Wrench className="w-5 h-5 text-primary" />
                      {getStatusBadge(wo.status)}
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Ticket</p>
                      <p className="font-medium">{getTicketInfo(wo.ticket_id)}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm text-muted-foreground">Teknisyen</p>
                          <p className="text-sm font-medium">{getTechnicianName(wo.assigned_technician)}</p>
                        </div>
                      </div>
                      {wo.scheduled_date && (
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Planlanan Tarih</p>
                            <p className="text-sm font-medium">{new Date(wo.scheduled_date).toLocaleDateString('tr-TR')}</p>
                          </div>
                        </div>
                      )}
                    </div>
                    {wo.notes && (
                      <div>
                        <p className="text-sm text-muted-foreground">Notlar</p>
                        <p className="text-sm">{wo.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}