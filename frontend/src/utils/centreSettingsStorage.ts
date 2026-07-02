import type { CentreSettings } from '@/types/centreSettings';
import { DEFAULT_CENTRE_SETTINGS } from '@/types/centreSettings';
import { envCentreName } from '@/utils/envBranding';

const STORAGE_KEY = 'mtp_centre_settings';

function withEnvCentreName(settings: CentreSettings): CentreSettings {
  if (import.meta.env.VITE_CENTRE_NAME) {
    return { ...settings, centreName: envCentreName() };
  }
  return settings;
}

export function loadCentreSettings(): CentreSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const settings = raw
      ? { ...DEFAULT_CENTRE_SETTINGS, ...JSON.parse(raw) }
      : DEFAULT_CENTRE_SETTINGS;
    return withEnvCentreName(settings);
  } catch {
    return DEFAULT_CENTRE_SETTINGS;
  }
}

export function saveCentreSettings(settings: CentreSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
