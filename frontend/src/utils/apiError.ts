import axios from 'axios';

/** Prefer API `{ message }` over generic axios status text. */
export function getApiErrorMessage(error: unknown, fallback = 'Request failed'): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message;
    if (typeof message === 'string' && message.trim()) return message;
    if (error.response?.status === 403) {
      return 'This page is for parent accounts only. Sign in with a parent email from SQL Account.';
    }
    if (error.response?.status === 404) {
      return 'API endpoint not found. Restart the backend after pulling latest changes.';
    }
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
