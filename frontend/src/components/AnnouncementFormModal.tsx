import { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import {
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_TARGET_ROLES,
  announcementToForm,
  emptyAnnouncementForm,
  type AnnouncementFormValues,
} from '@/utils/announcementForm';
import type { Announcement } from '@/types';

interface AnnouncementFormModalProps {
  open: boolean;
  onClose: () => void;
  announcement?: Announcement | null;
  onSubmit: (values: AnnouncementFormValues) => Promise<void>;
  saving?: boolean;
}

export function AnnouncementFormModal({
  open,
  onClose,
  announcement,
  onSubmit,
  saving = false,
}: AnnouncementFormModalProps) {
  const [form, setForm] = useState<AnnouncementFormValues>(emptyAnnouncementForm());
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm(announcement ? announcementToForm(announcement) : emptyAnnouncementForm());
      setError('');
    }
  }, [open, announcement]);

  const set = <K extends keyof AnnouncementFormValues>(key: K, value: AnnouncementFormValues[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Title is required.');
      return;
    }
    if (!form.content.trim()) {
      setError('Content is required.');
      return;
    }
    if (form.category === 'Holiday' && !form.holidayDate) {
      setError('Holiday date is required for public holidays.');
      return;
    }
    setError('');
    await onSubmit(form);
  };

  const isHoliday = form.category === 'Holiday';

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={announcement ? 'Edit announcement' : 'New announcement'}
      className="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="annTitle">Title</Label>
          <Input
            id="annTitle"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="e.g. Centre Open Day"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="annCategory">Type</Label>
            <Select
              id="annCategory"
              value={form.category}
              onChange={(e) =>
                set('category', e.target.value as AnnouncementFormValues['category'])
              }
            >
              {ANNOUNCEMENT_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'Holiday' ? 'Public holiday' : 'Notice'}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="annTarget">Audience</Label>
            <Select
              id="annTarget"
              value={form.targetRole}
              onChange={(e) =>
                set('targetRole', e.target.value as AnnouncementFormValues['targetRole'])
              }
            >
              {ANNOUNCEMENT_TARGET_ROLES.map((role) => (
                <option key={role} value={role}>
                  {role === 'All' ? 'Everyone' : role}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {isHoliday && (
          <div>
            <Label htmlFor="annHolidayDate">Holiday date</Label>
            <Input
              id="annHolidayDate"
              type="date"
              value={form.holidayDate}
              onChange={(e) => set('holidayDate', e.target.value)}
              required
            />
          </div>
        )}

        <div>
          <Label htmlFor="annContent">Message</Label>
          <Textarea
            id="annContent"
            rows={4}
            value={form.content}
            onChange={(e) => set('content', e.target.value)}
            placeholder="What should teachers, students, or parents know?"
            required
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving…' : announcement ? 'Save changes' : 'Create announcement'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
