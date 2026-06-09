export function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const escape = (cell: string) => {
    if (/[",\n]/.test(cell)) return `"${cell.replace(/"/g, '""')}"`;
    return cell;
  };
  const lines = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))];
  downloadBlob(filename, lines.join('\n'), 'text/csv;charset=utf-8');
}

export function downloadBlob(filename: string, content: BlobPart, mimeType: string) {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function openPrintDocument(title: string, bodyHtml: string) {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 24px; color: #0f172a; }
    h1 { font-size: 1.25rem; margin: 0 0 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
    th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; }
    th { background: #f8fafc; }
    .meta { color: #64748b; font-size: 13px; margin-bottom: 16px; }
    @media print { body { margin: 12px; } }
  </style>
</head>
<body>${bodyHtml}</body>
</html>`;
  downloadBlob(`${title.replace(/\s+/g, '-').toLowerCase()}.html`, html, 'text/html;charset=utf-8');
}
