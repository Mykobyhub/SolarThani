// Payment provider abstraction for the Milestone Payment (escrow) system.
//
// The real gateway (Omise / Xendit / etc.) has not been chosen yet — that
// decision is explicitly out of scope for this round. Everything in the app
// talks to a `PaymentProvider` through this interface only, so swapping the
// mock implementation for a real one later means writing one new file that
// implements this interface; no business logic elsewhere needs to change.

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
  /** Provider-side reference id for this action (hold/release/refund), stored in payment_transactions.provider_reference_id for reconciliation. */
  referenceId: string;
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
    return { success: true, referenceId };
  }

  async releaseHold({ holdReferenceId, amount, milestoneId }: PaymentReleaseParams): Promise<PaymentActionResult> {
    const referenceId = `MOCK-RELEASE-${milestoneId}-${Date.now()}`;
    console.log(`[MockPaymentProvider] releaseHold: milestone=${milestoneId} amount=${amount} hold=${holdReferenceId} -> ${referenceId}`);
    return { success: true, referenceId };
  }

  async refundHold({ holdReferenceId, amount, milestoneId }: PaymentRefundParams): Promise<PaymentActionResult> {
    const referenceId = `MOCK-REFUND-${milestoneId}-${Date.now()}`;
    console.log(`[MockPaymentProvider] refundHold: milestone=${milestoneId} amount=${amount} hold=${holdReferenceId} -> ${referenceId}`);
    return { success: true, referenceId };
  }
}

let providerInstance: PaymentProvider | null = null;

/** Returns the active payment provider. Swap the implementation here once a real gateway is chosen. */
export function getPaymentProvider(): PaymentProvider {
  if (!providerInstance) providerInstance = new MockPaymentProvider();
  return providerInstance;
}
