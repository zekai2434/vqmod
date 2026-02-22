import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import axios from "axios";
import { toast } from "sonner";
import { ArrowLeft, Send, HelpCircle } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL;

export default function CustomerPortalNewTicket() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "technical",
    priority: "medium",
    asset_id: ""
  });

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
      console.error("Error fetching assets:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim() || !formData.description.trim()) {
      toast.error("Lütfen tüm zorunlu alanları doldurun");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("portal_token");
      const response = await axios.post(
        `${API}/api/portal/tickets`,
        {
          ...formData,
          asset_id: formData.asset_id || null
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(`Talep oluşturuldu: ${response.data.ticket_number}`);
      navigate(`/portal/tickets/${response.data.id}`);
    } catch (error) {
      const message = error.response?.data?.detail || "Talep oluşturulurken hata oluştu";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { value: "technical", label: "Teknik Sorun" },
    { value: "network", label: "Ağ Problemi" },
    { value: "hardware", label: "Donanım Arızası" },
    { value: "software", label: "Yazılım Sorunu" },
    { value: "configuration", label: "Konfigürasyon" },
    { value: "performance", label: "Performans" },
    { value: "other", label: "Diğer" }
  ];

  const priorities = [
    { value: "low", label: "Düşük", description: "Acil değil, uygun zamanda çözülebilir" },
    { value: "medium", label: "Orta", description: "Normal öncelik, standart sürede çözüm" },
    { value: "high", label: "Yüksek", description: "Önemli, hızlı çözüm gerekli" },
    { value: "critical", label: "Kritik", description: "Acil, iş sürekliliğini etkiliyor" }
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6" data-testid="portal-new-ticket-page">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/portal/tickets")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Geri
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Yeni Destek Talebi</h1>
          <p className="text-muted-foreground">Sorununuzu bize bildirin</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="w-5 h-5" />
            Talep Detayları
          </CardTitle>
          <CardDescription>
            Sorununuzu detaylı bir şekilde açıklayın
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Konu <span className="text-red-500">*</span>
              </label>
              <Input
                placeholder="Örn: İnternet bağlantısı kesiliyor"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                data-testid="portal-ticket-title"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Açıklama <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Sorununuzu detaylı bir şekilde açıklayın. Ne zaman başladı? Hangi koşullarda oluşuyor?"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={6}
                required
                data-testid="portal-ticket-description"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Kategori</label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger data-testid="portal-ticket-category">
                    <SelectValue placeholder="Kategori seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Öncelik</label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData({ ...formData, priority: value })}
                >
                  <SelectTrigger data-testid="portal-ticket-priority">
                    <SelectValue placeholder="Öncelik seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map((pri) => (
                      <SelectItem key={pri.value} value={pri.value}>
                        <div>
                          <span>{pri.label}</span>
                          <span className="text-xs text-muted-foreground ml-2">
                            ({pri.description})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Asset */}
            {assets.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">İlgili Cihaz (Opsiyonel)</label>
                <Select
                  value={formData.asset_id}
                  onValueChange={(value) => setFormData({ ...formData, asset_id: value })}
                >
                  <SelectTrigger data-testid="portal-ticket-asset">
                    <SelectValue placeholder="Cihaz seçin (opsiyonel)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Seçim Yok</SelectItem>
                    {assets.map((asset) => (
                      <SelectItem key={asset.id} value={asset.id}>
                        {asset.hostname || asset.serial_number} - {asset.brand} {asset.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Submit */}
            <div className="pt-4 border-t border-border">
              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                disabled={loading}
                data-testid="portal-submit-ticket-btn"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                    Gönderiliyor...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Talep Oluştur
                  </span>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
