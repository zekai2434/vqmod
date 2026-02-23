import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Ticket, HardDrive, User, LogOut, Menu, X, Plus, Activity } from "lucide-react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL;

export default function CustomerPortalLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [customer, setCustomer] = useState(null);
  const [portalUser, setPortalUser] = useState(null);
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("portal_token");
    const user = localStorage.getItem("portal_user");
    
    if (!token || !user) {
      navigate("/portal/login");
      return;
    }

    setPortalUser(JSON.parse(user));
    fetchCustomer();
    fetchSettings();
  }, [navigate]);

  const fetchCustomer = async () => {
    try {
      const token = localStorage.getItem("portal_token");
      const response = await axios.get(`${API}/api/portal/customer`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomer(response.data);
    } catch (error) {
      console.error("Error fetching customer:", error);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API}/api/settings/system`);
      setSettings(response.data);
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  const menuItems = [
    { path: "/portal", icon: LayoutDashboard, label: "Dashboard", exact: true },
    { path: "/portal/tickets", icon: Ticket, label: "Destek Talepleri" },
    { path: "/portal/assets", icon: HardDrive, label: "Cihazlarım" },
  ];

  const handleLogout = () => {
    localStorage.removeItem("portal_token");
    localStorage.removeItem("portal_user");
    localStorage.removeItem("portal_customer_id");
    toast.success("Çıkış yapıldı");
    navigate("/portal/login");
  };

  const isActive = (item) => {
    if (item.exact) {
      return location.pathname === item.path;
    }
    return location.pathname.startsWith(item.path);
  };

  return (
    <div className="flex h-screen bg-slate-900">
      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-700/50 transform transition-transform duration-200 lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-6 border-b border-slate-700/50">
            <div className="flex items-center gap-3">
              {settings?.portal_logo_url || settings?.logo_url ? (
                <img src={settings.portal_logo_url || settings.logo_url} alt="Logo" className="w-10 h-10 rounded-xl object-contain" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">{settings?.portal_title || 'Müşteri Portalı'}</h1>
                {customer && (
                  <p className="text-xs text-slate-400 truncate max-w-[140px]">{customer.name}</p>
                )}
              </div>
            </div>
            <button
              data-testid="close-portal-sidebar-btn"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded hover:bg-slate-700"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
          
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`portal-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                  isActive(item)
                    ? 'bg-gradient-to-r from-blue-600/20 to-transparent text-blue-400 border-l-2 border-blue-500'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            ))}

            <div className="pt-4">
              <Link
                to="/portal/tickets/new"
                data-testid="portal-new-ticket-btn"
                onClick={() => setSidebarOpen(false)}
                className="flex items-center gap-3 px-4 py-3 rounded-lg font-medium bg-blue-600 hover:bg-blue-500 text-white transition-colors"
              >
                <Plus className="w-5 h-5" />
                Yeni Talep Oluştur
              </Link>
            </div>
          </nav>

          <div className="p-4 border-t border-slate-700/50">
            <div className="mb-3 px-4 py-3 bg-slate-800/50 rounded-lg">
              <p className="text-sm font-medium text-white">{portalUser?.full_name}</p>
              <p className="text-xs text-slate-400 truncate">{portalUser?.email}</p>
            </div>
            <Button
              data-testid="portal-logout-btn"
              variant="ghost"
              className="w-full justify-start text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5 mr-3" />
              Çıkış Yap
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
        <header className="h-16 border-b border-slate-700/50 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center justify-between h-full px-6">
            <button
              data-testid="open-portal-sidebar-btn"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-slate-800"
            >
              <Menu className="w-6 h-6 text-slate-300" />
            </button>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-300">
                Hoş geldiniz, <span className="font-medium text-white">{portalUser?.full_name || 'Kullanıcı'}</span>
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar bg-slate-900">
          <div className="p-6 md:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
