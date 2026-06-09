export const SETTINGS_TABS = ['Centre', 'Contact', 'Branding', 'Locale'] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number];

export const SETTINGS_TAB_PARAMS: Record<SettingsTab, string> = {
  Centre: 'centre',
  Contact: 'contact',
  Branding: 'branding',
  Locale: 'locale',
};

const PARAM_TO_TAB = Object.fromEntries(
  Object.entries(SETTINGS_TAB_PARAMS).map(([tab, param]) => [param, tab])
) as Record<string, SettingsTab>;

export function parseSettingsTabParam(param: string | null): SettingsTab {
  if (!param) return 'Centre';
  return PARAM_TO_TAB[param.toLowerCase()] ?? 'Centre';
}

export function settingsTabToParam(tab: SettingsTab): string {
  return SETTINGS_TAB_PARAMS[tab];
}

export function settingsTabPath(tab: SettingsTab): string {
  return `/admin/settings?tab=${settingsTabToParam(tab)}`;
}
