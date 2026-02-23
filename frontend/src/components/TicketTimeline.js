import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  MessageSquare, 
  Clock, 
  User, 
  Paperclip, 
  Wrench, 
  CheckCircle, 
  PauseCircle, 
  PlayCircle,
  PlusCircle,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import axios from "axios";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const eventConfig = {
  created: {
    icon: PlusCircle,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    label: "Oluşturuldu"
  },
  comment: {
    icon: MessageSquare,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    label: "Yorum"
  },
  status_change: {
    icon: RefreshCw,
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    label: "Durum Değişikliği"
  },
  assignment: {
    icon: User,
    color: "text-cyan-500",
    bgColor: "bg-cyan-500/10",
    label: "Atama"
  },
  sla_paused: {
    icon: PauseCircle,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
    label: "SLA Duraklatıldı"
  },
  sla_resumed: {
    icon: PlayCircle,
    color: "text-green-500",
    bgColor: "bg-green-500/10",
    label: "SLA Devam"
  },
  attachment: {
    icon: Paperclip,
    color: "text-slate-500",
    bgColor: "bg-slate-500/10",
    label: "Dosya"
  },
  work_order_created: {
    icon: Wrench,
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    label: "İş Emri"
  },
  work_order_completed: {
    icon: CheckCircle,
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
    label: "İş Emri Tamamlandı"
  },
  resolved: {
    icon: CheckCircle,
    color: "text-emerald-600",
    bgColor: "bg-emerald-600/10",
    label: "Çözümlendi"
  }
};

const statusLabels = {
  open: "Açık",
  in_progress: "Devam Ediyor",
  on_hold: "Beklemede",
  resolved: "Çözüldü",
  closed: "Kapalı"
};

export default function TicketTimeline({ ticketId }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchHistory();
  }, [ticketId]);

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/tickets/${ticketId}/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(response.data);
      setError(null);
    } catch (err) {
      setError("Zaman çizelgesi yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return formatDistanceToNow(date, { locale: tr, addSuffix: true });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    return new Date(timestamp).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <AlertCircle className="w-5 h-5 mr-2" />
        {error}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        <Clock className="w-5 h-5 mr-2" />
        Henüz kayıt yok
      </div>
    );
  }

  return (
    <div className="relative space-y-0" data-testid="ticket-timeline">
      {/* Timeline line */}
      <div className="absolute left-6 top-3 bottom-3 w-0.5 bg-slate-200 dark:bg-slate-700" />
      
      {history.map((event, index) => {
        const config = eventConfig[event.event_type] || eventConfig.created;
        const Icon = config.icon;
        
        return (
          <div 
            key={event.id} 
            className="relative pl-16 pb-6"
            data-testid={`timeline-event-${event.id}`}
          >
            {/* Icon */}
            <div className={`absolute left-3 w-7 h-7 rounded-full flex items-center justify-center ${config.bgColor} ring-4 ring-background`}>
              <Icon className={`w-4 h-4 ${config.color}`} />
            </div>
            
            {/* Content */}
            <Card className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <Badge variant="outline" className="text-xs">
                        {config.label}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(event.timestamp)}
                      </span>
                    </div>
                    
                    <p className="font-medium text-sm">{event.description}</p>
                    
                    {/* Event-specific content */}
                    {event.event_type === 'comment' && event.metadata?.comment && (
                      <div className={`mt-2 p-3 rounded-lg text-sm ${
                        event.metadata.is_internal 
                          ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800' 
                          : 'bg-slate-50 dark:bg-slate-800/50'
                      }`}>
                        {event.metadata.is_internal && (
                          <Badge variant="warning" className="text-xs mb-2">İç Not</Badge>
                        )}
                        <p className="whitespace-pre-wrap text-sm">{event.metadata.comment}</p>
                      </div>
                    )}
                    
                    {event.event_type === 'status_change' && (
                      <div className="mt-2 flex items-center gap-2 text-sm">
                        <Badge variant="outline">{statusLabels[event.metadata?.old_status] || event.metadata?.old_status}</Badge>
                        <span className="text-muted-foreground">→</span>
                        <Badge variant="default">{statusLabels[event.metadata?.new_status] || event.metadata?.new_status}</Badge>
                      </div>
                    )}
                    
                    {event.event_type === 'work_order_created' && event.metadata?.technician && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        <span>Teknisyen: <strong>{event.metadata.technician}</strong></span>
                        {event.metadata.work_type && (
                          <span className="ml-3">Tip: <strong>{event.metadata.work_type === 'onsite' ? 'Yerinde' : event.metadata.work_type === 'remote' ? 'Uzaktan' : 'Atölye'}</strong></span>
                        )}
                      </div>
                    )}
                    
                    {event.event_type === 'work_order_completed' && event.metadata?.time_spent_minutes > 0 && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        Harcanan süre: <strong>{event.metadata.time_spent_minutes} dakika</strong>
                      </div>
                    )}
                    
                    {event.event_type === 'attachment' && event.metadata?.filename && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <Paperclip className="w-3 h-3" />
                        <span>{event.metadata.filename}</span>
                        <span className="text-xs">({(event.metadata.file_size / 1024).toFixed(1)} KB)</span>
                      </div>
                    )}
                    
                    {event.event_type === 'sla_paused' && event.metadata?.reason && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        Sebep: {event.metadata.reason}
                      </div>
                    )}
                    
                    {event.event_type === 'sla_resumed' && event.metadata?.duration_minutes && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        Toplam duraklama: {event.metadata.duration_minutes} dakika
                      </div>
                    )}
                    
                    {/* User info */}
                    {event.user_name && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="w-3 h-3" />
                        {event.user_name}
                      </div>
                    )}
                  </div>
                  
                  {/* Timestamp */}
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-muted-foreground">
                      {formatDate(event.timestamp)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
