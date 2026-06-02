import { Card, CardContent } from '@/components/ui/Card';

interface InvoicePlaceholderProps {
  role: 'admin' | 'parent';
}

export function InvoicePlaceholderPage({ role }: InvoicePlaceholderProps) {
  const titles = {
    admin: 'Invoice Management',
    parent: 'Child Invoices',
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">{titles[role]}</h1>
      <Card className="mb-4 border-orange-200 bg-orange-50">
        <CardContent className="p-4 text-sm text-orange-800">
          Payment feature coming soon. Invoices are shown for reference only. No payment gateway is integrated yet.
        </CardContent>
      </Card>
    </div>
  );
}
