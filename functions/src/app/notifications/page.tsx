'use client';

import { useAccount } from 'wagmi';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ConnectionStatus } from '@/components/wallet/ConnectionStatus';
import { MainLayout } from '@/components/layout/MainLayout';
import { getNotificationsFromEvents, getNotificationIcon, getNotificationColor, type Notification, type NotificationPriority } from '@/lib/notifications';

export default function NotificationsPage() {
  const { address } = useAccount();
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'UNREAD' | NotificationPriority>('ALL');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!address) return;
    
    let cancelled = false;
    
    async function loadNotifications() {
      setLoading(true);
      try {
        const notifs = await getNotificationsFromEvents(address as string);
        if (!cancelled) {
          setNotifications(notifs);
        }
      } catch (error) {
        console.error('Failed to load notifications:', error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    
    loadNotifications();
    
    return () => {
      cancelled = true;
    };
  }, [address]);
  
  const filteredNotifications = notifications.filter(n => {
    if (filter === 'UNREAD') return !n.read;
    if (filter === 'HIGH' || filter === 'MEDIUM' || filter === 'LOW') return n.priority === filter;
    return true;
  });
  
  const markAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };
  
  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };
  
  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };
  
  const unreadCount = notifications.filter(n => !n.read).length;
  
  return (
    <MainLayout>
      <ConnectionStatus requireConnection requireCorrectNetwork>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
          <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
            
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Notifications
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Stay updated on your assets, transactions, and platform activity
              </p>
              
              {/* Info Banner */}
              <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm text-blue-900 dark:text-blue-300">
                    <p className="font-semibold mb-1">Real-Time Blockchain Notifications</p>
                    <p>Notifications are generated from actual blockchain events (asset approvals, income deposits, transactions). You'll only see notifications for events that have occurred on-chain.</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Stats & Actions */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 mb-6 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-6">
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Total</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{notifications.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Unread</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{unreadCount}</p>
                  </div>
                </div>
                
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all text-sm"
                  >
                    Mark All as Read
                  </button>
                )}
              </div>
            </div>
            
            {/* Filters */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-4 mb-6 border border-slate-200 dark:border-slate-700">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilter('ALL')}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    filter === 'ALL'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('UNREAD')}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    filter === 'UNREAD'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                  }`}
                >
                  Unread ({unreadCount})
                </button>
                <button
                  onClick={() => setFilter('HIGH')}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    filter === 'HIGH'
                      ? 'bg-red-600 text-white'
                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                  }`}
                >
                  High Priority
                </button>
                <button
                  onClick={() => setFilter('MEDIUM')}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    filter === 'MEDIUM'
                      ? 'bg-amber-600 text-white'
                      : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/50'
                  }`}
                >
                  Medium Priority
                </button>
                <button
                  onClick={() => setFilter('LOW')}
                  className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${
                    filter === 'LOW'
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                  }`}
                >
                  Low Priority
                </button>
              </div>
            </div>
            
            {/* Notifications List */}
            <div className="space-y-3">
              {loading ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-12 text-center border border-slate-200 dark:border-slate-700">
                  <svg className="animate-spin w-12 h-12 text-blue-600 dark:text-blue-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <p className="text-slate-600 dark:text-slate-400">Loading notifications...</p>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-12 text-center border border-slate-200 dark:border-slate-700">
                  <svg className="w-16 h-16 text-slate-400 dark:text-slate-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  </svg>
                  <p className="text-slate-600 dark:text-slate-400">No notifications found</p>
                </div>
              ) : (
                filteredNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`bg-white dark:bg-slate-800 rounded-xl shadow-lg border-l-4 p-6 ${
                      getNotificationColor(notification.priority)
                    } ${!notification.read ? 'ring-2 ring-blue-500/20' : ''}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="text-3xl flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
                              {notification.title}
                            </h3>
                            <p className="text-slate-600 dark:text-slate-400">
                              {notification.message}
                            </p>
                          </div>
                          {!notification.read && (
                            <span className="px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded">
                              NEW
                            </span>
                          )}
                        </div>
                        
                        {notification.amount && (
                          <p className="text-lg font-bold text-green-600 dark:text-green-400 mb-2">
                            {notification.amount}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between mt-4">
                          <span className="text-sm text-slate-500 dark:text-slate-400">
                            {new Date(notification.timestamp).toLocaleString()}
                          </span>
                          
                          <div className="flex items-center gap-2">
                            {!notification.read && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="px-3 py-1.5 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg font-semibold transition-colors"
                              >
                                Mark as Read
                              </button>
                            )}
                            {notification.actionUrl && (
                              <button
                                onClick={() => router.push(notification.actionUrl!)}
                                className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-all"
                              >
                                {notification.actionLabel || 'View'}
                              </button>
                            )}
                            <button
                              onClick={() => deleteNotification(notification.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                              aria-label="Delete notification"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </ConnectionStatus>
    </MainLayout>
  );
}
