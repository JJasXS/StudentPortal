import { AUDIT_ACTIONS, type AuditLogEntry } from '@/types/auditLog';

const ADMIN_USER_ID = '11111111-1111-1111-1111-111111111111';
const TEACHER_USER_ID = '22222222-2222-2222-2222-222222222221';

function daysAgo(days: number, hours = 10) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hours, 0, 0, 0);
  return d.toISOString();
}

/** Representative admin audit entries for demo / empty stores */
export const mockAuditLogs: AuditLogEntry[] = [
  {
    id: 'audit-demo-01',
    actorUserId: ADMIN_USER_ID,
    actorName: 'System Admin',
    actorRole: 'Admin',
    action: AUDIT_ACTIONS.announcementCreated,
    entityType: 'Announcement',
    entityLabel: 'CNY holiday hours',
    details: 'Posted centre-wide notice for Chinese New Year opening hours',
    createdAt: daysAgo(0, 11),
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
    details: 'Sent INV-2026-0042 to Michael Tan (Piano Mon AM)',
    createdAt: daysAgo(0, 9),
  },
  {
    id: 'audit-demo-03',
    actorUserId: ADMIN_USER_ID,
    actorName: 'System Admin',
    actorRole: 'Admin',
    action: AUDIT_ACTIONS.invoiceMarkedPaid,
    entityType: 'Invoice',
    entityId: 'inv-0038',
    entityLabel: 'INV-2026-0038',
    details: 'Marked INV-2026-0038 paid — Lisa Lim / James Lim Violin',
    createdAt: daysAgo(1, 16),
  },
  {
    id: 'audit-demo-04',
    actorUserId: ADMIN_USER_ID,
    actorName: 'System Admin',
    actorRole: 'Admin',
    action: AUDIT_ACTIONS.enrollmentCreated,
    entityType: 'Enrollment',
    entityId: 'enr-101',
    entityLabel: 'Emily Tan → Piano Mon AM',
    details: 'Enrolled Emily Tan in Piano Mon AM (Active)',
    createdAt: daysAgo(1, 14),
  },
  {
    id: 'audit-demo-05',
    actorUserId: ADMIN_USER_ID,
    actorName: 'System Admin',
    actorRole: 'Admin',
    action: AUDIT_ACTIONS.enrollmentCancelled,
    entityType: 'Enrollment',
    entityId: 'enr-088',
    entityLabel: 'Chloe Ng → Guitar Wed Eve',
    details: 'Cancelled Chloe Ng enrollment — family relocating',
    createdAt: daysAgo(2, 10),
  },
  {
    id: 'audit-demo-06',
    actorUserId: TEACHER_USER_ID,
    actorName: 'Sarah Chen',
    actorRole: 'Teacher',
    action: AUDIT_ACTIONS.studentUpdated,
    entityType: 'Student',
    entityId: '4',
    entityLabel: 'Emily Tan',
    details: 'Updated level to Grade 4 and emergency contact',
    createdAt: daysAgo(2, 18),
  },
  {
    id: 'audit-demo-07',
    actorUserId: ADMIN_USER_ID,
    actorName: 'System Admin',
    actorRole: 'Admin',
    action: AUDIT_ACTIONS.teacherRateUpdated,
    entityType: 'Teacher',
    entityId: '2',
    entityLabel: 'Sarah Chen',
    details: 'Hourly rate set to RM 85',
    createdAt: daysAgo(3, 15),
  },
  {
    id: 'audit-demo-08',
    actorUserId: ADMIN_USER_ID,
    actorName: 'System Admin',
    actorRole: 'Admin',
    action: AUDIT_ACTIONS.teacherCreated,
    entityType: 'Teacher',
    entityId: '3',
    entityLabel: 'David Wong',
    details: 'Added teacher David Wong (Guitar / Full-time)',
    createdAt: daysAgo(3, 11),
  },
  {
    id: 'audit-demo-09',
    actorUserId: ADMIN_USER_ID,
    actorName: 'System Admin',
    actorRole: 'Admin',
    action: AUDIT_ACTIONS.classCreated,
    entityType: 'Class',
    entityLabel: 'Violin Thu PM',
    details: 'Created Violin Thu PM · room Studio B · capacity 6',
    createdAt: daysAgo(4, 10),
  },
  {
    id: 'audit-demo-10',
    actorUserId: ADMIN_USER_ID,
    actorName: 'System Admin',
    actorRole: 'Admin',
    action: AUDIT_ACTIONS.courseCreated,
    entityType: 'Course',
    entityLabel: 'Piano Grade 5',
    details: 'Created course Piano Grade 5 · ABRSM track',
    createdAt: daysAgo(5, 9),
  },
  {
    id: 'audit-demo-11',
    actorUserId: ADMIN_USER_ID,
    actorName: 'System Admin',
    actorRole: 'Admin',
    action: AUDIT_ACTIONS.parentCreated,
    entityType: 'Parent',
    entityId: '6',
    entityLabel: 'Michael Tan',
    details: 'Registered parent Michael Tan linked to Emily Tan',
    createdAt: daysAgo(6, 13),
  },
  {
    id: 'audit-demo-12',
    actorUserId: ADMIN_USER_ID,
    actorName: 'System Admin',
    actorRole: 'Admin',
    action: AUDIT_ACTIONS.studentCreated,
    entityType: 'Student',
    entityId: '5',
    entityLabel: 'James Lim',
    details: 'Registered student James Lim (Violin beginner)',
    createdAt: daysAgo(7, 12),
  },
  {
    id: 'audit-demo-13',
    actorUserId: ADMIN_USER_ID,
    actorName: 'System Admin',
    actorRole: 'Admin',
    action: AUDIT_ACTIONS.invoiceMonthlyBilling,
    entityType: 'Invoice',
    entityLabel: 'July 2026 monthly run',
    details: 'Generated 12 invoices for July 2026 billing period',
    createdAt: daysAgo(8, 7),
  },
  {
    id: 'audit-demo-14',
    actorUserId: ADMIN_USER_ID,
    actorName: 'System Admin',
    actorRole: 'Admin',
    action: AUDIT_ACTIONS.settingsUpdated,
    entityType: 'Settings',
    entityLabel: 'Centre settings',
    details: 'Updated invoice prefix to INV and bank account details',
    createdAt: daysAgo(9, 9),
  },
  {
    id: 'audit-demo-15',
    actorUserId: ADMIN_USER_ID,
    actorName: 'System Admin',
    actorRole: 'Admin',
    action: AUDIT_ACTIONS.announcementUpdated,
    entityType: 'Announcement',
    entityLabel: 'Studio renovation',
    details: 'Rescheduled renovation notice end date to 31 Aug 2026',
    createdAt: daysAgo(10, 8),
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
