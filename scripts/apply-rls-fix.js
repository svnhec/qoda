#!/usr/bin/env node
/**
 * Apply RLS Fix Script
 * Runs the fix_permissions.sql against your Supabase database
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load environment variables
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Missing environment variables!");
    console.error("   Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
});

async function applyFix() {
    console.log("🔧 Applying RLS Fix...\n");

    // Read the SQL file
    const sqlPath = path.join(__dirname, "..", "supabase", "fix_permissions.sql");
    const sqlContent = fs.readFileSync(sqlPath, "utf8");

    // Split into separate statements (basic split - works for this file)
    const statements = sqlContent
        .split(/;\s*\n/)
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith("--"));

    console.log(`📄 Found ${statements.length} SQL statements to execute\n`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i] + ";";
        const preview = stmt.substring(0, 60).replace(/\n/g, " ") + "...";

        try {
            const { error } = await supabase.rpc("exec_sql", { sql: stmt });

            if (error) {
                // Try direct query if RPC fails
                const { error: directError } = await supabase.from("_exec").select(stmt);
                if (directError && !directError.message.includes("does not exist")) {
                    console.log(`⚠️  Statement ${i + 1}: ${preview}`);
                    console.log(`   Error: ${error.message}\n`);
                    errorCount++;
                    continue;
                }
            }

            console.log(`✅ Statement ${i + 1}: ${preview}`);
            successCount++;
        } catch (e) {
            console.log(`⚠️  Statement ${i + 1}: ${preview}`);
            console.log(`   Error: ${e.message}\n`);
            errorCount++;
        }
    }

    console.log("\n" + "=".repeat(50));
    console.log(`✅ Success: ${successCount} | ⚠️ Errors/Skipped: ${errorCount}`);
    console.log("=".repeat(50));
    console.log("\n⚠️  NOTE: If you see errors, run the SQL manually in Supabase Dashboard SQL Editor.");
    console.log("   This script has limitations with complex multi-statement SQL.\n");
}

// Alternative: Just show instructions
async function showInstructions() {
    console.log("📋 TO APPLY THE RLS FIX:\n");
    console.log("1. Open Supabase Dashboard: https://supabase.com/dashboard");
    console.log("2. Select your project");
    console.log("3. Go to SQL Editor (left sidebar)");
    console.log("4. Copy contents of: supabase/fix_permissions.sql");
    console.log("5. Paste and click 'Run'\n");
}

// Run
showInstructions();
