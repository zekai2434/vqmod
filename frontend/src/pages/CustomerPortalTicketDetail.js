import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import axios from "axios";
import { toast } from "sonner";
import { ArrowLeft, Clock, User, MessageSquare, Send, Calendar, Tag, AlertTriangle, CheckCircle } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

export default function CustomerPortalTicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchTicket();
  }, [id]);

  const fetchTicket = async () => {
    try {
      const token = localStorage.getItem("portal_token");
      const headers = { Authorization: `Bearer ${token}` };

      const [ticketRes, commentsRes] = await Promise.all([
        axios.get(`${API}/api/portal/tickets/${id}`, { headers }),
        axios.get(`${API}/api/portal/tickets/${id}/comments`, { headers })
      ]);

      setTicket(ticketRes.data);
      setComments(commentsRes.data);
    } catch (error) {
      toast.error("Talep bilgileri yüklenirken hata oluştu");
      navigate("/portal/tickets");
    } finally {
      setLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const token = localStorage.getItem("portal_token");
      await axios.post(
        `${API}/api/portal/tickets/${id}/comments`,
        { ticket_id: id, comment: newComment },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("Yorum eklendi");
      setNewComment("");
      fetchTicket();
    } catch (error) {
      toast.error("Yorum eklenirken hata oluştu");
    } finally {
      setSubmitting(false);
    }
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
      <Badge className={`${styles[status] || styles.open} border text-sm px-3 py-1`}>
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
      <Badge className={`${styles[priority] || styles.medium} text-sm px-3 py-1`}>
        {labels[priority] || priority}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Talep bulunamadı</p>
        <Link to="/portal/tickets">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Taleplere Dön
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="portal-ticket-detail">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <Link to="/portal/tickets">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Geri
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="font-mono text-lg text-primary font-bold">{ticket.ticket_number}</span>
            {getStatusBadge(ticket.status)}
            {getPriorityBadge(ticket.priority)}
          </div>
          <h1 className="text-2xl font-bold">{ticket.title}</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Açıklama</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-muted-foreground">{ticket.description}</p>
            </CardContent>
          </Card>

          {/* Comments */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Yorumlar ({comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {comments.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">Henüz yorum bulunmuyor</p>
              ) : (
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div
                      key={comment.id}
                      className="p-4 rounded-lg bg-muted/50 border border-border"
                      data-testid={`portal-comment-${comment.id}`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <User className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{comment.user_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(comment.created_at).toLocaleDateString("tr-TR", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </p>
                        </div>
                      </div>
                      <p className="whitespace-pre-wrap text-sm">{comment.comment}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Comment */}
              {!["resolved", "closed"].includes(ticket.status) && (
                <div className="pt-4 border-t border-border">
                  <Textarea
                    placeholder="Yorumunuzu yazın..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                    className="mb-3"
                    data-testid="portal-comment-input"
                  />
                  <Button
                    onClick={handleAddComment}
                    disabled={submitting || !newComment.trim()}
                    className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                    data-testid="portal-submit-comment-btn"
                  >
                    {submitting ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                        Gönderiliyor...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Send className="w-4 h-4" />
                        Yorum Ekle
                      </span>
                    )}
                  </Button>
                </div>
              )}

              {["resolved", "closed"].includes(ticket.status) && (
                <div className="pt-4 border-t border-border text-center">
                  <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    Bu talep kapatılmıştır
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Talep Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Oluşturulma Tarihi</p>
                  <p className="text-sm font-medium">
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

              <div className="flex items-center gap-3">
                <Tag className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Kategori</p>
                  <p className="text-sm font-medium capitalize">{ticket.category}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Kanal</p>
                  <p className="text-sm font-medium capitalize">{ticket.channel || "Portal"}</p>
                </div>
              </div>

              {ticket.sla_deadline && (
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">SLA Son Tarih</p>
                    <p className="text-sm font-medium">
                      {new Date(ticket.sla_deadline).toLocaleDateString("tr-TR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </p>
                  </div>
                </div>
              )}

              {ticket.resolved_at && (
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <div>
                    <p className="text-xs text-muted-foreground">Çözüm Tarihi</p>
                    <p className="text-sm font-medium">
                      {new Date(ticket.resolved_at).toLocaleDateString("tr-TR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
