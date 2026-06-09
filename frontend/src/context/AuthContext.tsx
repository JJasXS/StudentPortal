import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { authApi } from '@/api/auth';
import type { User } from '@/types';
import { TOKEN_KEY, USER_KEY } from '@/utils/constants';
import { demoCredentials, mockUsers } from '@/utils/mockData';
import { getDemoPassword } from '@/utils/demoPasswordOverrides';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const useApi = import.meta.env.VITE_USE_MOCK !== 'true';

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
            setUser(me);
            localStorage.setItem(USER_KEY, JSON.stringify(me));
          } else {
            setUser(JSON.parse(stored));
          }
        } catch {
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
        }
      }
      setIsLoading(false);
    };
    init();
  }, []);

  const login = async (email: string, password: string) => {
    if (useApi) {
      const response = await authApi.login(email, password);
      localStorage.setItem(TOKEN_KEY, response.token);
      localStorage.setItem(USER_KEY, JSON.stringify(response.user));
      setUser(response.user);
      return;
    }

    const demo = demoCredentials.find((c) => c.email === email);
    if (!demo || getDemoPassword(email, demo.password) !== password) {
      throw new Error('Invalid email or password');
    }
    const found = mockUsers.find((u) => u.email === email);
    if (!found) throw new Error('Invalid email or password');
    localStorage.setItem(TOKEN_KEY, 'mock-token');
    localStorage.setItem(USER_KEY, JSON.stringify(found));
    setUser(found);
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  };

  const updateUser = (updated: User) => {
    setUser(updated);
    localStorage.setItem(USER_KEY, JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
