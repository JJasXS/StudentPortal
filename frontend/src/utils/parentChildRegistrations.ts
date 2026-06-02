import type { PendingChildRegistration, RegisterChildFormData } from '@/types/childRegistration';

const STORAGE_KEY = 'parent-child-registrations';

function loadAll(): PendingChildRegistration[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PendingChildRegistration[]) : [];
  } catch {
    return [];
  }
}

function saveAll(items: PendingChildRegistration[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function loadPendingRegistrations(parentUserId: string) {
  return loadAll().filter((r) => r.parentUserId === parentUserId);
}

export function addPendingRegistration(parentUserId: string, form: RegisterChildFormData) {
  const entry: PendingChildRegistration = {
    id: `pending-${crypto.randomUUID()}`,
    parentUserId,
    fullName: form.fullName.trim(),
    dateOfBirth: form.dateOfBirth,
    gender: form.gender,
    schoolName: form.schoolName.trim() || undefined,
    instrument: form.instrument.trim() || undefined,
    status: 'Pending',
    submittedAt: new Date().toISOString(),
  };
  saveAll([...loadAll(), entry]);
  return entry;
}
