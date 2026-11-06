function buildCheckoutUrl(template: string, basketId: string): string {
  return template.replace("{basket_id}", encodeURIComponent(basketId));
}

function extractBasketId(body: Record<string, unknown>): string | null {
  for (const key of ["basket_id", "basketId"]) {
    const value = body[key];
    if (typeof value === "string" && value !== "") {
      return value;
    }
  }

  const data = body.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const nested = data as Record<string, unknown>;
    for (const key of ["basket_id", "basketId"]) {
      const value = nested[key];
      if (typeof value === "string" && value !== "") {
        return value;
      }
    }
  }

  return null;
}

function extractDirectPaymentUrl(body: Record<string, unknown>): string | null {
  for (const key of [
    "paymentUrl",
    "redirectUrl",
    "url",
    "payment_url",
    "checkout_url",
    "checkoutUrl",
  ]) {
    const value = body[key];
    if (typeof value === "string" && value !== "") {
      return value;
    }
  }

  const data = body.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const nested = data as Record<string, unknown>;
    for (const key of ["checkout_url", "checkoutUrl", "paymentUrl", "redirectUrl"]) {
      const value = nested[key];
      if (typeof value === "string" && value !== "") {
        return value;
      }
    }
  }

  return null;
}

function isSuccessResponse(body: Record<string, unknown>): boolean {
  if (body.success === true) {
    return true;
  }
  return String(body.status ?? "").toLowerCase() === "success";
}

/**
 * Browser-side payment initiation when the server cannot reach LotPayment.
 */
export async function submitPaymentForm(
  actionUrl: string,
  fields: Record<string, string | number>,
  checkoutUrlTemplate?: string,
): Promise<void> {
  const response = await fetch(actionUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(fields),
  });

  let body: Record<string, unknown> = {};
  try {
    body = (await response.json()) as Record<string, unknown>;
  } catch {
    throw new Error("Invalid response from payment gateway.");
  }

  if (!response.ok) {
    const message =
      typeof body.message === "string"
        ? body.message
        : `Payment gateway error (${response.status}).`;
    throw new Error(message);
  }

  if (!isSuccessResponse(body)) {
    const message =
      typeof body.message === "string"
        ? body.message
        : "Payment could not be started.";
    throw new Error(message);
  }

  const basketId = extractBasketId(body);
  if (basketId) {
    if (checkoutUrlTemplate && checkoutUrlTemplate.includes("{basket_id}")) {
      window.location.href = buildCheckoutUrl(checkoutUrlTemplate, basketId);
      return;
    }

    throw new Error("Payment checkout URL is not configured.");
  }

  const directUrl = extractDirectPaymentUrl(body);
  if (directUrl) {
    window.location.href = directUrl;
    return;
  }

  throw new Error("Payment gateway did not return a redirect URL.");
}
