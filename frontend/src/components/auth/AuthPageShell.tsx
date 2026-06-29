import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { CentreMark } from '@/components/branding/CentreMark';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';

interface AuthPageShellProps {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: 'md' | 'lg';
}

export function AuthPageShell({
  title,
  description,
  children,
  footer,
  maxWidth = 'md',
}: AuthPageShellProps) {
  const widthClass = maxWidth === 'lg' ? 'max-w-lg' : 'max-w-md';

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 via-white to-slate-100 p-4">
      <div className={`w-full ${widthClass}`}>
        <CentreMark className="mb-6" subtitle="Student & family portal" />
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
        {footer ?? (
          <p className="mt-4 text-center text-sm text-slate-600">
            <Link to="/login" className="font-medium text-primary-600 hover:underline">
              Back to sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
