/**
 * TRANSACTION DETAIL MODAL (Intercepted Route)
 * =============================================================================
 * Detailed view of a single transaction:
 * - Merchant info
 * - Authorization timeline
 * - JSON dump
 * - Dispute actions
 * =============================================================================
 */

import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { TransactionDetailModal } from "@/components/dashboard/transactions/transaction-detail-modal";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function TransactionPage({ params }: PageProps) {
    const { id: transactionId } = await params;
    const supabase = await createClient();

    // Fetch full transaction details
    const { data: transaction, error } = await supabase
        .from("transaction_settlements")
        .select(`
            *,
            agents:agent_id (name, id),
            clients:client_id (name, id)
        `)
        .eq("id", transactionId)
        .single();

    if (error || !transaction) notFound();

    return <TransactionDetailModal transaction={transaction} />;
}
