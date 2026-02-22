import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import axios from "axios";
import { toast } from "sonner";
import { Mail, Plus, Settings, Trash2, RefreshCw, CheckCircle, XCircle, Clock, Play } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

export default function EmailSettings() {
  const [loading, setLoading] = useState(true);
  const [configs, setConfigs] = useState([]);
  const [emailTickets, setEmailTickets] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [testing, setTesting] = useState(null);
  const [checking, setChecking] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    server: "",
    port: 993,
    username: "",
    password: "",
    encryption_type: "SSL",
    folder: "INBOX",
    polling_interval_minutes: 5,
    auto_create_ticket: true,
    default_category: "email",
    default_priority: "medium"
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      const [configsRes, ticketsRes] = await Promise.all([
        axios.get(`${API}/api/imap-configs`, { headers }),
        axios.get(`${API}/api/email-tickets?limit=20`, { headers })
      ]);

      setConfigs(configsRes.data);
      setEmailTickets(ticketsRes.data);
    } catch (error) {
      toast.error("Veriler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateConfig = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/api/imap-configs`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success("IMAP yapılandırması oluşturuldu");
      setIsDialogOpen(false);
      setFormData({
        name: "",
        server: "",
        port: 993,
        username: "",
        password: "",
        encryption_type: "SSL",
        folder: "INBOX",
        polling_interval_minutes: 5,
        auto_create_ticket: true,
        default_category: "email",
        default_priority: "medium"
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Yapılandırma oluşturulamadı");
    }
  };

  const handleTestConfig = async (configId) => {
    setTesting(configId);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API}/api/imap-configs/${configId}/test`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        toast.success(response.data.message);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error("Bağlantı testi başarısız");
    } finally {
      setTesting(null);
    }
  };

  const handleDeleteConfig = async (configId) => {
    if (!confirm("Bu yapılandırmayı silmek istediğinize emin misiniz?")) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/api/imap-configs/${configId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success("Yapılandırma silindi");
      fetchData();
    } catch (error) {
      toast.error("Yapılandırma silinemedi");
    }
  };

  const handleCheckEmails = async () => {
    setChecking(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API}/api/imap-configs/check-emails`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success("E-posta kontrolü başlatıldı");
      setTimeout(fetchData, 5000);
    } catch (error) {
      toast.error("E-posta kontrolü başlatılamadı");
    } finally {
      setChecking(false);
    }
  };

  const imapPresets = [
    { name: "Gmail", server: "imap.gmail.com", port: 993 },
    { name: "Outlook", server: "outlook.office365.com", port: 993 },
    { name: "Yahoo", server: "imap.mail.yahoo.com", port: 993 },
    { name: "Yandex", server: "imap.yandex.com", port: 993 }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8" data-testid="email-settings-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">E-posta Ayarları</h1>
          <p className="text-muted-foreground">IMAP ile otomatik ticket oluşturma</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleCheckEmails}
            disabled={checking || configs.length === 0}
            data-testid="check-emails-btn"
          >
            {checking ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Play className="w-4 h-4 mr-2" />
            )}
            E-postaları Kontrol Et
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="add-imap-config-btn">
                <Plus className="w-4 h-4 mr-2" />
                IMAP Ekle
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Yeni IMAP Yapılandırması</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCreateConfig} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Yapılandırma Adı</label>
                  <Input
                    placeholder="Örn: Destek E-postası"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    data-testid="imap-name-input"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Hızlı Seçim</label>
                  <div className="flex flex-wrap gap-2">
                    {imapPresets.map((preset) => (
                      <Button
                        key={preset.name}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setFormData({ 
                          ...formData, 
                          server: preset.server, 
                          port: preset.port 
                        })}
                      >
                        {preset.name}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">IMAP Sunucu</label>
                    <Input
                      placeholder="imap.gmail.com"
                      value={formData.server}
                      onChange={(e) => setFormData({ ...formData, server: e.target.value })}
                      required
                      data-testid="imap-server-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Port</label>
                    <Input
                      type="number"
                      value={formData.port}
                      onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                      required
                      data-testid="imap-port-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">E-posta Adresi</label>
                  <Input
                    type="email"
                    placeholder="destek@firma.com"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required
                    data-testid="imap-username-input"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Şifre / Uygulama Şifresi</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    data-testid="imap-password-input"
                  />
                  <p className="text-xs text-muted-foreground">
                    Gmail için uygulama şifresi kullanın
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Şifreleme</label>
                    <Select
                      value={formData.encryption_type}
                      onValueChange={(value) => setFormData({ ...formData, encryption_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SSL">SSL</SelectItem>
                        <SelectItem value="TLS">TLS</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Klasör</label>
                    <Input
                      value={formData.folder}
                      onChange={(e) => setFormData({ ...formData, folder: e.target.value })}
                      data-testid="imap-folder-input"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Varsayılan Kategori</label>
                    <Select
                      value={formData.default_category}
                      onValueChange={(value) => setFormData({ ...formData, default_category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="email">E-posta</SelectItem>
                        <SelectItem value="technical">Teknik</SelectItem>
                        <SelectItem value="network">Ağ</SelectItem>
                        <SelectItem value="hardware">Donanım</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Varsayılan Öncelik</label>
                    <Select
                      value={formData.default_priority}
                      onValueChange={(value) => setFormData({ ...formData, default_priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Düşük</SelectItem>
                        <SelectItem value="medium">Orta</SelectItem>
                        <SelectItem value="high">Yüksek</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">Otomatik Ticket Oluştur</p>
                    <p className="text-xs text-muted-foreground">
                      Gelen e-postalardan otomatik ticket oluştur
                    </p>
                  </div>
                  <Switch
                    checked={formData.auto_create_ticket}
                    onCheckedChange={(checked) => setFormData({ ...formData, auto_create_ticket: checked })}
                  />
                </div>

                <Button type="submit" className="w-full" data-testid="save-imap-config-btn">
                  Kaydet
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* IMAP Configs */}
      <div className="grid gap-4">
        {configs.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Henüz IMAP yapılandırması yok</p>
              <p className="text-sm text-muted-foreground mt-1">
                E-postalardan otomatik ticket oluşturmak için bir yapılandırma ekleyin
              </p>
            </CardContent>
          </Card>
        ) : (
          configs.map((config) => (
            <Card key={config.id} data-testid={`imap-config-${config.id}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Mail className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{config.name}</h3>
                      <p className="text-sm text-muted-foreground">{config.username}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {config.server}:{config.port} ({config.encryption_type})
                      </p>
                      {config.last_checked && (
                        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Son kontrol: {new Date(config.last_checked).toLocaleString("tr-TR")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={config.is_active ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}>
                      {config.is_active ? "Aktif" : "Pasif"}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestConfig(config.id)}
                      disabled={testing === config.id}
                      data-testid={`test-imap-${config.id}`}
                    >
                      {testing === config.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Settings className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteConfig(config.id)}
                      className="text-destructive hover:text-destructive"
                      data-testid={`delete-imap-${config.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Recent Email Tickets */}
      {emailTickets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Son Gelen E-postalar</CardTitle>
            <CardDescription>E-postalardan oluşturulan ticket'lar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {emailTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="p-4 rounded-lg border border-border flex items-start justify-between"
                  data-testid={`email-ticket-${ticket.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={
                        ticket.status === "processed"
                          ? "bg-green-500/20 text-green-400"
                          : ticket.status === "pending"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-gray-500/20 text-gray-400"
                      }>
                        {ticket.status === "processed" ? "İşlendi" : ticket.status === "pending" ? "Bekliyor" : ticket.status}
                      </Badge>
                      {ticket.ticket_id && (
                        <Badge variant="outline">Ticket Oluşturuldu</Badge>
                      )}
                    </div>
                    <h4 className="font-medium truncate">{ticket.subject}</h4>
                    <p className="text-sm text-muted-foreground">
                      {ticket.sender_name ? `${ticket.sender_name} <${ticket.sender_email}>` : ticket.sender_email}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(ticket.received_date).toLocaleString("tr-TR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {ticket.ticket_id ? (
                      <CheckCircle className="w-5 h-5 text-green-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
