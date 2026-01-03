/**
 * POST /api/team/invites/accept
 * =============================================================================
 * Accept a team invite by token.
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";

const AcceptInviteSchema = z.object({
    token: z.string().min(1),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { token } = AcceptInviteSchema.parse(body);

        const supabase = await createClient();

        // Get current user
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const serviceClient = createServiceClient();

        // Find the invite
        const { data: invite, error: inviteError } = await serviceClient
            .from("team_invites")
            .select("*")
            .eq("token", token)
            .eq("status", "pending")
            .single();

        if (inviteError || !invite) {
            return NextResponse.json(
                { error: "Invalid or expired invite" },
                { status: 400 }
            );
        }

        // Check if invite is expired
        if (new Date(invite.expires_at) < new Date()) {
            await serviceClient
                .from("team_invites")
                .update({ status: "expired" })
                .eq("id", invite.id);

            return NextResponse.json(
                { error: "Invite has expired" },
                { status: 400 }
            );
        }

        // Check if user email matches invite email
        const userEmail = user.email?.toLowerCase();
        if (userEmail !== invite.email.toLowerCase()) {
            return NextResponse.json(
                { error: "This invite was sent to a different email address" },
                { status: 403 }
            );
        }

        // Check if user is already a member
        const { data: existingMember } = await serviceClient
            .from("org_members")
            .select("id")
            .eq("organization_id", invite.organization_id)
            .eq("user_id", user.id)
            .single();

        if (existingMember) {
            // Already a member, just mark invite as accepted
            await serviceClient
                .from("team_invites")
                .update({ status: "accepted", accepted_at: new Date().toISOString() })
                .eq("id", invite.id);

            return NextResponse.json({
                success: true,
                message: "You are already a member of this organization",
                organization_id: invite.organization_id,
            });
        }

        // Add user as member
        const { error: memberError } = await serviceClient
            .from("org_members")
            .insert({
                organization_id: invite.organization_id,
                user_id: user.id,
                role: invite.role,
                invited_by: invite.invited_by,
                accepted_at: new Date().toISOString(),
            });

        if (memberError) {
            console.error("Failed to add member:", memberError);
            return NextResponse.json(
                { error: "Failed to join organization" },
                { status: 500 }
            );
        }

        // Mark invite as accepted
        await serviceClient
            .from("team_invites")
            .update({ status: "accepted", accepted_at: new Date().toISOString() })
            .eq("id", invite.id);

        // Update user's default organization if they don't have one
        const { data: profile } = await serviceClient
            .from("user_profiles")
            .select("default_organization_id")
            .eq("id", user.id)
            .single();

        if (!profile?.default_organization_id) {
            await serviceClient
                .from("user_profiles")
                .update({ default_organization_id: invite.organization_id })
                .eq("id", user.id);
        }

        // Get organization name for response
        const { data: org } = await serviceClient
            .from("organizations")
            .select("name")
            .eq("id", invite.organization_id)
            .single();

        return NextResponse.json({
            success: true,
            message: `Successfully joined ${org?.name || "organization"}`,
            organization_id: invite.organization_id,
        });
    } catch (err) {
        if (err instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Invalid request body", details: err.errors },
                { status: 400 }
            );
        }

        console.error("Accept invite error:", err);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
