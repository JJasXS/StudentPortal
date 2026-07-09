export const NOTIFY_READS_CHANGED = 'portal-notify-reads-changed';

export function notifyReadsChanged() {
  window.dispatchEvent(new CustomEvent(NOTIFY_READS_CHANGED));
}
