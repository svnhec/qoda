/**
 * CRUD /api/webhooks/user
 * =============================================================================
 * User-defined webhook management for custom integrations.
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";
import crypto from "crypto";

// Create webhook schema
const CreateWebhookSchema = z.object({
    name: z.string().min(1).max(100),
    url: z.string().url(),
    events: z.array(z.enum([
        "transaction.created",
        "transaction.settled",
        "agent.status_changed",
        "agent.budget_exceeded",
        "card.issued",
        "card.declined",
    ])).min(1),
});

// GET: List all webhooks for the organization
export async function GET() {
    const supabase = await createClient();

    // Get current user and their organization
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
        .from("user_profiles")
        .select("default_organization_id")
        .eq("id", user.id)
        .single();

    if (!profile?.default_organization_id) {
        return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const serviceClient = createServiceClient();
    const { data: webhooks, error } = await serviceClient
        .from("user_webhooks")
        .select("id, name, url, events, is_active, last_triggered_at, last_status_code, failure_count, created_at")
        .eq("organization_id", profile.default_organization_id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Failed to fetch webhooks:", error);
        return NextResponse.json({ error: "Failed to fetch webhooks" }, { status: 500 });
    }

    return NextResponse.json({ webhooks });
}

// POST: Create a new webhook
export async function POST(request: NextRequest) {
    try {
        const supabase = await createClient();

        // Get current user and their organization
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from("user_profiles")
            .select("default_organization_id")
            .eq("id", user.id)
            .single();

        if (!profile?.default_organization_id) {
            return NextResponse.json({ error: "No organization" }, { status: 400 });
        }

        const body = await request.json();
        const parsed = CreateWebhookSchema.parse(body);

        // Generate a secret for webhook signing
        const secret = `whsec_${crypto.randomBytes(24).toString("hex")}`;

        const serviceClient = createServiceClient();
        const { data: webhook, error } = await serviceClient
            .from("user_webhooks")
            .insert({
                organization_id: profile.default_organization_id,
                name: parsed.name,
                url: parsed.url,
                events: parsed.events,
                secret,
            })
            .select("id, name, url, events, is_active, created_at")
            .single();

        if (error) {
            console.error("Failed to create webhook:", error);
            return NextResponse.json({ error: "Failed to create webhook" }, { status: 500 });
        }

        // Return webhook with secret (only shown once!)
        return NextResponse.json({
            webhook: {
                ...webhook,
                secret, // Only returned on creation
            },
        }, { status: 201 });
    } catch (err) {
        if (err instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Invalid request body", details: err.errors },
                { status: 400 }
            );
        }

        console.error("Webhook creation error:", err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE: Delete a webhook
export async function DELETE(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get("id");

    if (!webhookId) {
        return NextResponse.json({ error: "Webhook ID required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Get current user and their organization
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
        .from("user_profiles")
        .select("default_organization_id")
        .eq("id", user.id)
        .single();

    if (!profile?.default_organization_id) {
        return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const serviceClient = createServiceClient();
    const { error } = await serviceClient
        .from("user_webhooks")
        .delete()
        .eq("id", webhookId)
        .eq("organization_id", profile.default_organization_id);

    if (error) {
        console.error("Failed to delete webhook:", error);
        return NextResponse.json({ error: "Failed to delete webhook" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
