import { AUDIT_ACTIONS, type AuditLogEntry } from '@/types/auditLog';
import type { User } from '@/types';
import { mergeWithMockAuditLogs, mockAuditLogs } from '@/utils/mockAuditLogs';

const STORAGE_KEY = 'mtp_audit_logs';
const MAX_ENTRIES = 1000;

export const AUDIT_ACTION_LABELS: Record<string, string> = {
  [AUDIT_ACTIONS.settingsUpdated]: 'Settings updated',
  [AUDIT_ACTIONS.invoiceCreated]: 'Invoice created',
  [AUDIT_ACTIONS.invoiceSent]: 'Invoice sent',
  [AUDIT_ACTIONS.invoiceUpdated]: 'Invoice updated',
  [AUDIT_ACTIONS.invoiceMarkedPaid]: 'Invoice marked paid',
  [AUDIT_ACTIONS.invoiceCancelled]: 'Invoice cancelled',
  [AUDIT_ACTIONS.invoiceMonthlyBilling]: 'Monthly billing run',
  [AUDIT_ACTIONS.studentCreated]: 'Student created',
  [AUDIT_ACTIONS.studentUpdated]: 'Student updated',
  [AUDIT_ACTIONS.studentDeactivated]: 'Student deactivated',
  [AUDIT_ACTIONS.parentCreated]: 'Parent created',
  [AUDIT_ACTIONS.parentUpdated]: 'Parent updated',
  [AUDIT_ACTIONS.parentDeactivated]: 'Parent deactivated',
  [AUDIT_ACTIONS.teacherCreated]: 'Teacher created',
  [AUDIT_ACTIONS.teacherUpdated]: 'Teacher updated',
  [AUDIT_ACTIONS.teacherDeactivated]: 'Teacher deactivated',
  [AUDIT_ACTIONS.teacherRateUpdated]: 'Teacher rate updated',
  [AUDIT_ACTIONS.teacherSpecializationUpdated]: 'Teacher specialization updated',
  [AUDIT_ACTIONS.courseCreated]: 'Course created',
  [AUDIT_ACTIONS.courseUpdated]: 'Course updated',
  [AUDIT_ACTIONS.courseDeactivated]: 'Course deactivated',
  [AUDIT_ACTIONS.classCreated]: 'Class created',
  [AUDIT_ACTIONS.classUpdated]: 'Class updated',
  [AUDIT_ACTIONS.classDeactivated]: 'Class deactivated',
  [AUDIT_ACTIONS.enrollmentCreated]: 'Enrollment created',
  [AUDIT_ACTIONS.enrollmentUpdated]: 'Enrollment updated',
  [AUDIT_ACTIONS.enrollmentCancelled]: 'Enrollment cancelled',
  [AUDIT_ACTIONS.announcementCreated]: 'Announcement created',
  [AUDIT_ACTIONS.announcementUpdated]: 'Announcement updated',
  [AUDIT_ACTIONS.announcementDeleted]: 'Announcement deleted',
  'invoice.status_changed': 'Invoice status changed',
  'invoice.paid': 'Invoice paid (parent)',
  'teacher.employment_updated': 'Teacher employment updated',
};

export function formatAuditAction(action: string) {
  return AUDIT_ACTION_LABELS[action] ?? action.replace(/\./g, ' · ');
}

function loadLocal(): AuditLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const stored = raw ? (JSON.parse(raw) as AuditLogEntry[]) : [];
    if (import.meta.env.VITE_USE_MOCK === 'true' && stored.length === 0) {
      return [...mockAuditLogs];
    }
    return stored;
  } catch {
    return import.meta.env.VITE_USE_MOCK === 'true' ? [...mockAuditLogs] : [];
  }
}

function saveLocal(entries: AuditLogEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
}

export function logAdminAction(
  actor: Pick<User, 'id' | 'fullName' | 'role'> | null | undefined,
  params: {
    action: string;
    entityType: string;
    entityId?: string;
    entityLabel?: string;
    details?: string;
  }
) {
  const entry: AuditLogEntry = {
    id: crypto.randomUUID(),
    actorUserId: actor?.id,
    actorName: actor?.fullName ?? 'Admin',
    actorRole: actor?.role ?? 'Admin',
    createdAt: new Date().toISOString(),
    ...params,
  };

  saveLocal([entry, ...loadLocal()]);

  if (import.meta.env.VITE_USE_MOCK !== 'true') {
    import('@/api/resources')
      .then(({ auditLogsApi }) =>
        auditLogsApi.create({
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          entityLabel: params.entityLabel,
          details: params.details,
        })
      )
      .catch(() => {});
  }

  return entry;
}

export function filterLocalAuditLogs(
  entries: AuditLogEntry[],
  filters: { search?: string; action?: string; entityType?: string; from?: string; to?: string }
) {
  const q = filters.search?.trim().toLowerCase();
  return entries.filter((e) => {
    if (filters.action && e.action !== filters.action) return false;
    if (filters.entityType && e.entityType !== filters.entityType) return false;
    if (filters.from && e.createdAt.slice(0, 10) < filters.from) return false;
    if (filters.to && e.createdAt.slice(0, 10) > filters.to) return false;
    if (q) {
      const haystack = [
        e.action,
        e.entityType,
        e.entityLabel,
        e.actorName,
        e.details,
        formatAuditAction(e.action),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

export function loadLocalAuditLogs(filters?: {
  search?: string;
  action?: string;
  entityType?: string;
  from?: string;
  to?: string;
}) {
  const entries = loadLocal();
  return filters ? filterLocalAuditLogs(entries, filters) : entries;
}

export async function loadAuditLogs(filters?: {
  search?: string;
  action?: string;
  entityType?: string;
  from?: string;
  to?: string;
}): Promise<AuditLogEntry[]> {
  const local = loadLocalAuditLogs(filters);

  if (import.meta.env.VITE_USE_MOCK === 'true') {
    return mergeWithMockAuditLogs(local);
  }

  try {
    const { auditLogsApi } = await import('@/api/resources');
    const remote = await auditLogsApi.getAll(filters);
    const byId = new Map<string, AuditLogEntry>();
    for (const e of [...remote, ...local]) {
      byId.set(e.id, e);
    }
    const merged = [...byId.values()].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return merged.length > 0 ? merged : mergeWithMockAuditLogs([]);
  } catch {
    const fallback = mergeWithMockAuditLogs(local);
    return fallback.length > 0 ? fallback : [...mockAuditLogs];
  }
}
