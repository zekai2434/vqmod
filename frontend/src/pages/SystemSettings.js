import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import axios from "axios";
import { toast } from "sonner";
import { 
  Settings, 
  Building2, 
  Palette, 
  Globe, 
  Upload, 
  Trash2, 
  Save, 
  Image,
  Phone,
  Mail,
  MapPin,
  Link as LinkIcon,
  CheckCircle,
  CreditCard,
  FileText,
  Key,
  ExternalLink,
  AlertCircle
} from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

export default function SystemSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    company_name: "NetOps Pro",
    company_slogan: "Teknik Servis Yönetimi",
    company_phone: "",
    company_email: "",
    company_address: "",
    company_website: "",
    logo_url: null,
    logo_dark_url: null,
    favicon_url: null,
    primary_color: "blue",
    portal_title: "Müşteri Portalı",
    portal_welcome_message: "Destek taleplerinizi takip edin ve yönetin",
    portal_logo_url: null,
    footer_text: ""
  });

  const fileInputRef = useRef(null);
  const [uploadingLogo, setUploadingLogo] = useState(null);

  const colorOptions = [
    { value: "blue", label: "Mavi", class: "bg-blue-600" },
    { value: "green", label: "Yeşil", class: "bg-emerald-600" },
    { value: "purple", label: "Mor", class: "bg-purple-600" },
    { value: "orange", label: "Turuncu", class: "bg-orange-600" },
    { value: "cyan", label: "Cyan", class: "bg-cyan-600" },
    { value: "rose", label: "Pembe", class: "bg-rose-600" }
  ];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/api/settings/system`);
      setSettings(prev => ({ ...prev, ...response.data }));
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      await axios.patch(`${API}/api/settings/system`, settings, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Ayarlar kaydedildi");
      
      // Trigger a refresh for components using settings
      window.dispatchEvent(new CustomEvent('settings-updated'));
    } catch (error) {
      toast.error("Ayarlar kaydedilemedi");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e, logoType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(logoType);
    
    const formData = new FormData();
    formData.append("file", file);

    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/api/settings/upload-logo?logo_type=${logoType}`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data"
        }
      });
      toast.success("Logo yüklendi");
      fetchSettings();
    } catch (error) {
      const message = error.response?.data?.detail || "Logo yüklenemedi";
      toast.error(message);
    } finally {
      setUploadingLogo(null);
    }
  };

  const handleRemoveLogo = async (logoType) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/api/settings/remove-logo?logo_type=${logoType}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Logo kaldırıldı");
      fetchSettings();
    } catch (error) {
      toast.error("Logo kaldırılamadı");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="system-settings-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight" style={{fontFamily: 'Chivo, sans-serif'}}>
            Sistem Ayarları
          </h1>
          <p className="text-slate-300">Şirket bilgileri, logo ve tema ayarları</p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/25"
          data-testid="save-settings-btn"
        >
          {saving ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
              Kaydediliyor...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              Kaydet
            </span>
          )}
        </Button>
      </div>

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="bg-slate-800/50 border border-slate-700">
          <TabsTrigger value="company" className="data-[state=active]:bg-slate-700">
            <Building2 className="w-4 h-4 mr-2" />
            Şirket Bilgileri
          </TabsTrigger>
          <TabsTrigger value="branding" className="data-[state=active]:bg-slate-700">
            <Image className="w-4 h-4 mr-2" />
            Logo & Marka
          </TabsTrigger>
          <TabsTrigger value="theme" className="data-[state=active]:bg-slate-700">
            <Palette className="w-4 h-4 mr-2" />
            Tema
          </TabsTrigger>
          <TabsTrigger value="portal" className="data-[state=active]:bg-slate-700">
            <Globe className="w-4 h-4 mr-2" />
            Portal Ayarları
          </TabsTrigger>
        </TabsList>

        {/* Company Info Tab */}
        <TabsContent value="company">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Building2 className="w-5 h-5" />
                Şirket Bilgileri
              </CardTitle>
              <CardDescription>Şirketinizin temel bilgilerini düzenleyin</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-slate-200">Şirket Adı</Label>
                  <Input
                    value={settings.company_name}
                    onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                    placeholder="Şirket adınız"
                    className="bg-slate-800 border-slate-700 text-white"
                    data-testid="company-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-200">Slogan</Label>
                  <Input
                    value={settings.company_slogan}
                    onChange={(e) => setSettings({ ...settings, company_slogan: e.target.value })}
                    placeholder="Şirket sloganı"
                    className="bg-slate-800 border-slate-700 text-white"
                    data-testid="company-slogan-input"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-slate-200 flex items-center gap-2">
                    <Phone className="w-4 h-4" /> Telefon
                  </Label>
                  <Input
                    value={settings.company_phone || ""}
                    onChange={(e) => setSettings({ ...settings, company_phone: e.target.value })}
                    placeholder="0850 XXX XX XX"
                    className="bg-slate-800 border-slate-700 text-white"
                    data-testid="company-phone-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-200 flex items-center gap-2">
                    <Mail className="w-4 h-4" /> E-posta
                  </Label>
                  <Input
                    type="email"
                    value={settings.company_email || ""}
                    onChange={(e) => setSettings({ ...settings, company_email: e.target.value })}
                    placeholder="info@sirket.com"
                    className="bg-slate-800 border-slate-700 text-white"
                    data-testid="company-email-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200 flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" /> Website
                </Label>
                <Input
                  value={settings.company_website || ""}
                  onChange={(e) => setSettings({ ...settings, company_website: e.target.value })}
                  placeholder="https://www.sirket.com"
                  className="bg-slate-800 border-slate-700 text-white"
                  data-testid="company-website-input"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200 flex items-center gap-2">
                  <MapPin className="w-4 h-4" /> Adres
                </Label>
                <Textarea
                  value={settings.company_address || ""}
                  onChange={(e) => setSettings({ ...settings, company_address: e.target.value })}
                  placeholder="Şirket adresi"
                  rows={3}
                  className="bg-slate-800 border-slate-700 text-white"
                  data-testid="company-address-input"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">Footer Metni</Label>
                <Input
                  value={settings.footer_text || ""}
                  onChange={(e) => setSettings({ ...settings, footer_text: e.target.value })}
                  placeholder="© 2025 Şirket Adı. Tüm hakları saklıdır."
                  className="bg-slate-800 border-slate-700 text-white"
                  data-testid="footer-text-input"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Image className="w-5 h-5" />
                Logo & Marka
              </CardTitle>
              <CardDescription>Logo ve favicon yükleyin (PNG, JPEG, SVG - Maks 2MB)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Main Logo */}
              <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-white">Ana Logo</h3>
                    <p className="text-sm text-slate-400">Sidebar ve login sayfasında görünür</p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      className="hidden"
                      id="logo-main"
                      onChange={(e) => handleLogoUpload(e, "main")}
                    />
                    <label htmlFor="logo-main">
                      <Button variant="outline" className="cursor-pointer" asChild disabled={uploadingLogo === "main"}>
                        <span>
                          {uploadingLogo === "main" ? (
                            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                          ) : (
                            <Upload className="w-4 h-4 mr-2" />
                          )}
                          Yükle
                        </span>
                      </Button>
                    </label>
                    {settings.logo_url && (
                      <Button variant="ghost" className="text-rose-400 hover:text-rose-300" onClick={() => handleRemoveLogo("main")}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
                {settings.logo_url ? (
                  <div className="flex items-center justify-center p-4 bg-slate-700 rounded-lg">
                    <img src={settings.logo_url} alt="Logo" className="max-h-16 object-contain" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-8 bg-slate-700/50 rounded-lg border-2 border-dashed border-slate-600">
                    <p className="text-slate-400">Logo yüklenmemiş</p>
                  </div>
                )}
              </div>

              {/* Favicon */}
              <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-white">Favicon</h3>
                    <p className="text-sm text-slate-400">Tarayıcı sekmesinde görünür (32x32 önerilir)</p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept="image/png,image/x-icon,image/svg+xml"
                      className="hidden"
                      id="logo-favicon"
                      onChange={(e) => handleLogoUpload(e, "favicon")}
                    />
                    <label htmlFor="logo-favicon">
                      <Button variant="outline" className="cursor-pointer" asChild disabled={uploadingLogo === "favicon"}>
                        <span>
                          {uploadingLogo === "favicon" ? (
                            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                          ) : (
                            <Upload className="w-4 h-4 mr-2" />
                          )}
                          Yükle
                        </span>
                      </Button>
                    </label>
                    {settings.favicon_url && (
                      <Button variant="ghost" className="text-rose-400 hover:text-rose-300" onClick={() => handleRemoveLogo("favicon")}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
                {settings.favicon_url ? (
                  <div className="flex items-center justify-center p-4 bg-slate-700 rounded-lg">
                    <img src={settings.favicon_url} alt="Favicon" className="w-8 h-8 object-contain" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-4 bg-slate-700/50 rounded-lg border-2 border-dashed border-slate-600">
                    <p className="text-slate-400">Favicon yüklenmemiş</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Theme Tab */}
        <TabsContent value="theme">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Palette className="w-5 h-5" />
                Tema Ayarları
              </CardTitle>
              <CardDescription>Ana tema rengini seçin</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Label className="text-slate-200">Ana Renk</Label>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                  {colorOptions.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setSettings({ ...settings, primary_color: color.value })}
                      className={`relative p-4 rounded-xl border-2 transition-all ${
                        settings.primary_color === color.value
                          ? "border-white"
                          : "border-slate-700 hover:border-slate-600"
                      }`}
                      data-testid={`color-${color.value}`}
                    >
                      <div className={`w-full h-12 rounded-lg ${color.class}`}></div>
                      <p className="text-sm text-slate-300 mt-2 text-center">{color.label}</p>
                      {settings.primary_color === color.value && (
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center">
                          <CheckCircle className="w-4 h-4 text-zinc-900" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Portal Tab */}
        <TabsContent value="portal">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Globe className="w-5 h-5" />
                Portal Ayarları
              </CardTitle>
              <CardDescription>Müşteri portalı görünümünü özelleştirin</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-slate-200">Portal Başlığı</Label>
                  <Input
                    value={settings.portal_title}
                    onChange={(e) => setSettings({ ...settings, portal_title: e.target.value })}
                    placeholder="Müşteri Portalı"
                    className="bg-slate-800 border-slate-700 text-white"
                    data-testid="portal-title-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-200">Karşılama Mesajı</Label>
                <Textarea
                  value={settings.portal_welcome_message}
                  onChange={(e) => setSettings({ ...settings, portal_welcome_message: e.target.value })}
                  placeholder="Destek taleplerinizi takip edin ve yönetin"
                  rows={2}
                  className="bg-slate-800 border-slate-700 text-white"
                  data-testid="portal-welcome-input"
                />
              </div>

              {/* Portal Logo */}
              <div className="p-6 rounded-xl bg-slate-800/50 border border-slate-700 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-white">Portal Logosu</h3>
                    <p className="text-sm text-slate-400">Müşteri portalında görünür (opsiyonel)</p>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml,image/webp"
                      className="hidden"
                      id="logo-portal"
                      onChange={(e) => handleLogoUpload(e, "portal")}
                    />
                    <label htmlFor="logo-portal">
                      <Button variant="outline" className="cursor-pointer" asChild disabled={uploadingLogo === "portal"}>
                        <span>
                          {uploadingLogo === "portal" ? (
                            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                          ) : (
                            <Upload className="w-4 h-4 mr-2" />
                          )}
                          Yükle
                        </span>
                      </Button>
                    </label>
                    {settings.portal_logo_url && (
                      <Button variant="ghost" className="text-rose-400 hover:text-rose-300" onClick={() => handleRemoveLogo("portal")}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
                {settings.portal_logo_url ? (
                  <div className="flex items-center justify-center p-4 bg-slate-700 rounded-lg">
                    <img src={settings.portal_logo_url} alt="Portal Logo" className="max-h-16 object-contain" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center p-4 bg-slate-700/50 rounded-lg border-2 border-dashed border-slate-600">
                    <p className="text-slate-400">Ana logo kullanılacak</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
