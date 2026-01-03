/**
 * SEND INVOICE API
 * =============================================================================
 * Emails the invoice to the client.
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
    _request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const { id: invoiceId } = params;

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: profile } = await supabase
            .from("user_profiles")
            .select("default_organization_id")
            .eq("id", user.id)
            .single();

        // Validate Ownership
        const { data: invoice } = await supabase
            .from("invoices")
            .select("*, clients(contact_email, name)")
            .eq("id", invoiceId)
            .eq("organization_id", profile?.default_organization_id)
            .single();

        if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });

        // Logic to send email (Mock for MVP)
        console.log(`[MOCK EMAIL] Sending Invoice ${invoiceId} to ${invoice.clients?.contact_email}`);

        // Update status
        await supabase
            .from("invoices")
            .update({
                status: 'sent',
                sent_at: new Date().toISOString()
            })
            .eq("id", invoiceId);

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Send invoice error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
