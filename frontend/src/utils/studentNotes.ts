export function buildStudentInterestNotes(instruments: string[], experience: string): string | undefined {
  const parts: string[] = [];
  if (instruments.length > 0) parts.push(`Interest: ${instruments.join(', ')}`);
  if (experience.trim()) parts.push(`Experience: ${experience.trim()}`);
  return parts.length > 0 ? parts.join('; ') : undefined;
}

export function parseStudentNotes(notes?: string) {
  if (!notes?.trim()) {
    return { instruments: [] as string[], experience: '' };
  }

  const instruments: string[] = [];
  let experience = '';

  for (const part of notes.split(';').map((p) => p.trim()).filter(Boolean)) {
    if (part.startsWith('Interest: ')) {
      instruments.push(
        ...part
          .slice(10)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      );
    } else if (part.startsWith('Experience: ')) {
      experience = part.slice(12).trim();
    }
  }

  return { instruments, experience };
}
