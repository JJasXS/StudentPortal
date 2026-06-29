import { Link } from 'react-router-dom';
import { GraduationCap, UserCog } from 'lucide-react';
import { AuthPageShell } from '@/components/auth/AuthPageShell';
import { Button } from '@/components/ui/Button';

export default function RegisterPage() {
  return (
    <AuthPageShell
      title="Create an account"
      description="Choose how you will use the portal"
      footer={
        <p className="mt-4 text-center text-sm text-slate-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary-600 hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <div className="space-y-3">
        <Link
          to="/register/student?step=1"
          className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-primary-300 hover:bg-primary-50/50"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900">Student</p>
            <p className="mt-0.5 text-sm text-slate-600">
              One login per learner — register as a student to access your portal.
            </p>
          </div>
        </Link>

        <div className="flex items-start gap-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 opacity-75">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-200 text-slate-500">
            <UserCog className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-700">Staff</p>
            <p className="mt-0.5 text-sm text-slate-500">
              Teacher and admin accounts are created by your centre administrator.
            </p>
            <Button type="button" variant="outline" size="sm" className="mt-3" disabled>
              Coming soon
            </Button>
          </div>
        </div>
      </div>
    </AuthPageShell>
  );
}
