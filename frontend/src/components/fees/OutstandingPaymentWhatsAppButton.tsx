import { MessageCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useCentreBranding } from '@/context/CentreBrandingContext';
import { cn } from '@/utils/cn';
import { envWhatsAppPaymentPhone } from '@/utils/envBranding';
import { buildOutstandingPaymentWhatsAppUrl } from '@/utils/whatsappPayment';
import type { SqlAccountOutstandingInvoice } from '@/types/sqlAccount';

interface OutstandingPaymentWhatsAppButtonProps {
  invoices: SqlAccountOutstandingInvoice[];
  studentName?: string;
  className?: string;
}

export function OutstandingPaymentWhatsAppButton({
  invoices,
  studentName,
  className,
}: OutstandingPaymentWhatsAppButtonProps) {
  const { user } = useAuth();
  const { settings, centreName } = useCentreBranding();
  if (invoices.length === 0) return null;

  const total = invoices.reduce((sum, invoice) => sum + invoice.outstanding, 0);
  const href = buildOutstandingPaymentWhatsAppUrl({
    phone: envWhatsAppPaymentPhone() ?? settings.phone,
    centreName,
    studentName: studentName?.trim() || user?.fullName || '',
    totalOutstanding: total,
    invoices,
  });
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex min-h-9 items-center justify-center rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white transition-colors hover:bg-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500',
        className
      )}
    >
      <MessageCircle className="mr-1.5 h-4 w-4" aria-hidden />
      Request payment on WhatsApp
    </a>
  );
}
