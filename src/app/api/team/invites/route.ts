/**
 * Team Invites API
 * =============================================================================
 * Manage team member invitations.
 * =============================================================================
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import { z } from "zod";
import { sendTeamInviteEmail } from "@/lib/email";
import { logger } from "@/lib/logger";

// Create invite schema
const CreateInviteSchema = z.object({
    email: z.string().email(),
    role: z.enum(["member", "admin"]).default("member"),
});

// GET: List pending invites for the organization
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

    // Check if user is admin
    const { data: membership } = await supabase
        .from("org_members")
        .select("role")
        .eq("organization_id", profile.default_organization_id)
        .eq("user_id", user.id)
        .single();

    if (!membership || !["admin", "owner"].includes(membership.role)) {
        return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const serviceClient = createServiceClient();
    const { data: invites, error } = await serviceClient
        .from("team_invites")
        .select("id, email, role, status, expires_at, created_at")
        .eq("organization_id", profile.default_organization_id)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

    if (error) {
        logger.error("Failed to fetch team invites", { error: error.message });
        return NextResponse.json({ error: "Failed to fetch invites" }, { status: 500 });
    }

    return NextResponse.json({ invites });
}

// POST: Create a new invite
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

        // Check if user is admin
        const { data: membership } = await supabase
            .from("org_members")
            .select("role")
            .eq("organization_id", profile.default_organization_id)
            .eq("user_id", user.id)
            .single();

        if (!membership || !["admin", "owner"].includes(membership.role)) {
            return NextResponse.json({ error: "Admin access required" }, { status: 403 });
        }

        const body = await request.json();
        const parsed = CreateInviteSchema.parse(body);

        const serviceClient = createServiceClient();

        // Check if invite already exists
        const { data: existingInvite } = await serviceClient
            .from("team_invites")
            .select("id")
            .eq("organization_id", profile.default_organization_id)
            .eq("email", parsed.email.toLowerCase())
            .eq("status", "pending")
            .single();

        if (existingInvite) {
            return NextResponse.json(
                { error: "Invite already pending for this email" },
                { status: 409 }
            );
        }

        // Check if user is already a member
        const { data: existingUser } = await serviceClient
            .from("user_profiles")
            .select("id")
            .eq("email", parsed.email.toLowerCase())
            .single();

        if (existingUser) {
            const { data: existingMembership } = await serviceClient
                .from("org_members")
                .select("id")
                .eq("organization_id", profile.default_organization_id)
                .eq("user_id", existingUser.id)
                .single();

            if (existingMembership) {
                return NextResponse.json(
                    { error: "User is already a member" },
                    { status: 409 }
                );
            }
        }

        const { data: invite, error } = await serviceClient
            .from("team_invites")
            .insert({
                organization_id: profile.default_organization_id,
                email: parsed.email.toLowerCase(),
                role: parsed.role,
                invited_by: user.id,
            })
            .select("id, email, role, expires_at, created_at")
            .single();

        if (error) {
            logger.error("Failed to create team invite", { error: error.message, email: parsed.email });
            return NextResponse.json({ error: "Failed to create invite" }, { status: 500 });
        }

        // Send invite email
        try {
            // Get organization name and inviter details
            const { data: org } = await serviceClient
                .from("organizations")
                .select("name")
                .eq("id", profile.default_organization_id)
                .single();

            const { data: inviter } = await serviceClient
                .from("user_profiles")
                .select("full_name, email")
                .eq("id", user.id)
                .single();

            if (org && inviter) {
                const acceptUrl = `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/team/invites/accept?token=${invite.id}`;

                await sendTeamInviteEmail({
                    inviteId: invite.id,
                    email: invite.email,
                    organizationName: org.name,
                    invitedByName: inviter.full_name || inviter.email || "Team Member",
                    role: invite.role,
                    acceptUrl,
                    expiresAt: invite.expires_at,
                });
            }
        } catch (emailError) {
            logger.error("Failed to send team invite email", {
                error: emailError instanceof Error ? emailError.message : String(emailError),
                inviteId: invite.id,
                email: invite.email
            });
            // Don't fail the invite creation if email fails
        }

        return NextResponse.json({ invite }, { status: 201 });
    } catch (err) {
        if (err instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Invalid request body", details: err.errors },
                { status: 400 }
            );
        }

        logger.error("Team invite creation error", {
            error: err instanceof Error ? err.message : String(err)
        });
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

// DELETE: Revoke an invite
export async function DELETE(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const inviteId = searchParams.get("id");

    if (!inviteId) {
        return NextResponse.json({ error: "Invite ID required" }, { status: 400 });
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

    // Check if user is admin
    const { data: membership } = await supabase
        .from("org_members")
        .select("role")
        .eq("organization_id", profile.default_organization_id)
        .eq("user_id", user.id)
        .single();

    if (!membership || !["admin", "owner"].includes(membership.role)) {
        return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const serviceClient = createServiceClient();
    const { error } = await serviceClient
        .from("team_invites")
        .update({ status: "revoked" })
        .eq("id", inviteId)
        .eq("organization_id", profile.default_organization_id);

    if (error) {
        logger.error("Failed to revoke team invite", { error: error.message, inviteId });
        return NextResponse.json({ error: "Failed to revoke invite" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
