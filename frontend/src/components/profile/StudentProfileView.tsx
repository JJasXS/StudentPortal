import { useEffect, useState, type FormEvent } from 'react';
import { Pencil } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useAccountSwitcher } from '@/context/AccountSwitcherContext';
import { authApi } from '@/api/auth';
import { studentsApi } from '@/api/resources';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select } from '@/components/ui/Input';
import { InstrumentPickerField } from '@/components/register/InstrumentPickerField';
import { LevelBarPicker } from '@/components/register/LevelBarPicker';
import { GENDER_OPTIONS, formatGender } from '@/utils/gender';
import { loadStudentSelfProfile } from '@/utils/loadStudentSelfProfile';
import { mockParents, mockStudents, mockUsers } from '@/utils/mockData';
import {
  accountCompletenessMessage,
  getStudentAccountCompleteness,
} from '@/utils/studentProfileCompleteness';
import { parseStudentNotes } from '@/utils/studentNotes';
import { AccountSwitcherPanel } from '@/components/profile/AccountSwitcherModal';
import { ProfileIdentityCard } from '@/components/profile/ProfileIdentityCard';
import type { StudentSelfProfile } from '@/types';

const useApi = import.meta.env.VITE_USE_MOCK !== 'true';

function loadMockStudentProfile(userId: string): StudentSelfProfile | null {
  const student = mockStudents.find((s) => s.userId === userId);
  if (!student) return null;
  const user = mockUsers.find((u) => u.id === userId);
  const parent = mockParents.find((p) => p.children?.includes(userId));
  return {
    ...student,
    phoneNumber: user?.phoneNumber,
    parent: parent
      ? {
          fullName: parent.fullName,
          email: parent.email,
          phoneNumber: parent.phoneNumber,
          relationship: parent.relationship,
        }
      : null,
  };
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="font-medium">{value?.trim() ? value : '—'}</p>
    </div>
  );
}

export function StudentProfileView() {
  const { user, updateUser } = useAuth();
  const { openSwitcher } = useAccountSwitcher();
  const [profile, setProfile] = useState<StudentSelfProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    email: '',
    dateOfBirth: '',
    gender: 'Male',
    schoolName: '',
    instruments: [] as string[],
    experience: '',
    password: '',
  });

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    if (useApi) {
      loadStudentSelfProfile(user)
        .then(setProfile)
        .finally(() => setLoading(false));
    } else {
      setProfile(loadMockStudentProfile(user.id));
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!editOpen || !profile) return;
    const parsed = parseStudentNotes(profile.notes);
    setForm({
      email: profile.email,
      dateOfBirth: profile.dateOfBirth?.slice(0, 10) ?? '',
      gender: profile.gender ?? 'Male',
      schoolName: profile.schoolName ?? '',
      instruments: parsed.instruments,
      experience: parsed.experience,
      password: '',
    });
    setError('');
  }, [editOpen, profile]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!profile || !user) return;
    if (!form.dateOfBirth) {
      setError('Date of birth is required.');
      return;
    }
    if (new Date(form.dateOfBirth) > new Date()) {
      setError('Date of birth cannot be in the future.');
      return;
    }
    if (!form.gender) {
      setError('Gender is required.');
      return;
    }
    if (!form.email.trim()) {
      setError('Email is required.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError('Enter a valid email.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        schoolName: form.schoolName.trim() || undefined,
        instrument: form.instruments.length > 0 ? form.instruments.join(', ') : undefined,
        experience: form.experience.trim() || undefined,
      };

      let updated: StudentSelfProfile;
      if (useApi) {
        updated = await studentsApi.updateMe(payload);
        const emailChanged = form.email.trim() !== profile.email;
        const passwordChanged = Boolean(form.password.trim());
        if (emailChanged || passwordChanged) {
          const authUser = await authApi.updateMe({
            fullName: profile.fullName,
            email: form.email.trim(),
            phoneNumber: profile.phoneNumber,
            ...(passwordChanged ? { password: form.password.trim() } : {}),
          });
          updated = { ...updated, email: authUser.email };
          updateUser(authUser);
        }
      } else {
        updated = {
          ...profile,
          ...payload,
          email: form.email.trim(),
          schoolName: payload.schoolName,
          notes:
            [
              payload.instrument ? `Interest: ${payload.instrument}` : '',
              payload.experience ? `Experience: ${payload.experience}` : '',
            ]
              .filter(Boolean)
              .join('; ') || undefined,
        };
      }

      setProfile(updated);
      setEditOpen(false);
      setForm((f) => ({ ...f, password: '' }));
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(msg ?? 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const parsedNotes = parseStudentNotes(profile?.notes);
  const completeness = profile ? getStudentAccountCompleteness(profile) : 0;

  return (
    <div>
      <PageHeader
        title="My Profile"
        description="Important details are set by the centre. Complete your account details below."
      />

      {user && (
        <div className="mb-4 max-w-3xl space-y-3">
          <ProfileIdentityCard
            user={user}
            onDoubleClick={openSwitcher}
            subtitle="Double-click to switch account"
          />
        </div>
      )}

      <Card className="mb-4 max-w-3xl">
        <CardContent className="pt-6">
          <AccountSwitcherPanel />
        </CardContent>
      </Card>

      {loading ? (
        <p className="text-sm text-slate-500">Loading profile…</p>
      ) : !profile ? (
        <p className="text-sm text-red-600">Could not load your student profile.</p>
      ) : (
        <div className="grid max-w-3xl gap-4">
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-700">Account details completeness</span>
                <span
                  className={
                    completeness >= 100
                      ? 'font-semibold text-emerald-700'
                      : completeness > 0
                        ? 'font-semibold text-primary-700'
                        : 'font-semibold text-slate-500'
                  }
                >
                  {completeness}%
                </span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full transition-all duration-500 ease-out ${
                    completeness >= 100 ? 'bg-emerald-500' : 'bg-primary-600'
                  }`}
                  style={{ width: `${completeness}%` }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">{accountCompletenessMessage(completeness)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Important information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" value={profile.fullName} />
              <Field label="Phone" value={profile.phoneNumber} />
              <Field label="Parent / guardian" value={profile.parent?.fullName} />
              <Field label="Parent email" value={profile.parent?.email} />
              <Field label="Parent phone" value={profile.parent?.phoneNumber} />
              <Field label="Relationship" value={profile.parent?.relationship} />
            </CardContent>
            <p className="border-t border-slate-100 px-6 pb-4 text-xs text-slate-500">
              Contact the centre if any of the above needs to be changed.
            </p>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle>Account details</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={() => setEditOpen(true)}>
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit
              </Button>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" value={profile.email} />
              <Field label="Date of birth" value={profile.dateOfBirth} />
              <Field label="Gender" value={formatGender(profile.gender)} />
              <Field label="School" value={profile.schoolName} />
              <Field
                label="Instruments"
                value={
                  parsedNotes.instruments.length > 0 ? parsedNotes.instruments.join(', ') : undefined
                }
              />
              <Field label="Level" value={parsedNotes.experience} />
            </CardContent>
          </Card>
        </div>
      )}

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit account details" className="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-slate-600">
            Update your account, personal, and music details. Name, phone, and parent information
            are managed by the centre.
          </p>
          <div>
            <Label htmlFor="profileEmail">Email</Label>
            <Input
              id="profileEmail"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="profileDob">Date of birth</Label>
              <Input
                id="profileDob"
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => setForm((f) => ({ ...f, dateOfBirth: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="profileGender">Gender</Label>
              <Select
                id="profileGender"
                value={form.gender}
                onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                required
              >
                {GENDER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="profileSchool">School name</Label>
            <Input
              id="profileSchool"
              value={form.schoolName}
              onChange={(e) => setForm((f) => ({ ...f, schoolName: e.target.value }))}
              placeholder="Current school"
            />
          </div>
          <InstrumentPickerField
            id="profileInstrument"
            value={form.instruments}
            onChange={(instruments) => setForm((f) => ({ ...f, instruments }))}
          />
          <LevelBarPicker
            id="profileExperience"
            value={form.experience}
            onChange={(experience) => setForm((f) => ({ ...f, experience }))}
          />
          <div>
            <Label htmlFor="profilePassword">New password</Label>
            <Input
              id="profilePassword"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="Leave blank to keep current"
              autoComplete="new-password"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
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
