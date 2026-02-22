import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Ticket, HardDrive, User, LogOut, Menu, X, Plus } from "lucide-react";
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

  useEffect(() => {
    const token = localStorage.getItem("portal_token");
    const user = localStorage.getItem("portal_user");
    
    if (!token || !user) {
      navigate("/portal/login");
      return;
    }

    setPortalUser(JSON.parse(user));
    fetchCustomer();
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

  const menuItems = [
    { path: "/portal", icon: LayoutDashboard, label: "Dashboard", exact: true },
    { path: "/portal/tickets", icon: Ticket, label: "Destek Talepleri" },
    { path: "/portal/assets", icon: HardDrive, label: "Cihazlarım" },
    { path: "/portal/profile", icon: User, label: "Profilim" },
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
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-6 border-b border-border bg-gradient-to-r from-blue-600/10 to-cyan-600/10">
            <div>
              <h1 className="text-lg font-bold tracking-tight">Müşteri Portalı</h1>
              {customer && (
                <p className="text-xs text-muted-foreground truncate max-w-[180px]">{customer.name}</p>
              )}
            </div>
            <button
              data-testid="close-portal-sidebar-btn"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                data-testid={`portal-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                  isActive(item)
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
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
                className="flex items-center gap-3 px-4 py-3 rounded-lg font-medium bg-green-600 hover:bg-green-700 text-white transition-colors"
              >
                <Plus className="w-5 h-5" />
                Yeni Talep Oluştur
              </Link>
            </div>
          </nav>

          <div className="p-4 border-t border-border">
            <div className="mb-3 px-4 py-2 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium">{portalUser?.full_name}</p>
              <p className="text-xs text-muted-foreground truncate">{portalUser?.email}</p>
            </div>
            <Button
              data-testid="portal-logout-btn"
              variant="ghost"
              className="w-full justify-start text-muted-foreground hover:text-destructive"
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
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center justify-between h-full px-6">
            <button
              data-testid="open-portal-sidebar-btn"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Hoş geldiniz, {portalUser?.full_name || 'Kullanıcı'}
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-6 md:p-8 lg:p-10">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
