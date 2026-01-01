/**
 * GET /api/billing/statement
 * =============================================================================
 * Fetches transaction data for a client to generate a billing statement.
 * Returns transactions for the current month in a format suitable for CSV export.
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";
import { logAuditError } from "@/lib/db/audit";

// Environment variables
const ENABLE_BILLING = process.env.ENABLE_BILLING === "true";

/**
 * Transaction data for statement export.
 */
interface StatementTransaction {
    date: string;
    merchant_name: string;
    merchant_category: string;
    amount_cents: bigint;
    markup_fee_cents: bigint;
    total_cents: bigint;
}

/**
 * Validation schema for statement request.
 */
const statementRequestSchema = z.object({
    clientId: z.string().uuid("Invalid client ID format"),
});

export async function GET(request: NextRequest) {
    // Check if billing is enabled
    if (!ENABLE_BILLING) {
        return NextResponse.json(
            { error: "Billing is not available", code: "FEATURE_DISABLED" },
            { status: 503 }
        );
    }

    let user: { id: string } | null = null;
    try {
        const supabase = await createClient();

        // Get current user
        const {
            data: { user: userData },
            error: authError,
        } = await supabase.auth.getUser();

        if (authError || !userData) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        user = userData;

        // Validate input parameters
        const { searchParams } = new URL(request.url);
        const clientId = searchParams.get("clientId");

        const validationResult = statementRequestSchema.safeParse({ clientId });
        if (!validationResult.success) {
            return NextResponse.json(
                { error: "Invalid request parameters", details: validationResult.error.issues },
                { status: 400 }
            );
        }

    // Get user's organization
    const { data: profile } = await supabase
        .from("user_profiles")
        .select("default_organization_id")
        .eq("id", user.id)
        .single();

        if (!profile?.default_organization_id) {
            await logAuditError({
                action: "billing_statement",
                resourceType: "statement",
                error: new Error("No organization found for user"),
                userId: user.id,
            });
            return NextResponse.json(
                { error: "No organization found" },
                { status: 400 }
            );
        }

        const organizationId = profile.default_organization_id;

        // Verify client belongs to user's organization
        const { data: client, error: clientError } = await supabase
            .from("clients")
            .select("id, name, organization_id")
            .eq("id", validationResult.data.clientId)
            .eq("organization_id", organizationId)
            .single();

        if (clientError || !client) {
            await logAuditError({
                action: "billing_statement",
                resourceType: "client",
                resourceId: validationResult.data.clientId,
                error: clientError || new Error("Client not found"),
                userId: user.id,
                organizationId,
            });
            return NextResponse.json(
                { error: "Client not found or access denied" },
                { status: 404 }
            );
        }

    // Get current month boundaries
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    // Fetch settlements for this client in current month
    const { data: settlements, error: settlementsError } = await supabase
        .from("transaction_settlements")
        .select(
            "created_at, merchant_name, merchant_category, amount_cents, markup_fee_cents"
        )
        .eq("client_id", clientId)
        .eq("organization_id", organizationId)
        .gte("created_at", monthStart.toISOString())
        .lt("created_at", monthEnd.toISOString())
        .order("created_at", { ascending: true });

    if (settlementsError) {
        await logAuditError({
            action: "billing_statement",
            resourceType: "settlements",
            resourceId: validationResult.data.clientId,
            error: settlementsError,
            userId: user.id,
            organizationId,
        });
        return NextResponse.json(
            { error: "Failed to fetch transactions" },
            { status: 500 }
        );
    }

    // Transform to statement format using BigInt
    const transactions: StatementTransaction[] = (settlements ?? []).map((s) => ({
        date: new Date(s.created_at).toLocaleDateString("en-US"),
        merchant_name: s.merchant_name,
        merchant_category: s.merchant_category ?? "",
        amount_cents: BigInt(s.amount_cents),
        markup_fee_cents: BigInt(s.markup_fee_cents),
        total_cents: BigInt(s.amount_cents) + BigInt(s.markup_fee_cents),
    }));

    // Calculate totals using BigInt
    const totals = transactions.reduce(
        (acc, tx) => ({
            spend: acc.spend + tx.amount_cents,
            markup: acc.markup + tx.markup_fee_cents,
            total: acc.total + tx.total_cents,
        }),
        { spend: 0n, markup: 0n, total: 0n }
    );

    return NextResponse.json({
        client: {
            id: client.id,
            name: client.name,
        },
        period,
        transactions: transactions.map(tx => ({
            ...tx,
            amount_cents: tx.amount_cents.toString(),
            markup_fee_cents: tx.markup_fee_cents.toString(),
            total_cents: tx.total_cents.toString(),
        })),
        totals: {
            spend: totals.spend.toString(),
            markup: totals.markup.toString(),
            total: totals.total.toString(),
        },
        transaction_count: transactions.length,
    });
    } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        await logAuditError({
            action: "billing_statement",
            resourceType: "api",
            error,
            userId: user?.id,
        });
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
