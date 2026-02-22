import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import axios from "axios";
import { toast } from "sonner";
import { Ticket, Plus, Search, Filter, ArrowRight, Clock, AlertTriangle, CheckCircle } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

export default function CustomerPortalTickets() {
  const [loading, setLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [filteredTickets, setFilteredTickets] = useState([]);
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
      const token = localStorage.getItem("portal_token");
      const response = await axios.get(`${API}/api/portal/tickets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTickets(response.data);
    } catch (error) {
      toast.error("Talepler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const filterTickets = () => {
    let filtered = [...tickets];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        t =>
          t.ticket_number.toLowerCase().includes(query) ||
          t.title.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== "all") {
      if (statusFilter === "open") {
        filtered = filtered.filter(t => !["resolved", "closed"].includes(t.status));
      } else if (statusFilter === "resolved") {
        filtered = filtered.filter(t => ["resolved", "closed"].includes(t.status));
      } else {
        filtered = filtered.filter(t => t.status === statusFilter);
      }
    }

    setFilteredTickets(filtered);
  };

  const getStatusBadge = (status) => {
    const styles = {
      open: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      in_progress: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      on_hold: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      resolved: "bg-green-500/20 text-green-400 border-green-500/30",
      closed: "bg-gray-500/20 text-gray-400 border-gray-500/30"
    };
    const labels = {
      open: "Açık",
      in_progress: "İşlemde",
      on_hold: "Beklemede",
      resolved: "Çözüldü",
      closed: "Kapalı"
    };
    return (
      <Badge className={`${styles[status] || styles.open} border`}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      low: "bg-slate-500/20 text-slate-400",
      medium: "bg-blue-500/20 text-blue-400",
      high: "bg-orange-500/20 text-orange-400",
      critical: "bg-red-500/20 text-red-400"
    };
    const labels = {
      low: "Düşük",
      medium: "Orta",
      high: "Yüksek",
      critical: "Kritik"
    };
    return (
      <Badge className={styles[priority] || styles.medium}>
        {labels[priority] || priority}
      </Badge>
    );
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "open":
      case "in_progress":
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case "on_hold":
        return <AlertTriangle className="w-4 h-4 text-orange-400" />;
      case "resolved":
      case "closed":
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      default:
        return <Ticket className="w-4 h-4 text-muted-foreground" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="portal-tickets-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Destek Talepleri</h1>
          <p className="text-muted-foreground">Tüm destek taleplerinizi görüntüleyin ve takip edin</p>
        </div>
        <Link to="/portal/tickets/new">
          <Button className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700">
            <Plus className="w-4 h-4 mr-2" />
            Yeni Talep Oluştur
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Talep numarası veya konu ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="portal-ticket-search"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48" data-testid="portal-ticket-filter">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Durum" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="open">Açık Talepler</SelectItem>
                <SelectItem value="in_progress">İşlemde</SelectItem>
                <SelectItem value="on_hold">Beklemede</SelectItem>
                <SelectItem value="resolved">Çözülmüş</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tickets List */}
      <Card>
        <CardContent className="p-0">
          {filteredTickets.length === 0 ? (
            <div className="text-center py-12">
              <Ticket className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                {tickets.length === 0 
                  ? "Henüz destek talebi bulunmuyor" 
                  : "Arama kriterlerine uygun talep bulunamadı"
                }
              </p>
              {tickets.length === 0 && (
                <Link to="/portal/tickets/new">
                  <Button variant="outline" className="mt-4">
                    <Plus className="w-4 h-4 mr-2" />
                    İlk Talebinizi Oluşturun
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filteredTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  to={`/portal/tickets/${ticket.id}`}
                  className="block p-4 hover:bg-muted/50 transition-colors"
                  data-testid={`portal-ticket-item-${ticket.ticket_number}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="mt-1">
                        {getStatusIcon(ticket.status)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-mono text-sm text-primary font-medium">{ticket.ticket_number}</span>
                          {getStatusBadge(ticket.status)}
                          {getPriorityBadge(ticket.priority)}
                        </div>
                        <h3 className="font-medium truncate">{ticket.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                          {ticket.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(ticket.created_at).toLocaleDateString("tr-TR", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-2" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
