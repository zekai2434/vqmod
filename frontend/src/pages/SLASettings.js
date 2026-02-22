import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Plus, Clock, Calendar, Edit, Trash2, Star, AlertTriangle
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const DEFAULT_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"
];

export default function SLASettings() {
  const [slaProfiles, setSlaProfiles] = useState([]);
  const [businessHours, setBusinessHours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [hoursDialogOpen, setHoursDialogOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const [editingHours, setEditingHours] = useState(null);

  const [profileForm, setProfileForm] = useState({
    name: "",
    code: "",
    description: "",
    response_time_hours: 4,
    resolution_time_hours: 24,
    is_default: false,
    color: "#3b82f6"
  });

  const [hoursForm, setHoursForm] = useState({
    name: "",
    description: "",
    timezone: "Europe/Istanbul",
    monday: { start: "09:00", end: "18:00", enabled: true },
    tuesday: { start: "09:00", end: "18:00", enabled: true },
    wednesday: { start: "09:00", end: "18:00", enabled: true },
    thursday: { start: "09:00", end: "18:00", enabled: true },
    friday: { start: "09:00", end: "18:00", enabled: true },
    saturday: { start: "09:00", end: "13:00", enabled: false },
    sunday: { start: "00:00", end: "00:00", enabled: false },
    holidays: [],
    is_default: false
  });

  const [newHoliday, setNewHoliday] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [profilesRes, hoursRes] = await Promise.all([
        axios.get(`${API}/sla-profiles`, { headers }),
        axios.get(`${API}/business-hours`, { headers })
      ]);
      
      setSlaProfiles(profilesRes.data);
      setBusinessHours(hoursRes.data);
    } catch (error) {
      toast.error("Veriler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      if (editingProfile) {
        await axios.patch(`${API}/sla-profiles/${editingProfile.id}`, profileForm, { headers });
        toast.success("SLA profili güncellendi");
      } else {
        await axios.post(`${API}/sla-profiles`, profileForm, { headers });
        toast.success("SLA profili oluşturuldu");
      }
      
      setProfileDialogOpen(false);
      resetProfileForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "İşlem başarısız");
    }
  };

  const handleSaveHours = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      if (editingHours) {
        await axios.patch(`${API}/business-hours/${editingHours.id}`, hoursForm, { headers });
        toast.success("İş saatleri güncellendi");
      } else {
        await axios.post(`${API}/business-hours`, hoursForm, { headers });
        toast.success("İş saatleri oluşturuldu");
      }
      
      setHoursDialogOpen(false);
      resetHoursForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "İşlem başarısız");
    }
  };

  const handleDeleteProfile = async (id) => {
    if (!confirm("Bu SLA profilini silmek istediğinizden emin misiniz?")) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/sla-profiles/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("SLA profili silindi");
      fetchData();
    } catch (error) {
      toast.error("Silme işlemi başarısız");
    }
  };

  const resetProfileForm = () => {
    setProfileForm({
      name: "",
      code: "",
      description: "",
      response_time_hours: 4,
      resolution_time_hours: 24,
      is_default: false,
      color: "#3b82f6"
    });
    setEditingProfile(null);
  };

  const resetHoursForm = () => {
    setHoursForm({
      name: "",
      description: "",
      timezone: "Europe/Istanbul",
      monday: { start: "09:00", end: "18:00", enabled: true },
      tuesday: { start: "09:00", end: "18:00", enabled: true },
      wednesday: { start: "09:00", end: "18:00", enabled: true },
      thursday: { start: "09:00", end: "18:00", enabled: true },
      friday: { start: "09:00", end: "18:00", enabled: true },
      saturday: { start: "09:00", end: "13:00", enabled: false },
      sunday: { start: "00:00", end: "00:00", enabled: false },
      holidays: [],
      is_default: false
    });
    setEditingHours(null);
  };

  const openEditProfile = (profile) => {
    setProfileForm({
      name: profile.name,
      code: profile.code,
      description: profile.description || "",
      response_time_hours: profile.response_time_hours,
      resolution_time_hours: profile.resolution_time_hours,
      is_default: profile.is_default,
      color: profile.color
    });
    setEditingProfile(profile);
    setProfileDialogOpen(true);
  };

  const openEditHours = (hours) => {
    setHoursForm({
      name: hours.name,
      description: hours.description || "",
      timezone: hours.timezone,
      monday: hours.monday,
      tuesday: hours.tuesday,
      wednesday: hours.wednesday,
      thursday: hours.thursday,
      friday: hours.friday,
      saturday: hours.saturday,
      sunday: hours.sunday,
      holidays: hours.holidays || [],
      is_default: hours.is_default
    });
    setEditingHours(hours);
    setHoursDialogOpen(true);
  };

  const addHoliday = () => {
    if (newHoliday && !hoursForm.holidays.includes(newHoliday)) {
      setHoursForm({...hoursForm, holidays: [...hoursForm.holidays, newHoliday]});
      setNewHoliday("");
    }
  };

  const removeHoliday = (date) => {
    setHoursForm({...hoursForm, holidays: hoursForm.holidays.filter(h => h !== date)});
  };

  const DAYS = [
    { key: "monday", label: "Pazartesi" },
    { key: "tuesday", label: "Salı" },
    { key: "wednesday", label: "Çarşamba" },
    { key: "thursday", label: "Perşembe" },
    { key: "friday", label: "Cuma" },
    { key: "saturday", label: "Cumartesi" },
    { key: "sunday", label: "Pazar" }
  ];

  if (loading) {
    return <div className="flex items-center justify-center h-96">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6" data-testid="sla-settings-page">
      <div>
        <h1 className="text-4xl font-bold tracking-tight" style={{fontFamily: 'Chivo, sans-serif'}}>SLA Yönetimi</h1>
        <p className="text-muted-foreground mt-2">SLA profillerini ve iş saatlerini yapılandırın</p>
      </div>

      <Tabs defaultValue="profiles">
        <TabsList>
          <TabsTrigger value="profiles">
            <Clock className="w-4 h-4 mr-2" />
            SLA Profilleri ({slaProfiles.length})
          </TabsTrigger>
          <TabsTrigger value="hours">
            <Calendar className="w-4 h-4 mr-2" />
            İş Saatleri ({businessHours.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profiles" className="space-y-4 mt-6">
          <div className="flex justify-end">
            <Dialog open={profileDialogOpen} onOpenChange={(open) => { setProfileDialogOpen(open); if (!open) resetProfileForm(); }}>
              <DialogTrigger asChild>
                <Button data-testid="add-sla-profile-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Yeni SLA Profili
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingProfile ? "SLA Profili Düzenle" : "Yeni SLA Profili"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Profil Adı *</Label>
                      <Input
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({...profileForm, name: e.target.value})}
                        placeholder="Kritik SLA"
                        data-testid="profile-name-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Kod *</Label>
                      <Input
                        value={profileForm.code}
                        onChange={(e) => setProfileForm({...profileForm, code: e.target.value.toUpperCase()})}
                        placeholder="P1"
                        disabled={!!editingProfile}
                        data-testid="profile-code-input"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Açıklama</Label>
                    <Textarea
                      value={profileForm.description}
                      onChange={(e) => setProfileForm({...profileForm, description: e.target.value})}
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>İlk Yanıt Süresi (saat) *</Label>
                      <Input
                        type="number"
                        min="1"
                        value={profileForm.response_time_hours}
                        onChange={(e) => setProfileForm({...profileForm, response_time_hours: parseInt(e.target.value) || 1})}
                        data-testid="response-time-input"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Çözüm Süresi (saat) *</Label>
                      <Input
                        type="number"
                        min="1"
                        value={profileForm.resolution_time_hours}
                        onChange={(e) => setProfileForm({...profileForm, resolution_time_hours: parseInt(e.target.value) || 1})}
                        data-testid="resolution-time-input"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Renk</Label>
                    <div className="flex gap-2">
                      {DEFAULT_COLORS.map(color => (
                        <div
                          key={color}
                          className={`w-8 h-8 rounded-full cursor-pointer border-2 ${profileForm.color === color ? 'border-foreground' : 'border-transparent'}`}
                          style={{ backgroundColor: color }}
                          onClick={() => setProfileForm({...profileForm, color})}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={profileForm.is_default}
                      onCheckedChange={(checked) => setProfileForm({...profileForm, is_default: checked})}
                    />
                    <Label>Varsayılan profil olarak ayarla</Label>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleSaveProfile} data-testid="save-profile-btn">Kaydet</Button>
                    <Button variant="outline" onClick={() => { setProfileDialogOpen(false); resetProfileForm(); }}>İptal</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {slaProfiles.length === 0 ? (
            <Card className="p-12">
              <div className="text-center">
                <Clock className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Henüz SLA profili tanımlanmamış</p>
                <p className="text-sm text-muted-foreground mt-1">Farklı öncelikler için SLA profilleri oluşturun</p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {slaProfiles.map(profile => (
                <Card key={profile.id} data-testid={`sla-profile-${profile.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: profile.color }} />
                        <div>
                          <CardTitle className="text-lg flex items-center gap-2">
                            {profile.name}
                            {profile.is_default && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                          </CardTitle>
                          <Badge variant="outline">{profile.code}</Badge>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditProfile(profile)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteProfile(profile.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {profile.description && (
                      <p className="text-sm text-muted-foreground mb-4">{profile.description}</p>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">İlk Yanıt</p>
                        <p className="font-bold text-lg">{profile.response_time_hours}s</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Çözüm</p>
                        <p className="font-bold text-lg">{profile.resolution_time_hours}s</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="hours" className="space-y-4 mt-6">
          <div className="flex justify-end">
            <Dialog open={hoursDialogOpen} onOpenChange={(open) => { setHoursDialogOpen(open); if (!open) resetHoursForm(); }}>
              <DialogTrigger asChild>
                <Button data-testid="add-business-hours-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Yeni İş Saatleri
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingHours ? "İş Saatleri Düzenle" : "Yeni İş Saatleri"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Takvim Adı *</Label>
                      <Input
                        value={hoursForm.name}
                        onChange={(e) => setHoursForm({...hoursForm, name: e.target.value})}
                        placeholder="Standart Mesai"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Zaman Dilimi</Label>
                      <Input
                        value={hoursForm.timezone}
                        onChange={(e) => setHoursForm({...hoursForm, timezone: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Açıklama</Label>
                    <Textarea
                      value={hoursForm.description}
                      onChange={(e) => setHoursForm({...hoursForm, description: e.target.value})}
                      rows={2}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Çalışma Günleri</Label>
                    {DAYS.map(day => (
                      <div key={day.key} className="flex items-center gap-4 p-3 rounded-lg border">
                        <Switch
                          checked={hoursForm[day.key]?.enabled}
                          onCheckedChange={(checked) => setHoursForm({
                            ...hoursForm,
                            [day.key]: {...hoursForm[day.key], enabled: checked}
                          })}
                        />
                        <span className="w-24 font-medium">{day.label}</span>
                        <Input
                          type="time"
                          value={hoursForm[day.key]?.start || "09:00"}
                          onChange={(e) => setHoursForm({
                            ...hoursForm,
                            [day.key]: {...hoursForm[day.key], start: e.target.value}
                          })}
                          disabled={!hoursForm[day.key]?.enabled}
                          className="w-32"
                        />
                        <span>-</span>
                        <Input
                          type="time"
                          value={hoursForm[day.key]?.end || "18:00"}
                          onChange={(e) => setHoursForm({
                            ...hoursForm,
                            [day.key]: {...hoursForm[day.key], end: e.target.value}
                          })}
                          disabled={!hoursForm[day.key]?.enabled}
                          className="w-32"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <Label>Tatil Günleri</Label>
                    <div className="flex gap-2">
                      <Input
                        type="date"
                        value={newHoliday}
                        onChange={(e) => setNewHoliday(e.target.value)}
                        className="flex-1"
                      />
                      <Button type="button" variant="outline" onClick={addHoliday}>Ekle</Button>
                    </div>
                    {hoursForm.holidays.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {hoursForm.holidays.map(date => (
                          <Badge key={date} variant="outline" className="cursor-pointer" onClick={() => removeHoliday(date)}>
                            {date} ×
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={hoursForm.is_default}
                      onCheckedChange={(checked) => setHoursForm({...hoursForm, is_default: checked})}
                    />
                    <Label>Varsayılan takvim olarak ayarla</Label>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button onClick={handleSaveHours}>Kaydet</Button>
                    <Button variant="outline" onClick={() => { setHoursDialogOpen(false); resetHoursForm(); }}>İptal</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {businessHours.length === 0 ? (
            <Card className="p-12">
              <div className="text-center">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Henüz iş saatleri takvimi tanımlanmamış</p>
                <p className="text-sm text-muted-foreground mt-1">SLA hesaplamalarında kullanılacak çalışma saatlerini belirleyin</p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {businessHours.map(hours => (
                <Card key={hours.id} data-testid={`business-hours-${hours.id}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {hours.name}
                          {hours.is_default && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                        </CardTitle>
                        <CardDescription>{hours.timezone}</CardDescription>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => openEditHours(hours)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm">
                      {DAYS.map(day => (
                        <div key={day.key} className="flex items-center justify-between">
                          <span className={hours[day.key]?.enabled ? "" : "text-muted-foreground"}>{day.label}</span>
                          <span className={hours[day.key]?.enabled ? "font-medium" : "text-muted-foreground"}>
                            {hours[day.key]?.enabled ? `${hours[day.key].start} - ${hours[day.key].end}` : "Kapalı"}
                          </span>
                        </div>
                      ))}
                    </div>
                    {hours.holidays?.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-xs text-muted-foreground mb-1">Tatil Günleri: {hours.holidays.length}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
