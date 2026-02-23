import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import axios from "axios";
import { toast } from "sonner";
import { Users, Plus, UserCheck, UserX, Search, Building, Mail, Phone, Key, Edit, Trash2, RotateCcw } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

export default function PortalUserList() {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [customerFilter, setCustomerFilter] = useState("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    customer_id: "",
    email: "",
    password: "",
    full_name: "",
    phone: ""
  });
  const [editFormData, setEditFormData] = useState({
    customer_id: "",
    email: "",
    full_name: "",
    phone: ""
  });
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, customerFilter]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      const [usersRes, customersRes] = await Promise.all([
        axios.get(`${API}/api/portal-users`, { headers }),
        axios.get(`${API}/api/customers`, { headers })
      ]);
      setUsers(usersRes.data);
      setCustomers(customersRes.data);
    } catch (error) {
      toast.error("Veriler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(u =>
        u.email.toLowerCase().includes(query) ||
        u.full_name.toLowerCase().includes(query) ||
        u.phone?.toLowerCase().includes(query)
      );
    }
    if (customerFilter !== "all") {
      filtered = filtered.filter(u => u.customer_id === customerFilter);
    }
    setFilteredUsers(filtered);
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!formData.customer_id || !formData.email || !formData.password || !formData.full_name) {
      toast.error("Lütfen zorunlu alanları doldurun");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/api/portal/register`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Portal kullanıcısı oluşturuldu");
      setIsDialogOpen(false);
      setFormData({ customer_id: "", email: "", password: "", full_name: "", phone: "" });
      fetchData();
    } catch (error) {
      const message = error.response?.data?.detail || "Kullanıcı oluşturulamadı";
      toast.error(message);
    }
  };

  const handleEditUser = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      const token = localStorage.getItem("token");
      await axios.patch(`${API}/api/portal-users/${selectedUser.id}`, editFormData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Kullanıcı güncellendi");
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      fetchData();
    } catch (error) {
      const message = error.response?.data?.detail || "Güncelleme başarısız";
      toast.error(message);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API}/api/portal-users/${selectedUser.id}/reset-password`, 
        { new_password: newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Şifre değiştirildi");
      setIsPasswordDialogOpen(false);
      setSelectedUser(null);
      setNewPassword("");
    } catch (error) {
      const message = error.response?.data?.detail || "Şifre değiştirilemedi";
      toast.error(message);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Bu kullanıcıyı silmek istediğinize emin misiniz?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API}/api/portal-users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Kullanıcı silindi");
      fetchData();
    } catch (error) {
      toast.error("Silme işlemi başarısız");
    }
  };

  const handleToggleActive = async (userId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.patch(
        `${API}/api/portal-users/${userId}/toggle-active`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success(response.data.message);
      fetchData();
    } catch (error) {
      toast.error("İşlem başarısız");
    }
  };

  const openEditDialog = (user) => {
    setSelectedUser(user);
    setEditFormData({
      customer_id: user.customer_id,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone || ""
    });
    setIsEditDialogOpen(true);
  };

  const openPasswordDialog = (user) => {
    setSelectedUser(user);
    setNewPassword("");
    setIsPasswordDialogOpen(true);
  };

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    return customer?.name || "Bilinmiyor";
  };

  const generatePassword = (setter) => {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setter(password);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="portal-users-page">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Portal Kullanıcıları</h1>
          <p className="text-muted-foreground">Müşteri portalı kullanıcılarını yönetin</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-portal-user-btn">
              <Plus className="w-4 h-4 mr-2" />
              Yeni Kullanıcı
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Yeni Portal Kullanıcısı</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <Label>Müşteri <span className="text-red-500">*</span></Label>
                <Select value={formData.customer_id} onValueChange={(v) => setFormData({...formData, customer_id: v})}>
                  <SelectTrigger data-testid="portal-user-customer-select">
                    <SelectValue placeholder="Müşteri seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ad Soyad <span className="text-red-500">*</span></Label>
                <Input
                  placeholder="Kullanıcı adı soyadı"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  required
                  data-testid="portal-user-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label>E-posta <span className="text-red-500">*</span></Label>
                <Input
                  type="email"
                  placeholder="kullanici@firma.com"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  data-testid="portal-user-email-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Şifre <span className="text-red-500">*</span></Label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Şifre"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required
                    data-testid="portal-user-password-input"
                  />
                  <Button type="button" variant="outline" onClick={() => generatePassword((p) => setFormData({...formData, password: p}))}>
                    <Key className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Telefon</Label>
                <Input
                  placeholder="05XX XXX XX XX"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  data-testid="portal-user-phone-input"
                />
              </div>
              <div className="pt-4 border-t">
                <Button type="submit" className="w-full" data-testid="save-portal-user-btn">
                  Kullanıcı Oluştur
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="İsim, e-posta veya telefon ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="portal-user-search"
              />
            </div>
            <Select value={customerFilter} onValueChange={setCustomerFilter}>
              <SelectTrigger className="w-full md:w-64" data-testid="portal-user-customer-filter">
                <Building className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Müşteri filtrele" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Müşteriler</SelectItem>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Kullanıcılar ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">
                {users.length === 0 ? "Henüz portal kullanıcısı yok" : "Arama kriterlerine uygun kullanıcı bulunamadı"}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kullanıcı</TableHead>
                  <TableHead>Müşteri</TableHead>
                  <TableHead>İletişim</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Kayıt Tarihi</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} data-testid={`portal-user-row-${user.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-primary font-medium">{user.full_name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="font-medium">{user.full_name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-muted-foreground" />
                        {getCustomerName(user.customer_id)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="w-3 h-3 text-muted-foreground" />
                          {user.email}
                        </div>
                        {user.phone && (
                          <div className="flex items-center gap-2 text-sm">
                            <Phone className="w-3 h-3 text-muted-foreground" />
                            {user.phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={user.is_active ? "bg-green-500/20 text-green-600 border-green-500/30" : "bg-red-500/20 text-red-600 border-red-500/30"}>
                        {user.is_active ? "Aktif" : "Pasif"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(user.created_at).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(user)} data-testid={`edit-user-${user.id}`}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openPasswordDialog(user)} data-testid={`reset-password-${user.id}`}>
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleActive(user.id)}
                          className={user.is_active ? "text-amber-500 hover:text-amber-600" : "text-green-500 hover:text-green-600"}
                          data-testid={`toggle-user-${user.id}`}
                        >
                          {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => handleDeleteUser(user.id)}
                          data-testid={`delete-user-${user.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Kullanıcı Düzenle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditUser} className="space-y-4">
            <div className="space-y-2">
              <Label>Müşteri</Label>
              <Select value={editFormData.customer_id} onValueChange={(v) => setEditFormData({...editFormData, customer_id: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Müşteri seçin" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ad Soyad</Label>
              <Input value={editFormData.full_name} onChange={(e) => setEditFormData({...editFormData, full_name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>E-posta</Label>
              <Input type="email" value={editFormData.email} onChange={(e) => setEditFormData({...editFormData, email: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label>Telefon</Label>
              <Input value={editFormData.phone} onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})} />
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">Kaydet</Button>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>İptal</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Şifre Sıfırla - {selectedUser?.full_name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label>Yeni Şifre</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Yeni şifre"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <Button type="button" variant="outline" onClick={() => generatePassword(setNewPassword)}>
                  <Key className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">En az 6 karakter olmalı</p>
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">Şifreyi Değiştir</Button>
              <Button type="button" variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>İptal</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Info Card */}
      <Card className="bg-blue-500/5 border-blue-500/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h4 className="font-medium text-blue-600">Portal Kullanıcıları Hakkında</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Portal kullanıcıları <code className="bg-muted px-1 rounded">/portal/login</code> adresinden giriş yaparak
                kendi ticket'larını görebilir, yeni ticket açabilir ve cihazlarını görüntüleyebilir.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
