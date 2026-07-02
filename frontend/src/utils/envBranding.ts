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
