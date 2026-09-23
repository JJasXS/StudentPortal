import { Music2 } from 'lucide-react';
import type { ClassItem } from '@/types';

export const INSTRUMENTS = ['Piano', 'Violin', 'Guitar', 'Vocal', 'Drums'] as const;
export const CLASS_TYPES = ['Individual', 'Group', 'Ensemble'] as const;

export interface ClassFilterState {
  search: string;
  day: string;
  instrument: string;
  type: string;
  grade: string;
  status: string;
}

export const EMPTY_CLASS_FILTERS: ClassFilterState = {
  search: '',
  day: '',
  instrument: '',
  type: '',
  grade: '',
  status: '',
};

export function detectInstrument(item: ClassItem): string {
  const hay = `${item.courseName ?? ''} ${item.className}`.toLowerCase();
  return INSTRUMENTS.find((i) => hay.includes(i.toLowerCase())) ?? '';
}

export function detectClassType(item: ClassItem): string {
  const hay = `${item.courseName ?? ''} ${item.className}`.toLowerCase();
  if (hay.includes('ensemble')) return 'Ensemble';
  if (hay.includes('group')) return 'Group';
  if (hay.includes('individual') || hay.includes('personal')) return 'Individual';
  return '';
}

export function detectGrade(item: ClassItem): string {
  const hay = `${item.courseName ?? ''} ${item.className}`;
  const match = hay.match(/grade\s*(\d+)/i);
  return match ? `Grade ${match[1]}` : '';
}

export function collectGradeOptions(classes: ClassItem[]): string[] {
  const set = new Set<string>();
  for (const c of classes) {
    const g = detectGrade(c);
    if (g) set.add(g);
  }
  return [...set].sort((a, b) => {
    const na = Number(a.replace(/\D/g, '')) || 0;
    const nb = Number(b.replace(/\D/g, '')) || 0;
    return na - nb;
  });
}

export function collectDayOptions(classes: ClassItem[]): string[] {
  const order = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const set = new Set(classes.map((c) => c.dayOfWeek).filter(Boolean));
  return order.filter((d) => set.has(d));
}

export function classFiltersActive(filters: ClassFilterState): boolean {
  return Object.values(filters).some((v) => v.trim().length > 0);
}

export function filterTeacherClasses(
  classes: ClassItem[],
  filters: ClassFilterState
): ClassItem[] {
  const q = filters.search.trim().toLowerCase();
  return classes.filter((c) => {
    if (q) {
      const hay = `${c.className} ${c.courseName ?? ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filters.day && c.dayOfWeek !== filters.day) return false;
    if (filters.instrument && detectInstrument(c) !== filters.instrument) return false;
    if (filters.type && detectClassType(c) !== filters.type) return false;
    if (filters.grade && detectGrade(c) !== filters.grade) return false;
    if (filters.status === 'Active' && !c.isActive) return false;
    if (filters.status === 'Inactive' && c.isActive) return false;
    return true;
  });
}

export { Music2 as EmptyClassesIcon };
