import type { Invoice } from '@/types';

const STORAGE_KEY = 'mock-invoice-status';

function loadOverrides(): Record<string, Invoice['status']> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Invoice['status']>) : {};
  } catch {
    return {};
  }
}

function saveOverrides(overrides: Record<string, Invoice['status']>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

export function applyInvoiceStatusOverrides(invoices: Invoice[]): Invoice[] {
  const overrides = loadOverrides();
  return invoices.map((inv) =>
    overrides[inv.id] ? { ...inv, status: overrides[inv.id] } : inv
  );
}

export function markInvoicePaid(invoiceId: string) {
  const overrides = loadOverrides();
  overrides[invoiceId] = 'Paid';
  saveOverrides(overrides);
}
