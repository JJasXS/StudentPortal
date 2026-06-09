import { AUDIT_ACTIONS, type AuditLogEntry } from '@/types/auditLog';

const ADMIN_USER_ID = '11111111-1111-1111-1111-111111111111';

function daysAgo(days: number, hours = 10) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hours, 30, 0, 0);
  return d.toISOString();
}

/** Ten representative admin audit entries for demo / empty stores */
export const mockAuditLogs: AuditLogEntry[] = [
  {
    id: 'audit-demo-01',
    actorUserId: ADMIN_USER_ID,
    actorName: 'System Admin',
    actorRole: 'Admin',
    action: AUDIT_ACTIONS.settingsUpdated,
    entityType: 'Settings',
    entityLabel: 'Centre settings',
    details: 'Updated invoice prefix and bank details',
    createdAt: daysAgo(0, 9),
  },
  {
    id: 'audit-demo-02',
    actorUserId: ADMIN_USER_ID,
    actorName: 'System Admin',
    actorRole: 'Admin',
    action: AUDIT_ACTIONS.invoiceSent,
    entityType: 'Invoice',
    entityId: 'inv-0042',
    entityLabel: 'INV-2026-0042',
    details: 'Sent to Michael Tan — Piano Mon AM',
    createdAt: daysAgo(1, 14),
  },
  {
    id: 'audit-demo-03',
    actorUserId: ADMIN_USER_ID,
    actorName: 'System Admin',
    actorRole: 'Admin',
    action: AUDIT_ACTIONS.enrollmentCreated,
    entityType: 'Enrollment',
    entityId: 'enr-101',
    entityLabel: 'Emily Tan → Piano Mon AM',
    details: 'Active',
    createdAt: daysAgo(2, 11),
  },
  {
    id: 'audit-demo-04',
    actorUserId: ADMIN_USER_ID,
    actorName: 'System Admin',
    actorRole: 'Admin',
    action: AUDIT_ACTIONS.teacherRateUpdated,
    entityType: 'Teacher',
    entityId: '2',
    entityLabel: 'Sarah Chen',
    details: '$85/hr',
    createdAt: daysAgo(3, 16),
  },
  {
    id: 'audit-demo-05',
    actorUserId: ADMIN_USER_ID,
    actorName: 'System Admin',
    actorRole: 'Admin',
    action: AUDIT_ACTIONS.courseCreated,
    entityType: 'Course',
    entityId: 'c-piano-g5',
    entityLabel: 'Piano Grade 5',
    createdAt: daysAgo(4, 10),
  },
  {
    id: 'audit-demo-06',
    actorUserId: ADMIN_USER_ID,
    actorName: 'System Admin',
    actorRole: 'Admin',
    action: AUDIT_ACTIONS.classCreated,
    entityType: 'Class',
    entityId: 'cl1',
    entityLabel: 'Piano Mon AM',
    createdAt: daysAgo(5, 9),
  },
  {
    id: 'audit-demo-07',
    actorUserId: ADMIN_USER_ID,
    actorName: 'System Admin',
    actorRole: 'Admin',
    action: AUDIT_ACTIONS.studentUpdated,
    entityType: 'Student',
    entityId: '4',
    entityLabel: 'Emily Tan',
    createdAt: daysAgo(6, 13),
  },
  {
    id: 'audit-demo-08',
    actorUserId: ADMIN_USER_ID,
    actorName: 'System Admin',
    actorRole: 'Admin',
    action: AUDIT_ACTIONS.announcementCreated,
    entityType: 'Announcement',
    entityId: 'ann-holiday',
    entityLabel: 'Labour Day closure',
    createdAt: daysAgo(7, 8),
  },
  {
    id: 'audit-demo-09',
    actorUserId: ADMIN_USER_ID,
    actorName: 'System Admin',
    actorRole: 'Admin',
    action: AUDIT_ACTIONS.invoiceMonthlyBilling,
    entityType: 'Invoice',
    entityLabel: 'June 2026 monthly run',
    details: '12 invoices created',
    createdAt: daysAgo(8, 7),
  },
  {
    id: 'audit-demo-10',
    actorUserId: ADMIN_USER_ID,
    actorName: 'System Admin',
    actorRole: 'Admin',
    action: AUDIT_ACTIONS.parentUpdated,
    entityType: 'Parent',
    entityId: '6',
    entityLabel: 'Michael Tan',
    createdAt: daysAgo(9, 15),
  },
];

export function mergeWithMockAuditLogs(entries: AuditLogEntry[]): AuditLogEntry[] {
  const byId = new Map<string, AuditLogEntry>();
  for (const e of [...mockAuditLogs, ...entries]) {
    byId.set(e.id, e);
  }
  return [...byId.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}
