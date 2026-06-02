import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Music } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input, Label } from '@/components/ui/Input';
import { demoCredentials } from '@/utils/mockData';

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@demo.com');
  const [password, setPassword] = useState('Admin@123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      const stored = localStorage.getItem('mtp_user');
      const loggedIn = stored ? JSON.parse(stored) : user;
      const role = loggedIn?.role;
      const routes: Record<string, string> = {
        Admin: '/admin/dashboard',
        Teacher: '/teacher/dashboard',
        Student: '/student/dashboard',
        Parent: '/parent/dashboard',
      };
      navigate(role ? routes[role] : '/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-white to-slate-100 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600">
            <Music className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Music Tuition Portal</h1>
          <p className="mt-2 text-sm text-slate-500">Sign in to manage classes, students, and lessons</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Sign In</CardTitle>
            <CardDescription>Enter your credentials to access your dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
            <div className="mt-4 flex justify-between text-sm">
              <Link to="/register" className="text-primary-600 hover:underline">Register</Link>
              <Link to="/forgot-password" className="text-primary-600 hover:underline">Forgot password?</Link>
            </div>
          </CardContent>
        </Card>
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
      </div>
    </div>
  );
}
