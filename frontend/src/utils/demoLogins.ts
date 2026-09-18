export type DemoLogin = {
  role: string;
  email: string;
  password: string;
};

/** Parse `VITE_DEMO_LOGINS` — entries separated by `;`, each `Role|email|password`. */
export function parseDemoLogins(raw: string | undefined): DemoLogin[] {
  if (!raw?.trim()) return [];

  return raw
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [role, email, password] = entry.split('|').map((p) => p.trim());
      if (!role || !email || !password) return null;
      return { role, email, password };
    })
    .filter((x): x is DemoLogin => x != null);
}

export function envDemoLogins(): DemoLogin[] {
  return parseDemoLogins(import.meta.env.VITE_DEMO_LOGINS as string | undefined);
}
