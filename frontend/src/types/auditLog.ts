export interface AuditLogEntry {
  id: string;
  actorUserId?: string;
  actorName?: string;
  actorRole?: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityLabel?: string;
  details?: string;
  createdAt: string;
}

export const AUDIT_ACTIONS = {
  settingsUpdated: 'settings.updated',
  invoiceCreated: 'invoice.created',
  invoiceSent: 'invoice.sent',
  invoiceUpdated: 'invoice.updated',
  invoiceMarkedPaid: 'invoice.marked_paid',
  invoiceCancelled: 'invoice.cancelled',
  invoiceMonthlyBilling: 'invoice.monthly_billing',
  studentCreated: 'student.created',
  studentUpdated: 'student.updated',
  studentDeactivated: 'student.deactivated',
  parentCreated: 'parent.created',
  parentUpdated: 'parent.updated',
  parentDeactivated: 'parent.deactivated',
  teacherCreated: 'teacher.created',
  teacherUpdated: 'teacher.updated',
  teacherDeactivated: 'teacher.deactivated',
  teacherRateUpdated: 'teacher.rate_updated',
  teacherSpecializationUpdated: 'teacher.specialization_updated',
  courseCreated: 'course.created',
  courseUpdated: 'course.updated',
  courseDeactivated: 'course.deactivated',
  classCreated: 'class.created',
  classUpdated: 'class.updated',
  classDeactivated: 'class.deactivated',
  enrollmentCreated: 'enrollment.created',
  enrollmentUpdated: 'enrollment.updated',
  enrollmentCancelled: 'enrollment.cancelled',
  announcementCreated: 'announcement.created',
  announcementUpdated: 'announcement.updated',
  announcementDeleted: 'announcement.deleted',
} as const;

export const AUDIT_ENTITY_TYPES = [
  'Settings',
  'Invoice',
  'Student',
  'Parent',
  'Teacher',
  'Course',
  'Class',
  'Enrollment',
  'Announcement',
] as const;
