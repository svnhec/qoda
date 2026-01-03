import { z } from "zod";
import type { CentsAmount } from "@/lib/types/currency";

export const JournalEntryInsertSchema = z.object({
  transaction_group_id: z.string().uuid(),
  account_id: z.string().uuid(),
  amount: z.custom<CentsAmount>((val) => typeof val === "bigint" && val > 0n, {
    message: "Amount must be a positive BigInt",
  }),
  posting_status: z.enum(["pending", "committed", "settled"]).optional(),
  description: z.string().nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
  created_by: z.string().uuid().nullable().optional(),
});

export const TransactionEntrySchema = z.object({
  accountCode: z.string(),
  debit: z.custom<CentsAmount>((val) => typeof val === "bigint" && val >= 0n),
  credit: z.custom<CentsAmount>((val) => typeof val === "bigint" && val >= 0n),
});
