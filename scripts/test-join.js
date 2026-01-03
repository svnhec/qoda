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
// Use Anon Key to simulate client-side/server-side auth context if possible, 
// but here we might need to assume the role. 
// For reproduction, let's use Service Role to rule out RLS first, then test structure.
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(url, key);

async function main() {
    const orgId = "a36ad33b-ff55-4d8b-8128-7ede20b982bd";

    console.log("Testing join query...");

    const { data, error } = await supabase
        .from("clients")
        .select(`
            *,
            agents (
                 id,
                current_spend_cents,
                is_active
            )
        `)
        .eq("organization_id", orgId);

    if (error) {
        console.error("Query failed:");
        console.error(JSON.stringify(error, null, 2));
    } else {
        console.log("Query success!");
        console.log(`Found ${data.length} clients`);
        if (data.length > 0) {
            console.log("First client agents:", data[0].agents);
        }
    }
}

main();
