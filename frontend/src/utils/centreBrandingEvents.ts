export const CENTRE_SETTINGS_UPDATED = 'mtp:centre-settings-updated';

export function notifyCentreSettingsUpdated() {
  window.dispatchEvent(new CustomEvent(CENTRE_SETTINGS_UPDATED));
}
