import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { TrendingUp, Clock, Users, Package, AlertTriangle, Download } from "lucide-react";
import axios from "axios";
import { toast } from "sonner";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#6366F1'];

const FLAT_COLORS = {
  blue: '#3B82F6',
  green: '#10B981',
  orange: '#F59E0B',
  red: '#EF4444',
  purple: '#8B5CF6',
  cyan: '#06B6D4',
  pink: '#EC4899',
  indigo: '#6366F1',
  emerald: '#059669',
  amber: '#F97316',
  slate: '#64748B',
  teal: '#14B8A6'
};

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  
  const [slaData, setSlaData] = useState(null);
  const [mttrData, setMttrData] = useState(null);
  const [categoryData, setCategoryData] = useState(null);
  const [technicianData, setTechnicianData] = useState([]);
  const [agingData, setAgingData] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [customerData, setCustomerData] = useState([]);
  const [partData, setPartData] = useState([]);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async (startDate = null, endDate = null) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };
      
      const params = {};
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      
      const [sla, mttr, category, technician, aging, trend, customer, parts] = await Promise.all([
        axios.get(`${API}/reports/sla-compliance`, { headers, params }),
        axios.get(`${API}/reports/mttr`, { headers, params }),
        axios.get(`${API}/reports/category-analysis`, { headers, params }),
        axios.get(`${API}/reports/technician-performance`, { headers, params }),
        axios.get(`${API}/reports/ticket-aging`, { headers }),
        axios.get(`${API}/reports/trend-analysis?days=30`, { headers }),
        axios.get(`${API}/reports/customer-analysis`, { headers }),
        axios.get(`${API}/reports/part-consumption`, { headers, params })
      ]);
      
      setSlaData(sla.data);
      setMttrData(mttr.data);
      setCategoryData(category.data);
      setTechnicianData(technician.data);
      setAgingData(aging.data);
      setTrendData(trend.data);
      setCustomerData(customer.data);
      setPartData(parts.data);
    } catch (error) {
      toast.error("Raporlar yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFilter = () => {
    if (dateRange.start && dateRange.end) {
      fetchReports(dateRange.start, dateRange.end);
    } else {
      fetchReports();
    }
  };

  const exportToCSV = (data, filename) => {
    const csv = convertToCSV(data);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success("Rapor indirildi");
  };

  const convertToCSV = (data) => {
    if (!data || data.length === 0) return "";
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(row => Object.values(row).join(',')).join('\\n');
    return `${headers}\\n${rows}`;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96">Yükleniyor...</div>;
  }

  const agingChartData = agingData ? [
    { name: '0-24 saat', value: agingData['0-24h'] },
    { name: '1-3 gün', value: agingData['1-3d'] },
    { name: '3-7 gün', value: agingData['3-7d'] },
    { name: '7-14 gün', value: agingData['7-14d'] },
    { name: '14+ gün', value: agingData['14d+'] }
  ] : [];

  const mttrByPriorityData = mttrData ? [
    { name: 'Kritik', hours: mttrData.mttr_by_priority.critical },
    { name: 'Yüksek', hours: mttrData.mttr_by_priority.high },
    { name: 'Orta', hours: mttrData.mttr_by_priority.medium },
    { name: 'Düşük', hours: mttrData.mttr_by_priority.low }
  ] : [];

  return (
    <div className="space-y-6" data-testid="reports-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold tracking-tight" style={{fontFamily: 'Chivo, sans-serif'}}>Raporlar & Analizler</h1>
          <p className="text-muted-foreground mt-2">Detaylı performans metrikleri ve istatistikler</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <Label>Başlangıç Tarihi</Label>
              <Input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({...dateRange, start: e.target.value})}
              />
            </div>
            <div className="flex-1">
              <Label>Bitiş Tarihi</Label>
              <Input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({...dateRange, end: e.target.value})}
              />
            </div>
            <Button onClick={handleApplyFilter}>Filtrele</Button>
            <Button variant="outline" onClick={() => {
              setDateRange({ start: "", end: "" });
              fetchReports();
            }}>
              Sıfırla
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
          <TabsTrigger value="performance">Performans</TabsTrigger>
          <TabsTrigger value="analysis">Analiz</TabsTrigger>
          <TabsTrigger value="technicians">Teknisyenler</TabsTrigger>
          <TabsTrigger value="customers">Müşteriler</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="border-l-4" style={{borderLeftColor: FLAT_COLORS.blue}}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{backgroundColor: FLAT_COLORS.blue + '20'}}>
                    <TrendingUp className="w-5 h-5" style={{color: FLAT_COLORS.blue}} />
                  </div>
                  SLA Uyum Oranı
                </CardTitle>
              </CardHeader>
              <CardContent>
                {slaData && (
                  <div>
                    <div className="text-5xl font-bold mb-4" style={{fontFamily: 'Chivo, sans-serif', color: FLAT_COLORS.blue}}>
                      {slaData.compliance_rate}%
                    </div>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between items-center p-2 rounded" style={{backgroundColor: FLAT_COLORS.green + '15'}}>
                        <span className="font-medium">SLA İçinde:</span>
                        <span className="font-bold text-lg" style={{color: FLAT_COLORS.green}}>{slaData.sla_met}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded" style={{backgroundColor: FLAT_COLORS.red + '15'}}>
                        <span className="font-medium">SLA İhlal:</span>
                        <span className="font-bold text-lg" style={{color: FLAT_COLORS.red}}>{slaData.sla_breached}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 rounded bg-muted">
                        <span className="font-medium">Toplam:</span>
                        <span className="font-bold text-lg">{slaData.total_resolved}</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-l-4" style={{borderLeftColor: FLAT_COLORS.purple}}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{backgroundColor: FLAT_COLORS.purple + '20'}}>
                    <Clock className="w-5 h-5" style={{color: FLAT_COLORS.purple}} />
                  </div>
                  Ortalama MTTR
                </CardTitle>
              </CardHeader>
              <CardContent>
                {mttrData && (
                  <div>
                    <div className="text-5xl font-bold mb-4" style={{fontFamily: 'Chivo, sans-serif', color: FLAT_COLORS.purple}}>
                      {mttrData.average_mttr_hours}h
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {mttrData.total_tickets} ticket analiz edildi
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{backgroundColor: FLAT_COLORS.red}}></div>
                        <span className="text-xs flex-1">Kritik</span>
                        <span className="text-sm font-bold">{mttrData.mttr_by_priority.critical}h</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{backgroundColor: FLAT_COLORS.orange}}></div>
                        <span className="text-xs flex-1">Yüksek</span>
                        <span className="text-sm font-bold">{mttrData.mttr_by_priority.high}h</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{backgroundColor: FLAT_COLORS.blue}}></div>
                        <span className="text-xs flex-1">Orta</span>
                        <span className="text-sm font-bold">{mttrData.mttr_by_priority.medium}h</span>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-l-4" style={{borderLeftColor: FLAT_COLORS.orange}}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{backgroundColor: FLAT_COLORS.orange + '20'}}>
                    <AlertTriangle className="w-5 h-5" style={{color: FLAT_COLORS.orange}} />
                  </div>
                  Açık Ticket Yaşı
                </CardTitle>
              </CardHeader>
              <CardContent>
                {agingData && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 rounded" style={{backgroundColor: FLAT_COLORS.green + '15'}}>
                      <span className="text-sm">0-24 saat</span>
                      <span className="font-bold text-lg" style={{color: FLAT_COLORS.green}}>{agingData['0-24h']}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded" style={{backgroundColor: FLAT_COLORS.blue + '15'}}>
                      <span className="text-sm">1-3 gün</span>
                      <span className="font-bold text-lg" style={{color: FLAT_COLORS.blue}}>{agingData['1-3d']}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded" style={{backgroundColor: FLAT_COLORS.orange + '15'}}>
                      <span className="text-sm">3-7 gün</span>
                      <span className="font-bold text-lg" style={{color: FLAT_COLORS.orange}}>{agingData['3-7d']}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded" style={{backgroundColor: FLAT_COLORS.amber + '15'}}>
                      <span className="text-sm">7-14 gün</span>
                      <span className="font-bold text-lg" style={{color: FLAT_COLORS.amber}}>{agingData['7-14d']}</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded" style={{backgroundColor: FLAT_COLORS.red + '15'}}>
                      <span className="text-sm">14+ gün</span>
                      <span className="font-bold text-lg" style={{color: FLAT_COLORS.red}}>{agingData['14d+']}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>30 Günlük Ticket Trendi</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" style={{fontSize: '12px'}} />
                  <YAxis stroke="#6b7280" style={{fontSize: '12px'}} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="created" 
                    stroke={FLAT_COLORS.blue}
                    strokeWidth={3}
                    dot={{fill: FLAT_COLORS.blue, r: 4}}
                    name="Oluşturulan" 
                  />
                  <Line 
                    type="monotone" 
                    dataKey="resolved" 
                    stroke={FLAT_COLORS.green}
                    strokeWidth={3}
                    dot={{fill: FLAT_COLORS.green, r: 4}}
                    name="Çözülen" 
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Önceliğe Göre MTTR</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={mttrByPriorityData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" stroke="#6b7280" style={{fontSize: '12px'}} />
                    <YAxis stroke="#6b7280" style={{fontSize: '12px'}} />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                    />
                    <Bar dataKey="hours" fill={FLAT_COLORS.purple} name="Saat" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Açık Ticket Yaş Dağılımı</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={agingChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {agingChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Kategoriye Göre Dağılım</CardTitle>
                <Button variant="outline" size="sm" onClick={() => exportToCSV(categoryData?.by_category || [], 'kategori-analizi')}>
                  <Download className="w-4 h-4 mr-2" />
                  CSV
                </Button>
              </CardHeader>
              <CardContent>
                {categoryData && (
                  <div className="space-y-3">
                    {categoryData.by_category.map((cat, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-sm">{cat.category}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary" 
                              style={{width: `${(cat.count / categoryData.by_category[0].count) * 100}%`}}
                            />
                          </div>
                          <Badge>{cat.count}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Önceliğe Göre Dağılım</CardTitle>
              </CardHeader>
              <CardContent>
                {categoryData && (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Kritik', value: categoryData.by_priority.critical },
                          { name: 'Yüksek', value: categoryData.by_priority.high },
                          { name: 'Orta', value: categoryData.by_priority.medium },
                          { name: 'Düşük', value: categoryData.by_priority.low }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => `${entry.name}: ${entry.value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[0, 1, 2, 3].map((index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Parça Tüketim Raporu
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => exportToCSV(partData, 'parca-tuketim')}>
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Parça Adı</th>
                      <th className="text-left p-2">Parça No</th>
                      <th className="text-right p-2">Toplam Kullanım</th>
                      <th className="text-right p-2">Kullanım Sayısı</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partData.slice(0, 10).map((part, idx) => (
                      <tr key={idx} className="border-b hover:bg-muted/50">
                        <td className="p-2">{part.part_name}</td>
                        <td className="p-2 font-mono text-xs">{part.part_number}</td>
                        <td className="p-2 text-right font-medium">{part.total_used}</td>
                        <td className="p-2 text-right">{part.usage_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="technicians" className="space-y-6 mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Teknisyen Performans Raporu
              </CardTitle>
              <Button variant="outline" size="sm" onClick={() => exportToCSV(technicianData, 'teknisyen-performans')}>
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Teknisyen</th>
                      <th className="text-right p-2">Atanan Ticket</th>
                      <th className="text-right p-2">Tamamlanan İş Emri</th>
                      <th className="text-right p-2">Toplam Süre (dk)</th>
                      <th className="text-right p-2">Ort. Çözüm (dk)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {technicianData.map((tech, idx) => (
                      <tr key={idx} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">{tech.name}</td>
                        <td className="p-2 text-right">{tech.assigned_tickets}</td>
                        <td className="p-2 text-right">{tech.completed_work_orders}</td>
                        <td className="p-2 text-right">{tech.total_time_spent}</td>
                        <td className="p-2 text-right font-medium">{tech.avg_resolution_time}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-6 mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Müşteri Bazlı Ticket İstatistikleri</CardTitle>
              <Button variant="outline" size="sm" onClick={() => exportToCSV(customerData, 'musteri-analizi')}>
                <Download className="w-4 h-4 mr-2" />
                CSV
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Müşteri</th>
                      <th className="text-left p-2">Şirket</th>
                      <th className="text-right p-2">Toplam Ticket</th>
                      <th className="text-right p-2">Açık Ticket</th>
                      <th className="text-right p-2">SLA İhlali</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customerData.map((customer, idx) => (
                      <tr key={idx} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-medium">{customer.name}</td>
                        <td className="p-2 text-muted-foreground">{customer.company}</td>
                        <td className="p-2 text-right">{customer.total_tickets}</td>
                        <td className="p-2 text-right">
                          {customer.open_tickets > 0 && (
                            <Badge variant="warning">{customer.open_tickets}</Badge>
                          )}
                        </td>
                        <td className="p-2 text-right">
                          {customer.sla_breaches > 0 && (
                            <Badge variant="error">{customer.sla_breaches}</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
