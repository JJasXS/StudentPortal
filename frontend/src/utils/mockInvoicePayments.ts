import type { Invoice } from '@/types';

const STORAGE_KEY = 'mock-invoice-patches';

function loadPatches(): Record<string, Partial<Invoice>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Partial<Invoice>>) : {};
  } catch {
    return {};
  }
}

function savePatches(patches: Record<string, Partial<Invoice>>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(patches));
}

export function applyInvoicePatches(invoices: Invoice[]): Invoice[] {
  const patches = loadPatches();
  return invoices.map((inv) => (patches[inv.id] ? { ...inv, ...patches[inv.id] } : inv));
}

/** @deprecated use applyInvoicePatches */
export const applyInvoiceStatusOverrides = applyInvoicePatches;

export function patchInvoice(invoiceId: string, patch: Partial<Invoice>) {
  const patches = loadPatches();
  patches[invoiceId] = { ...patches[invoiceId], ...patch };
  savePatches(patches);
}

export function markInvoicePaid(invoiceId: string) {
  patchInvoice(invoiceId, { status: 'Paid', paidAt: new Date().toISOString() });
}

export function setInvoiceStatus(invoiceId: string, status: Invoice['status']) {
  patchInvoice(invoiceId, { status });
}
