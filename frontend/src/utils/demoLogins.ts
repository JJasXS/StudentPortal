export type DemoLogin = {
  role: 'Admin' | 'Teacher' | 'Student';
  email: string;
  password: string;
};

const ALLOWED_DEMO_ROLES = new Set(['Admin', 'Teacher', 'Student', 'Parent']);

/** Normalize legacy Parent demo entries to Student. */
function normalizeDemoRole(role: string): DemoLogin['role'] | null {
  if (role === 'Admin' || role === 'Teacher' || role === 'Student') return role;
  if (role === 'Parent') return 'Student';
  return null;
}

/** Parse `VITE_DEMO_LOGINS` — entries separated by `;`, each `Role|email|password`. */
export function parseDemoLogins(raw: string | undefined): DemoLogin[] {
  if (!raw?.trim()) return [];

  return raw
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [roleRaw, email, password] = entry.split('|').map((p) => p.trim());
      if (!roleRaw || !email || !password) return null;
      if (!ALLOWED_DEMO_ROLES.has(roleRaw)) return null;
      const role = normalizeDemoRole(roleRaw);
      if (!role) return null;
      return { role, email, password };
    })
    .filter((x): x is DemoLogin => x != null);
}

export function envDemoLogins(): DemoLogin[] {
  return parseDemoLogins(import.meta.env.VITE_DEMO_LOGINS as string | undefined);
}

export const DEMO_LOGIN_ROLES: DemoLogin['role'][] = ['Admin', 'Teacher', 'Student'];

export function groupDemoLoginsByRole(logins: DemoLogin[]): Record<DemoLogin['role'], DemoLogin[]> {
  return {
    Admin: logins.filter((d) => d.role === 'Admin'),
    Teacher: logins.filter((d) => d.role === 'Teacher'),
    Student: logins.filter((d) => d.role === 'Student'),
  };
}
