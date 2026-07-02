import { envCentreName } from '@/utils/envBranding';

export interface CentreSettings {
  centreName: string;
  timezone: string;
  currency: string;
  defaultMonthlyFee: number;
  paymentInstructions?: string;
  address?: string;
  phone?: string;
  email?: string;
  bankName?: string;
  bankAccountNo?: string;
  invoicePrefix?: string;
  logoDataUrl?: string;
  brandColor?: string;
}

export const DEFAULT_CENTRE_SETTINGS: CentreSettings = {
  centreName: envCentreName(),
  timezone: 'Asia/Kuala_Lumpur',
  currency: 'MYR',
  defaultMonthlyFee: 300,
  paymentInstructions:
    'Pay online via the parent portal or bank transfer using the account details below.',
  address: '12 Jalan Melati, 50450 Kuala Lumpur',
  phone: '+60 3-1234 5678',
  email: 'billing@harmonymusic.demo',
  bankName: 'Maybank',
  bankAccountNo: '5123 4567 8901',
  invoicePrefix: 'INV',
  brandColor: '#2563eb',
};

export const TIMEZONE_OPTIONS = [
  'Asia/Kuala_Lumpur',
  'Asia/Singapore',
  'Asia/Bangkok',
  'Asia/Jakarta',
  'Asia/Manila',
  'UTC',
] as const;

export const CURRENCY_OPTIONS = ['MYR', 'SGD', 'USD', 'THB'] as const;
