/**
 * Minimal ambient types for the `razorpay` SDK so the app compiles in strict
 * mode regardless of the SDK's bundled typings.
 */
declare module "razorpay" {
  export interface RazorpayOrder {
    id: string;
    entity: string;
    amount: number;
    currency: string;
    receipt: string;
    status: string;
    notes?: Record<string, string>;
    created_at: number;
  }

  export interface RazorpayPayment {
    id: string;
    entity: string;
    amount: number;
    currency: string;
    status: string;
    method?: string;
    order_id: string;
    created_at: number;
    error_code?: string;
    error_description?: string;
  }

  export interface RazorpayRefund {
    id: string;
    entity: string;
    amount: number;
    status: string;
    payment_id: string;
  }

  export default class Razorpay {
    constructor(options: { key_id: string; key_secret: string });
    orders: {
      create(params: {
        amount: number;
        currency?: string;
        receipt?: string;
        notes?: Record<string, string>;
        partial_payment?: boolean;
      }): Promise<RazorpayOrder>;
      fetch(id: string): Promise<RazorpayOrder>;
    };
    payments: {
      fetch(id: string): Promise<RazorpayPayment>;
      refund(paymentId: string, params?: { amount?: number }): Promise<RazorpayRefund>;
    };
  }
}
