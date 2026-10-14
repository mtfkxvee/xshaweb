import { bookPaidQuotation } from "./orders";

// Shape of the part of DOKU's notification we use.
export type DokuNotification = {
  transaction?: { status?: string };
  order?: { invoice_number?: string; amount?: number | string };
};

// What a verified DOKU notification leads to. `retry` is the whole answer
// to "should we make DOKU send this again?":
//  - SUCCESS and booked (or already booked): no — acknowledged.
//  - SUCCESS but we failed to record it: YES. DOKU only stops on HTTP 200,
//    and acknowledging a payment we didn't record would leave a paid order
//    "unpaid" forever. This is safe because booking is idempotent.
//  - SUCCESS but it can never be booked (invoice isn't ours, order was
//    cancelled, DOKU's amount differs): no — retrying can't help. Cancelled
//    and mismatched payments are flagged on the Quotation for staff.
//  - any other status (pending, failed, expired): nothing to do.
export async function handleDokuNotification(body: DokuNotification): Promise<{ retry: boolean }> {
  const invoiceNumber = body.order?.invoice_number;
  if (!invoiceNumber || body.transaction?.status !== "SUCCESS") return { retry: false };

  // DOKU states the amount it collected; verify it against the order.
  const rawAmount = body.order?.amount;
  const amount = rawAmount === undefined || rawAmount === null ? NaN : Number(rawAmount);
  const confirmedAmount = Number.isFinite(amount) ? amount : null;

  const result = await bookPaidQuotation(invoiceNumber, confirmedAmount).catch((error: unknown) => ({
    ok: false as const,
    message: error instanceof Error ? error.message : String(error),
    retryable: true,
  }));

  if (result.ok) return { retry: false };
  console.error(`DOKU payment for ${invoiceNumber} not recorded: ${result.message}`);
  return { retry: result.retryable };
}
