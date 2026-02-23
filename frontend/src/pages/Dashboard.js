import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Ticket, Users, HardDrive, AlertTriangle, Clock, CheckCircle2, Wrench, ArrowRight, TrendingUp, Activity } from "lucide-react";
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
    { icon: Ticket, label: "Toplam Ticket", value: stats.total_tickets, color: "blue", gradient: "from-blue-600 to-blue-400" },
    { icon: Clock, label: "Açık Ticketlar", value: stats.open_tickets, color: "amber", gradient: "from-amber-600 to-amber-400" },
    { icon: AlertTriangle, label: "SLA Riski", value: stats.sla_risk_tickets, color: "rose", gradient: "from-rose-600 to-rose-400" },
    { icon: CheckCircle2, label: "Çözülmüş", value: stats.resolved_tickets, color: "emerald", gradient: "from-emerald-600 to-emerald-400" },
  ] : [];

  const secondaryStats = stats ? [
    { icon: Users, label: "Müşteriler", value: stats.total_customers, href: "/customers" },
    { icon: HardDrive, label: "Cihazlar", value: stats.total_assets, href: "/assets" },
    { icon: Wrench, label: "Aktif İş Emirleri", value: stats.active_work_orders, href: "/work-orders" },
  ] : [];

  const getStatusBadge = (status) => {
    const styles = {
      open: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      in_progress: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      on_hold: "bg-orange-500/10 text-orange-400 border-orange-500/20",
      resolved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      closed: "bg-zinc-500/10 text-slate-300 border-zinc-500/20"
    };
    const labels = {
      open: "Açık",
      in_progress: "Devam Ediyor",
      on_hold: "Beklemede",
      resolved: "Çözüldü",
      closed: "Kapalı"
    };
    return (
      <Badge className={`${styles[status] || styles.open} border`} data-testid={`status-badge-${status}`}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      critical: "bg-rose-500/10 text-rose-400 border-rose-500/20",
      high: "bg-orange-500/10 text-orange-400 border-orange-500/20",
      medium: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      low: "bg-zinc-500/10 text-slate-300 border-zinc-500/20"
    };
    const labels = {
      critical: "Kritik",
      high: "Yüksek",
      medium: "Orta",
      low: "Düşük"
    };
    return (
      <Badge className={`${styles[priority] || styles.medium} border`}>
        {labels[priority] || priority}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex items-center gap-3 text-slate-300">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-500 border-t-transparent"></div>
          <span>Yükleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="dashboard-container">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Canlı Veri</span>
          </div>
          <h1 className="text-4xl font-bold text-white tracking-tight" style={{fontFamily: 'Chivo, sans-serif'}}>Dashboard</h1>
          <p className="text-slate-300 mt-1">Teknik servis operasyonlarına genel bakış</p>
        </div>
        <Link to="/tickets/new">
          <Button data-testid="new-ticket-btn" className="bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/25">
            <Ticket className="w-5 h-5 mr-2" />
            Yeni Ticket
          </Button>
        </Link>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <div 
            key={index} 
            className="glass-card rounded-xl p-5 card-hover"
            data-testid={`stat-card-${index}`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{stat.label}</p>
                <p className="text-4xl font-bold text-white mt-2" style={{fontFamily: 'Chivo, sans-serif'}}>
                  {stat.value}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.gradient} flex items-center justify-center shadow-lg`}>
                <stat.icon className="w-6 h-6 text-white" strokeWidth={1.5} />
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-700/60">
              <div className="flex items-center gap-2 text-emerald-400 text-sm">
                <TrendingUp className="w-4 h-4" />
                <span>Son 7 gün</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {secondaryStats.map((stat, index) => (
          <Link key={index} to={stat.href}>
            <div className="glass-card rounded-xl p-5 card-hover group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center group-hover:bg-slate-600 transition-colors">
                    <stat.icon className="w-5 h-5 text-slate-300" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{stat.label}</p>
                    <p className="text-2xl font-bold text-white" style={{fontFamily: 'Chivo, sans-serif'}}>
                      {stat.value}
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-slate-300 transition-colors" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Tickets */}
      <div className="glass-card rounded-xl overflow-hidden" data-testid="recent-tickets-card">
        <div className="flex items-center justify-between p-5 border-b border-slate-700/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Son Ticketlar</h2>
              <p className="text-xs text-slate-400">En son oluşturulan destek talepleri</p>
            </div>
          </div>
          <Link to="/tickets">
            <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white" data-testid="view-all-tickets-btn">
              Tümünü Gör
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
        
        <div className="divide-y divide-zinc-800/60">
          {recentTickets.length === 0 ? (
            <div className="text-center py-12">
              <Ticket className="w-12 h-12 text-zinc-700 mx-auto mb-3" />
              <p className="text-slate-400">Henüz ticket yok</p>
            </div>
          ) : (
            recentTickets.map((ticket) => (
              <Link
                key={ticket.id}
                to={`/tickets/${ticket.id}`}
                data-testid={`ticket-${ticket.ticket_number}`}
                className="block"
              >
                <div className="flex items-center justify-between p-4 hover:bg-slate-700/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono text-sm font-medium text-blue-400">{ticket.ticket_number}</span>
                      {getStatusBadge(ticket.status)}
                      {getPriorityBadge(ticket.priority)}
                    </div>
                    <p className="font-medium text-white truncate">{ticket.title}</p>
                    <p className="text-sm text-slate-400 mt-0.5">{ticket.category}</p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-sm text-slate-300">
                      {new Date(ticket.created_at).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'short'
                      })}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(ticket.created_at).toLocaleTimeString('tr-TR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
