import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { InAppNotification } from '@/types';
import { getRepository, INITIAL_NOTIFICATIONS } from '@/data/storage';
import { useAuth } from '@/context/AuthContext';

interface NotificationContextType {
  notifications: InAppNotification[];
  userNotifications: InAppNotification[];
  unreadCount: number;
  addNotification: (notif: Omit<InAppNotification, 'id' | 'createdAt' | 'read'>) => Promise<InAppNotification>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  dismissNotification: (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState<InAppNotification[]>(INITIAL_NOTIFICATIONS);

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

  // Filter notifications for the current user
  const userNotifications = useMemo(() => {
    if (!currentUser) return [];
    return notifications
      .filter((n) => {
        if (n.recipientId === currentUser.id) return true;
        if (currentUser.patientId && n.recipientId === currentUser.patientId) return true;
        if (currentUser.role === 'patient' && (n.recipientId === 'pat-1' || n.recipientId === 'patient')) return true;
        return false;
      })
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
