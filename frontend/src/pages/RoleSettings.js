import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Plus, Shield, Edit, Trash2, Lock, Users, Ticket, HardDrive, Wrench, Package, FileText, Settings, ChartBar
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MODULE_ICONS = {
  tickets: Ticket,
  customers: Users,
  assets: HardDrive,
  work_orders: Wrench,
  parts: Package,
  rma: FileText,
  reports: ChartBar,
  settings: Settings,
  users: Users
};

const MODULE_LABELS = {
  tickets: "Ticketlar",
  customers: "Müşteriler",
  assets: "Cihazlar",
  work_orders: "İş Emirleri",
  parts: "Parçalar",
  rma: "RMA",
  reports: "Raporlar",
  settings: "Ayarlar",
  users: "Kullanıcılar"
};

export default function RoleSettings() {
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);

  const [roleForm, setRoleForm] = useState({
    name: "",
    code: "",
    description: "",
    permissions: []
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [rolesRes, permissionsRes] = await Promise.all([
        axios.get(`${API}/roles`, { headers }),
        axios.get(`${API}/permissions`, { headers })
      ]);
      
      setRoles(rolesRes.data);
      setPermissions(permissionsRes.data);
    } catch (error) {
      toast.error("Veriler yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRole = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      if (editingRole) {
        await axios.patch(`${API}/roles/${editingRole.id}`, roleForm, { headers });
        toast.success("Rol güncellendi");
      } else {
        await axios.post(`${API}/roles`, roleForm, { headers });
        toast.success("Rol oluşturuldu");
      }
      
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "İşlem başarısız");
    }
  };

  const handleDeleteRole = async (id) => {
    if (!confirm("Bu rolü silmek istediğinizden emin misiniz?")) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/roles/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Rol silindi");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Silme işlemi başarısız");
    }
  };

  const resetForm = () => {
    setRoleForm({
      name: "",
      code: "",
      description: "",
      permissions: []
    });
    setEditingRole(null);
  };

  const openEditRole = (role) => {
    setRoleForm({
      name: role.name,
      code: role.code,
      description: role.description || "",
      permissions: role.permissions || []
    });
    setEditingRole(role);
    setDialogOpen(true);
  };

  const togglePermission = (permCode) => {
    if (roleForm.permissions.includes(permCode)) {
      setRoleForm({
        ...roleForm,
        permissions: roleForm.permissions.filter(p => p !== permCode)
      });
    } else {
      setRoleForm({
        ...roleForm,
        permissions: [...roleForm.permissions, permCode]
      });
    }
  };

  const toggleModulePermissions = (module) => {
    const modulePerms = permissions.filter(p => p.module === module).map(p => p.code);
    const allSelected = modulePerms.every(p => roleForm.permissions.includes(p));
    
    if (allSelected) {
      setRoleForm({
        ...roleForm,
        permissions: roleForm.permissions.filter(p => !modulePerms.includes(p))
      });
    } else {
      const newPerms = [...new Set([...roleForm.permissions, ...modulePerms])];
      setRoleForm({ ...roleForm, permissions: newPerms });
    }
  };

  const groupedPermissions = permissions.reduce((acc, perm) => {
    if (!acc[perm.module]) {
      acc[perm.module] = [];
    }
    acc[perm.module].push(perm);
    return acc;
  }, {});

  const getRoleIcon = (code) => {
    switch (code) {
      case 'admin': return <Shield className="w-5 h-5 text-red-500" />;
      case 'manager': return <Users className="w-5 h-5 text-blue-500" />;
      case 'technician': return <Wrench className="w-5 h-5 text-green-500" />;
      default: return <Lock className="w-5 h-5 text-gray-500" />;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6" data-testid="role-settings-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight" style={{fontFamily: 'Chivo, sans-serif'}}>Rol Yönetimi</h1>
          <p className="text-muted-foreground mt-2">Kullanıcı rollerini ve yetkilerini yapılandırın</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button data-testid="add-role-btn">
              <Plus className="w-4 h-4 mr-2" />
              Yeni Rol
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRole ? "Rol Düzenle" : "Yeni Rol"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Rol Adı *</Label>
                  <Input
                    value={roleForm.name}
                    onChange={(e) => setRoleForm({...roleForm, name: e.target.value})}
                    placeholder="Destek Uzmanı"
                    data-testid="role-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kod *</Label>
                  <Input
                    value={roleForm.code}
                    onChange={(e) => setRoleForm({...roleForm, code: e.target.value.toLowerCase()})}
                    placeholder="support_agent"
                    disabled={!!editingRole}
                    data-testid="role-code-input"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Açıklama</Label>
                <Textarea
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({...roleForm, description: e.target.value})}
                  rows={2}
                />
              </div>

              <div className="space-y-4">
                <Label>Yetkiler</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(groupedPermissions).map(([module, perms]) => {
                    const ModuleIcon = MODULE_ICONS[module] || Lock;
                    const moduleLabel = MODULE_LABELS[module] || module;
                    const modulePerms = perms.map(p => p.code);
                    const allSelected = modulePerms.every(p => roleForm.permissions.includes(p));
                    const someSelected = modulePerms.some(p => roleForm.permissions.includes(p));
                    
                    return (
                      <Card key={module} className="overflow-hidden">
                        <CardHeader className="py-3 bg-muted/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ModuleIcon className="w-4 h-4" />
                              <CardTitle className="text-sm">{moduleLabel}</CardTitle>
                            </div>
                            <Checkbox
                              checked={allSelected}
                              className={someSelected && !allSelected ? "data-[state=checked]:bg-gray-400" : ""}
                              onCheckedChange={() => toggleModulePermissions(module)}
                            />
                          </div>
                        </CardHeader>
                        <CardContent className="py-3">
                          <div className="space-y-2">
                            {perms.map(perm => (
                              <div key={perm.code} className="flex items-center justify-between">
                                <span className="text-sm">{perm.name}</span>
                                <Checkbox
                                  checked={roleForm.permissions.includes(perm.code)}
                                  onCheckedChange={() => togglePermission(perm.code)}
                                />
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={handleSaveRole} data-testid="save-role-btn">Kaydet</Button>
                <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }}>İptal</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {roles.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Henüz rol tanımlanmamış</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles.map(role => (
            <Card key={role.id} data-testid={`role-card-${role.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {getRoleIcon(role.code)}
                    <div>
                      <CardTitle className="text-lg">{role.name}</CardTitle>
                      <Badge variant="outline">{role.code}</Badge>
                    </div>
                  </div>
                  {!role.is_system && (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditRole(role)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteRole(role.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  {role.is_system && (
                    <Badge variant="secondary">Sistem</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {role.description && (
                  <p className="text-sm text-muted-foreground mb-4">{role.description}</p>
                )}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Yetkiler ({role.permissions?.length || 0})</p>
                  <div className="flex flex-wrap gap-1">
                    {Object.keys(MODULE_LABELS).map(module => {
                      const modulePerms = permissions.filter(p => p.module === module).map(p => p.code);
                      const hasAny = modulePerms.some(p => role.permissions?.includes(p));
                      const hasAll = modulePerms.every(p => role.permissions?.includes(p));
                      
                      if (!hasAny) return null;
                      
                      return (
                        <Badge 
                          key={module} 
                          variant={hasAll ? "default" : "outline"}
                          className="text-xs"
                        >
                          {MODULE_LABELS[module]}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
