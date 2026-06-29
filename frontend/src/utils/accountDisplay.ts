import type { UserRole } from '@/types';

const ROLE_AVATAR: Record<UserRole, string> = {
  Admin: 'bg-violet-100 text-violet-700',
  Teacher: 'bg-sky-100 text-sky-700',
  Student: 'bg-emerald-100 text-emerald-700',
  Parent: 'bg-slate-100 text-slate-600',
};

export function accountInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function accountAvatarStyle(role?: UserRole): string {
  return role ? ROLE_AVATAR[role] : 'bg-slate-100 text-slate-600';
}
