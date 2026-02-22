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
import { Calendar } from "@/components/ui/calendar";
import { Plus, Wrench, Calendar as CalendarIcon, User, List, Grid3X3, MapPin, Monitor, Building2, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { tr } from "date-fns/locale";
import { format, startOfMonth, endOfMonth, isSameDay, addMonths, subMonths } from "date-fns";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DEFAULT_CHECKLIST = [
  { id: crypto.randomUUID(), task: "Müşteri ile randevu onayı", completed: false },
  { id: crypto.randomUUID(), task: "Cihaz fiziksel kontrolü", completed: false },
  { id: crypto.randomUUID(), task: "Arıza tespiti ve analiz", completed: false },
  { id: crypto.randomUUID(), task: "Onarım/değişim işlemi", completed: false },
  { id: crypto.randomUUID(), task: "Fonksiyon testleri", completed: false },
  { id: crypto.randomUUID(), task: "Müşteri eğitimi ve bilgilendirme", completed: false },
  { id: crypto.randomUUID(), task: "Servis formunun doldurulması", completed: false }
];

export default function WorkOrderList() {
  const navigate = useNavigate();
  const [workOrders, setWorkOrders] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState("list");
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTechnician, setFilterTechnician] = useState("all");
  const [formData, setFormData] = useState({
    ticket_id: "",
    assigned_technician: "",
    work_type: "onsite",
    scheduled_date: "",
    scheduled_time: "",
    notes: "",
    checklist: DEFAULT_CHECKLIST
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [workOrdersRes, ticketsRes, usersRes, customersRes] = await Promise.all([
        axios.get(`${API}/work-orders`, { headers }),
        axios.get(`${API}/tickets`, { headers }),
        axios.get(`${API}/users`, { headers }),
        axios.get(`${API}/customers`, { headers })
      ]);
      setWorkOrders(workOrdersRes.data);
      setTickets(ticketsRes.data);
      setUsers(usersRes.data);
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
      const scheduledDateTime = formData.scheduled_date + (formData.scheduled_time ? `T${formData.scheduled_time}` : '');
      
      await axios.post(`${API}/work-orders`, {
        ticket_id: formData.ticket_id,
        assigned_technician: formData.assigned_technician,
        work_type: formData.work_type,
        scheduled_date: scheduledDateTime || null,
        notes: formData.notes,
        checklist: formData.checklist
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("İş emri başarıyla oluşturuldu");
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error("İş emri oluşturulurken hata oluştu");
    }
  };

  const resetForm = () => {
    setFormData({
      ticket_id: "",
      assigned_technician: "",
      work_type: "onsite",
      scheduled_date: "",
      scheduled_time: "",
      notes: "",
      checklist: DEFAULT_CHECKLIST.map(item => ({ ...item, id: crypto.randomUUID() }))
    });
  };

  const getTicketInfo = (ticketId) => {
    const ticket = tickets.find(t => t.id === ticketId);
    return ticket ? { number: ticket.ticket_number, title: ticket.title, customerId: ticket.customer_id } : null;
  };

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.name : 'Bilinmeyen';
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

  const getWorkTypeBadge = (type) => {
    const config = {
      onsite: { icon: MapPin, label: "Yerinde", color: "bg-blue-100 text-blue-700" },
      remote: { icon: Monitor, label: "Uzaktan", color: "bg-purple-100 text-purple-700" },
      workshop: { icon: Building2, label: "Atölye", color: "bg-orange-100 text-orange-700" }
    };
    const { icon: Icon, label, color } = config[type] || config.onsite;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
        <Icon className="w-3 h-3" />
        {label}
      </span>
    );
  };

  const filteredWorkOrders = workOrders.filter(wo => {
    if (filterStatus !== "all" && wo.status !== filterStatus) return false;
    if (filterTechnician !== "all" && wo.assigned_technician !== filterTechnician) return false;
    return true;
  });

  const getWorkOrdersForDate = (date) => {
    return filteredWorkOrders.filter(wo => {
      if (!wo.scheduled_date) return false;
      return isSameDay(new Date(wo.scheduled_date), date);
    });
  };

  const getDaysWithWorkOrders = () => {
    const start = startOfMonth(selectedMonth);
    const end = endOfMonth(selectedMonth);
    const days = [];
    
    filteredWorkOrders.forEach(wo => {
      if (wo.scheduled_date) {
        const woDate = new Date(wo.scheduled_date);
        if (woDate >= start && woDate <= end) {
          days.push(woDate);
        }
      }
    });
    
    return days;
  };

  const technicians = users.filter(u => u.role === 'technician' || u.role === 'admin');

  if (loading) {
    return <div className="flex items-center justify-center h-96">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6" data-testid="work-order-list-container">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight" style={{fontFamily: 'Chivo, sans-serif'}}>İş Emirleri</h1>
          <p className="text-muted-foreground mt-2">Saha servis operasyonlarını yönetin</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center border rounded-lg p-1">
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              data-testid="view-list-btn"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === "calendar" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("calendar")}
              data-testid="view-calendar-btn"
            >
              <CalendarIcon className="w-4 h-4" />
            </Button>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-work-order-btn">
                <Plus className="w-5 h-5 mr-2" />
                Yeni İş Emri
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                      {tickets.filter(t => t.status !== 'closed' && t.status !== 'resolved').map(t => (
                        <SelectItem key={t.id} value={t.id}>
                          <span className="font-mono">{t.ticket_number}</span> - {t.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>İş Tipi *</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { value: "onsite", icon: MapPin, label: "Yerinde Servis", desc: "Müşteri lokasyonunda" },
                      { value: "remote", icon: Monitor, label: "Uzaktan Destek", desc: "Uzaktan bağlantı ile" },
                      { value: "workshop", icon: Building2, label: "Atölye", desc: "Cihaz teslim alınacak" }
                    ].map(({ value, icon: Icon, label, desc }) => (
                      <div
                        key={value}
                        onClick={() => setFormData({...formData, work_type: value})}
                        className={`p-4 border rounded-lg cursor-pointer transition-all ${
                          formData.work_type === value 
                            ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                            : 'hover:border-primary/50'
                        }`}
                        data-testid={`work-type-${value}`}
                      >
                        <Icon className={`w-6 h-6 mb-2 ${formData.work_type === value ? 'text-primary' : 'text-muted-foreground'}`} />
                        <p className="font-medium text-sm">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="assigned_technician">Teknisyen/Ekip *</Label>
                  <Select value={formData.assigned_technician} onValueChange={(v) => setFormData({...formData, assigned_technician: v})} required>
                    <SelectTrigger data-testid="wo-technician-select">
                      <SelectValue placeholder="Teknisyen seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {technicians.map(u => (
                        <SelectItem key={u.id} value={u.id}>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            {u.full_name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="scheduled_date">Randevu Tarihi</Label>
                    <Input
                      id="scheduled_date"
                      data-testid="wo-date-input"
                      type="date"
                      value={formData.scheduled_date}
                      onChange={(e) => setFormData({...formData, scheduled_date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="scheduled_time">Randevu Saati</Label>
                    <Input
                      id="scheduled_time"
                      data-testid="wo-time-input"
                      type="time"
                      value={formData.scheduled_time}
                      onChange={(e) => setFormData({...formData, scheduled_time: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notlar</Label>
                  <Textarea
                    id="notes"
                    data-testid="wo-notes-input"
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    rows={3}
                    placeholder="Özel talimatlar, gerekli ekipman vb."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Servis Prosedürü (Checklist)</Label>
                  <div className="border rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                    {formData.checklist.map((item, index) => (
                      <div key={item.id} className="flex items-center gap-2 text-sm">
                        <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium">
                          {index + 1}
                        </span>
                        <span>{item.task}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Checklist iş emri detay sayfasında düzenlenebilir</p>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button data-testid="submit-wo-btn" type="submit">Oluştur</Button>
                  <Button type="button" variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>İptal</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Label className="text-sm whitespace-nowrap">Durum:</Label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-40" data-testid="filter-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              <SelectItem value="scheduled">Planlandı</SelectItem>
              <SelectItem value="in_progress">Devam Ediyor</SelectItem>
              <SelectItem value="completed">Tamamlandı</SelectItem>
              <SelectItem value="cancelled">İptal Edildi</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-sm whitespace-nowrap">Teknisyen:</Label>
          <Select value={filterTechnician} onValueChange={setFilterTechnician}>
            <SelectTrigger className="w-48" data-testid="filter-technician">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tümü</SelectItem>
              {technicians.map(u => (
                <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground ml-auto">
          {filteredWorkOrders.length} iş emri
        </div>
      </div>

      {viewMode === "calendar" ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Takvim Görünümü</CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="font-medium min-w-[140px] text-center">
                    {format(selectedMonth, 'MMMM yyyy', { locale: tr })}
                  </span>
                  <Button variant="outline" size="icon" onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                month={selectedMonth}
                onMonthChange={setSelectedMonth}
                locale={tr}
                className="rounded-md border w-full"
                modifiers={{
                  hasWorkOrder: getDaysWithWorkOrders()
                }}
                modifiersStyles={{
                  hasWorkOrder: { 
                    backgroundColor: 'hsl(var(--primary) / 0.1)',
                    fontWeight: 'bold',
                    borderRadius: '50%'
                  }
                }}
              />
              <div className="flex items-center gap-4 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-primary/10 border border-primary/30" />
                  <span className="text-muted-foreground">İş emri var</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">
                {selectedDate 
                  ? format(selectedDate, 'd MMMM yyyy', { locale: tr })
                  : 'Tarih Seçin'
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDate ? (
                getWorkOrdersForDate(selectedDate).length > 0 ? (
                  <div className="space-y-3">
                    {getWorkOrdersForDate(selectedDate).map(wo => {
                      const ticketInfo = getTicketInfo(wo.ticket_id);
                      return (
                        <div
                          key={wo.id}
                          className="p-3 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => navigate(`/work-orders/${wo.id}`)}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            {getStatusBadge(wo.status)}
                            {getWorkTypeBadge(wo.work_type)}
                          </div>
                          {ticketInfo && (
                            <>
                              <p className="font-medium text-sm">{ticketInfo.title}</p>
                              <p className="text-xs text-muted-foreground">{ticketInfo.number}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Müşteri: {getCustomerName(ticketInfo.customerId)}
                              </p>
                            </>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Teknisyen: {getTechnicianName(wo.assigned_technician)}
                          </p>
                          {wo.scheduled_date && wo.scheduled_date.includes('T') && (
                            <p className="text-xs font-medium mt-2">
                              Saat: {new Date(wo.scheduled_date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">Bu tarihte iş emri yok</p>
                )
              ) : (
                <p className="text-center text-muted-foreground py-8">Takvimden bir gün seçin</p>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <>
          {filteredWorkOrders.length === 0 ? (
            <Card className="p-12">
              <div className="text-center">
                <Wrench className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Henüz iş emri yok</p>
                <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  İlk İş Emrini Oluştur
                </Button>
              </div>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredWorkOrders.map((wo) => {
                const ticketInfo = getTicketInfo(wo.ticket_id);
                const completedTasks = wo.checklist?.filter(item => item.completed).length || 0;
                const totalTasks = wo.checklist?.length || 0;
                
                return (
                  <Card 
                    key={wo.id} 
                    data-testid={`work-order-card-${wo.id}`} 
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => navigate(`/work-orders/${wo.id}`)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-center gap-3 flex-wrap">
                            {getStatusBadge(wo.status)}
                            {getWorkTypeBadge(wo.work_type)}
                            {totalTasks > 0 && (
                              <span className="text-xs text-muted-foreground">
                                Checklist: {completedTasks}/{totalTasks}
                              </span>
                            )}
                          </div>
                          
                          {ticketInfo && (
                            <div>
                              <p className="font-medium">{ticketInfo.title}</p>
                              <p className="text-sm text-muted-foreground">
                                <span className="font-mono">{ticketInfo.number}</span>
                                {' • '}
                                {getCustomerName(ticketInfo.customerId)}
                              </p>
                            </div>
                          )}
                          
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">Teknisyen</p>
                                <p className="text-sm font-medium">{getTechnicianName(wo.assigned_technician)}</p>
                              </div>
                            </div>
                            {wo.scheduled_date && (
                              <div className="flex items-center gap-2">
                                <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Randevu</p>
                                  <p className="text-sm font-medium">
                                    {new Date(wo.scheduled_date).toLocaleDateString('tr-TR')}
                                    {wo.scheduled_date.includes('T') && (
                                      <span className="ml-1">
                                        {new Date(wo.scheduled_date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>
                            )}
                            {wo.time_spent_minutes > 0 && (
                              <div>
                                <p className="text-xs text-muted-foreground">Harcanan Süre</p>
                                <p className="text-sm font-medium">{wo.time_spent_minutes} dk</p>
                              </div>
                            )}
                          </div>
                          
                          {wo.notes && (
                            <p className="text-sm text-muted-foreground line-clamp-2">{wo.notes}</p>
                          )}
                        </div>
                        
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); navigate(`/work-orders/${wo.id}`); }}>
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}