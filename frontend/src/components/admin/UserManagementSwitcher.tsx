import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/utils/cn';

const CHOICES = [
  { label: 'Students', path: '/admin/parents' },
  { label: 'Staff', path: '/admin/teachers' },
] as const;

function pathMatches(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

/** Kebab to switch Students ↔ Staff under User Management. */
export function UserManagementSwitcher() {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-label="Switch user management view"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <MoreVertical className="h-4 w-4" />
      </Button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 min-w-[11rem] rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {CHOICES.map((choice) => {
            const selected = pathMatches(location.pathname, choice.path);
            return (
              <button
                key={choice.path}
                type="button"
                role="menuitem"
                className={cn(
                  'block w-full px-3 py-2 text-left text-sm hover:bg-slate-50',
                  selected ? 'font-medium text-primary-700' : 'text-slate-700'
                )}
                onClick={() => {
                  setOpen(false);
                  void navigate(choice.path);
                }}
              >
                {choice.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function isUserManagementPath(pathname: string) {
  return CHOICES.some((c) => pathMatches(pathname, c.path));
}
