/** Common FPX bank codes → display names (Billplz API returns code only). */
export const FPX_BANK_NAMES: Record<string, string> = {
  ABMB0212: 'Alliance Bank',
  ABB0233: 'Affin Bank',
  AMBB0209: 'AmBank',
  BCBB0235: 'CIMB Clicks',
  BIMB0340: 'Bank Islam',
  BKRM0602: 'Bank Rakyat',
  BMMB0341: 'Bank Muamalat',
  BSN0601: 'BSN',
  CIT0219: 'Citibank',
  HLB0224: 'Hong Leong Bank',
  HSBC0223: 'HSBC',
  KFH0346: 'KFH',
  MB2U0227: 'Maybank2u',
  MBU0227: 'Maybank2u (Corporate)',
  OCBC0229: 'OCBC',
  PBB0233: 'Public Bank',
  RHB0218: 'RHB Bank',
  SCB0216: 'Standard Chartered',
  UOB0226: 'UOB',
};

export function fpxBankLabel(code: string): string {
  return FPX_BANK_NAMES[code] ?? code;
}
