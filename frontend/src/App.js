import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "@/pages/LoginPage";
import DashboardLayout from "@/components/DashboardLayout";
import Dashboard from "@/pages/Dashboard";
import TicketList from "@/pages/TicketList";
import TicketDetail from "@/pages/TicketDetail";
import NewTicket from "@/pages/NewTicket";
import CustomerList from "@/pages/CustomerList";
import CustomerDetail from "@/pages/CustomerDetail";
import AssetList from "@/pages/AssetList";
import PartList from "@/pages/PartList";
import RMAList from "@/pages/RMAList";
import WorkOrderList from "@/pages/WorkOrderList";
import WorkOrderDetail from "@/pages/WorkOrderDetail";
import UserList from "@/pages/UserList";
import Reports from "@/pages/Reports";
import NotificationSettings from "@/pages/NotificationSettings";
import SLASettings from "@/pages/SLASettings";
import RoleSettings from "@/pages/RoleSettings";
import EmailSettings from "@/pages/EmailSettings";
import WhatsAppSettings from "@/pages/WhatsAppSettings";
import PortalUserList from "@/pages/PortalUserList";
// Customer Portal
import CustomerPortalLogin from "@/pages/CustomerPortalLogin";
import CustomerPortalLayout from "@/components/CustomerPortalLayout";
import CustomerPortalDashboard from "@/pages/CustomerPortalDashboard";
import CustomerPortalTickets from "@/pages/CustomerPortalTickets";
import CustomerPortalTicketDetail from "@/pages/CustomerPortalTicketDetail";
import CustomerPortalNewTicket from "@/pages/CustomerPortalNewTicket";
import CustomerPortalAssets from "@/pages/CustomerPortalAssets";
import { Toaster } from "sonner";

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

const PortalPrivateRoute = ({ children }) => {
  const token = localStorage.getItem('portal_token');
  return token ? children : <Navigate to="/portal/login" />;
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          
          {/* Customer Portal Routes */}
          <Route path="/portal/login" element={<CustomerPortalLogin />} />
          <Route path="/portal" element={
            <PortalPrivateRoute>
              <CustomerPortalLayout />
            </PortalPrivateRoute>
          }>
            <Route index element={<CustomerPortalDashboard />} />
            <Route path="tickets" element={<CustomerPortalTickets />} />
            <Route path="tickets/new" element={<CustomerPortalNewTicket />} />
            <Route path="tickets/:id" element={<CustomerPortalTicketDetail />} />
            <Route path="assets" element={<CustomerPortalAssets />} />
          </Route>
          
          {/* Admin Routes */}
          <Route path="/" element={
            <PrivateRoute>
              <DashboardLayout />
            </PrivateRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="tickets" element={<TicketList />} />
            <Route path="tickets/:id" element={<TicketDetail />} />
            <Route path="tickets/new" element={<NewTicket />} />
            <Route path="customers" element={<CustomerList />} />
            <Route path="customers/:id" element={<CustomerDetail />} />
            <Route path="assets" element={<AssetList />} />
            <Route path="parts" element={<PartList />} />
            <Route path="rma" element={<RMAList />} />
            <Route path="work-orders" element={<WorkOrderList />} />
            <Route path="work-orders/:id" element={<WorkOrderDetail />} />
            <Route path="users" element={<UserList />} />
            <Route path="reports" element={<Reports />} />
            <Route path="notifications" element={<NotificationSettings />} />
            <Route path="sla-settings" element={<SLASettings />} />
            <Route path="roles" element={<RoleSettings />} />
            <Route path="email-settings" element={<EmailSettings />} />
            <Route path="whatsapp" element={<WhatsAppSettings />} />
            <Route path="portal-users" element={<PortalUserList />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;