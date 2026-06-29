import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Building2, Globe2, ImageIcon, Phone } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageHeader } from '@/components/PageHeader';
import { SquareIconTabs, type SquareIconTab } from '@/components/ui/SquareIconTabs';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label, Select, Textarea } from '@/components/ui/Input';
import { settingsApi } from '@/api/resources';
import {
  CURRENCY_OPTIONS,
  DEFAULT_CENTRE_SETTINGS,
  TIMEZONE_OPTIONS,
  type CentreSettings,
} from '@/types/centreSettings';
import { loadCentreSettings, saveCentreSettings } from '@/utils/centreSettingsStorage';
import { notifyCentreSettingsUpdated } from '@/utils/centreBrandingEvents';
import { useToast } from '@/context/ToastContext';
import { logAdminAction } from '@/utils/auditLog';
import { AUDIT_ACTIONS } from '@/types/auditLog';
import {
  parseSettingsTabParam,
  settingsTabPath,
  settingsTabToParam,
  type SettingsTab,
} from '@/utils/settingsTabs';

const TAB_LABELS: Record<SettingsTab, string> = {
  Centre: 'Centre',
  Contact: 'Contact',
  Branding: 'Branding',
  Locale: 'Locale',
};

const TAB_DESCRIPTIONS: Record<SettingsTab, string> = {
  Centre: 'Your centre name and location shown on documents',
  Contact: 'How parents and staff can reach the centre',
  Branding: 'Logo used on printed and PDF documents',
  Locale: 'Timezone and currency for schedules and amounts',
};

const TAB_CONFIG: SquareIconTab<SettingsTab>[] = (
  ['Centre', 'Contact', 'Branding', 'Locale'] as const
).map((id) => ({
  id,
  label: TAB_LABELS[id],
  icon: { Centre: Building2, Contact: Phone, Branding: ImageIcon, Locale: Globe2 }[id],
  description: TAB_DESCRIPTIONS[id],
  href: settingsTabPath(id),
}));

const MAX_LOGO_KB = 512;

function readLogoFile(file: File, onLoad: (dataUrl: string) => void, onError: (msg: string) => void) {
  if (!file.type.startsWith('image/')) {
    onError('Logo must be a PNG or JPG image.');
    return;
  }
  if (file.size > MAX_LOGO_KB * 1024) {
    onError(`Logo must be under ${MAX_LOGO_KB} KB.`);
    return;
  }
  const reader = new FileReader();
  reader.onload = () => onLoad(String(reader.result));
  reader.onerror = () => onError('Could not read the logo file.');
  reader.readAsDataURL(file);
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab = useMemo(() => parseSettingsTabParam(tabParam), [tabParam]);

  const [settings, setSettings] = useState<CentreSettings>(DEFAULT_CENTRE_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const { success: showToast } = useToast();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!tabParam) {
      setSearchParams({ tab: 'centre' }, { replace: true });
      return;
    }
    const parsed = parseSettingsTabParam(tabParam);
    const expected = settingsTabToParam(parsed);
    if (tabParam.toLowerCase() !== expected) {
      setSearchParams({ tab: expected }, { replace: true });
    }
  }, [tabParam, setSearchParams]);

  useEffect(() => {
    setLoading(true);
    if (import.meta.env.VITE_USE_MOCK === 'true') {
      setSettings(loadCentreSettings());
      setLoading(false);
      return;
    }
    settingsApi
      .getCentre()
      .then(setSettings)
      .catch(() => setSettings(loadCentreSettings()))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');
    try {
      if (import.meta.env.VITE_USE_MOCK === 'true') {
        saveCentreSettings(settings);
      } else {
        const saved = await settingsApi.updateCentre(settings);
        const merged = { ...settings, ...saved };
        setSettings(merged);
        saveCentreSettings(merged);
      }
      notifyCentreSettingsUpdated();
      setMessage('Settings saved.');
      showToast('Settings saved.');
      logAdminAction(user, {
        action: AUDIT_ACTIONS.settingsUpdated,
        entityType: 'Settings',
        entityLabel: settings.centreName,
        details: `${activeTab} settings`,
      });
    } catch {
      saveCentreSettings(settings);
      notifyCentreSettingsUpdated();
      setMessage('Saved locally — restart the backend to persist to the server.');
      showToast('Settings saved locally.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader title="Settings" description={TAB_DESCRIPTIONS[activeTab]} />

      <Card>
        <CardContent className="p-4 sm:p-6">
          {loading ? (
            <p className="text-sm text-slate-500">Loading settings…</p>
          ) : (
            <form onSubmit={handleSave}>
              <div className="space-y-6">
                <SquareIconTabs tabs={TAB_CONFIG} value={activeTab} />

                <div className="min-w-0">
                  <div className="mb-4 border-b border-slate-200 pb-3">
                    <h2 className="text-base font-semibold text-slate-900">
                      {TAB_LABELS[activeTab]}
                    </h2>
                    <p className="mt-0.5 text-sm text-slate-500">{TAB_DESCRIPTIONS[activeTab]}</p>
                  </div>

                  <div className="max-w-2xl space-y-4">
                    {activeTab === 'Centre' && (
                      <>
                        <div>
                          <Label htmlFor="centreName">Centre name</Label>
                          <Input
                            id="centreName"
                            value={settings.centreName}
                            onChange={(e) =>
                              setSettings((s) => ({ ...s, centreName: e.target.value }))
                            }
                            required
                          />
                        </div>
                        <div>
                          <Label htmlFor="address">Address</Label>
                          <Textarea
                            id="address"
                            rows={3}
                            value={settings.address ?? ''}
                            onChange={(e) => setSettings((s) => ({ ...s, address: e.target.value }))}
                            placeholder="Street, city, postcode"
                          />
                        </div>
                      </>
                    )}

                    {activeTab === 'Contact' && (
                      <>
                        <div>
                          <Label htmlFor="phone">Phone</Label>
                          <Input
                            id="phone"
                            value={settings.phone ?? ''}
                            onChange={(e) => setSettings((s) => ({ ...s, phone: e.target.value }))}
                            placeholder="+60 3-1234 5678"
                          />
                        </div>
                        <div>
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={settings.email ?? ''}
                            onChange={(e) => setSettings((s) => ({ ...s, email: e.target.value }))}
                            placeholder="hello@yourcentre.com"
                          />
                          <p className="mt-1 text-xs text-slate-500">
                            Shown on parent communications and documents.
                          </p>
                        </div>
                      </>
                    )}

                    {activeTab === 'Branding' && (
                      <>
                      <div>
                        <Label htmlFor="brandColor">Brand colour</Label>
                        <div className="mt-1 flex items-center gap-3">
                          <Input
                            id="brandColor"
                            type="color"
                            value={settings.brandColor ?? DEFAULT_CENTRE_SETTINGS.brandColor}
                            onChange={(e) =>
                              setSettings((s) => ({ ...s, brandColor: e.target.value }))
                            }
                            className="h-10 w-14 cursor-pointer p-1"
                          />
                          <Input
                            value={settings.brandColor ?? DEFAULT_CENTRE_SETTINGS.brandColor}
                            onChange={(e) =>
                              setSettings((s) => ({ ...s, brandColor: e.target.value }))
                            }
                            placeholder="#2563eb"
                            className="max-w-[8rem] font-mono text-sm"
                          />
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          Used on login, sidebar accents, and invoice PDF headers.
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="logo">Centre logo</Label>
                        <Input
                          id="logo"
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            readLogoFile(
                              file,
                              (dataUrl) => {
                                setSettings((s) => ({ ...s, logoDataUrl: dataUrl }));
                                setError('');
                              },
                              setError
                            );
                          }}
                        />
                        {settings.logoDataUrl ? (
                          <div className="mt-3 flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                            <img
                              src={settings.logoDataUrl}
                              alt="Centre logo preview"
                              className="h-14 w-14 rounded border border-slate-100 object-contain"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-slate-800">Logo uploaded</p>
                              <p className="text-xs text-slate-500">Used on centre documents</p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setSettings((s) => ({ ...s, logoDataUrl: undefined }))}
                            >
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-slate-500">
                            Optional. PNG or JPG, max {MAX_LOGO_KB} KB.
                          </p>
                        )}
                      </div>
                      </>
                    )}

                    {activeTab === 'Locale' && (
                      <>
                        <div>
                          <Label htmlFor="timezone">Timezone</Label>
                          <Select
                            id="timezone"
                            value={settings.timezone}
                            onChange={(e) =>
                              setSettings((s) => ({ ...s, timezone: e.target.value }))
                            }
                          >
                            {TIMEZONE_OPTIONS.map((tz) => (
                              <option key={tz} value={tz}>
                                {tz}
                              </option>
                            ))}
                          </Select>
                          <p className="mt-1 text-xs text-slate-500">
                            Used for class schedules and session times.
                          </p>
                        </div>
                        <div>
                          <Label htmlFor="currency">Currency</Label>
                          <Select
                            id="currency"
                            value={settings.currency}
                            onChange={(e) =>
                              setSettings((s) => ({ ...s, currency: e.target.value }))
                            }
                          >
                            {CURRENCY_OPTIONS.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </Select>
                          <p className="mt-1 text-xs text-slate-500">
                            Default currency for fees and reports.
                          </p>
                        </div>
                      </>
                    )}
                  </div>

                  {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
                  {message && <p className="mt-4 text-sm text-emerald-600">{message}</p>}

                  <div className="mt-6 flex justify-start border-t border-slate-100 pt-4">
                    <Button type="submit" disabled={saving}>
                      {saving ? 'Saving…' : `Save ${TAB_LABELS[activeTab].toLowerCase()}`}
                    </Button>
                  </div>
                </div>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
