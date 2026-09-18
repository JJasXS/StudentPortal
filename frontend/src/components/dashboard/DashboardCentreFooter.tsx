import { useCentreBranding } from '@/context/CentreBrandingContext';

export function DashboardCentreFooter() {
  const { centreName } = useCentreBranding();

  return (
    <p className="pt-2 text-center text-xs text-slate-400">
      {centreName} · v1.0
    </p>
  );
}
