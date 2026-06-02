import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface PageBackLinkProps {
  to: string;
  label: string;
}

export function PageBackLink({ to, label }: PageBackLinkProps) {
  return (
    <Link
      to={to}
      className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-primary-600"
    >
      <ArrowLeft className="h-4 w-4" />
      {label}
    </Link>
  );
}
