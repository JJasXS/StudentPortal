import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Invoice } from '@/types';
import type { CentreSettings } from '@/types/centreSettings';
import { loadCentreSettings } from '@/utils/centreSettingsStorage';
import { brandColorToRgb } from '@/utils/brandColor';
import { formatInvoiceCourse, formatRm } from '@/utils/invoiceBilling';
import { formatDateDDMMYYYY } from '@/utils/dateFormat';
import { currentBillingPeriod } from '@/utils/billingPeriod';

type DocumentKind = 'invoice' | 'receipt';

function safeFilename(invoiceNo: string, kind: DocumentKind) {
  const base = invoiceNo.replace(/[^\w-]+/g, '_');
  return kind === 'receipt' ? `${base}-receipt.pdf` : `${base}.pdf`;
}

function lineDescription(invoice: Invoice) {
  const course = formatInvoiceCourse(invoice);
  const period = invoice.billingPeriod ?? currentBillingPeriod();
  return `Monthly tuition — ${course} (${period})`;
}

function drawPaidStamp(doc: jsPDF, pageWidth: number) {
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(1.2);
  doc.roundedRect(pageWidth - 58, 38, 44, 18, 2, 2, 'S');
  doc.setTextColor(16, 185, 129);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('PAID', pageWidth - 36, 50, { align: 'center' });
}

function drawCentreHeader(doc: jsPDF, settings: CentreSettings, pageWidth: number, kind: DocumentKind) {
  const [r, g, b] = brandColorToRgb(settings.brandColor);
  doc.setFillColor(r, g, b);
  doc.rect(0, 0, pageWidth, 36, 'F');

  let textX = 14;
  if (settings.logoDataUrl) {
    try {
      doc.addImage(settings.logoDataUrl, 'PNG', 12, 6, 22, 22);
      textX = 38;
    } catch {
      /* ignore invalid logo */
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(settings.centreName, textX, 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const contact: string[] = [];
  if (settings.address) contact.push(settings.address);
  if (settings.phone) contact.push(settings.phone);
  if (settings.email) contact.push(settings.email);
  if (contact.length) {
    doc.text(contact.join(' · '), textX, 21);
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  const title = kind === 'receipt' ? 'Payment receipt' : 'Tax invoice';
  doc.text(title, pageWidth - 14, 14, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
}

export function renderInvoicePdf(invoice: Invoice, kind: DocumentKind = 'invoice') {
  const settings = loadCentreSettings();
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  drawCentreHeader(doc, settings, pageWidth, kind);

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(invoice.invoiceNo, pageWidth - 14, 28, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Issued ${formatDateDDMMYYYY(invoice.createdAt)}`, pageWidth - 14, 33, { align: 'right' });

  if (invoice.status === 'Paid' && kind === 'invoice') {
    drawPaidStamp(doc, pageWidth);
  }

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('Bill to', 14, 48);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.parentName ?? '—', 14, 54);
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.text(`Student: ${invoice.studentName ?? '—'}`, 14, 59);

  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.text('Due date', pageWidth - 14, 48, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(formatDateDDMMYYYY(invoice.dueDate), pageWidth - 14, 54, { align: 'right' });
  if (invoice.paidAt && kind === 'receipt') {
    doc.setFont('helvetica', 'bold');
    doc.text('Paid on', pageWidth - 14, 59, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(formatDateDDMMYYYY(invoice.paidAt), pageWidth - 14, 64, { align: 'right' });
  }

  const unitPrice = formatRm(invoice.amount, settings.currency);
  autoTable(doc, {
    startY: 72,
    head: [['Description', 'Qty', 'Unit price', 'Amount']],
    body: [[lineDescription(invoice), '1', unitPrice, unitPrice]],
    theme: 'grid',
    headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3.5 },
    columnStyles: {
      0: { cellWidth: 88 },
      1: { halign: 'center', cellWidth: 14 },
      2: { halign: 'right', cellWidth: 32 },
      3: { halign: 'right', fontStyle: 'bold', cellWidth: 32 },
    },
  });

  const tableEnd =
    (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 100;
  const totalLabel = invoice.status === 'Paid' ? 'Amount paid' : 'Total due';

  autoTable(doc, {
    startY: tableEnd + 2,
    body: [[totalLabel, unitPrice]],
    theme: 'plain',
    styles: { fontSize: 10, cellPadding: 2.5 },
    columnStyles: {
      0: { halign: 'right', fontStyle: 'bold' },
      1: { halign: 'right', fontStyle: 'bold', cellWidth: 40 },
    },
  });

  let y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? tableEnd) + 10;

  if (settings.bankName || settings.bankAccountNo) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);
    doc.text('Bank transfer', 14, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    if (settings.bankName) {
      doc.text(`Bank: ${settings.bankName}`, 14, y);
      y += 4;
    }
    if (settings.bankAccountNo) {
      doc.text(`Account: ${settings.bankAccountNo}`, 14, y);
      y += 4;
    }
    doc.text(`Reference: ${invoice.invoiceNo}`, 14, y);
    y += 8;
  }

  if (settings.paymentInstructions) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('Payment instructions', 14, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(doc.splitTextToSize(settings.paymentInstructions, pageWidth - 28), 14, y);
  }

  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text(
    kind === 'receipt' ? 'Thank you for your payment.' : 'Please pay by the due date shown above.',
    pageWidth / 2,
    doc.internal.pageSize.getHeight() - 10,
    { align: 'center' }
  );

  doc.save(safeFilename(invoice.invoiceNo, kind));
}
