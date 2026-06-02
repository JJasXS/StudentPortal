import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import type { Announcement } from '@/types';

interface GeneralAnnouncementListProps {
  items: Announcement[];
  emptyMessage?: string;
}

export function GeneralAnnouncementList({
  items,
  emptyMessage = 'No general announcements.',
}: GeneralAnnouncementListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 py-16 text-center">
        <p className="text-sm text-slate-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {items.map((a) => (
        <Card key={a.id}>
          <CardHeader className="pb-2">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <CardTitle className="text-base leading-snug">{a.title}</CardTitle>
              {a.targetRole !== 'All' && <StatusBadge status={a.targetRole} />}
            </div>
            <p className="text-xs text-slate-400">
              {formatDateDDMMYYYY(a.createdAt)}
              {a.createdByName ? ` · ${a.createdByName}` : ''}
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-slate-700">{a.content}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
