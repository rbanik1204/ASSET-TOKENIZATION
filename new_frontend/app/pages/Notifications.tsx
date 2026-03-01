import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck, Trash2, RefreshCw, ExternalLink, ShoppingCart, DollarSign, Shield, AlertTriangle, Info } from 'lucide-react';
import { useAlgorand } from '../contexts/AlgorandContext';
import { API_BASE, apiFetch } from '../config/api';
import { toast } from 'sonner';

type NotifType = 'purchase' | 'income' | 'governance' | 'kyc' | 'system' | 'alert';

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionUrl?: string;
  txId?: string;
  network?: string;
}

const typeConfig: Record<NotifType, { icon: React.FC<{ className?: string }>; color: string }> = {
  purchase: { icon: ShoppingCart, color: 'text-accent' },
  income: { icon: DollarSign, color: 'text-green-400' },
  governance: { icon: Shield, color: 'text-blue-400' },
  kyc: { icon: Shield, color: 'text-yellow-400' },
  alert: { icon: AlertTriangle, color: 'text-destructive' },
  system: { icon: Info, color: 'text-muted-foreground' },
};

const DEMO_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'income',
    title: 'Income Available',
    message: '0.5 ALGO income is available to claim from Manhattan Loft',
    timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    read: false,
  },
  {
    id: '2',
    type: 'governance',
    title: 'Governance Vote Passed',
    message: 'Proposal #3 "Increase rental yield by 2%" passed with 78% approval',
    timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    read: false,
    actionUrl: '/governance',
  },
  {
    id: '3',
    type: 'purchase',
    title: 'Purchase Confirmed',
    message: 'Your purchase of 5 units of Tokyo Office Tower was confirmed on-chain',
    timestamp: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    read: true,
  },
  {
    id: '4',
    type: 'system',
    title: 'Network Upgrade',
    message: 'Algorand TestNet upgraded to v3.22. Smart contracts redeployed.',
    timestamp: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(),
    read: true,
  },
];

const NotificationsPage: React.FC = () => {
  const { address, network } = useAlgorand();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(false);

  const fetchNotifications = () => {
    if (!address) return;
    setLoading(true);
    apiFetch(`${API_BASE}/notifications?walletAddress=${address}`)
      .then(r => r.json())
      .then(data => {
        const items = data.notifications ?? data.data ?? [];
        setNotifs(Array.isArray(items) ? items : []);
      })
      .catch(() => setNotifs([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(interval);
  }, [address]);

  const markRead = (id: string) => {
    setNotifs(n => n.map(x => x.id === id ? { ...x, read: true } : x));
    apiFetch(`${API_BASE}/notifications/${id}/read`, { method: 'POST' }).catch(() => {});
  };

  const markAllRead = () => {
    setNotifs(n => n.map(x => ({ ...x, read: true })));
    if (address) {
      apiFetch(`${API_BASE}/notifications/mark-all-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      }).catch(() => {});
    }
    toast.success('All notifications marked as read');
  };

  const remove = (id: string) => setNotifs(n => n.filter(x => x.id !== id));

  const clearAll = () => {
    setNotifs([]);
    toast.success('Notifications cleared');
  };

  const shown = filter === 'unread' ? notifs.filter(n => !n.read) : notifs;
  const unreadCount = notifs.filter(n => !n.read).length;

  const formatTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const h = Math.floor(diff / 3600000);
    if (h < 1) return `${Math.floor(diff / 60000)}m ago`;
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Bell className="w-8 h-8 text-accent" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white text-xs flex items-center justify-center font-bold">
                {unreadCount}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-3xl font-bold uppercase">NOTIFICATIONS</h1>
            <p className="text-sm text-muted-foreground">{unreadCount} unread</p>
          </div>
        </div>
        <div className="flex gap-2">
          {loading && <RefreshCw className="w-4 h-4 animate-spin text-accent" />}
          {unreadCount > 0 && (
            <button onClick={markAllRead}
              className="flex items-center gap-1 px-3 py-1.5 border-2 border-foreground text-xs font-bold uppercase hover:border-accent transition-colors">
              <CheckCheck className="w-3 h-3" /> MARK ALL READ
            </button>
          )}
          {notifs.length > 0 && (
            <button onClick={clearAll}
              className="flex items-center gap-1 px-3 py-1.5 border-2 border-foreground text-xs font-bold uppercase hover:border-destructive transition-colors">
              <Trash2 className="w-3 h-3" /> CLEAR ALL
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-0 border-2 border-foreground mb-6 w-fit">
        {(['all', 'unread'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 text-xs font-bold uppercase transition-colors ${
              filter === f ? 'bg-accent text-black' : 'hover:bg-muted'
            }`}>
            {f === 'all' ? `ALL (${notifs.length})` : `UNREAD (${unreadCount})`}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {shown.length === 0 ? (
        <div className="border-2 border-foreground p-16 text-center">
          <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground uppercase font-bold">NO NOTIFICATIONS</p>
        </div>
      ) : (
        <div className="space-y-2">
          {shown.map(notif => {
            const cfg = typeConfig[notif.type];
            const Icon = cfg.icon;
            return (
              <div key={notif.id}
                className={`border-2 p-4 flex gap-4 transition-colors ${
                  notif.read ? 'border-foreground/50 opacity-70' : 'border-foreground bg-black'
                }`}
                onClick={() => markRead(notif.id)}
              >
                <div className={`mt-0.5 flex-shrink-0 ${cfg.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold uppercase text-sm">{notif.title}</span>
                        {!notif.read && (
                          <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{notif.message}</p>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">{formatTime(notif.timestamp)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {notif.actionUrl && (
                      <a href={notif.actionUrl}
                        className="text-xs text-accent hover:underline flex items-center gap-1 uppercase font-bold">
                        VIEW <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    {notif.txId && (
                      <a href={`https://testnet.algoexplorer.io/tx/${notif.txId}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-xs text-accent hover:underline flex items-center gap-1 uppercase font-bold">
                        TX <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <button onClick={e => { e.stopPropagation(); remove(notif.id); }}
                      className="ml-auto text-xs text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
