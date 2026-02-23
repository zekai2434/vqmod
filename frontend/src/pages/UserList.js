import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, User, Mail, Shield, Edit, Trash2, Key, RotateCcw, Search, Users } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function UserList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "operator"
  });
  
  const [editFormData, setEditFormData] = useState({
    full_name: "",
    email: "",
    role: ""
  });
  
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      toast.error("Kullanıcılar yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/auth/register`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Kullanıcı başarıyla oluşturuldu");
      setDialogOpen(false);
      setFormData({ full_name: "", email: "", password: "", role: "operator" });
      fetchUsers();
    } catch (error) {
      const message = error.response?.data?.detail || "Kullanıcı oluşturulamadı";
      toast.error(message);
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API}/users/${selectedUser.id}`, editFormData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Kullanıcı güncellendi");
      setEditDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error) {
      const message = error.response?.data?.detail || "Güncelleme başarısız";
      toast.error(message);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/users/${selectedUser.id}/reset-password`, 
        { new_password: newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("Şifre değiştirildi");
      setPasswordDialogOpen(false);
      setSelectedUser(null);
      setNewPassword("");
    } catch (error) {
      const message = error.response?.data?.detail || "Şifre değiştirilemedi";
      toast.error(message);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm("Bu kullanıcıyı silmek istediğinize emin misiniz?")) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Kullanıcı silindi");
      fetchUsers();
    } catch (error) {
      const message = error.response?.data?.detail || "Silme işlemi başarısız";
      toast.error(message);
    }
  };

  const openEditDialog = (user) => {
    setSelectedUser(user);
    setEditFormData({
      full_name: user.full_name,
      email: user.email,
      role: user.role
    });
    setEditDialogOpen(true);
  };

  const openPasswordDialog = (user) => {
    setSelectedUser(user);
    setNewPassword("");
    setPasswordDialogOpen(true);
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
    let password = "";
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  const getRoleBadge = (role) => {
    const roles = {
      admin: { label: "Admin", variant: "error" },
      operator: { label: "Operatör", variant: "info" },
      technician: { label: "Teknisyen", variant: "success" },
      warehouse: { label: "Depo", variant: "warning" },
      manager: { label: "Yönetici", variant: "default" }
    };
    const r = roles[role] || { label: role, variant: "secondary" };
    return <Badge variant={r.variant}>{r.label}</Badge>;
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch = u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="user-list-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Kullanıcılar</h1>
          <p className="text-gray-600 mt-1">Kullanıcı ve rol yönetimi</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-user-btn">
              <Plus className="w-5 h-5 mr-2" />
              Yeni Kullanıcı
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Yeni Kullanıcı Ekle</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Ad Soyad *</Label>
                <Input
                  data-testid="user-name-input"
                  value={formData.full_name}
                  onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>E-posta *</Label>
                <Input
                  data-testid="user-email-input"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Şifre *</Label>
                <div className="flex gap-2">
                  <Input
                    data-testid="user-password-input"
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required
                  />
                  <Button type="button" variant="outline" onClick={() => setFormData({...formData, password: generatePassword()})}>
                    <Key className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Rol *</Label>
                <Select value={formData.role} onValueChange={(v) => setFormData({...formData, role: v})}>
                  <SelectTrigger data-testid="user-role-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="operator">Operatör</SelectItem>
                    <SelectItem value="technician">Teknisyen</SelectItem>
                    <SelectItem value="warehouse">Depo</SelectItem>
                    <SelectItem value="manager">Yönetici</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 pt-4">
                <Button data-testid="submit-user-btn" type="submit">Ekle</Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="İsim veya e-posta ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Rol filtrele" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Roller</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="operator">Operatör</SelectItem>
            <SelectItem value="technician">Teknisyen</SelectItem>
            <SelectItem value="warehouse">Depo</SelectItem>
            <SelectItem value="manager">Yönetici</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-xs text-gray-600">Toplam</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {['admin', 'operator', 'technician', 'manager'].map(role => (
          <Card key={role}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Shield className={`w-8 h-8 ${role === 'admin' ? 'text-red-500' : role === 'operator' ? 'text-cyan-500' : role === 'technician' ? 'text-green-500' : 'text-purple-500'}`} />
                <div>
                  <p className="text-2xl font-bold">{users.filter(u => u.role === role).length}</p>
                  <p className="text-xs text-gray-600 capitalize">{role === 'admin' ? 'Admin' : role === 'operator' ? 'Operatör' : role === 'technician' ? 'Teknisyen' : 'Yönetici'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* User List */}
      {filteredUsers.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Kullanıcı bulunamadı</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.map((user) => (
            <Card key={user.id} data-testid={`user-card-${user.id}`} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                      <User className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-gray-900">{user.full_name}</CardTitle>
                      {getRoleBadge(user.role)}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">{user.email}</span>
                </div>
                <div className="pt-2 border-t text-sm text-gray-500">
                  Kayıt: {new Date(user.created_at).toLocaleDateString('tr-TR')}
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(user)}
                    data-testid={`edit-user-${user.id}`}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Düzenle
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openPasswordDialog(user)}
                    data-testid={`reset-password-${user.id}`}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-500 hover:text-red-700"
                    onClick={() => handleDelete(user.id)}
                    data-testid={`delete-user-${user.id}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Kullanıcı Düzenle</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label>Ad Soyad</Label>
              <Input
                value={editFormData.full_name}
                onChange={(e) => setEditFormData({...editFormData, full_name: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>E-posta</Label>
              <Input
                type="email"
                value={editFormData.email}
                onChange={(e) => setEditFormData({...editFormData, email: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Rol</Label>
              <Select value={editFormData.role} onValueChange={(v) => setEditFormData({...editFormData, role: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="operator">Operatör</SelectItem>
                  <SelectItem value="technician">Teknisyen</SelectItem>
                  <SelectItem value="warehouse">Depo</SelectItem>
                  <SelectItem value="manager">Yönetici</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="submit">Kaydet</Button>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>İptal</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Şifre Sıfırla - {selectedUser?.full_name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handlePasswordReset} className="space-y-4">
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
                <Button type="button" variant="outline" onClick={() => setNewPassword(generatePassword())}>
                  <Key className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-gray-500">En az 6 karakter olmalı</p>
            </div>
            <div className="flex gap-2 pt-4">
              <Button type="submit">Şifreyi Değiştir</Button>
              <Button type="button" variant="outline" onClick={() => setPasswordDialogOpen(false)}>İptal</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
