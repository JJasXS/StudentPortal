import { SlidingTabs } from '@/components/ui/SlidingTabs';

export const CLASS_TABS = ['stream', 'notes', 'homework', 'materials', 'students'] as const;
export type ClassWorkspaceTab = (typeof CLASS_TABS)[number];

const LABELS: Record<ClassWorkspaceTab, string> = {
  stream: 'Stream',
  notes: 'Lesson Notes',
  homework: 'Homework',
  materials: 'Materials',
  students: 'Students',
};

interface ClassTabBarProps {
  value: ClassWorkspaceTab;
  onChange: (tab: ClassWorkspaceTab) => void;
  counts?: Partial<Record<ClassWorkspaceTab, number>>;
}

export function ClassTabBar({ value, onChange, counts }: ClassTabBarProps) {
  return (
    <SlidingTabs
      tabs={CLASS_TABS}
      value={value}
      onChange={(v) => onChange(v as ClassWorkspaceTab)}
      labels={LABELS}
      counts={counts as Record<string, number> | undefined}
      className="rounded-t-xl"
    />
  );
}

export function parseClassTab(raw: string | null): ClassWorkspaceTab {
  if (raw && (CLASS_TABS as readonly string[]).includes(raw)) {
    return raw as ClassWorkspaceTab;
  }
  return 'stream';
}
