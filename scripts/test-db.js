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
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(url, key);

async function main() {
    console.log("Checking Clients Table...");

    // Check Clients
    const { data: clients, error } = await supabase.from("clients").select("*");
    if (error) {
        console.error("Error fetching clients:", error.message);
    } else {
        console.log(`Found ${clients.length} clients.`);
        if (clients.length > 0) {
            console.log("Client 1 Org ID:", clients[0].organization_id);
            console.log("Client 1 Name:", clients[0].name);
        } else {
            console.log("No clients found. The page should show 'No clients found'.");
        }
    }

    // Check Agents
    const { data: agents, error: aErr } = await supabase.from("agents").select("id, client_id");
    if (aErr) console.error("Error fetching agents:", aErr.message);
    else console.log(`Found ${agents.length} agents.`);
}

main();
