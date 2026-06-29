import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { authApi } from '@/api/auth';
import type { User } from '@/types';
import { TOKEN_KEY, USER_KEY } from '@/utils/constants';
import { demoCredentials, mockUsers } from '@/utils/mockData';
import { saveCurrentAccount } from '@/utils/savedAccounts';
import { getDemoPassword } from '@/utils/demoPasswordOverrides';
import { canSignIn } from '@/utils/learnerPortal';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  setSession: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const useApi = import.meta.env.VITE_USE_MOCK !== 'true';

function rejectUnsupportedRole() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const stored = localStorage.getItem(USER_KEY);
      const token = localStorage.getItem(TOKEN_KEY);
      if (stored && token) {
        try {
          if (useApi) {
            const me = await authApi.me();
            if (!canSignIn(me.role)) {
              rejectUnsupportedRole();
              setUser(null);
            } else {
              setUser(me);
              localStorage.setItem(USER_KEY, JSON.stringify(me));
            }
          } else {
            const parsed = JSON.parse(stored) as User;
            if (!canSignIn(parsed.role)) {
              rejectUnsupportedRole();
              setUser(null);
            } else {
              setUser(parsed);
            }
          }
        } catch {
          rejectUnsupportedRole();
        }
      }
      setIsLoading(false);
    };
    init();
  }, []);

  const login = async (email: string, password: string) => {
    if (useApi) {
      try {
        const response = await authApi.login(email, password);
        if (!canSignIn(response.user.role)) {
          throw new Error(
            'This account cannot sign in here. Use a student account — each learner has their own login.'
          );
        }
        localStorage.setItem(TOKEN_KEY, response.token);
        localStorage.setItem(USER_KEY, JSON.stringify(response.user));
        setUser(response.user);
        saveCurrentAccount();
      } catch (err: unknown) {
        const apiMessage = (err as { response?: { data?: { message?: string } } }).response?.data
          ?.message;
        throw new Error(apiMessage ?? (err instanceof Error ? err.message : 'Login failed'));
      }
      return;
    }

    const demo = demoCredentials.find((c) => c.email === email);
    if (!demo || getDemoPassword(email, demo.password) !== password) {
      throw new Error('Invalid email or password');
    }
    const found = mockUsers.find((u) => u.email === email);
    if (!found) throw new Error('Invalid email or password');
    if (!canSignIn(found.role)) {
      throw new Error(
        'This account cannot sign in here. Use a student account — each learner has their own login.'
      );
    }
    localStorage.setItem(TOKEN_KEY, 'mock-token');
    localStorage.setItem(USER_KEY, JSON.stringify(found));
    setUser(found);
    saveCurrentAccount();
  };

  const setSession = (token: string, sessionUser: User) => {
    if (!canSignIn(sessionUser.role)) return;
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(sessionUser));
    setUser(sessionUser);
  };

  const logout = () => {
    rejectUnsupportedRole();
    setUser(null);
  };

  const updateUser = (updated: User) => {
    setUser(updated);
    localStorage.setItem(USER_KEY, JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, setSession, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
