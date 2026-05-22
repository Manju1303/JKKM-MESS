import { create } from 'zustand';

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  severity: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  setNotifications: (n: Notification[]) => void;
  addNotification: (n: Notification) => void;
  markRead: (id: number) => void;
  markAllRead: () => void;
  setUnreadCount: (count: number) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  setNotifications: (notifications) => set({
    notifications,
    unreadCount: notifications.filter(n => !n.isRead).length,
  }),
  addNotification: (n) => set((s) => ({
    notifications: [n, ...s.notifications],
    unreadCount: s.unreadCount + 1,
  })),
  markRead: (id) => set((s) => ({
    notifications: s.notifications.map(n => n.id === id ? { ...n, isRead: true } : n),
    unreadCount: Math.max(0, s.unreadCount - 1),
  })),
  markAllRead: () => set((s) => ({
    notifications: s.notifications.map(n => ({ ...n, isRead: true })),
    unreadCount: 0,
  })),
  setUnreadCount: (count) => set({ unreadCount: count }),
}));
