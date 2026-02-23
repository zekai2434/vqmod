import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Trash2, Eye, Edit } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function TicketList() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    filterTickets();
  }, [tickets, searchQuery, statusFilter]);

  const fetchTickets = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/tickets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTickets(response.data);
    } catch (error) {
      toast.error("Ticketlar yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const filterTickets = () => {
    let filtered = tickets;

    if (statusFilter !== "all") {
      filtered = filtered.filter(t => t.status === statusFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(t => 
        t.ticket_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredTickets(filtered);
  };

  const handleDelete = async (e, ticketId) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!window.confirm("Bu ticket'ı ve tüm ilgili verileri (yorumlar, dosyalar) silmek istediğinize emin misiniz?")) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/tickets/${ticketId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Ticket silindi");
      fetchTickets();
    } catch (error) {
      const message = error.response?.data?.detail || "Silme işlemi başarısız";
      toast.error(message);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      open: { variant: "default", label: "Açık" },
      in_progress: { variant: "secondary", label: "Devam Ediyor" },
      on_hold: { variant: "warning", label: "Beklemede" },
      resolved: { variant: "success", label: "Çözüldü" },
      closed: { variant: "outline", label: "Kapalı" }
    };
    const config = variants[status] || variants.open;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPriorityBadge = (priority) => {
    const variants = {
      critical: { variant: "error", label: "Kritik" },
      high: { variant: "warning", label: "Yüksek" },
      medium: { variant: "info", label: "Orta" },
      low: { variant: "outline", label: "Düşük" }
    };
    const config = variants[priority] || variants.medium;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6" data-testid="ticket-list-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-gray-900" style={{fontFamily: 'Chivo, sans-serif'}}>Ticketlar</h1>
          <p className="text-gray-600 mt-2">Arıza kayıtlarını yönetin</p>
        </div>
        <Link to="/tickets/new">
          <Button data-testid="create-ticket-btn">
            <Plus className="w-5 h-5 mr-2" />
            Yeni Ticket
          </Button>
        </Link>
      </div>

      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              data-testid="search-input"
              placeholder="Ticket numarası, başlık veya açıklama ara..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger data-testid="status-filter" className="w-full md:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm Durumlar</SelectItem>
              <SelectItem value="open">Açık</SelectItem>
              <SelectItem value="in_progress">Devam Ediyor</SelectItem>
              <SelectItem value="on_hold">Beklemede</SelectItem>
              <SelectItem value="resolved">Çözüldü</SelectItem>
              <SelectItem value="closed">Kapalı</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <p className="text-2xl font-bold text-gray-900">{tickets.length}</p>
          <p className="text-xs text-gray-600">Toplam</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-blue-600">{tickets.filter(t => t.status === 'open').length}</p>
          <p className="text-xs text-gray-600">Açık</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-amber-600">{tickets.filter(t => t.status === 'in_progress').length}</p>
          <p className="text-xs text-gray-600">Devam Eden</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-emerald-600">{tickets.filter(t => t.status === 'resolved').length}</p>
          <p className="text-xs text-gray-600">Çözülen</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-red-600">{tickets.filter(t => t.priority === 'critical' || t.priority === 'high').length}</p>
          <p className="text-xs text-gray-600">Yüksek Öncelik</p>
        </Card>
      </div>

      {filteredTickets.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <p className="text-gray-600">Ticket bulunamadı</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map((ticket) => (
            <Card key={ticket.id} className="p-6 hover:shadow-md transition-shadow" data-testid={`ticket-row-${ticket.ticket_number}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1 cursor-pointer" onClick={() => navigate(`/tickets/${ticket.id}`)}>
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="font-mono text-sm font-semibold text-gray-900">{ticket.ticket_number}</span>
                    {getStatusBadge(ticket.status)}
                    {getPriorityBadge(ticket.priority)}
                  </div>
                  <h3 className="text-lg font-semibold mb-1 text-gray-900">{ticket.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2">{ticket.description}</p>
                  <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                    <span>Kategori: {ticket.category}</span>
                    <span>•</span>
                    <span>Oluşturulma: {new Date(ticket.created_at).toLocaleDateString('tr-TR')}</span>
                  </div>
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/tickets/${ticket.id}`)}
                    data-testid={`view-ticket-${ticket.id}`}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-500 hover:text-red-700"
                    onClick={(e) => handleDelete(e, ticket.id)}
                    data-testid={`delete-ticket-${ticket.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
