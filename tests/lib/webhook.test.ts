import { verifyWebhookSignature } from "@/lib/stripe/webhook";

jest.mock("@/lib/stripe/client", () => ({
  getStripeClient: jest.fn(() => ({
    webhooks: {
      constructEvent: jest.fn((_rawBody, signature, _secret) => {
        if (signature === "invalidSig") {
          throw new Error("Invalid signature");
        }
        return { id: "evt_test", type: "test.event" };
      }),
    },
  })),
}));

describe("webhook verification", () => {
  it("rejects invalid signatures", () => {
    const result = verifyWebhookSignature("rawBody", "invalidSig");
    expect(result.success).toBe(false);
  });

  it("accepts valid signatures", () => {
    const result = verifyWebhookSignature("rawBody", "validSig");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.event).toBeDefined();
    }
  });

  it("rejects missing signature", () => {
    const result = verifyWebhookSignature("rawBody", "");
    expect(result.success).toBe(false);
  });
});
