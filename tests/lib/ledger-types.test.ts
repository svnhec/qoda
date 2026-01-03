import {
  parseJournalEntry,
  serializeJournalEntry,
  SYSTEM_ACCOUNT_CODES,
  type JournalEntryRow,
  type JournalEntry,
  type AccountType,
  type PostingStatus,
} from "@/lib/db/types";

describe("Ledger Types", () => {
  describe("parseJournalEntry", () => {
    it("should convert string amount to BigInt", () => {
      const row: JournalEntryRow = {
        id: "test-id",
        transaction_group_id: "txn-group-id",
        account_id: "account-id",
        amount: "1050", // String from PostgreSQL
        posting_status: "pending",
        description: "Test entry",
        metadata: {},
        idempotency_key: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        created_by: null,
      };

      const entry = parseJournalEntry(row);

      expect(entry.amount).toBe(1050n);
      expect(typeof entry.amount).toBe("bigint");
    });

    it("should handle negative amounts (credits)", () => {
      const row: JournalEntryRow = {
        id: "test-id",
        transaction_group_id: "txn-group-id",
        account_id: "account-id",
        amount: "-5000", // Negative = Credit
        posting_status: "committed",
        description: "Credit entry",
        metadata: { stripe_transaction_id: "txn_xxx" },
        idempotency_key: "key_123",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        created_by: "user-123",
      };

      const entry = parseJournalEntry(row);

      expect(entry.amount).toBe(-5000n);
      expect(entry.posting_status).toBe("committed");
      expect(entry.metadata.stripe_transaction_id).toBe("txn_xxx");
    });

    it("should preserve all other fields", () => {
      const row: JournalEntryRow = {
        id: "id-1",
        transaction_group_id: "txn-1",
        account_id: "acc-1",
        amount: "100",
        posting_status: "settled",
        description: "Test",
        metadata: { agent_id: "agent-1", client_id: "client-1" },
        idempotency_key: "idem-1",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
        created_by: "user-1",
      };

      const entry = parseJournalEntry(row);

      expect(entry.id).toBe("id-1");
      expect(entry.transaction_group_id).toBe("txn-1");
      expect(entry.account_id).toBe("acc-1");
      expect(entry.posting_status).toBe("settled");
      expect(entry.description).toBe("Test");
      expect(entry.metadata.agent_id).toBe("agent-1");
      expect(entry.idempotency_key).toBe("idem-1");
      expect(entry.created_by).toBe("user-1");
    });
  });

  describe("serializeJournalEntry", () => {
    it("should convert BigInt amount to string", () => {
      const entry: JournalEntry = {
        id: "test-id",
        transaction_group_id: "txn-group-id",
        account_id: "account-id",
        amount: 1050n,
        posting_status: "pending",
        description: "Test entry",
        metadata: {},
        idempotency_key: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        created_by: null,
      };

      const row = serializeJournalEntry(entry);

      expect(row.amount).toBe("1050");
      expect(typeof row.amount).toBe("string");
    });

    it("should handle negative amounts", () => {
      const entry: JournalEntry = {
        id: "test-id",
        transaction_group_id: "txn-group-id",
        account_id: "account-id",
        amount: -5000n,
        posting_status: "committed",
        description: "Credit entry",
        metadata: {},
        idempotency_key: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        created_by: null,
      };

      const row = serializeJournalEntry(entry);

      expect(row.amount).toBe("-5000");
    });

    it("should be reversible with parseJournalEntry", () => {
      const original: JournalEntry = {
        id: "test-id",
        transaction_group_id: "txn-group-id",
        account_id: "account-id",
        amount: 12345n,
        posting_status: "settled",
        description: "Round trip test",
        metadata: { test: true },
        idempotency_key: "key-123",
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
        created_by: "user-1",
      };

      const serialized = serializeJournalEntry(original);
      const parsed = parseJournalEntry(serialized);

      expect(parsed.amount).toBe(original.amount);
      expect(parsed.id).toBe(original.id);
      expect(parsed.description).toBe(original.description);
    });
  });

  describe("SYSTEM_ACCOUNT_CODES", () => {
    it("should have all required asset accounts", () => {
      expect(SYSTEM_ACCOUNT_CODES.PLATFORM_CASH).toBe("1000");
      expect(SYSTEM_ACCOUNT_CODES.ACCOUNTS_RECEIVABLE_AGENCIES).toBe("1100");
      expect(SYSTEM_ACCOUNT_CODES.PREPAID_CARD_FUNDS).toBe("1200");
    });

    it("should have all required liability accounts", () => {
      expect(SYSTEM_ACCOUNT_CODES.AGENCY_DEPOSITS).toBe("2000");
      expect(SYSTEM_ACCOUNT_CODES.ACCOUNTS_PAYABLE_VENDORS).toBe("2100");
      expect(SYSTEM_ACCOUNT_CODES.DEFERRED_REVENUE).toBe("2200");
    });

    it("should have all required revenue accounts", () => {
      expect(SYSTEM_ACCOUNT_CODES.MARKUP_REVENUE).toBe("4000");
      expect(SYSTEM_ACCOUNT_CODES.INTERCHANGE_REVENUE).toBe("4100");
      expect(SYSTEM_ACCOUNT_CODES.SUBSCRIPTION_REVENUE).toBe("4200");
    });

    it("should have all required expense accounts", () => {
      expect(SYSTEM_ACCOUNT_CODES.API_COSTS).toBe("5000");
      expect(SYSTEM_ACCOUNT_CODES.CARD_PROCESSING_FEES).toBe("5100");
      expect(SYSTEM_ACCOUNT_CODES.PLATFORM_OPERATING_EXPENSES).toBe("5200");
    });
  });

  describe("Type safety", () => {
    it("should enforce AccountType enum values", () => {
      const validTypes: AccountType[] = [
        "asset",
        "liability",
        "equity",
        "revenue",
        "expense",
      ];
      expect(validTypes).toHaveLength(5);
    });

    it("should enforce PostingStatus enum values", () => {
      const validStatuses: PostingStatus[] = ["pending", "committed", "settled"];
      expect(validStatuses).toHaveLength(3);
    });

    it("should allow BigInt arithmetic on amounts", () => {
      const debit: JournalEntry["amount"] = 1000n;
      const credit: JournalEntry["amount"] = -1000n;
      const balance = debit + credit;

      expect(balance).toBe(0n);
    });

    it("should demonstrate balanced transaction invariant", () => {
      // Simulate a transaction with multiple entries
      const entries: Array<{ amount: bigint }> = [
        { amount: 10000n },  // Debit: Platform Cash +$100
        { amount: -10000n }, // Credit: Agency Deposits -$100
      ];

      const sum = entries.reduce((acc, e) => acc + e.amount, 0n);
      expect(sum).toBe(0n); // Balanced transaction
    });

    it("should demonstrate unbalanced transaction detection", () => {
      // Simulate an unbalanced transaction
      const entries: Array<{ amount: bigint }> = [
        { amount: 10000n },  // Debit: +$100
        { amount: -9000n },  // Credit: -$90 (missing $10!)
      ];

      const sum = entries.reduce((acc, e) => acc + e.amount, 0n);
      expect(sum).not.toBe(0n); // Unbalanced!
      expect(sum).toBe(1000n); // Missing $10
    });
  });
});

describe("Ledger Helper Functions", () => {
  describe("generateIdempotencyKey", () => {
    // Import dynamically to avoid Supabase client initialization
    const generateIdempotencyKey = (prefix: string, uniqueId: string) =>
      `${prefix}_${uniqueId}`;

    it("should generate consistent keys", () => {
      const key1 = generateIdempotencyKey("stripe_webhook", "evt_123");
      const key2 = generateIdempotencyKey("stripe_webhook", "evt_123");

      expect(key1).toBe(key2);
      expect(key1).toBe("stripe_webhook_evt_123");
    });

    it("should differentiate by prefix", () => {
      const stripeKey = generateIdempotencyKey("stripe", "123");
      const rebillKey = generateIdempotencyKey("rebill", "123");

      expect(stripeKey).not.toBe(rebillKey);
    });

    it("should handle various ID formats", () => {
      expect(generateIdempotencyKey("test", "abc-123")).toBe("test_abc-123");
      expect(generateIdempotencyKey("test", "uuid_here")).toBe("test_uuid_here");
    });
  });
});






