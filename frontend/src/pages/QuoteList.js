import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, FileText, Search, Building2, Calendar, DollarSign, 
  Eye, Edit, Trash2, Copy, Send, CheckCircle, XCircle, Clock, AlertTriangle
} from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function QuoteList() {
  const navigate = useNavigate();
  const [quotes, setQuotes] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const [quotesRes, customersRes] = await Promise.all([
        axios.get(`${API}/quotes`, { headers }),
        axios.get(`${API}/customers`, { headers })
      ]);
      
      setQuotes(quotesRes.data);
      setCustomers(customersRes.data);
    } catch (error) {
      toast.error("Veri yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const getCustomerName = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.name : 'Bilinmeyen';
  };

  const handleDelete = async (quoteId) => {
    if (!window.confirm("Bu teklifi silmek istediğinize emin misiniz?")) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API}/quotes/${quoteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Teklif silindi");
      fetchData();
    } catch (error) {
      toast.error("Silme işlemi başarısız");
    }
  };

  const handleDuplicate = async (quoteId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API}/quotes/${quoteId}/duplicate`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Teklif kopyalandı");
      navigate(`/quotes/${response.data.id}`);
    } catch (error) {
      toast.error("Kopyalama başarısız");
    }
  };

  const handleStatusChange = async (quoteId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${API}/quotes/${quoteId}`, { status: newStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success("Durum güncellendi");
      fetchData();
    } catch (error) {
      toast.error("Güncelleme başarısız");
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      draft: { label: "Taslak", variant: "secondary", icon: FileText },
      sent: { label: "Gönderildi", variant: "info", icon: Send },
      accepted: { label: "Kabul Edildi", variant: "success", icon: CheckCircle },
      rejected: { label: "Reddedildi", variant: "error", icon: XCircle },
      expired: { label: "Süresi Doldu", variant: "warning", icon: AlertTriangle }
    };
    const c = config[status] || config.draft;
    const Icon = c.icon;
    return (
      <Badge variant={c.variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {c.label}
      </Badge>
    );
  };

  const getDaysRemaining = (validUntil) => {
    if (!validUntil) return null;
    const end = new Date(validUntil);
    const now = new Date();
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return diff;
  };

  const filteredQuotes = quotes.filter(q => {
    const matchesSearch = 
      q.quote_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getCustomerName(q.customer_id).toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || q.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: quotes.length,
    draft: quotes.filter(q => q.status === 'draft').length,
    sent: quotes.filter(q => q.status === 'sent').length,
    accepted: quotes.filter(q => q.status === 'accepted').length,
    totalValue: quotes.filter(q => q.status === 'accepted').reduce((sum, q) => sum + (q.grand_total || 0), 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="quote-list-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Teklifler</h1>
          <p className="text-gray-600 mt-1">Müşteri tekliflerini yönetin ve takip edin</p>
        </div>
        <Button onClick={() => navigate('/quotes/new')} data-testid="new-quote-btn">
          <Plus className="w-5 h-5 mr-2" />
          Yeni Teklif
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <FileText className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm text-gray-600">Toplam Teklif</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-500/10">
                <Clock className="w-5 h-5 text-slate-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.draft}</p>
                <p className="text-sm text-gray-600">Taslak</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10">
                <Send className="w-5 h-5 text-cyan-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.sent}</p>
                <p className="text-sm text-gray-600">Gönderilen</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.accepted}</p>
                <p className="text-sm text-gray-600">Kabul Edilen</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <DollarSign className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.totalValue.toLocaleString('tr-TR')} ₺</p>
                <p className="text-sm text-gray-600">Kabul Edilen Toplam</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Teklif no, konu veya müşteri ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 text-gray-900"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48 text-gray-900">
            <SelectValue placeholder="Durum filtrele" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Durumlar</SelectItem>
            <SelectItem value="draft">Taslak</SelectItem>
            <SelectItem value="sent">Gönderildi</SelectItem>
            <SelectItem value="accepted">Kabul Edildi</SelectItem>
            <SelectItem value="rejected">Reddedildi</SelectItem>
            <SelectItem value="expired">Süresi Doldu</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Quote List */}
      {filteredQuotes.length === 0 ? (
        <Card className="p-12">
          <div className="text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Henüz teklif yok</p>
            <Button className="mt-4" onClick={() => navigate('/quotes/new')}>
              <Plus className="w-4 h-4 mr-2" />
              İlk Teklifi Oluştur
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredQuotes.map((quote) => {
            const daysRemaining = getDaysRemaining(quote.valid_until);
            const isExpiringSoon = daysRemaining !== null && daysRemaining > 0 && daysRemaining <= 7;
            
            return (
              <Card 
                key={quote.id} 
                data-testid={`quote-card-${quote.quote_number}`}
                className={`hover:shadow-md transition-shadow ${isExpiringSoon && quote.status === 'sent' ? 'border-amber-300' : ''}`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <span className="font-mono text-lg font-bold text-gray-900">{quote.quote_number}</span>
                        {getStatusBadge(quote.status)}
                        {isExpiringSoon && quote.status === 'sent' && (
                          <Badge variant="warning" className="gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {daysRemaining} gün kaldı
                          </Badge>
                        )}
                      </div>
                      
                      {quote.subject && (
                        <h3 className="text-lg font-semibold mb-2 text-gray-900">{quote.subject}</h3>
                      )}
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Müşteri</p>
                          <p className="font-medium text-gray-900 flex items-center gap-1">
                            <Building2 className="w-4 h-4" />
                            {getCustomerName(quote.customer_id)}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Toplam Tutar</p>
                          <p className="font-bold text-lg text-blue-600">
                            {quote.grand_total?.toLocaleString('tr-TR')} {quote.currency}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Geçerlilik</p>
                          <p className="font-medium text-gray-900 flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {quote.valid_until ? new Date(quote.valid_until).toLocaleDateString('tr-TR') : '-'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">Oluşturulma</p>
                          <p className="font-medium text-gray-900">
                            {new Date(quote.created_at).toLocaleDateString('tr-TR')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 mt-3 text-xs text-gray-500">
                        <span>{quote.items?.length || 0} kalem</span>
                        <span>•</span>
                        <span>Ödeme: {quote.payment_terms === 'pesin' ? 'Peşin' : quote.payment_terms}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 ml-4">
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/quotes/${quote.id}`)}
                          data-testid={`view-quote-${quote.id}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDuplicate(quote.id)}
                          title="Kopyala"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-500 hover:text-red-700"
                          onClick={() => handleDelete(quote.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      {/* Quick Status Actions */}
                      {quote.status === 'draft' && (
                        <Button
                          size="sm"
                          className="bg-cyan-600 hover:bg-cyan-700"
                          onClick={() => handleStatusChange(quote.id, 'sent')}
                        >
                          <Send className="w-4 h-4 mr-1" />
                          Gönderildi
                        </Button>
                      )}
                      {quote.status === 'sent' && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => handleStatusChange(quote.id, 'accepted')}
                          >
                            <CheckCircle className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-500"
                            onClick={() => handleStatusChange(quote.id, 'rejected')}
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
