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
    console.error("Missing Supabase service role credentials");
    process.exit(1);
}

const supabase = createClient(url, key);

async function applyMigration(migrationFile) {
    console.log(`Applying migration: ${migrationFile}`);
    const sql = fs.readFileSync(path.join(__dirname, '../supabase/migrations', migrationFile), 'utf8');

    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
        console.error(`Failed to apply ${migrationFile}:`, error);
        throw error;
    }

    console.log(`✓ ${migrationFile} applied successfully`);
}

async function main() {
    try {
        console.log("Applying database fixes...");

        // Apply the new migrations in order
        await applyMigration('018_fix_balance_column.sql');
        await applyMigration('019_fix_rls_security.sql');

        console.log("All migrations applied successfully!");

        // Test that the balance column exists
        console.log("Testing balance column...");
        const { data, error } = await supabase
            .from('organizations')
            .select('issuing_balance_cents')
            .limit(1);

        if (error) {
            console.error("Balance column test failed:", error);
        } else {
            console.log("✓ Balance column exists and is accessible");
        }

    } catch (error) {
        console.error("Migration process failed:", error);
        process.exit(1);
    }
}

main();
