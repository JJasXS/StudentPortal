import type { Invoice } from '@/types';
import { mockInvoices } from '@/utils/mockData';
import { applyInvoicePatches, patchInvoice } from '@/utils/mockInvoicePayments';

const STORAGE_KEY = 'mtp_admin_invoices';

function loadCreated(): Invoice[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Invoice[]) : [];
  } catch {
    return [];
  }
}

function saveCreated(invoices: Invoice[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(invoices));
}

/** All invoices: seed data + admin-created, with payment status overrides applied. */
export function loadAllInvoices(): Invoice[] {
  const created = loadCreated();
  const baseIds = new Set(mockInvoices.map((i) => i.id));
  const extra = created.filter((i) => !baseIds.has(i.id));
  return applyInvoicePatches([...mockInvoices, ...extra]);
}

export function appendInvoices(newInvoices: Invoice[]): Invoice[] {
  const created = loadCreated();
  const next = [...created, ...newInvoices];
  saveCreated(next);
  return loadAllInvoices();
}

export function updateStoredInvoice(id: string, patch: Partial<Invoice>): Invoice[] {
  const created = loadCreated();
  const idx = created.findIndex((i) => i.id === id);
  if (idx >= 0) {
    created[idx] = { ...created[idx], ...patch };
    saveCreated(created);
  } else {
    patchInvoice(id, patch);
  }
  return loadAllInvoices();
}
