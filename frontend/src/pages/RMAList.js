import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function RMAList() {
  const [rmaList, setRmaList] = useState([]);
  const [assets, setAssets] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    asset_id: "",
    ticket_id: "",
    reason: ""
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      const [rmaRes, assetsRes, ticketsRes] = await Promise.all([
        axios.get(`${API}/rma`, { headers }),
        axios.get(`${API}/assets`, { headers }),
        axios.get(`${API}/tickets`, { headers })
      ]);
      setRmaList(rmaRes.data);
      setAssets(assetsRes.data);
      setTickets(ticketsRes.data);
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
      await axios.post(`${API}/rma`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("RMA başarıyla oluşturuldu");
      setDialogOpen(false);
      setFormData({ asset_id: "", ticket_id: "", reason: "" });
      fetchData();
    } catch (error) {
      toast.error("RMA oluşturulurken hata oluştu");
    }
  };

  const getAssetInfo = (assetId) => {
    const asset = assets.find(a => a.id === assetId);
    return asset ? `${asset.device_type} - ${asset.serial_number}` : 'Bilinmeyen';
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: { variant: "warning", label: "Beklemede" },
      approved: { variant: "info", label: "Onaylandı" },
      shipped: { variant: "secondary", label: "Kargoda" },
      completed: { variant: "success", label: "Tamamlandı" },
      rejected: { variant: "error", label: "Reddedildi" }
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6" data-testid="rma-list-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight" style={{fontFamily: 'Chivo, sans-serif'}}>RMA Yönetimi</h1>
          <p className="text-muted-foreground mt-2">Garanti ve iade süreçlerini takip edin</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-rma-btn">
              <Plus className="w-5 h-5 mr-2" />
              Yeni RMA
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Yeni RMA Oluştur</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="asset_id">Cihaz *</Label>
                <Select value={formData.asset_id} onValueChange={(v) => setFormData({...formData, asset_id: v})} required>
                  <SelectTrigger data-testid="rma-asset-select">
                    <SelectValue placeholder="Cihaz seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {assets.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.device_type} - {a.serial_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ticket_id">İlgili Ticket</Label>
                <Select value={formData.ticket_id} onValueChange={(v) => setFormData({...formData, ticket_id: v})}>
                  <SelectTrigger data-testid="rma-ticket-select">
                    <SelectValue placeholder="Ticket seçin (opsiyonel)" />
                  </SelectTrigger>
                  <SelectContent>
                    {tickets.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.ticket_number} - {t.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">İade Nedeni *</Label>
                <Textarea
                  id="reason"
                  data-testid="rma-reason-input"
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  rows={4}
                  required
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button data-testid="submit-rma-btn" type="submit">Oluştur</Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {rmaList.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <p className="text-muted-foreground">Henüz RMA kaydı yok</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {rmaList.map((rma) => (
            <Card key={rma.id} data-testid={`rma-card-${rma.rma_number}`} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="w-5 h-5 text-primary" />
                      <span className="font-mono text-lg font-bold">{rma.rma_number}</span>
                      {getStatusBadge(rma.status)}
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-muted-foreground">Cihaz</p>
                        <p className="font-medium">{getAssetInfo(rma.asset_id)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">İade Nedeni</p>
                        <p className="text-sm">{rma.reason}</p>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>Oluşturulma: {new Date(rma.created_at).toLocaleDateString('tr-TR')}</span>
                        {rma.completed_at && (
                          <>
                            <span>•</span>
                            <span>Tamamlanma: {new Date(rma.completed_at).toLocaleDateString('tr-TR')}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}