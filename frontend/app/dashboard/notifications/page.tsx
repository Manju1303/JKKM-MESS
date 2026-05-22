'use client';
import { useEffect, useState } from 'react';
import { notificationsAPI } from '@/lib/api';
import { useNotificationStore } from '@/store/notificationStore';
import {
  Bell, Check, AlertTriangle, AlertCircle, Info, Calendar, Clock, Sparkles
} from 'lucide-react';
import { cn, formatDateTime } from '@/lib/utils';

interface AlertItem {
  id: number;
  title: string;
  message: string;
  type: string;       // LOW_STOCK, EXPIRY, PURCHASE, SYSTEM
  severity: string;   // INFO, WARNING, CRITICAL
  isRead: boolean;
  createdAt: string;
}

// ── Mock Fallback Data ────────────────────────────────────────────────────────
const mockAlerts: AlertItem[] = [
  { id: 1, title: 'Low Stock Alert: Sunflower Oil', message: 'Sunflower Oil is currently at 0 LITRE. Min required level is 50 LITRE.', type: 'LOW_STOCK', severity: 'CRITICAL', isRead: false, createdAt: new Date().toISOString() },
  { id: 2, title: 'Expiring Soon: Toor Dal Batch #TD524', message: 'Batch TD524 (150 KG) will expire in 4 days.', type: 'EXPIRY', severity: 'WARNING', isRead: false, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: 3, title: 'Purchase Approved: PO-2026-0518', message: 'Mess Manager approved procurement from Sri Balaji Traders (₹12,400).', type: 'PURCHASE', severity: 'INFO', isRead: false, createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: 4, title: 'System Database Backup Successful', message: 'Automated database snapshot completed. Saved to S3 storage bucket.', type: 'SYSTEM', severity: 'INFO', isRead: true, createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: 5, title: 'Stock Intake Logged: Rice', message: 'Storekeeper logged 1,200 KG of Ponni Rice into Main Store.', type: 'PURCHASE', severity: 'INFO', isRead: true, createdAt: new Date(Date.now() - 172800000).toISOString() },
];

export default function NotificationsPage() {
  const { notifications, unreadCount, setNotifications, markRead, markAllRead } = useNotificationStore();
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | 'CRITICAL'>('ALL');
  const [loading, setLoading] = useState(true);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await notificationsAPI.getAll();
      if (res.data && res.data.length > 0) {
        setNotifications(res.data);
      } else {
        setNotifications(mockAlerts);
      }
    } catch (e) {
      console.log('Using local mock alerts cache');
      setNotifications(mockAlerts);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationsAPI.markRead(id);
      markRead(id);
    } catch {
      // Offline fallback
      markRead(id);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsAPI.markAllRead();
      markAllRead();
    } catch {
      // Offline fallback
      markAllRead();
    }
  };

  const filteredAlerts = notifications.filter(n => {
    if (filter === 'UNREAD') return !n.isRead;
    if (filter === 'CRITICAL') return n.severity === 'CRITICAL' || n.severity === 'WARNING';
    return true;
  });

  return (
    <div className="space-y-6 animate-in">
      {/* Summary Actions Card */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center text-white shadow-lg">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-sm leading-none flex items-center gap-1.5">
              Alert Notifications Center
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 font-bold">
                  {unreadCount} Unread
                </span>
              )}
            </h3>
            <p className="text-xs text-muted-foreground mt-1">Real-time alerts, stock counts, and system notifications</p>
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="px-3 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold flex items-center gap-1.5 transition-all w-full sm:w-auto justify-center"
            >
              <Check className="w-4 h-4" /> Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-border pb-1">
        {(['ALL', 'UNREAD', 'CRITICAL'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-4 py-2 text-xs font-semibold tracking-wider uppercase border-b-2 transition-all',
              filter === f
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {f === 'ALL' ? 'All Alerts' : f === 'UNREAD' ? 'Unread Only' : 'Important Alerts'}
          </button>
        ))}
      </div>

      {/* Notifications Feed */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-2 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/4" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filteredAlerts.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center glass-card">
          <Sparkles className="w-12 h-12 text-muted-foreground/35 mx-auto mb-3" />
          <p className="font-semibold text-foreground">You are all caught up!</p>
          <p className="text-xs text-muted-foreground mt-1">No alerts matching your current filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAlerts.map(alert => {
            const isCritical = alert.severity === 'CRITICAL';
            const isWarning = alert.severity === 'WARNING';
            return (
              <div
                key={alert.id}
                className={cn(
                  'p-4 rounded-xl border flex flex-col sm:flex-row items-start justify-between gap-4 transition-all relative overflow-hidden bg-card',
                  alert.isRead ? 'border-border opacity-70' : 'border-border',
                  !alert.isRead && isCritical && 'border-red-500/20 bg-red-500/5',
                  !alert.isRead && isWarning && 'border-amber-500/20 bg-amber-500/5',
                  !alert.isRead && !isCritical && !isWarning && 'border-primary/20 bg-primary/5'
                )}
              >
                {/* Left indicators */}
                <div className="flex gap-3 items-start flex-1 min-w-0">
                  <div className={cn(
                    'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm',
                    isCritical ? 'bg-red-500/15 text-red-500' : isWarning ? 'bg-amber-500/15 text-amber-500' : 'bg-blue-500/15 text-blue-500'
                  )}>
                    {isCritical ? (
                      <AlertCircle className="w-4 h-4" />
                    ) : isWarning ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <Info className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={cn(
                      'text-sm font-semibold leading-tight text-foreground',
                      !alert.isRead && 'font-bold text-foreground'
                    )}>
                      {alert.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed pr-6">{alert.message}</p>
                    <div className="flex gap-4 items-center mt-2.5 text-[10px] text-muted-foreground font-semibold">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(alert.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(alert.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <span className="uppercase bg-muted/65 border border-border px-1.5 py-0.5 rounded text-[8px] tracking-wider text-muted-foreground/80">
                        {alert.type}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right controls */}
                {!alert.isRead && (
                  <button
                    onClick={() => handleMarkAsRead(alert.id)}
                    className="p-1.5 rounded-lg bg-muted/70 hover:bg-primary hover:text-white border border-border text-muted-foreground hover:border-primary transition-all flex items-center gap-1 text-[10px] font-semibold flex-shrink-0"
                    title="Mark as read"
                  >
                    <Check className="w-3.5 h-3.5" /> Mark read
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
