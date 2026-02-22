import { useEffect, useState } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "@/pages/LoginPage";
import DashboardLayout from "@/components/DashboardLayout";
import Dashboard from "@/pages/Dashboard";
import TicketList from "@/pages/TicketList";
import TicketDetail from "@/pages/TicketDetail";
import NewTicket from "@/pages/NewTicket";
import CustomerList from "@/pages/CustomerList";
import AssetList from "@/pages/AssetList";
import PartList from "@/pages/PartList";
import RMAList from "@/pages/RMAList";
import WorkOrderList from "@/pages/WorkOrderList";
import UserList from "@/pages/UserList";
import { Toaster } from "sonner";

const PrivateRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
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
            <Route path="assets" element={<AssetList />} />
            <Route path="parts" element={<PartList />} />
            <Route path="rma" element={<RMAList />} />
            <Route path="work-orders" element={<WorkOrderList />} />
            <Route path="users" element={<UserList />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" richColors />
    </div>
  );
}

export default App;