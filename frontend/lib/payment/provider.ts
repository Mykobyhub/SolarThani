// Payment provider abstraction for the Milestone Payment (escrow) system.
//
// Omise (Opn Payments) was chosen as the real gateway, integrated via its Recipient API only
// (platform holds funds in its own Omise balance, pays installers out via Transfer — see
// lib/payment/omise-provider.ts). Account Chaining (per-installer sub-merchant) is a reserved
// future option, not implemented. Everything in the app talks to a `PaymentProvider` through
// this interface only, so business logic elsewhere never needs to know which concrete
// provider is active.

import { getOmiseConfig, activeOmiseSecretKey, OmisePaymentProvider } from './omise-provider';

export interface PaymentHoldParams {
  amount: number;
  projectId: number;
  milestoneId: number;
}

export interface PaymentReleaseParams {
  holdReferenceId: string;
  amount: number;
  milestoneId: number;
}

export interface PaymentRefundParams {
  holdReferenceId: string;
  amount: number;
  milestoneId: number;
}

export interface PaymentActionResult {
  success: boolean;
  /**
   * Where this action actually stands. Synchronous providers (the mock, and Omise refunds)
   * always resolve 'succeeded' immediately. Asynchronous providers (Omise charges/transfers)
   * resolve 'pending' — the real outcome only arrives later via the provider's webhook, which
   * is responsible for reconciling payment_transactions.status and advancing the milestone
   * state machine from there. 'failed' means the provider rejected the action outright.
   */
  status: 'succeeded' | 'pending' | 'failed';
  /** Provider-side reference id for this action (hold/release/refund), stored in payment_transactions.provider_reference_id for reconciliation. */
  referenceId: string;
  /** Set only for actions that need the payer to complete a step out-of-band (e.g. Omise PromptPay's QR/authorize URL for createHold). Absent for synchronous actions. */
  nextActionUrl?: string;
  /**
   * Set when createHold() found and re-used an already-pending charge for this milestone instead
   * of creating a new one (e.g. the customer hit "retry" after the QR poll timed out, but hadn't
   * actually let the original charge expire). Callers must not insert a second transactions row
   * for the same charge when this is true — update the existing row's status instead.
   */
  reused?: boolean;
}

export interface PaymentProvider {
  /** Provider name, stored alongside every transaction row (e.g. 'mock', 'omise'). */
  readonly name: string;

  /** Places a hold (escrow) for one milestone's amount. */
  createHold(params: PaymentHoldParams): Promise<PaymentActionResult>;

  /** Releases a previously-held amount to the installer (payout). */
  releaseHold(params: PaymentReleaseParams): Promise<PaymentActionResult>;

  /** Refunds a previously-held amount back to the customer. */
  refundHold(params: PaymentRefundParams): Promise<PaymentActionResult>;
}

/**
 * Mock implementation — simulates every action succeeding immediately with a
 * fake reference id, so the full milestone workflow (propose → pay → start →
 * complete → confirm/dispute → release/refund) can be exercised end-to-end
 * before a real gateway is wired in. Every call is logged for traceability.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';

  async createHold({ amount, projectId, milestoneId }: PaymentHoldParams): Promise<PaymentActionResult> {
    const referenceId = `MOCK-HOLD-${projectId}-${milestoneId}-${Date.now()}`;
    console.log(`[MockPaymentProvider] createHold: project=${projectId} milestone=${milestoneId} amount=${amount} -> ${referenceId}`);
    return { success: true, status: 'succeeded', referenceId };
  }

  async releaseHold({ holdReferenceId, amount, milestoneId }: PaymentReleaseParams): Promise<PaymentActionResult> {
    const referenceId = `MOCK-RELEASE-${milestoneId}-${Date.now()}`;
    console.log(`[MockPaymentProvider] releaseHold: milestone=${milestoneId} amount=${amount} hold=${holdReferenceId} -> ${referenceId}`);
    return { success: true, status: 'succeeded', referenceId };
  }

  async refundHold({ holdReferenceId, amount, milestoneId }: PaymentRefundParams): Promise<PaymentActionResult> {
    const referenceId = `MOCK-REFUND-${milestoneId}-${Date.now()}`;
    console.log(`[MockPaymentProvider] refundHold: milestone=${milestoneId} amount=${amount} hold=${holdReferenceId} -> ${referenceId}`);
    return { success: true, status: 'succeeded', referenceId };
  }
}

let mockProviderInstance: PaymentProvider | null = null;

/**
 * Returns the active payment provider. Resolves to `OmisePaymentProvider` once a secret key is
 * saved for the active mode (test/live) in Admin → ตั้งค่า → Gateway; falls back to the mock
 * otherwise, so every existing mock-based flow keeps working untouched until Omise is actually
 * configured. Config is read fresh from `site_content` each call (same lookup-every-time
 * convention as `getLineConfig()`) rather than cached, so a settings change takes effect
 * immediately without a restart.
 */
export async function getPaymentProvider(): Promise<PaymentProvider> {
  const cfg = await getOmiseConfig();
  if (activeOmiseSecretKey(cfg)) return new OmisePaymentProvider();

  if (!mockProviderInstance) mockProviderInstance = new MockPaymentProvider();
  return mockProviderInstance;
}
