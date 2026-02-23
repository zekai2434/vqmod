import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import axios from "axios";
import { Activity, Mail, Lock, User, ArrowRight, Loader2 } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function LoginPage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState(null);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "operator"
  });

  useEffect(() => {
    axios.get(`${API}/settings/system`).then(res => setSettings(res.data)).catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const response = await axios.post(`${API}/auth/login`, {
          email: formData.email,
          password: formData.password
        });
        
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        toast.success("Giriş başarılı!");
        navigate('/');
      } else {
        await axios.post(`${API}/auth/register`, formData);
        toast.success("Kayıt başarılı! Şimdi giriş yapabilirsiniz.");
        setIsLogin(true);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Bir hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-900">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-10">
            {settings?.logo_url ? (
              <img src={settings.logo_url} alt="Logo" className="w-12 h-12 rounded-xl object-contain" />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/25">
                <Activity className="w-6 h-6 text-white" strokeWidth={2.5} />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight" style={{fontFamily: 'Chivo, sans-serif'}}>
                {settings?.company_name || 'NetOps Pro'}
              </h1>
              <p className="text-xs text-slate-400 uppercase tracking-wider">{settings?.company_slogan || 'Teknik Servis Yönetimi'}</p>
            </div>
          </div>

          {/* Form Card */}
          <div className="glass-card rounded-2xl p-8" data-testid="login-card">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">
                {isLogin ? "Hoş Geldiniz" : "Hesap Oluştur"}
              </h2>
              <p className="text-slate-300">
                {isLogin ? "Devam etmek için giriş yapın" : "Yeni bir hesap oluşturun"}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="full_name" className="text-slate-200 text-sm font-medium">Ad Soyad</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      id="full_name"
                      data-testid="fullname-input"
                      type="text"
                      className="pl-11 h-12 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                      placeholder="Adınız Soyadınız"
                      value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                      required={!isLogin}
                    />
                  </div>
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-200 text-sm font-medium">E-posta</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="email"
                    data-testid="email-input"
                    type="email"
                    className="pl-11 h-12 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                    placeholder="ornek@firma.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-200 text-sm font-medium">Şifre</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="password"
                    data-testid="password-input"
                    type="password"
                    className="pl-11 h-12 bg-slate-800 border-slate-700 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required
                  />
                </div>
              </div>

              <Button
                data-testid="submit-btn"
                type="submit"
                className="w-full h-12 bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-500/25 transition-all duration-200"
                disabled={loading}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Yükleniyor...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    {isLogin ? "Giriş Yap" : "Kayıt Ol"}
                    <ArrowRight className="w-5 h-5" />
                  </span>
                )}
              </Button>

              <div className="text-center pt-4">
                <button
                  data-testid="toggle-mode-btn"
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-slate-300 hover:text-blue-400 text-sm transition-colors"
                >
                  {isLogin ? "Hesabınız yok mu? Kayıt olun" : "Zaten hesabınız var mı? Giriş yapın"}
                </button>
              </div>
            </form>

            {/* Portal Link */}
            <div className="mt-8 pt-6 border-t border-slate-700">
              <Link 
                to="/portal/login" 
                className="flex items-center justify-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                <span>Müşteri Portalı için tıklayın</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Image */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1691435828932-911a7801adfb?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA1OTV8MHwxfHNlYXJjaHwxfHxuZXR3b3JrJTIwc2VydmVyJTIwcm9vbSUyMGRhcmslMjBibHVlJTIwbGlnaHRzfGVufDB8fHx8MTc3MTgwMjg3OXww&ixlib=rb-4.1.0&q=85)'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-slate-900/30" />
        
        {/* Overlay Content */}
        <div className="relative z-10 flex flex-col justify-end p-12">
          <div className="max-w-md">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Sistem Aktif</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4" style={{fontFamily: 'Chivo, sans-serif'}}>
              Network Operasyonlarınızı Kontrol Altına Alın
            </h2>
            <p className="text-slate-300 leading-relaxed">
              Ticket yönetimi, SLA takibi, iş emirleri ve müşteri portalı ile teknik servis süreçlerinizi 
              tek bir platformdan yönetin.
            </p>
            
            {/* Stats */}
            <div className="flex gap-8 mt-8 pt-8 border-t border-slate-700">
              <div>
                <p className="text-3xl font-bold text-white">%99.9</p>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Uptime</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">24/7</p>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Destek</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-white">500+</p>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Müşteri</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
