const STORAGE_KEY = 'mtp_demo_password_overrides';

function load(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function save(overrides: Record<string, string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

export function getDemoPassword(email: string, defaultPassword: string): string {
  const overrides = load();
  return overrides[email.trim().toLowerCase()] ?? defaultPassword;
}

export function setDemoPassword(email: string, password: string) {
  const overrides = load();
  overrides[email.trim().toLowerCase()] = password;
  save(overrides);
}
