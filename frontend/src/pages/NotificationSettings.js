import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Mail, MessageSquare, Bell, Settings, Send, CheckCircle, XCircle, Clock,
  AlertTriangle, User, Phone
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function NotificationSettings() {
  const [settings, setSettings] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testingSms, setTestingSms] = useState(false);
  const [testPhone, setTestPhone] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [settingsRes, notificationsRes] = await Promise.all([
        axios.get(`${API}/notifications/settings`, { headers }),
        axios.get(`${API}/notifications?limit=50`, { headers })
      ]);
      
      setSettings(settingsRes.data);
      setNotifications(notificationsRes.data);
    } catch (error) {
      toast.error("Ayarlar yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API}/notifications/settings`, settings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Ayarlar kaydedildi");
    } catch (error) {
      toast.error("Ayarlar kaydedilirken hata oluştu");
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    try {
      const token = localStorage.getItem('token');
      const result = await axios.post(`${API}/notifications/test-email`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (result.data.status === "sent") {
        toast.success("Test e-postası gönderildi!");
      } else {
        toast.warning(`E-posta gönderilemedi: ${result.data.reason || result.data.error}`);
      }
    } catch (error) {
      toast.error("Test e-postası gönderilemedi");
    } finally {
      setTestingEmail(false);
    }
  };

  const handleTestSms = async () => {
    if (!testPhone) {
      toast.error("Lütfen telefon numarası girin");
      return;
    }
    
    setTestingSms(true);
    try {
      const token = localStorage.getItem('token');
      const result = await axios.post(`${API}/notifications/test-sms?phone=${encodeURIComponent(testPhone)}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (result.data.status === "sent") {
        toast.success("Test SMS'i gönderildi!");
      } else {
        toast.warning(`SMS gönderilemedi: ${result.data.reason || result.data.error}`);
      }
    } catch (error) {
      toast.error("Test SMS'i gönderilemedi");
    } finally {
      setTestingSms(false);
    }
  };

  const handleRunSlaCheck = async () => {
    try {
      const token = localStorage.getItem('token');
      const result = await axios.post(`${API}/notifications/sla-check`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success(`SLA kontrolü tamamlandı. ${result.data.notified} bildirim gönderildi.`);
    } catch (error) {
      toast.error("SLA kontrolü yapılamadı");
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      sent: { variant: "success", icon: CheckCircle, label: "Gönderildi" },
      failed: { variant: "error", icon: XCircle, label: "Başarısız" },
      pending: { variant: "warning", icon: Clock, label: "Bekliyor" },
      skipped: { variant: "outline", icon: AlertTriangle, label: "Atlandı" }
    };
    const { variant, icon: Icon, label } = config[status] || config.pending;
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };

  const getChannelIcon = (channel) => {
    return channel === "email" ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6" data-testid="notification-settings-page">
      <div>
        <h1 className="text-4xl font-bold tracking-tight" style={{fontFamily: 'Chivo, sans-serif'}}>Bildirim Ayarları</h1>
        <p className="text-muted-foreground mt-2">E-posta ve SMS bildirimlerini yapılandırın</p>
      </div>

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings">
            <Settings className="w-4 h-4 mr-2" />
            Ayarlar
          </TabsTrigger>
          <TabsTrigger value="history">
            <Bell className="w-4 h-4 mr-2" />
            Bildirim Geçmişi ({notifications.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-6 mt-6">
          {/* Channel Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bildirim Kanalları</CardTitle>
              <CardDescription>Hangi kanallar üzerinden bildirim gönderileceğini seçin</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="font-medium">E-posta Bildirimleri</p>
                    <p className="text-sm text-muted-foreground">Resend üzerinden e-posta gönderimi</p>
                  </div>
                </div>
                <Switch
                  checked={settings?.email_enabled || false}
                  onCheckedChange={(checked) => setSettings({...settings, email_enabled: checked})}
                  data-testid="email-toggle"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="font-medium">SMS Bildirimleri</p>
                    <p className="text-sm text-muted-foreground">NetGSM üzerinden SMS gönderimi</p>
                  </div>
                </div>
                <Switch
                  checked={settings?.sms_enabled || false}
                  onCheckedChange={(checked) => setSettings({...settings, sms_enabled: checked})}
                  data-testid="sms-toggle"
                />
              </div>
            </CardContent>
          </Card>

          {/* NetGSM Settings */}
          {settings?.sms_enabled && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">NetGSM Ayarları</CardTitle>
                <CardDescription>SMS gönderimi için NetGSM hesap bilgileri</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Kullanıcı Adı</Label>
                    <Input
                      value={settings?.netgsm_username || ""}
                      onChange={(e) => setSettings({...settings, netgsm_username: e.target.value})}
                      placeholder="NetGSM kullanıcı adı"
                      data-testid="netgsm-username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Şifre</Label>
                    <Input
                      type="password"
                      value={settings?.netgsm_password || ""}
                      onChange={(e) => setSettings({...settings, netgsm_password: e.target.value})}
                      placeholder="••••••••"
                      data-testid="netgsm-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Başlık (Header)</Label>
                    <Input
                      value={settings?.netgsm_header || ""}
                      onChange={(e) => setSettings({...settings, netgsm_header: e.target.value})}
                      placeholder="SIRKETADI"
                      data-testid="netgsm-header"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4 pt-2">
                  <Input
                    placeholder="Test telefon numarası (5XXXXXXXXX)"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    className="max-w-xs"
                  />
                  <Button variant="outline" onClick={handleTestSms} disabled={testingSms}>
                    <Send className="w-4 h-4 mr-2" />
                    {testingSms ? "Gönderiliyor..." : "Test SMS Gönder"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notification Events */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bildirim Olayları</CardTitle>
              <CardDescription>Hangi olaylarda bildirim gönderileceğini seçin</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <span className="text-sm">Ticket oluşturulduğunda</span>
                  <Switch
                    checked={settings?.notify_on_ticket_created || false}
                    onCheckedChange={(checked) => setSettings({...settings, notify_on_ticket_created: checked})}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <span className="text-sm">Ticket atandığında</span>
                  <Switch
                    checked={settings?.notify_on_ticket_assigned || false}
                    onCheckedChange={(checked) => setSettings({...settings, notify_on_ticket_assigned: checked})}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <span className="text-sm">Ticket güncellendiğinde</span>
                  <Switch
                    checked={settings?.notify_on_ticket_updated || false}
                    onCheckedChange={(checked) => setSettings({...settings, notify_on_ticket_updated: checked})}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <span className="text-sm">Ticket çözümlendiğinde</span>
                  <Switch
                    checked={settings?.notify_on_ticket_resolved || false}
                    onCheckedChange={(checked) => setSettings({...settings, notify_on_ticket_resolved: checked})}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <span className="text-sm">SLA risk durumunda</span>
                  <Switch
                    checked={settings?.notify_on_sla_risk || false}
                    onCheckedChange={(checked) => setSettings({...settings, notify_on_sla_risk: checked})}
                  />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border">
                  <span className="text-sm">Yorumda bahsedildiğinde (@mention)</span>
                  <Switch
                    checked={settings?.notify_on_comment_mention || false}
                    onCheckedChange={(checked) => setSettings({...settings, notify_on_comment_mention: checked})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <Button onClick={handleSaveSettings} disabled={saving} data-testid="save-settings-btn">
              {saving ? "Kaydediliyor..." : "Ayarları Kaydet"}
            </Button>
            <Button variant="outline" onClick={handleTestEmail} disabled={testingEmail}>
              <Mail className="w-4 h-4 mr-2" />
              {testingEmail ? "Gönderiliyor..." : "Test E-postası Gönder"}
            </Button>
            <Button variant="outline" onClick={handleRunSlaCheck}>
              <AlertTriangle className="w-4 h-4 mr-2" />
              SLA Kontrolü Çalıştır
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          {notifications.length === 0 ? (
            <Card className="p-12">
              <div className="text-center">
                <Bell className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Henüz bildirim gönderilmemiş</p>
              </div>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <div key={notification.id} className="p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3">
                          {getChannelIcon(notification.channel)}
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              {getStatusBadge(notification.status)}
                              <Badge variant="outline">{notification.notification_type}</Badge>
                            </div>
                            <p className="text-sm font-medium">{notification.subject || notification.content?.slice(0, 50)}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {notification.recipient_email || notification.recipient_phone}
                            </p>
                            {notification.error_message && (
                              <p className="text-xs text-red-500 mt-1">{notification.error_message}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          {new Date(notification.created_at).toLocaleString('tr-TR')}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
