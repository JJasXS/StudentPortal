import type { Attendance } from '@/types';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { downloadCsv, openPrintDocument } from '@/utils/exportDownload';

export function exportAttendanceCsv(records: Attendance[], filename = 'attendance-export.csv') {
  const headers = ['Date', 'Class', 'Student', 'Status', 'Remarks'];
  const rows = records.map((a) => [
    formatDateDDMMYYYY(a.sessionDate),
    a.className ?? '',
    a.studentName ?? '',
    a.status,
    a.remarks ?? '',
  ]);
  downloadCsv(filename, headers, rows);
}

export function exportAttendancePdf(records: Attendance[], title = 'Attendance report') {
  const rows = records
    .map(
      (a) =>
        `<tr>
          <td>${formatDateDDMMYYYY(a.sessionDate)}</td>
          <td>${a.className ?? '—'}</td>
          <td>${a.studentName ?? '—'}</td>
          <td>${a.status}</td>
          <td>${a.remarks ?? '—'}</td>
        </tr>`
    )
    .join('');

  const body = `
    <h1>${title}</h1>
    <p class="meta">${records.length} record${records.length === 1 ? '' : 's'} · Sample export</p>
    <table>
      <thead>
        <tr><th>Date</th><th>Class</th><th>Student</th><th>Status</th><th>Remarks</th></tr>
      </thead>
      <tbody>${rows || '<tr><td colspan="5">No records</td></tr>'}</tbody>
    </table>
    <p class="meta" style="margin-top:16px">Use Print → Save as PDF in your browser.</p>
  `;
  openPrintDocument(title, body);
}
