import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuthPageShell } from '@/components/auth/AuthPageShell';
import { StepProgress } from '@/components/ui/StepProgress';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select } from '@/components/ui/Input';
import { InstrumentPickerField } from '@/components/register/InstrumentPickerField';
import { LevelBarPicker } from '@/components/register/LevelBarPicker';
import { authApi } from '@/api/auth';
import { useAuth } from '@/context/AuthContext';
import { GENDER_OPTIONS, formatGender } from '@/utils/gender';
import {
  EMPTY_STUDENT_REGISTER_FORM,
  STUDENT_REGISTER_STEPS,
  type StudentRegisterForm,
} from '@/types/studentRegistration';
import type { LoginResponse, User } from '@/types';
import { parseRegisterStepParam, registerStudentStepPath } from '@/utils/studentRegisterSteps';

function validateStep(step: number, form: StudentRegisterForm): string | null {
  if (step === 1) {
    if (!form.fullName.trim()) return 'Full name is required.';
    if (!form.dateOfBirth) return 'Date of birth is required.';
    if (new Date(form.dateOfBirth) > new Date()) return 'Date of birth cannot be in the future.';
    if (!form.gender) return 'Please select gender.';
  }
  if (step === 2) {
    if (!form.email.trim()) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Enter a valid email.';
    if (!form.password || form.password.length < 6) return 'Password must be at least 6 characters.';
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
  }
  if (step === 4) {
    if (!form.acceptTerms) return 'You must accept the terms to continue.';
  }
  return null;
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-slate-100 py-2 text-sm last:border-0">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value || '—'}</span>
    </div>
  );
}

export default function StudentRegisterPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { setSession } = useAuth();
  const stepParam = searchParams.get('step');
  const step = useMemo(() => parseRegisterStepParam(stepParam), [stepParam]);
  const [form, setForm] = useState<StudentRegisterForm>(EMPTY_STUDENT_REGISTER_FORM);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!stepParam) {
      setSearchParams({ step: '1' }, { replace: true });
      return;
    }
    const parsed = parseRegisterStepParam(stepParam);
    if (stepParam !== String(parsed)) {
      setSearchParams({ step: String(parsed) }, { replace: true });
    }
  }, [stepParam, setSearchParams]);

  const goToStep = (next: number) => {
    setSearchParams({ step: String(next) });
  };

  const set = <K extends keyof StudentRegisterForm>(key: K, value: StudentRegisterForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const goNext = () => {
    const message = validateStep(step, form);
    if (message) {
      setError(message);
      return;
    }
    setError('');
    goToStep(Math.min(step + 1, STUDENT_REGISTER_STEPS.length));
  };

  const goBack = () => {
    setError('');
    goToStep(Math.max(step - 1, 1));
  };

  const completeMockRegister = (): LoginResponse => {
    const id = crypto.randomUUID();
    const user: User = {
      id,
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      phoneNumber: form.phoneNumber.trim() || undefined,
      role: 'Student',
      isActive: true,
    };
    return { token: 'mock-token', user };
  };

  const handleSubmit = async () => {
    const message = validateStep(4, form);
    if (message) {
      setError(message);
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      let response: LoginResponse;
      if (import.meta.env.VITE_USE_MOCK === 'true') {
        await new Promise((r) => setTimeout(r, 400));
        response = completeMockRegister();
      } else {
        response = await authApi.registerStudent({
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          password: form.password,
          dateOfBirth: form.dateOfBirth,
          gender: form.gender,
          phoneNumber: form.phoneNumber.trim() || undefined,
          schoolName: form.schoolName.trim() || undefined,
          instrument:
            form.instruments.length > 0 ? form.instruments.join(', ') : undefined,
          experience: form.experience.trim() || undefined,
        });
      }
      setSession(response.token, response.user);
      navigate('/student/dashboard', { replace: true });
    } catch (err: unknown) {
      const apiMessage =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setError(apiMessage ?? 'Registration failed. Try again or use a different email.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthPageShell
      title="Student registration"
      description="Complete each step — you can skip optional fields on step 3"
      maxWidth="lg"
      footer={
        <p className="mt-4 text-center text-sm text-slate-600">
          <Link to="/register" className="text-primary-600 hover:underline">
            Change account type
          </Link>
          {' · '}
          <Link to="/login" className="text-primary-600 hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <StepProgress
        steps={[...STUDENT_REGISTER_STEPS]}
        currentStep={step}
        className="mb-6"
        getStepHref={registerStudentStepPath}
      />

      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Tell us who you are. All fields on this step are required.</p>
          <div>
            <Label htmlFor="regName">Full name</Label>
            <Input
              id="regName"
              value={form.fullName}
              onChange={(e) => set('fullName', e.target.value)}
              placeholder="Your full name"
              autoComplete="name"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="regDob">Date of birth</Label>
              <Input
                id="regDob"
                type="date"
                value={form.dateOfBirth}
                onChange={(e) => set('dateOfBirth', e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="regGender">Gender</Label>
              <Select
                id="regGender"
                value={form.gender}
                onChange={(e) => set('gender', e.target.value)}
              >
                {GENDER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Create your login. You will use this email and password to sign in.
          </p>
          <div>
            <Label htmlFor="regEmail">Email</Label>
            <Input
              id="regEmail"
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <Label htmlFor="regPhone">Phone (optional)</Label>
            <Input
              id="regPhone"
              type="tel"
              value={form.phoneNumber}
              onChange={(e) => set('phoneNumber', e.target.value)}
              placeholder="+60 12-345 6789"
              autoComplete="tel"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="regPassword">Password</Label>
              <Input
                id="regPassword"
                type="password"
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div>
              <Label htmlFor="regConfirm">Confirm password</Label>
              <Input
                id="regConfirm"
                type="password"
                value={form.confirmPassword}
                onChange={(e) => set('confirmPassword', e.target.value)}
                autoComplete="new-password"
              />
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Optional — helps the centre place you in the right class. You can skip to review.
          </p>
          <div>
            <Label htmlFor="regSchool">School name</Label>
            <Input
              id="regSchool"
              value={form.schoolName}
              onChange={(e) => set('schoolName', e.target.value)}
              placeholder="Current school"
            />
          </div>
          <InstrumentPickerField
            id="regInstrument"
            value={form.instruments}
            onChange={(v) => set('instruments', v)}
          />
          <LevelBarPicker
            id="regExperience"
            value={form.experience}
            onChange={(v) => set('experience', v)}
          />
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Check your details, then create your account.</p>
          <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-4 py-2">
            <ReviewRow label="Name" value={form.fullName} />
            <ReviewRow label="Date of birth" value={form.dateOfBirth} />
            <ReviewRow label="Gender" value={formatGender(form.gender)} />
            <ReviewRow label="Email" value={form.email} />
            <ReviewRow label="Phone" value={form.phoneNumber} />
            <ReviewRow label="School" value={form.schoolName} />
            <ReviewRow
              label="Instruments"
              value={form.instruments.length > 0 ? form.instruments.join(', ') : ''}
            />
            <ReviewRow label="Level" value={form.experience} />
          </div>
          <label className="flex cursor-pointer items-start gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              className="mt-1 rounded border-slate-300"
              checked={form.acceptTerms}
              onChange={(e) => set('acceptTerms', e.target.checked)}
            />
            <span>
              I agree to the centre&apos;s terms of use and privacy policy. My account will be
              active immediately after registration.
            </span>
          </label>
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex justify-between gap-2 border-t border-slate-100 pt-4">
        <Button type="button" variant="outline" onClick={goBack} disabled={step === 1 || submitting}>
          Back
        </Button>
        {step < STUDENT_REGISTER_STEPS.length ? (
          <Button type="button" onClick={goNext}>
            Continue
          </Button>
        ) : (
          <Button type="button" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </Button>
        )}
      </div>
    </AuthPageShell>
  );
}
