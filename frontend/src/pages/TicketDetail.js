import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Clock, User, Calendar, AlertCircle } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [asset, setAsset] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    fetchTicketDetails();
  }, [id]);

  const fetchTicketDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const ticketRes = await axios.get(`${API}/tickets/${id}`, { headers });
      setTicket(ticketRes.data);

      const customerRes = await axios.get(`${API}/customers/${ticketRes.data.customer_id}`, { headers });
      setCustomer(customerRes.data);

      if (ticketRes.data.asset_id) {
        const assetRes = await axios.get(`${API}/assets/${ticketRes.data.asset_id}`, { headers });
        setAsset(assetRes.data);
      }
    } catch (error) {
      toast.error("Ticket detayları yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API}/tickets/${id}`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Durum güncellendi");
      fetchTicketDetails();
    } catch (error) {
      toast.error("Durum güncellenirken hata oluştu");
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status) => {
    const variants = {
      open: { variant: "default", label: "Açık" },
      in_progress: { variant: "secondary", label: "Devam Ediyor" },
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

  const isSLARisk = () => {
    if (!ticket?.sla_deadline) return false;
    return new Date(ticket.sla_deadline) < new Date() && ticket.status !== 'resolved' && ticket.status !== 'closed';
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Yükleniyor...</div>;
  }

  if (!ticket) {
    return <div className="flex items-center justify-center h-96">Ticket bulunamadı</div>;
  }

  return (
    <div className="max-w-5xl" data-testid="ticket-detail-page">
      <Button
        data-testid="back-to-tickets-btn"
        variant="ghost"
        onClick={() => navigate('/tickets')}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Ticketlara Dön
      </Button>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-mono text-lg font-bold" data-testid="ticket-number">{ticket.ticket_number}</span>
                  {getStatusBadge(ticket.status)}
                  {getPriorityBadge(ticket.priority)}
                  {isSLARisk() && (
                    <Badge variant="error" data-testid="sla-risk-badge">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      SLA Riski
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-3xl" style={{fontFamily: 'Chivo, sans-serif'}}>{ticket.title}</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Açıklama</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{ticket.description}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Müşteri</p>
                    <p className="font-medium">{customer?.name}</p>
                    <p className="text-sm text-muted-foreground">{customer?.company}</p>
                  </div>
                </div>

                {asset && (
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Cihaz</p>
                      <p className="font-medium">{asset.device_type} - {asset.brand}</p>
                      <p className="text-sm font-mono">{asset.serial_number}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Kategori</p>
                    <p className="font-medium">{ticket.category}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Oluşturulma</p>
                    <p className="font-medium">{new Date(ticket.created_at).toLocaleString('tr-TR')}</p>
                  </div>
                </div>

                {ticket.sla_deadline && (
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">SLA Deadline</p>
                      <p className="font-medium">{new Date(ticket.sla_deadline).toLocaleString('tr-TR')}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(ticket.sla_deadline), { locale: tr, addSuffix: true })}
                      </p>
                    </div>
                  </div>
                )}

                {ticket.resolved_at && (
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Çözüm Tarihi</p>
                      <p className="font-medium">{new Date(ticket.resolved_at).toLocaleString('tr-TR')}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <label className="text-sm font-medium mb-2 block">Durum Güncelle</label>
              <Select value={ticket.status} onValueChange={handleStatusUpdate} disabled={updating}>
                <SelectTrigger data-testid="status-update-select" className="w-full md:w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Açık</SelectItem>
                  <SelectItem value="in_progress">Devam Ediyor</SelectItem>
                  <SelectItem value="resolved">Çözüldü</SelectItem>
                  <SelectItem value="closed">Kapalı</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}