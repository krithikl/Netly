import type { PaymentTestForm } from "@/lib/app/types";

export async function createPaymentAuthorization(paymentTestForm: PaymentTestForm) {
  const response = await fetch("/api/open-banking/payment-test/start", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(paymentTestForm)
  });
  const payload = (await response.json()) as { authorizationUrl?: string; error?: string };

  if (!response.ok || !payload.authorizationUrl) {
    throw new Error(payload.error || "Could not start payment test.");
  }

  return payload.authorizationUrl;
}
