import type { AppNotification } from '@/types/notification';

const STORAGE_KEY = 'mtp_notifications';

const DEMO_PARENT_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'n-demo-1',
    userId: '6',
    title: 'New lesson note',
    message: 'Introduction to C Major — Emily had a great first lesson!',
    category: 'LessonNote',
    linkPath: '/parent/lesson-notes',
    isRead: false,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'n-demo-2',
    userId: '6',
    title: 'Course fee due',
    message: 'INV-2026-0042 — RM 300.00 due 15 Jun 2026',
    category: 'Invoice',
    linkPath: '/parent/invoices',
    isRead: false,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'n-demo-3',
    userId: '6',
    title: 'Centre closed — public holiday',
    message: 'The centre will be closed on 5 May for Labour Day.',
    category: 'Announcement',
    linkPath: '/parent/announcements',
    isRead: true,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

function loadLocal(userId: string): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all: AppNotification[] = raw ? JSON.parse(raw) : [];
    const mine = all.filter((n) => n.userId === userId);
    if (mine.length === 0 && DEMO_PARENT_NOTIFICATIONS.some((n) => n.userId === userId)) {
      return DEMO_PARENT_NOTIFICATIONS.filter((n) => n.userId === userId);
    }
    return mine;
  } catch {
    return DEMO_PARENT_NOTIFICATIONS.filter((n) => n.userId === userId);
  }
}

function saveLocal(entries: AppNotification[]) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const all: AppNotification[] = raw ? JSON.parse(raw) : [];
    const byId = new Map(all.map((n) => [n.id, n]));
    for (const entry of entries) byId.set(entry.id, entry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...byId.values()]));
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }
}

export const NOTIFICATION_CATEGORY_LABELS: Record<string, string> = {
  LessonNote: 'Lesson note',
  Invoice: 'Billing',
  Announcement: 'Announcement',
  Attendance: 'Attendance',
  System: 'System',
};

export async function loadNotifications(
  userId: string,
  unreadOnly?: boolean
): Promise<AppNotification[]> {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    const list = loadLocal(userId);
    return unreadOnly ? list.filter((n) => !n.isRead) : list;
  }

  try {
    const { notificationsApi } = await import('@/api/resources');
    return notificationsApi.getAll(unreadOnly);
  } catch {
    return loadLocal(userId);
  }
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    return loadLocal(userId).filter((n) => !n.isRead).length;
  }

  try {
    const { notificationsApi } = await import('@/api/resources');
    return notificationsApi.getUnreadCount();
  } catch {
    return loadLocal(userId).filter((n) => !n.isRead).length;
  }
}

export async function markNotificationRead(userId: string, id: string) {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    const list = loadLocal(userId).map((n) => (n.id === id ? { ...n, isRead: true } : n));
    saveLocal(list);
    return;
  }

  try {
    const { notificationsApi } = await import('@/api/resources');
    await notificationsApi.markRead(id);
  } catch {
    const list = loadLocal(userId).map((n) => (n.id === id ? { ...n, isRead: true } : n));
    saveLocal(list);
  }
}

export async function markAllNotificationsRead(userId: string) {
  if (import.meta.env.VITE_USE_MOCK === 'true') {
    const list = loadLocal(userId).map((n) => ({ ...n, isRead: true }));
    saveLocal(list);
    return;
  }

  try {
    const { notificationsApi } = await import('@/api/resources');
    await notificationsApi.markAllRead();
  } catch {
    const list = loadLocal(userId).map((n) => ({ ...n, isRead: true }));
    saveLocal(list);
  }
}

export function pushLocalNotification(notification: Omit<AppNotification, 'id' | 'createdAt'>) {
  const entry: AppNotification = {
    ...notification,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  saveLocal([entry]);
  return entry;
}
