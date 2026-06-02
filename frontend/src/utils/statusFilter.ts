export function getStatusCounts<T>(items: T[], getStatus: (item: T) => string, statuses: readonly string[]) {
  const counts: Record<string, number> = {};
  for (const status of statuses) {
    counts[status] = items.filter((item) => getStatus(item) === status).length;
  }
  return counts;
}

export function filterByStatus<T>(
  items: T[],
  activeStatus: string,
  getStatus: (item: T) => string
): T[] {
  if (activeStatus === 'All') return items;
  return items.filter((item) => getStatus(item) === activeStatus);
}

export function activeRecordStatus(isActive?: boolean) {
  return isActive !== false ? 'Active' : 'Cancelled';
}
