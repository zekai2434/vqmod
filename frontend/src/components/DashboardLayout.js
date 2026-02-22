import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, Ticket, Users, Package, HardDrive, Wrench, FileText, Settings, LogOut, Menu, X, Bell, Clock, Shield } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const menuItems = [
    { path: "/", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/tickets", icon: Ticket, label: "Ticketlar" },
    { path: "/customers", icon: Users, label: "Müşteriler" },
    { path: "/assets", icon: HardDrive, label: "Cihazlar" },
    { path: "/work-orders", icon: Wrench, label: "İş Emirleri" },
    { path: "/parts", icon: Package, label: "Parçalar" },
    { path: "/rma", icon: FileText, label: "RMA" },
    { path: "/reports", icon: FileText, label: "Raporlar" },
    { path: "/notifications", icon: Bell, label: "Bildirimler" },
    { path: "/sla-settings", icon: Clock, label: "SLA Yönetimi" },
    { path: "/roles", icon: Shield, label: "Rol Yönetimi" },
    { path: "/users", icon: Settings, label: "Kullanıcılar" },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    toast.success("Çıkış yapıldı");
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-background">
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transform transition-transform duration-200 lg:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-6 border-b border-border">
            <h1 className="text-xl font-bold tracking-tight" style={{fontFamily: 'Chivo, sans-serif'}}>
              NetworkOps
            </h1>
            <button
              data-testid="close-sidebar-btn"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto custom-scrollbar">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path || 
                (item.path !== "/" && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-border">
            <Button
              data-testid="logout-btn"
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

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center justify-between h-full px-6">
            <button
              data-testid="open-sidebar-btn"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                Hoş geldiniz, {JSON.parse(localStorage.getItem('user') || '{}').full_name || 'Kullanıcı'}
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