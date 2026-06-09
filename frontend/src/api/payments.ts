import apiClient from './client';

export interface FpxBank {
  code: string;
  active: boolean;
}

export interface BillplzPaymentSession {
  billId: string;
  paymentUrl: string;
  invoiceId: string;
}

export interface BillplzStatus {
  enabled: boolean;
  sandbox: boolean;
}

export const paymentsApi = {
  getBillplzStatus: () =>
    apiClient.get<BillplzStatus>('/payments/billplz/status').then((r) => r.data),

  getFpxBanks: () =>
    apiClient.get<FpxBank[]>('/payments/billplz/fpx-banks').then((r) => r.data),

  createBillplzPayment: (invoiceId: string, fpxBankCode: string) =>
    apiClient
      .post<BillplzPaymentSession>(`/invoices/${invoiceId}/billplz`, { fpxBankCode })
      .then((r) => r.data),
};
