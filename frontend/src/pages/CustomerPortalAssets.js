import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import axios from "axios";
import { toast } from "sonner";
import { HardDrive, Wifi, Server, Shield, Calendar, Clock, AlertTriangle } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

export default function CustomerPortalAssets() {
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState([]);

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      const token = localStorage.getItem("portal_token");
      const response = await axios.get(`${API}/api/portal/assets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAssets(response.data);
    } catch (error) {
      toast.error("Cihazlar yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const getDeviceIcon = (type) => {
    const icons = {
      router: Server,
      switch: Wifi,
      firewall: Shield,
      access_point: Wifi
    };
    const Icon = icons[type?.toLowerCase()] || HardDrive;
    return <Icon className="w-6 h-6" />;
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: "bg-green-500/20 text-green-400 border-green-500/30",
      inactive: "bg-gray-500/20 text-gray-400 border-gray-500/30",
      maintenance: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      retired: "bg-red-500/20 text-red-400 border-red-500/30"
    };
    const labels = {
      active: "Aktif",
      inactive: "Pasif",
      maintenance: "Bakımda",
      retired: "Kullanım Dışı"
    };
    return (
      <Badge className={`${styles[status] || styles.active} border`}>
        {labels[status] || status}
      </Badge>
    );
  };

  const isWarrantyExpiring = (warrantyEnd) => {
    if (!warrantyEnd) return false;
    const endDate = new Date(warrantyEnd);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
  };

  const isWarrantyExpired = (warrantyEnd) => {
    if (!warrantyEnd) return false;
    return new Date(warrantyEnd) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="portal-assets-page">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cihazlarım</h1>
        <p className="text-muted-foreground">Sözleşmenize bağlı tüm cihazlar</p>
      </div>

      {assets.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <HardDrive className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Henüz kayıtlı cihaz bulunmuyor</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {assets.map((asset) => (
            <Card key={asset.id} className="hover:border-primary/50 transition-colors" data-testid={`portal-asset-${asset.serial_number}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      {getDeviceIcon(asset.device_type)}
                    </div>
                    <div>
                      <CardTitle className="text-base">
                        {asset.hostname || asset.serial_number}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {asset.brand} {asset.model}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(asset.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Seri No</p>
                    <p className="font-mono">{asset.serial_number}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Tip</p>
                    <p className="capitalize">{asset.device_type}</p>
                  </div>
                  {asset.ip_address && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground text-xs">IP Adresi</p>
                      <p className="font-mono">{asset.ip_address}</p>
                    </div>
                  )}
                  {asset.mac_address && (
                    <div className="col-span-2">
                      <p className="text-muted-foreground text-xs">MAC Adresi</p>
                      <p className="font-mono">{asset.mac_address}</p>
                    </div>
                  )}
                </div>

                {/* Warranty Info */}
                {asset.warranty_end && (
                  <div className={`flex items-center gap-2 p-2 rounded-lg ${
                    isWarrantyExpired(asset.warranty_end)
                      ? "bg-red-500/10 text-red-400"
                      : isWarrantyExpiring(asset.warranty_end)
                      ? "bg-yellow-500/10 text-yellow-400"
                      : "bg-green-500/10 text-green-400"
                  }`}>
                    {isWarrantyExpired(asset.warranty_end) ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <Calendar className="w-4 h-4" />
                    )}
                    <div className="text-xs">
                      <p className="font-medium">
                        {isWarrantyExpired(asset.warranty_end)
                          ? "Garanti Sona Erdi"
                          : isWarrantyExpiring(asset.warranty_end)
                          ? "Garanti Sona Ermek Üzere"
                          : "Garanti Geçerli"
                        }
                      </p>
                      <p>
                        {new Date(asset.warranty_end).toLocaleDateString("tr-TR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric"
                        })}
                      </p>
                    </div>
                  </div>
                )}

                {/* Support End Info */}
                {asset.support_end && (
                  <div className={`flex items-center gap-2 p-2 rounded-lg ${
                    isWarrantyExpired(asset.support_end)
                      ? "bg-red-500/10 text-red-400"
                      : isWarrantyExpiring(asset.support_end)
                      ? "bg-yellow-500/10 text-yellow-400"
                      : "bg-blue-500/10 text-blue-400"
                  }`}>
                    <Clock className="w-4 h-4" />
                    <div className="text-xs">
                      <p className="font-medium">Destek Bitiş</p>
                      <p>
                        {new Date(asset.support_end).toLocaleDateString("tr-TR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric"
                        })}
                      </p>
                    </div>
                  </div>
                )}

                {asset.location && (
                  <p className="text-xs text-muted-foreground">
                    📍 {asset.location}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
