import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Lock, Mail } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/api/auth';
import { CentreMark } from '@/components/branding/CentreMark';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input, Label } from '@/components/ui/Input';
import { dashboardPathForRole } from '@/utils/learnerPortal';
import { getApiErrorMessage } from '@/utils/apiError';
import { envDemoLogins, type DemoLogin } from '@/utils/demoLogins';
import type { UserRole } from '@/types';

type LoginStep = 'email' | 'password';

const DEMO_LOGINS = envDemoLogins();

export default function LoginPage() {
  const { login, loginWithUdfEmail, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const addingAccount = searchParams.get('addAccount') === '1';
  const useApi = import.meta.env.VITE_USE_MOCK !== 'true';

  const [step, setStep] = useState<LoginStep>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const finishLogin = (role: UserRole | undefined) => {
    if (role === 'Admin' || role === 'Teacher' || role === 'Student' || role === 'Parent') {
      navigate(dashboardPathForRole(role));
    } else {
      navigate('/');
    }
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
      setError(getApiErrorMessage(err, 'Could not sign in. Check your email and try again.'));
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
      setError(getApiErrorMessage(err, 'Incorrect email or password.'));
    } finally {
      setLoading(false);
    }
  };

  const goBackToEmail = () => {
    setStep('email');
    setPassword('');
    setError('');
  };

  const applyDemoLogin = (demo: DemoLogin) => {
    setEmail(demo.email);
    setPassword(demo.password);
    setError('');
    setStep('password');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-primary-50/40 p-4 sm:p-6">
      <div className="w-full max-w-[420px]">
        <CentreMark
          className="mb-8"
          subtitle="Sign in to manage classes, schedules, and student progress"
        />

        <Card className="border-slate-200/80 shadow-md">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">
              {addingAccount ? 'Add another account' : step === 'email' ? 'Welcome back' : 'Enter your password'}
            </CardTitle>
            <CardDescription>
              {step === 'email'
                ? 'Enter the email address linked to your account.'
                : `Signing in as ${email}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <div
                className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
                role="alert"
              >
                {error}
              </div>
            )}

            {step === 'email' ? (
              <form onSubmit={handleEmailContinue} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? 'Please wait…' : 'Continue'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Your password"
                    required
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={goBackToEmail} className="shrink-0">
                    <ArrowLeft className="mr-1 h-4 w-4" />
                    Back
                  </Button>
                  <Button type="submit" className="flex-1" size="lg" disabled={loading}>
                    {loading ? 'Please wait…' : 'Sign in'}
                  </Button>
                </div>
              </form>
            )}

            {step === 'email' && (
              <div className="mt-6 border-t border-slate-100 pt-4 text-center text-sm">
                <Link
                  to="/forgot-password"
                  className="text-slate-600 hover:text-slate-900 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {DEMO_LOGINS.length > 0 && (
          <div className="mt-6 space-y-2">
            <p className="text-center text-xs font-medium uppercase tracking-wide text-slate-400">
              Dev password logins
            </p>
            <ul className="space-y-1.5">
              {DEMO_LOGINS.map((demo) => (
                <li key={demo.email}>
                  <button
                    type="button"
                    onClick={() => applyDemoLogin(demo)}
                    className="flex w-full items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-700 shadow-sm hover:border-primary-300 hover:bg-primary-50/40"
                  >
                    <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="min-w-[4.5rem] font-medium text-slate-900">{demo.role}</span>
                    <span className="truncate text-slate-500">{demo.email}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-slate-500">
          Need help signing in? Contact your music centre for account access.
        </p>
      </div>
    </div>
  );
}
