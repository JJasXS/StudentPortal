import type { CentreSettings } from '@/types/centreSettings';
import { DEFAULT_CENTRE_SETTINGS } from '@/types/centreSettings';

const STORAGE_KEY = 'mtp_centre_settings';

export function loadCentreSettings(): CentreSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_CENTRE_SETTINGS, ...JSON.parse(raw) } : DEFAULT_CENTRE_SETTINGS;
  } catch {
    return DEFAULT_CENTRE_SETTINGS;
  }
}

export function saveCentreSettings(settings: CentreSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
