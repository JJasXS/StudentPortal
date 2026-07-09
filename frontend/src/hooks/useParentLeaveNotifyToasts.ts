import { useEffect } from 'react';
import { useToast } from '@/context/ToastContext';
import { isLeaveDecisionNotice, leaveDecisionToastVariant } from '@/utils/notifyLeave';
import type { Announcement } from '@/types';

const SESSION_KEY = 'parentLeaveToastedIds';

function getToastedIds(): Set<string> {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

function saveToastedIds(ids: Set<string>) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify([...ids]));
}

export function useParentLeaveNotifyToasts(items: Announcement[], enabled: boolean) {
  const { success, error, info } = useToast();

  useEffect(() => {
    if (!enabled || items.length === 0) return;

    const toasted = getToastedIds();
    const pending = items.filter(
      (item) => !item.isRead && isLeaveDecisionNotice(item) && !toasted.has(item.id)
    );

    if (pending.length === 0) return;

    for (const item of pending) {
      const variant = leaveDecisionToastVariant(item);
      const message = item.content ? `${item.title} — ${item.content}` : item.title;
      if (variant === 'error') error(message);
      else if (variant === 'success') success(message);
      else info(message);
      toasted.add(item.id);
    }

    saveToastedIds(toasted);
  }, [enabled, items, success, error, info]);
}
