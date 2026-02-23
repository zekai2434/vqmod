import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Clock, User, Calendar, AlertCircle, MessageSquare, Paperclip, Send, Upload, Image as ImageIcon, Wrench, MapPin, Monitor, Building2, Plus, History, Pencil, HardDrive, Download } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import FileUpload, { ImageViewer } from "@/components/FileUpload";
import TicketTimeline from "@/components/TicketTimeline";
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
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [viewerImages, setViewerImages] = useState(null);
  const [users, setUsers] = useState([]);
  const [assets, setAssets] = useState([]);
  const [createWODialogOpen, setCreateWODialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [woFormData, setWoFormData] = useState({
    work_type: "onsite",
    assigned_technician: "",
    scheduled_date: "",
    scheduled_time: "",
    notes: ""
  });
  const [editFormData, setEditFormData] = useState({
    title: "",
    description: "",
    category: "",
    subcategory: "",
    priority: "",
    asset_id: "",
    assigned_to: ""
  });
  const [creatingWO, setCreatingWO] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

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
      } else {
        setAsset(null);
      }

      const commentsRes = await axios.get(`${API}/tickets/${id}/comments`, { headers });
      setComments(commentsRes.data);

      const attachmentsRes = await axios.get(`${API}/attachments?related_to=ticket&related_id=${id}`, { headers });
      setAttachments(attachmentsRes.data);

      const workOrdersRes = await axios.get(`${API}/work-orders?ticket_id=${id}`, { headers });
      setWorkOrders(workOrdersRes.data);

      const usersRes = await axios.get(`${API}/users`, { headers });
      setUsers(usersRes.data);

      // Fetch customer assets for editing
      const assetsRes = await axios.get(`${API}/assets?customer_id=${ticketRes.data.customer_id}`, { headers });
      setAssets(assetsRes.data);
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

  const openEditDialog = () => {
    if (!ticket) return;
    setEditFormData({
      title: ticket.title || "",
      description: ticket.description || "",
      category: ticket.category || "",
      subcategory: ticket.subcategory || "",
      priority: ticket.priority || "",
      asset_id: ticket.asset_id || "",
      assigned_to: ticket.assigned_to || ""
    });
    setEditDialogOpen(true);
  };

  const handleEditTicket = async () => {
    setSavingEdit(true);
    try {
      const token = localStorage.getItem('token');
      const updateData = {};
      
      // Only include changed fields
      if (editFormData.title !== ticket.title) updateData.title = editFormData.title;
      if (editFormData.description !== ticket.description) updateData.description = editFormData.description;
      if (editFormData.category !== ticket.category) updateData.category = editFormData.category;
      if (editFormData.subcategory !== ticket.subcategory) updateData.subcategory = editFormData.subcategory;
      if (editFormData.priority !== ticket.priority) updateData.priority = editFormData.priority;
      if (editFormData.assigned_to !== ticket.assigned_to) updateData.assigned_to = editFormData.assigned_to;
      
      // Handle asset_id - "" means remove asset
      if (editFormData.asset_id !== (ticket.asset_id || "")) {
        updateData.asset_id = editFormData.asset_id || null;
      }

      if (Object.keys(updateData).length === 0) {
        toast.info("Değişiklik yapılmadı");
        setEditDialogOpen(false);
        return;
      }

      await axios.patch(`${API}/tickets/${id}`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Ticket başarıyla güncellendi");
      setEditDialogOpen(false);
      fetchTicketDetails();
    } catch (error) {
      toast.error("Ticket güncellenirken hata oluştu");
    } finally {
      setSavingEdit(false);
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

  const handleUploadFiles = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      for (const fileObj of selectedFiles) {
        const reader = new FileReader();
        
        await new Promise((resolve, reject) => {
          reader.onload = async (e) => {
            try {
              const base64Data = e.target.result.split(',')[1];
              
              await axios.post(`${API}/attachments`, {
                related_to: 'ticket',
                related_id: id,
                filename: fileObj.name,
                file_type: fileObj.type,
                file_size: fileObj.size,
                file_data: base64Data
              }, { headers });
              
              resolve();
            } catch (error) {
              reject(error);
            }
          };
          
          reader.onerror = reject;
          reader.readAsDataURL(fileObj.file);
        });
      }

      toast.success(`${selectedFiles.length} dosya yüklendi`);
      setSelectedFiles([]);
      setUploadDialogOpen(false);
      fetchTicketDetails();
    } catch (error) {
      toast.error("Dosyalar yüklenirken hata oluştu");
    } finally {
      setUploading(false);
    }
  };

  const openImageViewer = (attachments) => {
    const images = attachments.filter(att => att.file_type.startsWith('image/'));
    if (images.length > 0) {
      setViewerImages(images.map(img => ({
        ...img,
        file_data: `data:${img.file_type};base64,${img.file_data}`
      })));
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

  const handleCreateWorkOrder = async () => {
    if (!woFormData.assigned_technician) {
      toast.error("Lütfen teknisyen seçin");
      return;
    }

    setCreatingWO(true);
    try {
      const token = localStorage.getItem('token');
      const scheduledDateTime = woFormData.scheduled_date + (woFormData.scheduled_time ? `T${woFormData.scheduled_time}` : '');
      
      const defaultChecklist = [
        { id: crypto.randomUUID(), task: "Müşteri ile randevu onayı", completed: false },
        { id: crypto.randomUUID(), task: "Cihaz fiziksel kontrolü", completed: false },
        { id: crypto.randomUUID(), task: "Arıza tespiti ve analiz", completed: false },
        { id: crypto.randomUUID(), task: "Onarım/değişim işlemi", completed: false },
        { id: crypto.randomUUID(), task: "Fonksiyon testleri", completed: false },
        { id: crypto.randomUUID(), task: "Müşteri eğitimi ve bilgilendirme", completed: false },
        { id: crypto.randomUUID(), task: "Servis formunun doldurulması", completed: false }
      ];

      await axios.post(`${API}/work-orders`, {
        ticket_id: id,
        assigned_technician: woFormData.assigned_technician,
        work_type: woFormData.work_type,
        scheduled_date: scheduledDateTime || null,
        notes: woFormData.notes,
        checklist: defaultChecklist
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success("İş emri oluşturuldu");
      setCreateWODialogOpen(false);
      setWoFormData({ work_type: "onsite", assigned_technician: "", scheduled_date: "", scheduled_time: "", notes: "" });
      fetchTicketDetails();
    } catch (error) {
      toast.error("İş emri oluşturulurken hata oluştu");
    } finally {
      setCreatingWO(false);
    }
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

  const getWOStatusBadge = (status) => {
    const variants = {
      scheduled: { variant: "info", label: "Planlandı" },
      in_progress: { variant: "warning", label: "Devam Ediyor" },
      completed: { variant: "success", label: "Tamamlandı" },
      cancelled: { variant: "outline", label: "İptal Edildi" }
    };
    const config = variants[status] || variants.scheduled;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTechnicianName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user ? user.full_name : 'Bilinmeyen';
  };

  const technicians = users.filter(u => u.role === 'technician' || u.role === 'admin');

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

      {/* Quick Actions */}
      <div className="flex items-center gap-2 mb-6 print:hidden flex-wrap">
        <Button
          variant="default"
          onClick={openEditDialog}
          data-testid="edit-ticket-btn"
        >
          <Pencil className="w-4 h-4 mr-2" />
          Ticket Düzenle
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate(`/service-report/${id}`)}
          data-testid="print-service-report-btn"
        >
          <Wrench className="w-4 h-4 mr-2" />
          Servis Raporu Yazdır
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate('/quotes/new')}
          data-testid="create-quote-btn"
        >
          <Plus className="w-4 h-4 mr-2" />
          Teklif Oluştur
        </Button>
      </div>

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

          <Tabs defaultValue="timeline" className="w-full">
            <TabsList>
              <TabsTrigger value="timeline" data-testid="timeline-tab">
                <History className="w-4 h-4 mr-2" />
                Zaman Çizelgesi
              </TabsTrigger>
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

            <TabsContent value="timeline" className="mt-4">
              <TicketTimeline ticketId={id} />
            </TabsContent>

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
              <div className="mb-4">
                <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="upload-file-btn">
                      <Upload className="w-4 h-4 mr-2" />
                      Dosya Yükle
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Dosya Yükle</DialogTitle>
                    </DialogHeader>
                    <FileUpload
                      onFilesSelected={setSelectedFiles}
                      maxFiles={10}
                      maxSizeMB={10}
                      accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                    />
                    <div className="flex gap-2 pt-4">
                      <Button 
                        onClick={handleUploadFiles} 
                        disabled={selectedFiles.length === 0 || uploading}
                        data-testid="confirm-upload-btn"
                      >
                        {uploading ? "Yükleniyor..." : "Yükle"}
                      </Button>
                      <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                        İptal
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {attachments.length === 0 ? (
                <Card className="p-8">
                  <p className="text-center text-muted-foreground">Dosya yok</p>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {attachments.map((att) => (
                    <Card key={att.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          {att.file_type.startsWith('image/') ? (
                            <div 
                              className="w-16 h-16 rounded overflow-hidden flex-shrink-0 bg-muted cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => openImageViewer([att])}
                            >
                              <img 
                                src={`data:${att.file_type};base64,${att.file_data}`}
                                alt={att.filename}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-16 h-16 rounded bg-muted flex items-center justify-center flex-shrink-0">
                              <Paperclip className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                          
                          <div className="flex-1">
                            <p className="font-medium">{att.filename}</p>
                            <p className="text-sm text-muted-foreground">
                              {(att.file_size / 1024).toFixed(2)} KB
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(att.created_at).toLocaleDateString('tr-TR')}
                            </p>
                          </div>

                          {att.file_type.startsWith('image/') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openImageViewer([att])}
                            >
                              <ImageIcon className="w-4 h-4 mr-2" />
                              Görüntüle
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  
                  {attachments.filter(a => a.file_type.startsWith('image/')).length > 1 && (
                    <Button
                      variant="outline"
                      onClick={() => openImageViewer(attachments.filter(a => a.file_type.startsWith('image/')))}
                    >
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Tüm Resimleri Görüntüle
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="workorders" className="mt-4">
              <div className="mb-4">
                <Dialog open={createWODialogOpen} onOpenChange={setCreateWODialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="create-work-order-btn">
                      <Plus className="w-4 h-4 mr-2" />
                      İş Emri Oluştur
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle>Bu Ticket İçin İş Emri Oluştur</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>İş Tipi *</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { value: "onsite", icon: MapPin, label: "Yerinde" },
                            { value: "remote", icon: Monitor, label: "Uzaktan" },
                            { value: "workshop", icon: Building2, label: "Atölye" }
                          ].map(({ value, icon: Icon, label }) => (
                            <div
                              key={value}
                              onClick={() => setWoFormData({...woFormData, work_type: value})}
                              className={`p-3 border rounded-lg cursor-pointer transition-all text-center ${
                                woFormData.work_type === value 
                                  ? 'border-primary bg-primary/5 ring-2 ring-primary/20' 
                                  : 'hover:border-primary/50'
                              }`}
                              data-testid={`wo-type-${value}`}
                            >
                              <Icon className={`w-5 h-5 mx-auto mb-1 ${woFormData.work_type === value ? 'text-primary' : 'text-muted-foreground'}`} />
                              <p className="text-xs font-medium">{label}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Teknisyen *</Label>
                        <Select value={woFormData.assigned_technician} onValueChange={(v) => setWoFormData({...woFormData, assigned_technician: v})}>
                          <SelectTrigger data-testid="wo-tech-select">
                            <SelectValue placeholder="Teknisyen seçin" />
                          </SelectTrigger>
                          <SelectContent>
                            {technicians.map(u => (
                              <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Randevu Tarihi</Label>
                          <Input
                            type="date"
                            data-testid="wo-sched-date"
                            value={woFormData.scheduled_date}
                            onChange={(e) => setWoFormData({...woFormData, scheduled_date: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Saat</Label>
                          <Input
                            type="time"
                            data-testid="wo-sched-time"
                            value={woFormData.scheduled_time}
                            onChange={(e) => setWoFormData({...woFormData, scheduled_time: e.target.value})}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Notlar</Label>
                        <Textarea
                          data-testid="wo-notes"
                          value={woFormData.notes}
                          onChange={(e) => setWoFormData({...woFormData, notes: e.target.value})}
                          rows={2}
                          placeholder="Özel talimatlar..."
                        />
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button onClick={handleCreateWorkOrder} disabled={creatingWO} data-testid="confirm-create-wo">
                          {creatingWO ? "Oluşturuluyor..." : "Oluştur"}
                        </Button>
                        <Button variant="outline" onClick={() => setCreateWODialogOpen(false)}>İptal</Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {workOrders.length === 0 ? (
                <Card className="p-8">
                  <div className="text-center">
                    <Wrench className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">Bu ticket için henüz iş emri yok</p>
                    <p className="text-sm text-muted-foreground mt-1">Yukarıdaki butonu kullanarak iş emri oluşturun</p>
                  </div>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {workOrders.map((wo) => {
                    const completedTasks = wo.checklist?.filter(item => item.completed).length || 0;
                    const totalTasks = wo.checklist?.length || 0;
                    
                    return (
                      <Card 
                        key={wo.id} 
                        className="cursor-pointer hover:shadow-md transition-shadow" 
                        onClick={() => navigate(`/work-orders/${wo.id}`)}
                        data-testid={`wo-card-${wo.id}`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                {getWOStatusBadge(wo.status)}
                                {getWorkTypeBadge(wo.work_type)}
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-1">
                                  <User className="w-4 h-4 text-muted-foreground" />
                                  <span>{getTechnicianName(wo.assigned_technician)}</span>
                                </div>
                                {wo.scheduled_date && (
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4 text-muted-foreground" />
                                    <span>{new Date(wo.scheduled_date).toLocaleDateString('tr-TR')}</span>
                                  </div>
                                )}
                              </div>
                              {totalTasks > 0 && (
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-32">
                                    <div 
                                      className="h-full bg-green-500" 
                                      style={{width: `${(completedTasks / totalTasks) * 100}%`}}
                                    />
                                  </div>
                                  <span className="text-xs text-muted-foreground">{completedTasks}/{totalTasks}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
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

      {/* Edit Ticket Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Ticket Düzenle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Başlık *</Label>
              <Input
                id="edit-title"
                data-testid="edit-ticket-title"
                value={editFormData.title}
                onChange={(e) => setEditFormData({...editFormData, title: e.target.value})}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Açıklama *</Label>
              <Textarea
                id="edit-description"
                data-testid="edit-ticket-description"
                value={editFormData.description}
                onChange={(e) => setEditFormData({...editFormData, description: e.target.value})}
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Kategori *</Label>
                <Select 
                  value={editFormData.category} 
                  onValueChange={(v) => setEditFormData({...editFormData, category: v})}
                >
                  <SelectTrigger data-testid="edit-ticket-category">
                    <SelectValue placeholder="Kategori seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="network">Network</SelectItem>
                    <SelectItem value="hardware">Donanım</SelectItem>
                    <SelectItem value="software">Yazılım</SelectItem>
                    <SelectItem value="security">Güvenlik</SelectItem>
                    <SelectItem value="other">Diğer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Öncelik *</Label>
                <Select 
                  value={editFormData.priority} 
                  onValueChange={(v) => setEditFormData({...editFormData, priority: v})}
                >
                  <SelectTrigger data-testid="edit-ticket-priority">
                    <SelectValue placeholder="Öncelik seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">Kritik</SelectItem>
                    <SelectItem value="high">Yüksek</SelectItem>
                    <SelectItem value="medium">Orta</SelectItem>
                    <SelectItem value="low">Düşük</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Atanan Teknisyen</Label>
              <Select 
                value={editFormData.assigned_to || "none"} 
                onValueChange={(v) => setEditFormData({...editFormData, assigned_to: v === "none" ? "" : v})}
              >
                <SelectTrigger data-testid="edit-ticket-assignee">
                  <SelectValue placeholder="Teknisyen seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Atanmamış</SelectItem>
                  {technicians.map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Asset Selection - KEY FEATURE */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <HardDrive className="w-4 h-4" />
                Cihaz
              </Label>
              <Select 
                value={editFormData.asset_id || "none"} 
                onValueChange={(v) => setEditFormData({...editFormData, asset_id: v === "none" ? "" : v})}
              >
                <SelectTrigger data-testid="edit-ticket-asset">
                  <SelectValue placeholder="Cihaz seçin (opsiyonel)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Cihaz Yok</SelectItem>
                  {assets.map(a => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.brand} {a.model} - {a.serial_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {assets.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Bu müşteriye ait kayıtlı cihaz bulunmuyor.
                </p>
              )}
              {editFormData.asset_id && editFormData.asset_id !== (ticket.asset_id || "") && (
                <p className="text-xs text-amber-600">
                  Cihaz değişikliği zaman çizelgesine kaydedilecek.
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button 
                onClick={handleEditTicket} 
                disabled={savingEdit}
                data-testid="save-ticket-edit"
              >
                {savingEdit ? "Kaydediliyor..." : "Kaydet"}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setEditDialogOpen(false)}
              >
                İptal
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {viewerImages && (
        <ImageViewer
          images={viewerImages}
          onClose={() => setViewerImages(null)}
        />
      )}
    </div>
  );
}
