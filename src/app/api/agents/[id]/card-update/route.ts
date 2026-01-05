/**
 * UPDATE CARD STATUS & LIMITS
 * =============================================================================
 * Handles freezing/unfreezing cards and updating spend limits.
 * Integrates with Stripe Issuing.
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

// Mock stripe instance for now - replace with real import constant when configured
const ENABLE_STRIPE_ISSUING = process.env.ENABLE_STRIPE_ISSUING === 'true';

// Zod schema for card update requests
const CardUpdateSchema = z.object({
  action: z.enum(['set_status', 'set_limit']),
  value: z.union([
    z.enum(['active', 'inactive']), // for set_status
    z.number().int().positive().max(10000000) // for set_limit (max $100k)
  ])
}).refine((data) => {
  // Additional validation: ensure value type matches action
  if (data.action === 'set_status') {
    return typeof data.value === 'string' && (data.value === 'active' || data.value === 'inactive');
  } else if (data.action === 'set_limit') {
    return typeof data.value === 'number' && data.value > 0;
  }
  return false;
}, {
  message: "Value type must match action type"
});

export async function POST(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const { id: agentId } = params;

    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const body = await request.json();
        const validation = CardUpdateSchema.safeParse(body);
        if (!validation.success) {
            return NextResponse.json({
                error: "Invalid input",
                details: validation.error.errors
            }, { status: 400 });
        }

        const { action, value } = validation.data;

        const { data: profile } = await supabase
            .from("user_profiles")
            .select("default_organization_id")
            .eq("id", user.id)
            .single();

        if (!profile?.default_organization_id) {
            return NextResponse.json({ error: "No organization" }, { status: 400 });
        }

        // Get Agent
        const { data: agent } = await supabase
            .from("agents")
            .select("*")
            .eq("id", agentId)
            .eq("organization_id", profile.default_organization_id)
            .single();

        if (!agent) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

        // Logic
        if (action === 'set_status') {
            const newStatus = value === 'active' ? 'active' : 'inactive';

            // 1. Update Stripe if real
            if (ENABLE_STRIPE_ISSUING && agent.stripe_card_id) {
                const { updateCardStatus } = await import("@/lib/issuing");
                await updateCardStatus(agent.stripe_card_id, newStatus);
            }

            // 2. Update DB
            const { error } = await supabase
                .from("agents")
                .update({ card_status: newStatus })
                .eq("id", agentId);

            if (error) throw error;
        }
        else if (action === 'set_limit') {
            const limitCents = Number(value);

            // 1. Update Stripe if real
            if (ENABLE_STRIPE_ISSUING && agent.stripe_card_id) {
                const { updateCardLimit } = await import("@/lib/issuing");
                await updateCardLimit(agent.stripe_card_id, limitCents);
            }

            // 2. Update DB
            const { error } = await supabase
                .from("agents")
                .update({ daily_limit_cents: limitCents })
                .eq("id", agentId);

            if (error) throw error;
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("Update card error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
