import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { settingsApi } from '@/api/resources';
import type { CentreSettings } from '@/types/centreSettings';
import { DEFAULT_CENTRE_SETTINGS } from '@/types/centreSettings';
import { applyBrandPalette } from '@/utils/brandColor';
import { loadCentreSettings } from '@/utils/centreSettingsStorage';
import { CENTRE_SETTINGS_UPDATED } from '@/utils/centreBrandingEvents';

interface CentreBrandingContextValue {
  settings: CentreSettings;
  centreName: string;
  logoDataUrl?: string;
  brandColor: string;
  contactEmail?: string;
  refresh: () => Promise<void>;
}

const CentreBrandingContext = createContext<CentreBrandingContextValue | null>(null);

const useApi = import.meta.env.VITE_USE_MOCK !== 'true';

function mergeSettings(partial: Partial<CentreSettings>): CentreSettings {
  return { ...DEFAULT_CENTRE_SETTINGS, ...loadCentreSettings(), ...partial };
}

export function CentreBrandingProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<CentreSettings>(() => loadCentreSettings());

  const apply = useCallback((next: CentreSettings) => {
    setSettings(next);
    applyBrandPalette(next.brandColor);
    const appName = next.centreName || import.meta.env.VITE_APP_NAME || 'Music Tuition Portal';
    document.title = appName;
  }, []);

  const refresh = useCallback(async () => {
    if (!useApi) {
      apply(loadCentreSettings());
      return;
    }
    try {
      const remote = await settingsApi.getCentre();
      apply(mergeSettings(remote));
    } catch {
      apply(loadCentreSettings());
    }
  }, [apply]);

  useEffect(() => {
    void refresh();
    const onUpdate = () => {
      void refresh();
    };
    window.addEventListener(CENTRE_SETTINGS_UPDATED, onUpdate);
    return () => window.removeEventListener(CENTRE_SETTINGS_UPDATED, onUpdate);
  }, [refresh]);

  const value = useMemo<CentreBrandingContextValue>(
    () => ({
      settings,
      centreName: settings.centreName,
      logoDataUrl: settings.logoDataUrl,
      brandColor: settings.brandColor ?? DEFAULT_CENTRE_SETTINGS.brandColor!,
      contactEmail: settings.email,
      refresh,
    }),
    [settings, refresh]
  );

  return (
    <CentreBrandingContext.Provider value={value}>{children}</CentreBrandingContext.Provider>
  );
}

export function useCentreBranding() {
  const ctx = useContext(CentreBrandingContext);
  if (!ctx) throw new Error('useCentreBranding must be used within CentreBrandingProvider');
  return ctx;
}
