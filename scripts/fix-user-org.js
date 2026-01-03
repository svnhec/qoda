const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load .env.local
try {
    const envPath = path.resolve(process.cwd(), ".env.local");
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach(line => {
        const parts = line.split("=");
        if (parts.length >= 2) {
            const key = parts[0].trim();
            const val = parts.slice(1).join("=").trim().replace(/"/g, "");
            process.env[key] = val;
        }
    });
} catch (e) {
    console.log("No .env.local found or error reading it");
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error("Missing Supabase Service Role Key");
    process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
    const userId = "f738c655-f3c3-4ac6-8c25-180564ee5837"; // From previous debug output
    const orgId = "a36ad33b-ff55-4d8b-8128-7ede20b982bd";   // Stark Tech

    console.log(`Fixing membership for user ${userId} -> org ${orgId}...`);

    // 1. Update User Profile Default Org
    const { error: profileError } = await supabase
        .from("user_profiles")
        .update({ default_organization_id: orgId })
        .eq("id", userId);

    if (profileError) console.error("Profile Update Failed:", profileError);
    else console.log("Profile updated with default_organization_id");

    // 2. Ensure Membership Exists in org_members
    const { error: memberError } = await supabase
        .from("org_members")
        .upsert({
            organization_id: orgId,
            user_id: userId,
            role: "owner",
            accepted_at: new Date().toISOString()
        }, { onConflict: "organization_id,user_id" });

    if (memberError) console.error("Membership Upsert Failed:", memberError);
    else console.log("Membership confirmed in org_members");
}

main();
