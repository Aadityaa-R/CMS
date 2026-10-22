import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { InAppNotification, User } from '@/types';
import { getRepository, INITIAL_NOTIFICATIONS } from '@/data/storage';
import { STORAGE_KEY_PREFIX } from '@/lib/authConstants';
import { useAuth } from '@/context/AuthContext';
import { subscribeRealtimeEvent, broadcastRealtimeEvent } from '@/lib/realtime';
import { Bell, X } from 'lucide-react';

export function isNotificationForUser(n: InAppNotification, user: User | null): boolean {
  if (!user) return false;
  if (n.recipientId === user.id) return true;

  // Receptionist role: matches 'reception', 'receptionist', 'all_reception'
  if (
    (user.role === 'receptionist' || user.id === 'usr-rec-1' || user.id === 'usr-rec-2') &&
    (n.recipientId === 'reception' || n.recipientId === 'receptionist' || n.recipientId === 'all_reception')
  ) {
    return true;
  }

  // Managing Director (MD / Dr. Marcus Vance): matches 'doc-1', 'usr-doc-1', 'md', 'admin'
  if (
    (user.role === 'md' || user.role === 'admin' || user.id === 'usr-doc-1') &&
    (n.recipientId === 'doc-1' || n.recipientId === 'usr-doc-1' || n.recipientId === 'md' || n.recipientId === 'all_doctors')
  ) {
    return true;
  }

  // Doctor (Dr. Nathan Hayes): matches 'doc-2', 'usr-doc-2', 'doctor'
  if (
    (user.role === 'doctor' || user.id === 'usr-doc-2') &&
    (n.recipientId === 'doc-2' || n.recipientId === 'usr-doc-2' || n.recipientId === 'doctor' || n.recipientId === 'all_doctors')
  ) {
    return true;
  }

  // Doctor 3 (Dr. Sophia Reed): matches 'doc-3', 'usr-doc-3'
  if (
    (user.id === 'usr-doc-3' || user.id === 'doc-3') &&
    (n.recipientId === 'doc-3' || n.recipientId === 'usr-doc-3' || n.recipientId === 'all_doctors')
  ) {
    return true;
  }

  // Patient: matches patientId or 'pat-1' or 'patient'
  if (
    user.role === 'patient' &&
    (n.recipientId === user.id ||
      (user.patientId && n.recipientId === user.patientId) ||
      n.recipientId === 'pat-1' ||
      n.recipientId === 'patient')
  ) {
    return true;
  }

  return false;
}

interface NotificationContextType {
  notifications: InAppNotification[];
  userNotifications: InAppNotification[];
  unreadCount: number;
  addNotification: (notif: Omit<InAppNotification, 'id' | 'createdAt' | 'read'>) => Promise<InAppNotification>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismissNotification: (id: string) => Promise<void>;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<InAppNotification[]>(INITIAL_NOTIFICATIONS);
  const [activeToast, setActiveToast] = useState<InAppNotification | null>(null);

  // Load notifications from repository on mount
  useEffect(() => {
    let isMounted = true;
    const loadRepo = async () => {
      try {
        const repo = getRepository<InAppNotification>('notifications');
        const list = await repo.list();
        if (isMounted && list && list.length > 0) {
          setNotifications(list);
        }
      } catch {
        // Fallback to initial
      }
    };
    loadRepo();
    return () => {
      isMounted = false;
    };
  }, []);

  // Listen to realtime events and storage updates
  useEffect(() => {
    const handleRealtime = (event: any) => {
      let notif: InAppNotification | null = null;
      if (event && event.notification) {
        notif = event.notification;
      }
      if (notif) {
        setNotifications((prev) => {
          if (prev.some((n) => n.id === notif!.id)) {
            return prev;
          }
          return [notif!, ...prev];
        });

        if (currentUser && isNotificationForUser(notif, currentUser)) {
          setActiveToast(notif);
        }
      }
    };

    const unsubscribe = subscribeRealtimeEvent(handleRealtime);

    const handleStorage = async (e: StorageEvent) => {
      if (e.key === `${STORAGE_KEY_PREFIX}notifications`) {
        try {
          const repo = getRepository<InAppNotification>('notifications');
          const list = await repo.list();
          if (list) {
            setNotifications(list);
          }
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      unsubscribe();
      window.removeEventListener('storage', handleStorage);
    };
  }, [currentUser]);

  // Auto-dismiss active toast after 6 seconds
  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => {
      setActiveToast(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [activeToast]);

  // Filter notifications for the current user
  const userNotifications = useMemo(() => {
    if (!currentUser) return [];
    return notifications
      .filter((n) => isNotificationForUser(n, currentUser))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [notifications, currentUser]);

  const unreadCount = useMemo(() => {
    return userNotifications.filter((n) => !n.read).length;
  }, [userNotifications]);

  const addNotification = useCallback(
    async (
      data: Omit<InAppNotification, 'id' | 'createdAt' | 'read'>
    ): Promise<InAppNotification> => {
      const newNotif: InAppNotification = {
        ...data,
        id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        read: false,
        createdAt: new Date().toISOString(),
      };

      setNotifications((prev) => [newNotif, ...prev]);

      try {
        const repo = getRepository<InAppNotification>('notifications');
        await repo.create(newNotif);
      } catch {
        // Fallback
      }

      broadcastRealtimeEvent({
        type: 'NOTIFICATION_ADDED',
        notification: newNotif,
      });

      return newNotif;
    },
    []
  );

  const markAsRead = useCallback(async (id: string): Promise<void> => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    try {
      const repo = getRepository<InAppNotification>('notifications');
      await repo.update(id, { read: true });
    } catch {
      // Fallback
    }
  }, []);

  const markAllAsRead = useCallback(async (): Promise<void> => {
    if (!currentUser) return;
    const idsToMark = userNotifications.filter((n) => !n.read).map((n) => n.id);
    if (idsToMark.length === 0) return;

    const idSet = new Set(idsToMark);
    setNotifications((prev) =>
      prev.map((n) => (idSet.has(n.id) ? { ...n, read: true } : n))
    );

    try {
      const repo = getRepository<InAppNotification>('notifications');
      for (const id of idsToMark) {
        await repo.update(id, { read: true });
      }
    } catch {
      // Fallback
    }
  }, [currentUser, userNotifications]);

  const dismissNotification = useCallback(async (id: string): Promise<void> => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      const repo = getRepository<InAppNotification>('notifications');
      await repo.remove(id);
    } catch {
      // Fallback
    }
  }, []);

  const value = useMemo(
    () => ({
      notifications,
      userNotifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      dismissNotification,
    }),
    [
      notifications,
      userNotifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      dismissNotification,
    ]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}

      {/* Realtime Toast Notification Banner */}
      {activeToast && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 max-w-sm w-[calc(100vw-2.5rem)] sm:w-96 bg-white dark:bg-slate-900 border border-teal-500/30 dark:border-teal-500/40 shadow-xl rounded-xl p-4 flex items-start gap-3 transition-all"
        >
          <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
            <Bell className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {activeToast.title}
              </span>
              <span className="text-[0.625rem] text-teal-600 dark:text-teal-400 font-semibold uppercase tracking-wider">
                Just now
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-snug break-words">
              {activeToast.message}
            </p>
            <div className="flex items-center justify-between gap-2 mt-2 pt-1.5 border-t border-slate-100 dark:border-slate-800">
              {activeToast.linkTab ? (
                <button
                  type="button"
                  onClick={() => {
                    const tab = activeToast.linkTab;
                    markAsRead(activeToast.id);
                    setActiveToast(null);
                    const url = new URL(window.location.href);
                    url.searchParams.set('tab', tab!);
                    window.history.pushState({}, '', url.toString());
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="text-xs text-teal-600 dark:text-teal-400 hover:underline font-medium cursor-pointer"
                >
                  View Desk
                </button>
              ) : (
                <span />
              )}
              <button
                type="button"
                onClick={() => {
                  markAsRead(activeToast.id);
                  setActiveToast(null);
                }}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveToast(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 -mr-1 -mt-1 cursor-pointer"
            aria-label="Close notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </aside>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
