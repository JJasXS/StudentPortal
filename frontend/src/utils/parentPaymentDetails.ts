import type { ParentPaymentDetails } from '@/types/parentPayment';

const STORAGE_KEY = 'parent-payment-details';

function storageKey(parentUserId: string) {
  return `${STORAGE_KEY}:${parentUserId}`;
}

export function loadParentPaymentDetails(parentUserId: string): ParentPaymentDetails | null {
  try {
    const raw = localStorage.getItem(storageKey(parentUserId));
    if (!raw) return null;
    return JSON.parse(raw) as ParentPaymentDetails;
  } catch {
    return null;
  }
}

export function saveParentPaymentDetails(parentUserId: string, details: ParentPaymentDetails) {
  localStorage.setItem(storageKey(parentUserId), JSON.stringify(details));
}

export function maskCardDisplay(last4: string) {
  return `•••• •••• •••• ${last4}`;
}

export function cardLast4FromNumber(cardNumber: string) {
  const digits = cardNumber.replace(/\D/g, '');
  return digits.slice(-4);
}

export function isValidCvv(cvv: string) {
  const digits = cvv.replace(/\D/g, '');
  return digits.length >= 3 && digits.length <= 4;
}
