import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Clock, User, Calendar, CheckCircle2, Upload, Camera, FileSignature, Save, Package, Plus, Trash2 } from "lucide-react";
import FileUpload from "@/components/FileUpload";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function WorkOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workOrder, setWorkOrder] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [technician, setTechnician] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [photoDialogOpen, setPhotoDialogOpen] = useState(false);
  const [partDialogOpen, setPartDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [serviceReport, setServiceReport] = useState("");
  const [timeSpent, setTimeSpent] = useState(0);
  const [signatureData, setSignatureData] = useState("");
  const [parts, setParts] = useState([]);
  const [partUsage, setPartUsage] = useState([]);
  const [partReservations, setPartReservations] = useState([]);
  const [selectedPart, setSelectedPart] = useState("");
  const [partQuantity, setPartQuantity] = useState(1);
  const [addingPart, setAddingPart] = useState(false);

  useEffect(() => {
    if (id) fetchWorkOrderDetails();
  }, [id]);

  const fetchWorkOrderDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const woRes = await axios.get(`${API}/work-orders/${id}`, { headers });
      setWorkOrder(woRes.data);
      setServiceReport(woRes.data.service_report || "");
      setTimeSpent(woRes.data.time_spent_minutes || 0);

      const ticketRes = await axios.get(`${API}/tickets/${woRes.data.ticket_id}`, { headers });
      setTicket(ticketRes.data);

      const users = await axios.get(`${API}/users`, { headers });
      const tech = users.data.find(u => u.id === woRes.data.assigned_technician);
      setTechnician(tech);

      const photosRes = await axios.get(`${API}/attachments?related_to=work_order&related_id=${id}`, { headers });
      setPhotos(photosRes.data);

      // Fetch parts data
      const [partsRes, usageRes, reservationsRes] = await Promise.all([
        axios.get(`${API}/parts`, { headers }),
        axios.get(`${API}/part-usage?work_order_id=${id}`, { headers }),
        axios.get(`${API}/part-reservations?work_order_id=${id}`, { headers })
      ]);
      setParts(partsRes.data);
      setPartUsage(usageRes.data);
      setPartReservations(reservationsRes.data);
    } catch (error) {
      toast.error("İş emri detayları yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleAddPartUsage = async () => {
    if (!selectedPart || partQuantity < 1) {
      toast.error("Lütfen parça ve miktar seçin");
      return;
    }

    setAddingPart(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/part-usage`, {
        part_id: selectedPart,
        work_order_id: id,
        quantity: partQuantity
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Parça kullanımı eklendi");
      setPartDialogOpen(false);
      setSelectedPart("");
      setPartQuantity(1);
      fetchWorkOrderDetails();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Parça eklenirken hata oluştu");
    } finally {
      setAddingPart(false);
    }
  };

  const handleReservePart = async () => {
    if (!selectedPart || partQuantity < 1) {
      toast.error("Lütfen parça ve miktar seçin");
      return;
    }

    setAddingPart(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/part-reservations`, {
        part_id: selectedPart,
        work_order_id: id,
        quantity: partQuantity
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Parça rezerve edildi");
      setPartDialogOpen(false);
      setSelectedPart("");
      setPartQuantity(1);
      fetchWorkOrderDetails();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Rezervasyon yapılırken hata oluştu");
    } finally {
      setAddingPart(false);
    }
  };

  const handleUseReservation = async (reservationId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API}/part-reservations/${reservationId}/use`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Rezervasyon kullanıldı");
      fetchWorkOrderDetails();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Rezervasyon kullanılırken hata oluştu");
    }
  };

  const handleCancelReservation = async (reservationId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API}/part-reservations/${reservationId}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Rezervasyon iptal edildi");
      fetchWorkOrderDetails();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Rezervasyon iptal edilirken hata oluştu");
    }
  };

  const getPartInfo = (partId) => {
    const part = parts.find(p => p.id === partId);
    return part ? { name: part.name, number: part.part_number } : { name: "Bilinmeyen", number: "" };
  };

  const handleChecklistUpdate = async (itemId, completed) => {
    try {
      const token = localStorage.getItem('token');
      const updatedChecklist = workOrder.checklist.map(item =>
        item.id === itemId ? { ...item, completed, completed_at: completed ? new Date().toISOString() : null } : item
      );

      await axios.patch(`${API}/work-orders/${id}`, {
        checklist: updatedChecklist
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setWorkOrder({ ...workOrder, checklist: updatedChecklist });
      toast.success("Checklist güncellendi");
    } catch (error) {
      toast.error("Checklist güncellenirken hata oluştu");
    }
  };

  const handleUploadPhotos = async () => {
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
                related_to: 'work_order',
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

      toast.success(`${selectedFiles.length} fotoğraf yüklendi`);
      setSelectedFiles([]);
      setPhotoDialogOpen(false);
      fetchWorkOrderDetails();
    } catch (error) {
      toast.error("Fotoğraflar yüklenirken hata oluştu");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveReport = async () => {
    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API}/work-orders/${id}`, {
        service_report: serviceReport,
        time_spent_minutes: timeSpent,
        customer_signature: signatureData || workOrder.customer_signature
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Servis raporu kaydedildi");
      fetchWorkOrderDetails();
    } catch (error) {
      toast.error("Servis raporu kaydedilirken hata oluştu");
    } finally {
      setUpdating(false);
    }
  };

  const handleCompleteWorkOrder = async () => {
    setUpdating(true);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API}/work-orders/${id}`, {
        status: 'completed'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("İş emri tamamlandı");
      fetchWorkOrderDetails();
    } catch (error) {
      toast.error("İş emri tamamlanırken hata oluştu");
    } finally {
      setUpdating(false);
    }
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
    const labels = {
      onsite: "Yerinde",
      remote: "Uzaktan",
      workshop: "Atölye"
    };
    return <Badge variant="secondary">{labels[type] || type}</Badge>;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Yükleniyor...</div>;
  }

  if (!workOrder) {
    return <div className="flex items-center justify-center h-96">İş emri bulunamadı</div>;
  }

  const completedTasks = workOrder.checklist?.filter(item => item.completed).length || 0;
  const totalTasks = workOrder.checklist?.length || 0;
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

  return (
    <div className="max-w-7xl" data-testid="work-order-detail-page">
      <Button
        variant="ghost"
        onClick={() => navigate('/work-orders')}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        İş Emirlerine Dön
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    {getStatusBadge(workOrder.status)}
                    {getWorkTypeBadge(workOrder.work_type)}
                  </div>
                  <CardTitle className="text-2xl mb-2" style={{fontFamily: 'Chivo, sans-serif'}}>
                    İş Emri Detayı
                  </CardTitle>
                  {ticket && (
                    <p className="text-sm text-muted-foreground">
                      Ticket: {ticket.ticket_number} - {ticket.title}
                    </p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {workOrder.scheduled_date && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                  <Calendar className="w-5 h-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Planlanan Tarih</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(workOrder.scheduled_date).toLocaleDateString('tr-TR')}
                    </p>
                  </div>
                </div>
              )}

              {workOrder.notes && (
                <div>
                  <h3 className="font-semibold mb-2">Notlar</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{workOrder.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Tabs defaultValue="checklist" className="w-full">
            <TabsList>
              <TabsTrigger value="checklist">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Checklist ({completedTasks}/{totalTasks})
              </TabsTrigger>
              <TabsTrigger value="parts">
                <Package className="w-4 h-4 mr-2" />
                Parçalar ({partUsage.length})
              </TabsTrigger>
              <TabsTrigger value="report">
                <FileSignature className="w-4 h-4 mr-2" />
                Servis Raporu
              </TabsTrigger>
              <TabsTrigger value="photos">
                <Camera className="w-4 h-4 mr-2" />
                Fotoğraflar ({photos.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="checklist" className="space-y-4 mt-4">
              <Card>
                <CardContent className="p-6">
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">İlerleme</span>
                      <span className="text-sm font-medium">{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 transition-all duration-300" 
                        style={{width: `${progress}%`}}
                      />
                    </div>
                  </div>

                  {workOrder.checklist && workOrder.checklist.length > 0 ? (
                    <div className="space-y-3">
                      {workOrder.checklist.map((item) => (
                        <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                          <Checkbox
                            checked={item.completed}
                            onCheckedChange={(checked) => handleChecklistUpdate(item.id, checked)}
                            disabled={workOrder.status === 'completed'}
                          />
                          <div className="flex-1">
                            <p className={`text-sm ${item.completed ? 'line-through text-muted-foreground' : 'font-medium'}`}>
                              {item.task}
                            </p>
                            {item.completed_at && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Tamamlandı: {new Date(item.completed_at).toLocaleString('tr-TR')}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-4">Checklist tanımlanmamış</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="report" className="space-y-4 mt-4">
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="service_report">Yapılan İşlemler</Label>
                    <Textarea
                      id="service_report"
                      data-testid="service-report-input"
                      value={serviceReport}
                      onChange={(e) => setServiceReport(e.target.value)}
                      rows={8}
                      placeholder="Yapılan işlemleri detaylı olarak açıklayın..."
                      disabled={workOrder.status === 'completed'}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="time_spent">Harcanan Süre (Dakika)</Label>
                    <Input
                      id="time_spent"
                      data-testid="time-spent-input"
                      type="number"
                      value={timeSpent}
                      onChange={(e) => setTimeSpent(parseInt(e.target.value) || 0)}
                      disabled={workOrder.status === 'completed'}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Müşteri İmzası</Label>
                    {workOrder.customer_signature ? (
                      <div className="p-4 border rounded-lg bg-muted">
                        <p className="text-sm text-muted-foreground">✓ İmza alındı</p>
                      </div>
                    ) : (
                      <Input
                        data-testid="signature-input"
                        placeholder="İmza alanı (demo için metin)"
                        value={signatureData}
                        onChange={(e) => setSignatureData(e.target.value)}
                        disabled={workOrder.status === 'completed'}
                      />
                    )}
                  </div>

                  {workOrder.status !== 'completed' && (
                    <Button onClick={handleSaveReport} disabled={updating}>
                      <Save className="w-4 h-4 mr-2" />
                      Raporu Kaydet
                    </Button>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="photos" className="space-y-4 mt-4">
              <div className="mb-4">
                <Dialog open={photoDialogOpen} onOpenChange={setPhotoDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="upload-photo-btn">
                      <Upload className="w-4 h-4 mr-2" />
                      Fotoğraf Yükle
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Servis Fotoğrafları Yükle</DialogTitle>
                    </DialogHeader>
                    <FileUpload
                      onFilesSelected={setSelectedFiles}
                      maxFiles={10}
                      maxSizeMB={10}
                      accept="image/*"
                    />
                    <div className="flex gap-2 pt-4">
                      <Button onClick={handleUploadPhotos} disabled={selectedFiles.length === 0 || uploading}>
                        {uploading ? "Yükleniyor..." : "Yükle"}
                      </Button>
                      <Button variant="outline" onClick={() => setPhotoDialogOpen(false)}>
                        İptal
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {photos.length === 0 ? (
                <Card className="p-8">
                  <p className="text-center text-muted-foreground">Fotoğraf yok</p>
                </Card>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {photos.map((photo) => (
                    <Card key={photo.id} className="overflow-hidden">
                      <img 
                        src={`data:${photo.file_type};base64,${photo.file_data}`}
                        alt={photo.filename}
                        className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                      />
                      <CardContent className="p-2">
                        <p className="text-xs text-muted-foreground truncate">{photo.filename}</p>
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
              <CardTitle className="text-lg">Teknisyen Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{technician?.full_name}</p>
                  <p className="text-sm text-muted-foreground">{technician?.role}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Durum Yönetimi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Durum Güncelle</Label>
                <Select 
                  value={workOrder.status} 
                  onValueChange={async (newStatus) => {
                    setUpdating(true);
                    try {
                      const token = localStorage.getItem('token');
                      await axios.patch(`${API}/work-orders/${id}`, { status: newStatus }, {
                        headers: { Authorization: `Bearer ${token}` }
                      });
                      toast.success("Durum güncellendi");
                      fetchWorkOrderDetails();
                    } catch (error) {
                      toast.error("Durum güncellenirken hata oluştu");
                    } finally {
                      setUpdating(false);
                    }
                  }}
                  disabled={updating}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Planlandı</SelectItem>
                    <SelectItem value="in_progress">Devam Ediyor</SelectItem>
                    <SelectItem value="completed">Tamamlandı</SelectItem>
                    <SelectItem value="cancelled">İptal Edildi</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {workOrder.status !== 'completed' && (
                <Button 
                  className="w-full" 
                  onClick={handleCompleteWorkOrder}
                  disabled={updating || progress < 100}
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  İş Emrini Tamamla
                </Button>
              )}

              {workOrder.completed_at && (
                <div className="text-sm text-muted-foreground">
                  <p>Tamamlanma: {new Date(workOrder.completed_at).toLocaleString('tr-TR')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {timeSpent > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Süre Bilgileri</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{timeSpent}</p>
                    <p className="text-sm text-muted-foreground">dakika</p>
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
