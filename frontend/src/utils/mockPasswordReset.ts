const CODE_KEY = 'mtp_password_reset_codes';

interface ResetEntry {
  code: string;
  expiresAt: number;
}

function load(): Record<string, ResetEntry> {
  try {
    const raw = localStorage.getItem(CODE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function save(entries: Record<string, ResetEntry>) {
  localStorage.setItem(CODE_KEY, JSON.stringify(entries));
}

export function issueMockResetCode(email: string): string | null {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const code = String(Math.floor(100000 + Math.random() * 900000));
  const entries = load();
  entries[normalized] = {
    code,
    expiresAt: Date.now() + 60 * 60 * 1000,
  };
  save(entries);
  return code;
}

export function verifyMockResetCode(email: string, code: string): boolean {
  const normalized = email.trim().toLowerCase();
  const entry = load()[normalized];
  if (!entry) return false;
  if (entry.expiresAt < Date.now()) return false;
  return entry.code === code.trim();
}

export function clearMockResetCode(email: string) {
  const normalized = email.trim().toLowerCase();
  const entries = load();
  delete entries[normalized];
  save(entries);
}
