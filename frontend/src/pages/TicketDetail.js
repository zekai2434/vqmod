import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Clock, User, Calendar, AlertCircle, MessageSquare, Paperclip, Send } from "lucide-react";
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
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [isInternalComment, setIsInternalComment] = useState(false);

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

      const commentsRes = await axios.get(`${API}/tickets/${id}/comments`, { headers });
      setComments(commentsRes.data);

      const attachmentsRes = await axios.get(`${API}/attachments?related_to=ticket&related_id=${id}`, { headers });
      setAttachments(attachmentsRes.data);

      const workOrdersRes = await axios.get(`${API}/work-orders?ticket_id=${id}`, { headers });
      setWorkOrders(workOrdersRes.data);
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

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/tickets/${id}/comments`, {
        ticket_id: id,
        comment: newComment,
        is_internal: isInternalComment
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Yorum eklendi");
      setNewComment("");
      setIsInternalComment(false);
      fetchTicketDetails();
    } catch (error) {
      toast.error("Yorum eklenirken hata oluştu");
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

  const getChannelBadge = (channel) => {
    const labels = {
      phone: "Telefon",
      email: "E-posta",
      portal: "Portal",
      walk_in: "Yerinde"
    };
    return <Badge variant="outline">{labels[channel] || channel}</Badge>;
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
    <div className="max-w-6xl" data-testid="ticket-detail-page">
      <Button
        data-testid="back-to-tickets-btn"
        variant="ghost"
        onClick={() => navigate('/tickets')}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Ticketlara Dön
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className="font-mono text-lg font-bold" data-testid="ticket-number">{ticket.ticket_number}</span>
                    {getStatusBadge(ticket.status)}
                    {getPriorityBadge(ticket.priority)}
                    {getChannelBadge(ticket.channel)}
                    {isSLARisk() && (
                      <Badge variant="error" data-testid="sla-risk-badge">
                        <AlertCircle className="w-3 h-3 mr-1" />
                        SLA Riski
                      </Badge>
                    )}
                    {ticket.is_out_of_scope && (
                      <Badge variant="warning">Kapsam Dışı</Badge>
                    )}
                  </div>
                  <CardTitle className="text-2xl mb-2" style={{fontFamily: 'Chivo, sans-serif'}}>{ticket.title}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Açıklama</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{ticket.description}</p>
              </div>

              {ticket.on_hold_reason && (
                <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm font-medium mb-1">Bekleme Sebebi</p>
                  <p className="text-sm">{ticket.on_hold_reason}</p>
                </div>
              )}

              {ticket.out_of_scope_reason && (
                <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800">
                  <p className="text-sm font-medium mb-1">Kapsam Dışı Nedeni</p>
                  <p className="text-sm">{ticket.out_of_scope_reason}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                <div>
                  <p className="text-sm text-muted-foreground">Kategori</p>
                  <p className="font-medium">{ticket.category}</p>
                  {ticket.subcategory && (
                    <p className="text-sm text-muted-foreground">{ticket.subcategory}</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Oluşturulma</p>
                  <p className="font-medium">{new Date(ticket.created_at).toLocaleString('tr-TR')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="comments" className="w-full">
            <TabsList>
              <TabsTrigger value="comments">
                <MessageSquare className="w-4 h-4 mr-2" />
                Yorumlar ({comments.length})
              </TabsTrigger>
              <TabsTrigger value="attachments">
                <Paperclip className="w-4 h-4 mr-2" />
                Dosyalar ({attachments.length})
              </TabsTrigger>
              <TabsTrigger value="workorders">
                İş Emirleri ({workOrders.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="comments" className="space-y-4 mt-4">
              <div className="space-y-4">
                {comments.map((comment) => (
                  <Card key={comment.id} className={comment.is_internal ? "border-l-4 border-l-orange-500" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm">{comment.user_name}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(comment.created_at), { locale: tr, addSuffix: true })}
                            </span>
                            {comment.is_internal && (
                              <Badge variant="warning" className="text-xs">İç Not</Badge>
                            )}
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{comment.comment}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card>
                <CardContent className="p-4">
                  <Textarea
                    data-testid="comment-input"
                    placeholder="Yorum ekle..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                    className="mb-3"
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={isInternalComment}
                        onChange={(e) => setIsInternalComment(e.target.checked)}
                      />
                      İç not (müşteri görmez)
                    </label>
                    <Button data-testid="add-comment-btn" onClick={handleAddComment} disabled={!newComment.trim()}>
                      <Send className="w-4 h-4 mr-2" />
                      Gönder
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="attachments" className="mt-4">
              {attachments.length === 0 ? (
                <Card className="p-8">
                  <p className="text-center text-muted-foreground">Dosya yok</p>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {attachments.map((att) => (
                    <Card key={att.id}>
                      <CardContent className="p-4 flex items-center gap-3">
                        <Paperclip className="w-5 h-5 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="font-medium">{att.filename}</p>
                          <p className="text-sm text-muted-foreground">
                            {(att.file_size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="workorders" className="mt-4">
              {workOrders.length === 0 ? (
                <Card className="p-8">
                  <p className="text-center text-muted-foreground">İş emri yok</p>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {workOrders.map((wo) => (
                    <Card key={wo.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/work-orders`)}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{wo.work_type === 'onsite' ? 'Yerinde Servis' : wo.work_type === 'remote' ? 'Uzaktan' : 'Atölye'}</p>
                            <p className="text-sm text-muted-foreground">Durum: {wo.status}</p>
                          </div>
                          <Badge>{wo.status}</Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Durum Yönetimi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Durum Güncelle</label>
                <Select value={ticket.status} onValueChange={handleStatusUpdate} disabled={updating}>
                  <SelectTrigger data-testid="status-update-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Açık</SelectItem>
                    <SelectItem value="in_progress">Devam Ediyor</SelectItem>
                    <SelectItem value="on_hold">Beklemede</SelectItem>
                    <SelectItem value="resolved">Çözüldü</SelectItem>
                    <SelectItem value="closed">Kapalı</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Müşteri Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Müşteri</p>
                <p className="font-medium">{customer?.name}</p>
                {customer?.company && <p className="text-sm text-muted-foreground">{customer.company}</p>}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">İletişim</p>
                <p className="text-sm">{customer?.email}</p>
                <p className="text-sm">{customer?.phone}</p>
              </div>
            </CardContent>
          </Card>

          {asset && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Cihaz Bilgileri</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Cihaz</p>
                  <p className="font-medium">{asset.device_type} - {asset.brand}</p>
                  <p className="text-sm">{asset.model}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Seri No</p>
                  <p className="text-sm font-mono">{asset.serial_number}</p>
                </div>
                {asset.hostname && (
                  <div>
                    <p className="text-sm text-muted-foreground">Hostname</p>
                    <p className="text-sm">{asset.hostname}</p>
                  </div>
                )}
                {asset.ip_address && (
                  <div>
                    <p className="text-sm text-muted-foreground">IP Address</p>
                    <p className="text-sm font-mono">{asset.ip_address}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {ticket.sla_deadline && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">SLA Takibi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Deadline</p>
                    <p className="font-medium text-sm">{new Date(ticket.sla_deadline).toLocaleString('tr-TR')}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(ticket.sla_deadline), { locale: tr, addSuffix: true })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
