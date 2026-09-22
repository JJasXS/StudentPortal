/** Centre / app display names from repo-root `.env` (VITE_*). */
export function envCentreName(): string {
  return (
    import.meta.env.VITE_CENTRE_NAME ||
    import.meta.env.VITE_APP_NAME ||
    'Music Tuition Portal'
  );
}

export function envAppName(): string {
  return import.meta.env.VITE_APP_NAME || envCentreName();
}

/** Centre WhatsApp number for outstanding-fee payment requests (repo-root `.env`). */
export function envWhatsAppPaymentPhone(): string | undefined {
  const raw = (import.meta.env.VITE_WHATSAPP_PAYMENT_PHONE as string | undefined)?.trim();
  return raw || undefined;
}
