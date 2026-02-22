import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Ticket, Users, HardDrive, AlertTriangle, Clock, CheckCircle2, Wrench } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentTickets, setRecentTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [statsRes, ticketsRes] = await Promise.all([
        axios.get(`${API}/reports/dashboard`, { headers }),
        axios.get(`${API}/tickets`, { headers })
      ]);
      
      setStats(statsRes.data);
      setRecentTickets(ticketsRes.data.slice(0, 5));
    } catch (error) {
      toast.error("Veri yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const statCards = stats ? [
    { icon: Ticket, label: "Toplam Ticket", value: stats.total_tickets, color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950" },
    { icon: Clock, label: "Açık Ticketlar", value: stats.open_tickets, color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950" },
    { icon: AlertTriangle, label: "SLA Riski", value: stats.sla_risk_tickets, color: "text-red-600", bg: "bg-red-50 dark:bg-red-950" },
    { icon: CheckCircle2, label: "Çözülmüş", value: stats.resolved_tickets, color: "text-green-600", bg: "bg-green-50 dark:bg-green-950" },
    { icon: Users, label: "Müşteriler", value: stats.total_customers, color: "text-purple-600", bg: "bg-purple-50 dark:bg-purple-950" },
    { icon: HardDrive, label: "Cihazlar", value: stats.total_assets, color: "text-cyan-600", bg: "bg-cyan-50 dark:bg-cyan-950" },
    { icon: Wrench, label: "Aktif İş Emirleri", value: stats.active_work_orders, color: "text-indigo-600", bg: "bg-indigo-50 dark:bg-indigo-950" },
  ] : [];

  const getStatusBadge = (status) => {
    const variants = {
      open: { variant: "default", label: "Açık" },
      in_progress: { variant: "secondary", label: "Devam Ediyor" },
      resolved: { variant: "success", label: "Çözüldü" },
      closed: { variant: "outline", label: "Kapalı" }
    };
    const config = variants[status] || variants.open;
    return <Badge variant={config.variant} data-testid={`status-badge-${status}`}>{config.label}</Badge>;
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
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-muted-foreground">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="dashboard-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight" style={{fontFamily: 'Chivo, sans-serif'}}>Dashboard</h1>
          <p className="text-muted-foreground mt-2">Teknik servis operasyonlarına genel bakış</p>
        </div>
        <Link to="/tickets/new">
          <Button data-testid="new-ticket-btn" size="lg">
            <Ticket className="w-5 h-5 mr-2" />
            Yeni Ticket
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="transition-shadow hover:shadow-md" data-testid={`stat-card-${index}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold mt-2" style={{fontFamily: 'Chivo, sans-serif'}}>{stat.value}</p>
                </div>
                <div className={`p-4 rounded-lg ${stat.bg}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card data-testid="recent-tickets-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Son Ticketlar</CardTitle>
            <Link to="/tickets">
              <Button variant="ghost" size="sm" data-testid="view-all-tickets-btn">Tümünü Gör</Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentTickets.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Henüz ticket yok</p>
          ) : (
            <div className="space-y-4">
              {recentTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  to={`/tickets/${ticket.id}`}
                  data-testid={`ticket-${ticket.ticket_number}`}
                >
                  <div className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-medium">{ticket.ticket_number}</span>
                        {getStatusBadge(ticket.status)}
                        {getPriorityBadge(ticket.priority)}
                      </div>
                      <p className="font-medium mt-1">{ticket.title}</p>
                      <p className="text-sm text-muted-foreground mt-1">{ticket.category}</p>
                    </div>
                    <div className="text-right text-sm text-muted-foreground">
                      {new Date(ticket.created_at).toLocaleDateString('tr-TR')}
                    </div>
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