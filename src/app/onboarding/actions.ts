'use server'

import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function createOrganizationAction(orgName: string, userId: string) {
    try {
        // 1. Verify Authentication (Security Check)
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return { error: "Unauthorized: Please log in again." };
        }

        if (user.id !== userId) {
            return { error: "Unauthorized: User ID mismatch." };
        }

        // 2. Use Service Role to Create Org (Bypassing RLS)
        const adminClient = createServiceClient();
        const slug = orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 50);

        // Check availability
        const { data: existing } = await adminClient
            .from("organizations")
            .select("id")
            .eq("slug", slug)
            .single();

        if (existing) {
            return { error: "That agency name is already taken. Please try another." };
        }

        // Create Organization
        const { data: org, error: orgError } = await adminClient
            .from("organizations")
            .insert({ name: orgName, slug })
            .select()
            .single();

        if (orgError) {
            console.error("Org Creation Error:", orgError);
            return { error: orgError.message };
        }

        // 3. Add Member as Owner
        const { error: memberError } = await adminClient.from("org_members").insert({
            organization_id: org.id,
            user_id: userId,
            role: "owner",
            accepted_at: new Date().toISOString() // Auto-accept since they created it
        });

        if (memberError) {
            console.error("Member Creation Error:", memberError);
            // Try to cleanup
            await adminClient.from("organizations").delete().eq("id", org.id);
            return { error: "Failed to set up membership: " + memberError.message };
        }

        // 4. Set Default Org
        // We use admin client here because user_profiles might arguably have strict RLS too? 
        // Usually users can update their own profile, but let's be safe.
        await adminClient
            .from("user_profiles")
            .update({ default_organization_id: org.id })
            .eq("id", userId);

        return { data: org };

    } catch (e) {
        console.error("Server Action Exception:", e);
        return { error: "Internal Server Error" };
    }
}
