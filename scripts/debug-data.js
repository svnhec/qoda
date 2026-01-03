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
// Use Service Role Key to bypass RLS for debugging
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
    console.error("Missing Supabase Service Role Key - cannot debug RLS issues effectively.");
    process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
    console.log("--- DEBUGGING DATA STATE ---");

    // 1. Check Users
    const { data: { users }, error: uErr } = await supabase.auth.admin.listUsers();
    if (uErr) console.error("List Users Error:", uErr.message);
    else {
        console.log(`Total Auth Users: ${users.length}`);
        users.forEach(u => console.log(` - User: ${u.email} (ID: ${u.id})`));
    }

    // 2. Check Organizations
    const { data: orgs, error: oErr } = await supabase.from("organizations").select("*");
    if (oErr) console.error("List Orgs Error:", oErr.message);
    else {
        console.log(`Total Organizations: ${orgs.length}`);
        orgs.forEach(o => console.log(` - Org: ${o.name} (ID: ${o.id})`));
    }

    // 3. Check Memberships
    const { data: members, error: mErr } = await supabase.from("organization_members").select("*");
    if (mErr) console.error("List Members Error:", mErr.message);
    else {
        console.log(`Total Memberships: ${members.length}`);
        members.forEach(m => console.log(` - User ${m.user_id} -> Org ${m.organization_id}`));
    }
}

main();
