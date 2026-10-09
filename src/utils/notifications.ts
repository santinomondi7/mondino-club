import { NotificationItem } from '../types/index.ts';

const DEVICE_NOTIF_STORAGE_KEY = 'mondino_device_notifications_enabled_v1';
const PROMPT_DISMISSED_KEY = 'mondino_device_notifications_prompted_v1';
const PUSHED_IDS_KEY = 'mondino_pushed_notif_ids_v1';

export interface InAppPushBannerPayload {
  id: string;
  title: string;
  body: string;
  icon?: string;
  actionUrl?: string;
  createdAt?: string;
}

export function isDeviceNotificationsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const saved = window.localStorage.getItem(DEVICE_NOTIF_STORAGE_KEY);
    if (saved === 'true') return true;
    if (saved === 'false') return false;
  } catch {
    // ignore storage errors
  }
  if ('Notification' in window && Notification.permission === 'granted') {
    return true;
  }
  return false;
}

export function hasPromptedForNotifications(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    if (window.localStorage.getItem(DEVICE_NOTIF_STORAGE_KEY) !== null) return true;
    return window.sessionStorage.getItem(PROMPT_DISMISSED_KEY) === 'true';
  } catch {
    return true;
  }
}

export function markNotificationPromptDismissed(): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(PROMPT_DISMISSED_KEY, 'true');
  } catch {
    // ignore
  }
}

export function setDeviceNotificationsEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DEVICE_NOTIF_STORAGE_KEY, enabled ? 'true' : 'false');
    window.dispatchEvent(
      new CustomEvent<boolean>('mondino-notif-status-change', { detail: enabled })
    );
  } catch {
    // ignore
  }
}

export async function triggerSystemAndInAppNotification(payload: {
  id?: string;
  title: string;
  body: string;
  icon?: string;
  actionUrl?: string;
}): Promise<void> {
  if (typeof window === 'undefined') return;

  const effectiveIcon = payload.icon || '/images/mondino_app_logo.jpg';

  // 1. Always emit in-app push toast banner so the user sees it on any device/browser/iframe
  window.dispatchEvent(
    new CustomEvent<InAppPushBannerPayload>('mondino-push-toast', {
      detail: {
        id: payload.id || `push-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title: payload.title,
        body: payload.body,
        icon: effectiveIcon,
        actionUrl: payload.actionUrl,
        createdAt: new Date().toISOString(),
      },
    })
  );

  // 2. Also trigger native OS / Service Worker notification if supported and granted
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && typeof reg.showNotification === 'function') {
          await reg.showNotification(payload.title, {
            body: payload.body,
            icon: effectiveIcon,
            badge: effectiveIcon,
            tag: payload.id || undefined,
          });
          return;
        }
      }
    } catch {
      // Fallback to standard Notification constructor below
    }

    try {
      new Notification(payload.title, {
        body: payload.body,
        icon: effectiveIcon,
        badge: effectiveIcon,
      });
    } catch {
      // Ignored on browsers that require ServiceWorkerRegistration
    }
  }
}

export async function requestAndActivateNotifications(clubName: string, logoUrl?: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // Attempt native browser permission prompt if available
  if ('Notification' in window && Notification.permission === 'default') {
    try {
      await Notification.requestPermission();
    } catch {
      // Continue even if iframe/WebView blocks native dialog
    }
  }

  setDeviceNotificationsEnabled(true);

  await triggerSystemAndInAppNotification({
    id: `welcome-notif-${Date.now()}`,
    title: `Notificaciones activadas — ${clubName}`,
    body: 'Te avisaremos cuando sumes puntos, en tu cumpleaños y ante nuevas promociones de la farmacia.',
    icon: logoUrl || '/images/mondino_app_logo.jpg',
  });

  return true;
}

export async function dispatchUnreadNotifications(
  items: NotificationItem[],
  iconUrl?: string
): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!isDeviceNotificationsEnabled()) return;

  try {
    const seenRaw = window.localStorage.getItem(PUSHED_IDS_KEY) || '[]';
    const seenIds = new Set<string>(JSON.parse(seenRaw));
    let updated = false;

    const unreadItems = items.filter((item) => !item.isRead && !seenIds.has(item.id));
    for (const item of unreadItems.slice(0, 3)) {
      seenIds.add(item.id);
      updated = true;
      await triggerSystemAndInAppNotification({
        id: item.id,
        title: item.title,
        body: item.message,
        icon: iconUrl || '/images/mondino_app_logo.jpg',
        actionUrl: item.actionUrl,
      });
    }

    // Mark remaining unread items as seen if there were many on initial load
    for (const item of unreadItems.slice(3)) {
      seenIds.add(item.id);
      updated = true;
    }

    if (updated) {
      const recentIds = Array.from(seenIds).slice(-100);
      window.localStorage.setItem(PUSHED_IDS_KEY, JSON.stringify(recentIds));
    }
  } catch {
    // ignore storage errors
  }
}
