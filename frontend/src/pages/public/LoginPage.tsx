import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/api/auth';
import { CentreMark } from '@/components/branding/CentreMark';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input, Label } from '@/components/ui/Input';
import { demoCredentials } from '@/utils/mockData';
import { dashboardPathForRole, canSignIn } from '@/utils/learnerPortal';
import { getSavedAccounts, saveCurrentAccount, type SavedAccount } from '@/utils/savedAccounts';
import { accountAvatarStyle, accountInitials } from '@/utils/accountDisplay';
import { cn } from '@/utils/cn';
import { getApiErrorMessage } from '@/utils/apiError';
import type { UserRole } from '@/types';

type LoginStep = 'email' | 'password';

export default function LoginPage() {
  const { login, loginWithUdfEmail, user, setSession } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const addingAccount = searchParams.get('addAccount') === '1';
  const useApi = import.meta.env.VITE_USE_MOCK !== 'true';

  const [step, setStep] = useState<LoginStep>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(
    () => import.meta.env.VITE_DEMO_LOGIN_PASSWORD || 'Admin@123'
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const savedAccounts = useMemo(() => getSavedAccounts(), []);

  const finishLogin = (role: UserRole | undefined) => {
    if (role === 'Admin' || role === 'Teacher' || role === 'Student' || role === 'Parent') {
      navigate(dashboardPathForRole(role));
    } else {
      navigate('/');
    }
  };

  const quickSwitch = (account: SavedAccount) => {
    if (!canSignIn(account.user.role)) return;
    setSession(account.token, account.user);
    saveCurrentAccount();
    navigate(dashboardPathForRole(account.user.role as 'Admin' | 'Teacher' | 'Student' | 'Parent'));
  };

  const handleEmailContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (!useApi) {
        setStep('password');
        return;
      }

      const { method } = await authApi.getLoginMethod(email.trim());
      if (method === 'password') {
        setStep('password');
        return;
      }

      await loginWithUdfEmail(email.trim());
      const stored = localStorage.getItem('mtp_user');
      const loggedIn = stored ? JSON.parse(stored) : user;
      finishLogin(loggedIn?.role as UserRole | undefined);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Could not continue'));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      const stored = localStorage.getItem('mtp_user');
      const loggedIn = stored ? JSON.parse(stored) : user;
      finishLogin(loggedIn?.role as UserRole | undefined);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Login failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-white to-slate-100 p-4">
      <div className="w-full max-w-md">
        <CentreMark className="mb-8" subtitle="Sign in to your classes, schedule, and lesson notes" />

        {savedAccounts.length > 0 && step === 'email' && (
          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Continue as</CardTitle>
              <CardDescription>Tap an account — no password needed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {savedAccounts.map((account) => (
                <button
                  key={account.user.id}
                  type="button"
                  onClick={() => quickSwitch(account)}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-slate-50"
                >
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold',
                      accountAvatarStyle(account.user.role)
                    )}
                  >
                    {accountInitials(account.user.fullName)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {account.user.fullName}
                    </p>
                    <p className="truncate text-xs text-slate-500">{account.user.email}</p>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>{addingAccount ? 'Add another account' : 'Sign In'}</CardTitle>
            <CardDescription>
              {step === 'email' &&
                'Admin (SY_USER udf_email) and parent (AR_CUSTOMER udf_email) — email only, no password'}
              {step === 'password' && 'Enter your password (demo admin, teacher, student)'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}

            {step === 'email' && (
              <form onSubmit={handleEmailContinue} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin or parent udf_email from SQL Account"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing in...' : 'Continue'}
                </Button>
              </form>
            )}

            {step === 'password' && (
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <p className="text-sm text-slate-600">{email}</p>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => setStep('email')}>
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </div>
              </form>
            )}

            {step === 'email' && (
              <div className="mt-4 flex justify-between text-sm">
                <Link to="/register" className="text-primary-600 hover:underline">
                  Student registration
                </Link>
                <Link to="/forgot-password" className="text-primary-600 hover:underline">
                  Forgot password?
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {step === 'email' && (
          <Card className="mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Demo Accounts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-xs text-slate-600">
              {demoCredentials.map((c) => (
                <p key={c.email}>
                  <strong>{c.role}:</strong> {c.email} / {c.password}
                </p>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
