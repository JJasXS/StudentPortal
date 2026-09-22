import { useEffect, useState, type FormEvent } from 'react';
import { Pencil } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/api/auth';
import { StudentProfileView } from '@/components/profile/StudentProfileView';
import { ProfileIdentityCard } from '@/components/profile/ProfileIdentityCard';
import { AccountSwitcherPanel } from '@/components/profile/AccountSwitcherModal';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';

const useApi = import.meta.env.VITE_USE_MOCK !== 'true';

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
  });

  useEffect(() => {
    if (user) {
      setForm({
        fullName: user.fullName,
        email: user.email,
        phoneNumber: user.phoneNumber ?? '',
        password: '',
      });
    }
  }, [user, editOpen]);

  const openEdit = () => {
    setError('');
    setEditOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phoneNumber: form.phoneNumber.trim() || undefined,
        ...(form.password.trim() ? { password: form.password } : {}),
      };

      if (useApi) {
        const updated = await authApi.updateMe(payload);
        updateUser(updated);
      } else if (user) {
        updateUser({
          ...user,
          fullName: payload.fullName,
          email: payload.email,
          phoneNumber: payload.phoneNumber,
        });
      }
      setEditOpen(false);
      setForm((f) => ({ ...f, password: '' }));
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(msg || 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (user?.role === 'Student') {
    return <StudentProfileView />;
  }

  return (
    <div className="w-full space-y-6">
      <PageHeader title="My Profile" description="View and update your account information" />

      {user && <ProfileIdentityCard user={user} />}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Account Details</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={openEdit}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Edit
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-sm text-slate-500">Full Name</p>
            <p className="font-medium">{user?.fullName}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Email</p>
            <p className="font-medium">{user?.email}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Phone</p>
            <p className="font-medium">{user?.phoneNumber || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Role</p>
            {user?.role && <StatusBadge status={user.role} />}
          </div>
        </CardContent>
      </Card>

      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Switch account
        </p>
        <AccountSwitcherPanel />
      </div>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Profile">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phoneNumber">Phone</Label>
            <Input
              id="phoneNumber"
              type="tel"
              value={form.phoneNumber}
              onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
              placeholder="+60123456789"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Leave blank to keep current"
              autoComplete="new-password"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
