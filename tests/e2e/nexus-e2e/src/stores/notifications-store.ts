import { create } from 'zustand'

// Notifications domain store — unread count, notification list
interface Notification {
  id: string
  type: string
  title: string
  body: string
  read: boolean
  createdAt: string
}

interface NotificationsStore {
  notifications: Notification[]
  unreadCount: number

  setNotifications: (notifications: Notification[]) => void
  markRead: (id: string) => void
  markAllRead: () => void
  addNotification: (notification: Notification) => void
}

export const useNotificationsStore = create<NotificationsStore>((set) => ({
  notifications: [],
  unreadCount: 0,

  setNotifications: (notifications) =>
    set({ notifications, unreadCount: notifications.filter((n) => !n.read).length }),
  markRead: (id) =>
    set((s) => {
      const updated = s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
      return { notifications: updated, unreadCount: updated.filter((n) => !n.read).length }
    }),
  markAllRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),
  addNotification: (notification) =>
    set((s) => ({
      notifications: [notification, ...s.notifications],
      unreadCount: s.unreadCount + (notification.read ? 0 : 1),
    })),
}))
