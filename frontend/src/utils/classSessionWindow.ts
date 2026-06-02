/** Parse session date + HH:mm into local timestamp */
export function sessionDateTimeMs(sessionDate: string, time: string) {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(`${sessionDate.slice(0, 10)}T00:00:00`);
  d.setHours(h, m ?? 0, 0, 0);
  return d.getTime();
}

export function isWithinClassWindow(sessionDate: string, startTime: string, endTime: string) {
  const now = Date.now();
  return now >= sessionDateTimeMs(sessionDate, startTime) && now <= sessionDateTimeMs(sessionDate, endTime);
}

export function classHasNotEnded(sessionDate: string, endTime: string) {
  return Date.now() <= sessionDateTimeMs(sessionDate, endTime);
}

export function formatClassWindow(sessionDate: string, startTime: string, endTime: string) {
  const d = new Date(`${sessionDate.slice(0, 10)}T12:00:00`);
  const dateLabel = d.toLocaleDateString('en-MY', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  return `${dateLabel}, ${startTime} – ${endTime}`;
}
