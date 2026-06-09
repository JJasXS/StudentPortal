import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { authApi } from '@/api/auth';
import { demoCredentials } from '@/utils/mockData';
import { setDemoPassword } from '@/utils/demoPasswordOverrides';
import {
  clearMockResetCode,
  issueMockResetCode,
  verifyMockResetCode,
} from '@/utils/mockPasswordReset';

type Step = 'request' | 'reset';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const useApi = import.meta.env.VITE_USE_MOCK !== 'true';

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      if (useApi) {
        const result = await authApi.forgotPassword(email.trim());
        setMessage(result.message);
        if (result.resetCode) setDemoCode(result.resetCode);
      } else {
        const exists = demoCredentials.some(
          (c) => c.email.toLowerCase() === email.trim().toLowerCase()
        );
        if (!exists) {
          setMessage('If an account exists for this email, a reset code has been issued.');
          setStep('reset');
          setLoading(false);
          return;
        }
        const code = issueMockResetCode(email.trim());
        setDemoCode(code);
        setMessage('Reset code issued. Enter it below with your new password.');
      }
      setStep('reset');
    } catch {
      setError('Could not request a reset code. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      if (useApi) {
        const result = await authApi.resetPassword({
          email: email.trim(),
          resetCode: resetCode.trim(),
          newPassword,
        });
        setMessage(result.message);
      } else {
        if (!verifyMockResetCode(email.trim(), resetCode.trim())) {
          setError('Invalid or expired reset code.');
          setLoading(false);
          return;
        }
        setDemoPassword(email.trim(), newPassword);
        clearMockResetCode(email.trim());
        setMessage('Password updated. You can sign in with your new password.');
      }
      setStep('request');
      setResetCode('');
      setNewPassword('');
      setConfirmPassword('');
      setDemoCode(null);
    } catch {
      setError('Invalid or expired reset code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{step === 'request' ? 'Forgot password' : 'Reset password'}</CardTitle>
          <CardDescription>
            {step === 'request'
              ? 'Enter your account email to receive a reset code.'
              : 'Enter the reset code and choose a new password.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'request' ? (
            <form onSubmit={handleRequest} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              {message && <p className="text-sm text-emerald-600">{message}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Sending…' : 'Send reset code'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <p className="text-sm text-slate-600">
                Resetting password for <strong>{email}</strong>
              </p>
              {demoCode && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  <span className="font-medium">Demo reset code:</span>{' '}
                  <span className="font-mono tracking-widest">{demoCode}</span>
                  <p className="mt-1 text-xs text-amber-800">
                    In production this code would be emailed to you.
                  </p>
                </div>
              )}
              <div>
                <Label htmlFor="resetCode">Reset code</Label>
                <Input
                  id="resetCode"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  placeholder="6-digit code"
                  required
                  inputMode="numeric"
                />
              </div>
              <div>
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              {message && <p className="text-sm text-emerald-600">{message}</p>}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setStep('request');
                    setError('');
                  }}
                  disabled={loading}
                >
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={loading}>
                  {loading ? 'Saving…' : 'Update password'}
                </Button>
              </div>
            </form>
          )}

          <div className="mt-4 text-center">
            <Link to="/login" className="text-sm text-primary-600 hover:underline">
              Back to login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
