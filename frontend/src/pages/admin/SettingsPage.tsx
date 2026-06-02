import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" description="System configuration and preferences" />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>General Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <p>Centre Name: Music Tuition Portal (Demo)</p>
            <p>Timezone: Asia/Kuala_Lumpur</p>
            <p>Currency: MYR (RM)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Future Settings</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-600">
            Multi-tenant configuration, notification preferences, and payment settings will be available in future phases.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
