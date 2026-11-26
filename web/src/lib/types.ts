/** Shared JSON contract. All monetary numbers are integer MXN centavos.
 * Dates use ISO 8601; responses include model defaults (exclude_unset=false).
 */
export type Currency = "MXN";
export type OrderStatus = "pending" | "paid" | "expired" | "failed";
export type ExpenseSource = "voice" | "manual";

export interface Business {
  id: string;
  name: string;
  category: string;
  zone: string;
  temporary_location: string | null;
  location_expires_at: string | null;
  demo_data: boolean;
}

export interface OrderCreate {
  business_id: string;
  amount_cents: number;
  concept: string;
  currency?: Currency;
}

export interface Order extends OrderCreate {
  currency: Currency;
  id: string;
  status: OrderStatus;
  idempotency_key: string;
  codi_qr_id: string | null;
  qr_string: string | null;
  created_at: string;
  expires_at: string | null;
  paid_at: string | null;
  reconciliation_required: boolean;
  reconciliation_reason: string | null;
  demo_data: boolean;
}

export interface Payment {
  id: string;
  order_id: string;
  codi_qr_id: string;
  transaction_id: string;
  webhook_id: string;
  amount_cents: number;
  currency: Currency;
  paid_at: string;
  demo_data: boolean;
}

export interface ExpenseCreate {
  business_id: string;
  amount_cents: number;
  category: string;
  date: string;
  source?: ExpenseSource;
  description?: string;
  currency?: Currency;
}

export interface Expense extends ExpenseCreate {
  id: string;
  source: ExpenseSource;
  description: string;
  currency: Currency;
  demo_data: boolean;
}

export interface Closing {
  currency: Currency;
  confirmed_sales_cents: number;
  expenses_cents: number;
  estimated_profit_cents: number;
  pending: Order[];
  pending_cents: number;
  missing: string[];
}

export interface CampaignSimulation {
  currency: Currency;
  ok: boolean;
  max_discount_pct: number | null;
  message: string | null;
  formula: string;
  budget_cents: number;
  max_uses: number | null;
}
