import { describe, it, expect } from "vitest";
import { verifyWebhookSignature } from "@/lib/stripe/webhook";

describe("webhook verification", () => {
  it("rejects invalid signatures", () => {
    const result = verifyWebhookSignature("rawBody", "invalidSig");
    expect(result.success).toBe(false);
  });
});
