import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import axios from "axios";
import { toast } from "sonner";
import { 
  MessageCircle, 
  QrCode, 
  RefreshCw, 
  Send, 
  Phone, 
  CheckCircle, 
  XCircle, 
  Wifi, 
  WifiOff,
  ArrowDownLeft,
  ArrowUpRight,
  Clock
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

export default function WhatsAppSettings() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [qrData, setQrData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sendForm, setSendForm] = useState({ phone_number: "", message: "" });
  const [sending, setSending] = useState(false);
  const qrPollRef = useRef(null);

  useEffect(() => {
    fetchStatus();
    fetchMessages();
    return () => {
      if (qrPollRef.current) clearInterval(qrPollRef.current);
    };
  }, []);

  useEffect(() => {
    if (status?.status === 'waiting_qr' || status?.status === 'connecting') {
      // Poll for QR updates
      qrPollRef.current = setInterval(fetchQR, 3000);
    } else {
      if (qrPollRef.current) {
        clearInterval(qrPollRef.current);
        qrPollRef.current = null;
      }
    }
  }, [status?.status]);

  const fetchStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/api/whatsapp/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus(response.data);
    } catch (error) {
      console.error("Error fetching status:", error);
      setStatus({ connected: false, status: "error" });
    } finally {
      setLoading(false);
    }
  };

  const fetchQR = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/api/whatsapp/qr`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setQrData(response.data);
      
      // Also update status
      if (response.data.status !== status?.status) {
        fetchStatus();
      }
    } catch (error) {
      console.error("Error fetching QR:", error);
    }
  };

  const fetchMessages = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API}/api/whatsapp/messages?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const handleReconnect = async () => {
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/api/whatsapp/reconnect`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Yeniden bağlanılıyor...");
      setStatus({ ...status, status: "connecting" });
      setTimeout(fetchQR, 2000);
    } catch (error) {
      toast.error("Bağlantı hatası");
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("WhatsApp bağlantısını kesmek istediğinize emin misiniz?")) return;
    
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/api/whatsapp/disconnect`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Bağlantı kesildi");
      fetchStatus();
    } catch (error) {
      toast.error("Bağlantı kesme hatası");
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!sendForm.phone_number || !sendForm.message) return;

    setSending(true);
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(`${API}/api/whatsapp/send`, sendForm, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        toast.success("Mesaj gönderildi");
        setSendForm({ ...sendForm, message: "" });
        fetchMessages();
      } else {
        toast.error(response.data.error || "Mesaj gönderilemedi");
      }
    } catch (error) {
      toast.error("Gönderim hatası");
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = () => {
    if (!status) return null;
    
    const statusConfig = {
      connected: { color: "bg-green-500/20 text-green-400 border-green-500/30", label: "Bağlı", icon: CheckCircle },
      disconnected: { color: "bg-gray-500/20 text-gray-400 border-gray-500/30", label: "Bağlı Değil", icon: WifiOff },
      waiting_qr: { color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", label: "QR Bekleniyor", icon: QrCode },
      connecting: { color: "bg-blue-500/20 text-blue-400 border-blue-500/30", label: "Bağlanıyor", icon: RefreshCw },
      service_unavailable: { color: "bg-red-500/20 text-red-400 border-red-500/30", label: "Servis Yok", icon: XCircle },
      error: { color: "bg-red-500/20 text-red-400 border-red-500/30", label: "Hata", icon: XCircle }
    };

    const config = statusConfig[status.status] || statusConfig.disconnected;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} border flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.label}
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

  return (
    <div className="space-y-8" data-testid="whatsapp-settings-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">WhatsApp Entegrasyonu</h1>
          <p className="text-muted-foreground">WhatsApp üzerinden müşterilerinizle iletişim kurun</p>
        </div>
        <div className="flex items-center gap-3">
          {getStatusBadge()}
          {status?.phone && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              +{status.phone}
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="connection" className="space-y-6">
        <TabsList>
          <TabsTrigger value="connection" className="flex items-center gap-2">
            <Wifi className="w-4 h-4" />
            Bağlantı
          </TabsTrigger>
          <TabsTrigger value="send" className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            Mesaj Gönder
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4" />
            Mesaj Geçmişi
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connection">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Connection Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wifi className="w-5 h-5" />
                  Bağlantı Durumu
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Durum:</span>
                    {getStatusBadge()}
                  </div>
                  {status?.phone && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Telefon:</span>
                      <span className="font-mono">+{status.phone}</span>
                    </div>
                  )}
                  {status?.timestamp && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Son Güncelleme:</span>
                      <span className="text-sm">{new Date(status.timestamp).toLocaleString("tr-TR")}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  {status?.connected ? (
                    <Button variant="destructive" onClick={handleDisconnect} className="flex-1">
                      <WifiOff className="w-4 h-4 mr-2" />
                      Bağlantıyı Kes
                    </Button>
                  ) : (
                    <Button onClick={handleReconnect} className="flex-1">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Bağlan
                    </Button>
                  )}
                  <Button variant="outline" onClick={fetchStatus}>
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* QR Code */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <QrCode className="w-5 h-5" />
                  QR Kod
                </CardTitle>
                <CardDescription>
                  WhatsApp uygulamanızdan QR kodu tarayın
                </CardDescription>
              </CardHeader>
              <CardContent>
                {status?.connected ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <CheckCircle className="w-16 h-16 text-green-400 mb-4" />
                    <p className="font-medium">WhatsApp Bağlı</p>
                    <p className="text-sm text-muted-foreground">Mesaj gönderip alabilirsiniz</p>
                  </div>
                ) : qrData?.qr ? (
                  <div className="flex flex-col items-center">
                    <img 
                      src={qrData.qr} 
                      alt="WhatsApp QR Code" 
                      className="w-64 h-64 rounded-lg border border-border"
                    />
                    <p className="text-sm text-muted-foreground mt-4 text-center">
                      WhatsApp → Ayarlar → Bağlı Cihazlar → Cihaz Bağla
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <QrCode className="w-16 h-16 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">QR kod henüz oluşturulmadı</p>
                    <Button onClick={handleReconnect} className="mt-4">
                      QR Kod Oluştur
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Instructions */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Nasıl Kullanılır?</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>"Bağlan" butonuna tıklayarak QR kod oluşturun</li>
                <li>Telefonunuzda WhatsApp'ı açın</li>
                <li>Ayarlar → Bağlı Cihazlar → Cihaz Bağla'ya gidin</li>
                <li>Ekrandaki QR kodu telefonunuzla tarayın</li>
                <li>Bağlantı kurulduğunda mesaj gönderip alabilirsiniz</li>
              </ol>
              <div className="mt-4 p-4 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
                <p className="text-sm text-yellow-400">
                  <strong>Önemli:</strong> WhatsApp Web'de oturum açık kalmalıdır. Telefon kapatılırsa veya internet kesilirse bağlantı kopar.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="send">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                Mesaj Gönder
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!status?.connected ? (
                <div className="text-center py-8">
                  <WifiOff className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Mesaj göndermek için önce WhatsApp'a bağlanın</p>
                </div>
              ) : (
                <form onSubmit={handleSendMessage} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Telefon Numarası</label>
                    <Input
                      placeholder="905XXXXXXXXX (ülke kodu ile)"
                      value={sendForm.phone_number}
                      onChange={(e) => setSendForm({ ...sendForm, phone_number: e.target.value })}
                      required
                      data-testid="whatsapp-phone-input"
                    />
                    <p className="text-xs text-muted-foreground">
                      Örnek: 905551234567 (Türkiye için 90 ile başlayın)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Mesaj</label>
                    <Textarea
                      placeholder="Mesajınızı yazın..."
                      value={sendForm.message}
                      onChange={(e) => setSendForm({ ...sendForm, message: e.target.value })}
                      rows={4}
                      required
                      data-testid="whatsapp-message-input"
                    />
                  </div>

                  <Button type="submit" disabled={sending} className="w-full" data-testid="whatsapp-send-btn">
                    {sending ? (
                      <span className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Gönderiliyor...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Send className="w-4 h-4" />
                        Gönder
                      </span>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Mesaj Geçmişi
              </CardTitle>
              <Button variant="outline" size="sm" onClick={fetchMessages}>
                <RefreshCw className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <p className="text-muted-foreground">Henüz mesaj yok</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-4 rounded-lg border ${
                        msg.direction === "inbound"
                          ? "bg-muted/50 border-border"
                          : "bg-primary/5 border-primary/20"
                      }`}
                      data-testid={`whatsapp-msg-${msg.id}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          {msg.direction === "inbound" ? (
                            <ArrowDownLeft className="w-4 h-4 text-blue-400" />
                          ) : (
                            <ArrowUpRight className="w-4 h-4 text-green-400" />
                          )}
                          <span className="font-mono text-sm">+{msg.phone_number}</span>
                        </div>
                        <Badge className={
                          msg.status === "sent" || msg.status === "received"
                            ? "bg-green-500/20 text-green-400"
                            : msg.status === "failed"
                            ? "bg-red-500/20 text-red-400"
                            : "bg-gray-500/20 text-gray-400"
                        }>
                          {msg.status === "sent" ? "Gönderildi" : 
                           msg.status === "received" ? "Alındı" :
                           msg.status === "failed" ? "Başarısız" : msg.status}
                        </Badge>
                      </div>
                      <p className="text-sm">{msg.message}</p>
                      <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(msg.created_at).toLocaleString("tr-TR")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
