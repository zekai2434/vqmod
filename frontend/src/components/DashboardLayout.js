import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Ticket, Users, Package, HardDrive, Wrench, FileText, Settings, LogOut, Menu, X, Bell, Clock, Shield, Mail, MessageCircle, UserCircle, ChevronRight, Activity, Cog, ScrollText, FilePlus, Wallet, Receipt } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL;

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [systemSettings, setSystemSettings] = useState(null);

  useEffect(() => {
    fetchSettings();
    
    // Listen for settings updates
    const handleSettingsUpdate = () => fetchSettings();
    window.addEventListener('settings-updated', handleSettingsUpdate);
    return () => window.removeEventListener('settings-updated', handleSettingsUpdate);
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/api/settings/system`);
      setSystemSettings(response.data);
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  const menuGroups = [
    {
      label: "Ana Menü",
      items: [
        { path: "/", icon: LayoutDashboard, label: "Dashboard" },
        { path: "/tickets", icon: Ticket, label: "Ticketlar" },
        { path: "/customers", icon: Users, label: "Müşteriler" },
        { path: "/assets", icon: HardDrive, label: "Cihazlar" },
      ]
    },
    {
      label: "Operasyonlar",
      items: [
        { path: "/work-orders", icon: Wrench, label: "İş Emirleri" },
        { path: "/parts", icon: Package, label: "Parçalar" },
        { path: "/rma", icon: FileText, label: "RMA" },
        { path: "/contracts", icon: ScrollText, label: "Sözleşmeler" },
        { path: "/quotes", icon: FilePlus, label: "Teklifler" },
        { path: "/reports", icon: Activity, label: "Raporlar" },
      ]
    },
    {
      label: "Finans",
      items: [
        { path: "/ledger", icon: Wallet, label: "Cariler" },
        { path: "/invoices", icon: Receipt, label: "Faturalar" },
      ]
    },
    {
      label: "İletişim",
      items: [
        { path: "/notifications", icon: Bell, label: "Bildirimler" },
        { path: "/email-settings", icon: Mail, label: "E-posta" },
        { path: "/whatsapp", icon: MessageCircle, label: "WhatsApp" },
      ]
    },
    {
      label: "Yönetim",
      items: [
        { path: "/portal-users", icon: UserCircle, label: "Portal Kullanıcıları" },
        { path: "/sla-settings", icon: Clock, label: "SLA Yönetimi" },
        { path: "/roles", icon: Shield, label: "Roller" },
        { path: "/users", icon: Settings, label: "Kullanıcılar" },
        { path: "/settings", icon: Cog, label: "Sistem Ayarları" },
      ]
    }
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.success("Çıkış yapıldı");
    navigate('/login');
  };

  const isActive = (path) => {
    return location.pathname === path || 
      (path !== "/" && location.pathname.startsWith(path));
  };

  return (
    <div className="flex h-screen bg-slate-900">
      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 bg-slate-900 border-r border-slate-700/50 transform transition-all duration-300 lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } ${collapsed ? 'w-20' : 'w-64'}`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-slate-700/50">
            <Link to="/" className="flex items-center gap-3">
              {systemSettings?.logo_url ? (
                <img src={systemSettings.logo_url} alt="Logo" className="w-10 h-10 rounded-xl object-contain" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Activity className="w-5 h-5 text-white" strokeWidth={2.5} />
                </div>
              )}
              {!collapsed && (
                <div>
                  <h1 className="text-lg font-bold text-white tracking-tight" style={{fontFamily: 'Chivo, sans-serif'}}>
                    {systemSettings?.company_name?.split(' ')[0] || 'NetOps'}
                  </h1>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider">
                    {systemSettings?.company_name?.split(' ').slice(1).join(' ') || systemSettings?.company_slogan || 'Pro'}
                  </p>
                </div>
              )}
            </Link>
            <button
              data-testid="close-sidebar-btn"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded hover:bg-slate-800"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto custom-scrollbar">
            {menuGroups.map((group, idx) => (
              <div key={idx}>
                {!collapsed && (
                  <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {group.label}
                  </p>
                )}
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                      onClick={() => setSidebarOpen(false)}
                      className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                        isActive(item.path)
                          ? 'bg-gradient-to-r from-blue-600/20 to-transparent text-blue-400 border-l-2 border-blue-500'
                          : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                      }`}
                    >
                      <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive(item.path) ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'}`} strokeWidth={1.5} />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                      {!collapsed && isActive(item.path) && (
                        <ChevronRight className="w-4 h-4 ml-auto text-blue-400" />
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* User & Logout */}
          <div className="p-3 border-t border-slate-700/60">
            <div className={`mb-3 p-3 rounded-lg bg-slate-800/50 ${collapsed ? 'hidden' : ''}`}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-sm font-bold">
                  {(JSON.parse(localStorage.getItem('user') || '{}').full_name || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-100 truncate">
                    {JSON.parse(localStorage.getItem('user') || '{}').full_name || 'Kullanıcı'}
                  </p>
                  <p className="text-xs text-slate-400 truncate">
                    {JSON.parse(localStorage.getItem('user') || '{}').email || ''}
                  </p>
                </div>
              </div>
            </div>
            <Button
              data-testid="logout-btn"
              variant="ghost"
              className={`w-full text-slate-300 hover:text-rose-400 hover:bg-rose-500/10 ${collapsed ? 'justify-center px-0' : 'justify-start'}`}
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5" strokeWidth={1.5} />
              {!collapsed && <span className="ml-3">Çıkış Yap</span>}
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-slate-700/60 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center justify-between h-full px-6">
            <div className="flex items-center gap-4">
              <button
                data-testid="open-sidebar-btn"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-lg hover:bg-slate-700 text-slate-300"
              >
                <Menu className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="hidden lg:flex p-2 rounded-lg hover:bg-slate-700 text-slate-300"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xs font-medium text-emerald-400">Sistem Aktif</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900">
          <div className="p-6 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
