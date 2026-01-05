/**
 * INVOICE DETAIL PAGE
 * =============================================================================
 * Full invoice view with:
 * - Transaction breakdown
 * - Markup calculations
 * - Edit/exclude transactions
 * - Send/download actions
 * =============================================================================
 */

import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { InvoiceDetailView } from "@/components/dashboard/billing/invoice-detail-view";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Invoice Details | Qoda",
};

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function InvoiceDetailPage({ params }: PageProps) {
    const { id: invoiceId } = await params;
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect(`/auth/login?redirect=/dashboard/billing/${invoiceId}`);

    const { data: profile } = await supabase
        .from("user_profiles")
        .select("default_organization_id")
        .eq("id", user.id)
        .single();

    if (!profile?.default_organization_id) redirect("/dashboard?error=no_organization");

    // Fetch invoice with client info
    const { data: invoice, error } = await supabase
        .from("invoices")
        .select(`
            *,
            clients:client_id (
                id,
                name,
                contact_email,
                markup_percentage
            )
        `)
        .eq("id", invoiceId)
        .eq("organization_id", profile.default_organization_id)
        .single();

    if (error || !invoice) notFound();

    // Fetch transactions for this invoice period
    const { data: transactions } = await supabase
        .from("transaction_settlements")
        .select(`
            id,
            amount_cents,
            merchant_name,
            merchant_category,
            status,
            created_at,
            agents:agent_id (name)
        `)
        .eq("client_id", invoice.client_id)
        .gte("created_at", invoice.period_start)
        .lte("created_at", invoice.period_end)
        .order("created_at", { ascending: false });

    return (
        <InvoiceDetailView
            invoice={invoice as any}
            transactions={(transactions || []) as any}
        />
    );
}
