import type { User } from '@/types';
import { TOKEN_KEY, USER_KEY } from '@/utils/constants';

const ACCOUNTS_KEY = 'mtp_saved_accounts';

export interface SavedAccount {
  token: string;
  user: User;
  savedAt: string;
}

function loadAll(): SavedAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    return raw ? (JSON.parse(raw) as SavedAccount[]) : [];
  } catch {
    return [];
  }
}

function saveAll(accounts: SavedAccount[]) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
}

export function getSavedAccounts(): SavedAccount[] {
  return loadAll();
}

export function saveCurrentAccount(): void {
  const token = localStorage.getItem(TOKEN_KEY);
  const userRaw = localStorage.getItem(USER_KEY);
  if (!token || !userRaw) return;

  try {
    const user = JSON.parse(userRaw) as User;
    const all = loadAll().filter(
      (a) => a.user.id !== user.id && a.user.email.toLowerCase() !== user.email.toLowerCase()
    );
    all.unshift({ token, user, savedAt: new Date().toISOString() });
    saveAll(all.slice(0, 8));
  } catch {
    /* ignore */
  }
}

export function removeSavedAccount(userId: string): void {
  saveAll(loadAll().filter((a) => a.user.id !== userId));
}

export function switchToSavedAccount(account: SavedAccount): void {
  localStorage.setItem(TOKEN_KEY, account.token);
  localStorage.setItem(USER_KEY, JSON.stringify(account.user));
}
