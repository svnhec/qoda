import { JournalEntryInsertSchema } from "@/lib/validation/ledger";

describe("ledger validation", () => {
  it("rejects negative amounts", () => {
    const invalid = { amount: -1000n };
    expect(JournalEntryInsertSchema.safeParse(invalid).success).toBe(false);
  });
});
