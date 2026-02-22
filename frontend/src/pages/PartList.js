import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Package } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function PartList() {
  const [parts, setParts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    part_number: "",
    name: "",
    category: "",
    quantity: 0,
    min_stock: 5,
    unit_price: 0,
    supplier: ""
  });

  useEffect(() => {
    fetchParts();
  }, []);

  const fetchParts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/parts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setParts(response.data);
    } catch (error) {
      toast.error("Parçalar yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API}/parts`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Parça başarıyla eklendi");
      setDialogOpen(false);
      setFormData({
        part_number: "",
        name: "",
        category: "",
        quantity: 0,
        min_stock: 5,
        unit_price: 0,
        supplier: ""
      });
      fetchParts();
    } catch (error) {
      toast.error("Parça eklenirken hata oluştu");
    }
  };

  const isLowStock = (part) => part.quantity <= part.min_stock;

  if (loading) {
    return <div className="flex items-center justify-center h-96">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6" data-testid="part-list-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight" style={{fontFamily: 'Chivo, sans-serif'}}>Parçalar</h1>
          <p className="text-muted-foreground mt-2">Stok ve parça yönetimi</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-part-btn">
              <Plus className="w-5 h-5 mr-2" />
              Yeni Parça
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Yeni Parça Ekle</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="part_number">Parça Numarası *</Label>
                  <Input
                    id="part_number"
                    data-testid="part-number-input"
                    value={formData.part_number}
                    onChange={(e) => setFormData({...formData, part_number: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Parça Adı *</Label>
                  <Input
                    id="name"
                    data-testid="part-name-input"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Kategori *</Label>
                  <Input
                    id="category"
                    data-testid="part-category-input"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier">Tedarikçi</Label>
                  <Input
                    id="supplier"
                    data-testid="part-supplier-input"
                    value={formData.supplier}
                    onChange={(e) => setFormData({...formData, supplier: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Miktar</Label>
                  <Input
                    id="quantity"
                    data-testid="part-quantity-input"
                    type="number"
                    min="0"
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min_stock">Min. Stok</Label>
                  <Input
                    id="min_stock"
                    data-testid="part-minstock-input"
                    type="number"
                    min="0"
                    value={formData.min_stock}
                    onChange={(e) => setFormData({...formData, min_stock: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit_price">Birim Fiyat</Label>
                  <Input
                    id="unit_price"
                    data-testid="part-price-input"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.unit_price}
                    onChange={(e) => setFormData({...formData, unit_price: parseFloat(e.target.value)})}
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-4">
                <Button data-testid="submit-part-btn" type="submit">Ekle</Button>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>İptal</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {parts.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <p className="text-muted-foreground">Henüz parça yok</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {parts.map((part) => (
            <Card key={part.id} data-testid={`part-card-${part.id}`} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    <CardTitle className="text-lg">{part.name}</CardTitle>
                  </div>
                  {isLowStock(part) && (
                    <Badge variant="warning">Düşük Stok</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="text-sm text-muted-foreground">Parça No</p>
                  <p className="font-mono text-sm">{part.part_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Kategori</p>
                  <p className="text-sm">{part.category}</p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div>
                    <p className="text-sm text-muted-foreground">Stok</p>
                    <p className="text-2xl font-bold" style={{fontFamily: 'Chivo, sans-serif'}}>{part.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Fiyat</p>
                    <p className="font-semibold">₺{part.unit_price.toFixed(2)}</p>
                  </div>
                </div>
                {part.supplier && (
                  <div>
                    <p className="text-sm text-muted-foreground">Tedarikçi</p>
                    <p className="text-sm">{part.supplier}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}