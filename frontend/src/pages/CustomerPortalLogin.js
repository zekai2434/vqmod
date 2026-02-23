import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import axios from "axios";
import { Activity, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

export default function CustomerPortalLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState(null);
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });

  useEffect(() => {
    axios.get(`${API}/api/settings/system`).then(res => setSettings(res.data)).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API}/api/portal/login`, {
        email: formData.email,
        password: formData.password
      });

      localStorage.setItem("portal_token", response.data.access_token);
      localStorage.setItem("portal_user", JSON.stringify(response.data.user));
      localStorage.setItem("portal_customer_id", response.data.customer_id);

      toast.success("Giriş başarılı!");
      navigate("/portal");
    } catch (error) {
      const message = error.response?.data?.detail || "Bir hata oluştu";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-cyan-600/5"></div>
      
      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {settings?.portal_logo_url || settings?.logo_url ? (
            <img src={settings.portal_logo_url || settings.logo_url} alt="Logo" className="w-14 h-14 rounded-xl object-contain" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Activity className="w-7 h-7 text-white" strokeWidth={2.5} />
            </div>
          )}
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl p-8" data-testid="portal-login-card">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">{settings?.portal_title || 'Müşteri Portalı'}</h1>
            <p className="text-slate-400">{settings?.portal_welcome_message || 'Destek taleplerinizi takip edin ve yönetin'}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">E-posta</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                <Input
                  type="email"
                  placeholder="ornek@firma.com"
                  className="pl-11 h-12 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  data-testid="portal-email-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Şifre</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-500" />
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="pl-11 h-12 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  data-testid="portal-password-input"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-500/25"
              disabled={loading}
              data-testid="portal-login-btn"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Giriş yapılıyor...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  Giriş Yap
                  <ArrowRight className="w-5 h-5" />
                </span>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-700">
            <p className="text-sm text-center text-slate-400">
              Hesabınız yok mu? <span className="text-blue-400">Sistem yöneticinize başvurun</span>
            </p>
          </div>

          <div className="mt-4 text-center">
            <Link 
              to="/login" 
              className="text-sm text-slate-500 hover:text-slate-300 flex items-center justify-center gap-1 transition-colors"
            >
              Personel Girişi <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Footer */}
        {settings?.footer_text && (
          <p className="text-center text-xs text-slate-500 mt-6">{settings.footer_text}</p>
        )}
      </div>
    </div>
  );
}
