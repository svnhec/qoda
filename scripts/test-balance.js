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

async function testBalanceFunctions() {
    try {
        console.log("Testing balance functions...");

        // First, let's check if the issuing_balance_cents column exists
        console.log("Checking if balance column exists...");
        const { data: columnCheck, error: columnError } = await supabase
            .from('information_schema.columns')
            .select('column_name')
            .eq('table_name', 'organizations')
            .eq('column_name', 'issuing_balance_cents');

        if (columnError || !columnCheck || columnCheck.length === 0) {
            console.log("Balance column doesn't exist. Adding it manually...");

            // Try to add the column
            const { error: alterError } = await supabase.rpc('exec_sql', {
                sql_query: `
                    ALTER TABLE organizations
                    ADD COLUMN IF NOT EXISTS issuing_balance_cents TEXT NOT NULL DEFAULT '0'
                    CHECK (issuing_balance_cents ~ '^-?[0-9]+$')
                `
            });

            if (alterError) {
                console.error("Failed to add balance column:", alterError);
                console.log("You may need to apply the migrations manually");
                return;
            }

            console.log("✓ Balance column added successfully");
        } else {
            console.log("✓ Balance column exists");
        }

        // Get an organization to test with
        const { data: orgs, error: orgError } = await supabase
            .from('organizations')
            .select('id, name, issuing_balance_cents')
            .limit(1);

        if (orgError || !orgs || orgs.length === 0) {
            console.error("No organizations found to test with");
            return;
        }

        const testOrg = orgs[0];
        console.log(`Testing with organization: ${testOrg.name} (${testOrg.id})`);
        console.log(`Current balance: ${testOrg.issuing_balance_cents} cents`);

        // Test adding funds
        console.log("Testing addOrganizationFunds...");
        const { addOrganizationFunds } = require('../src/lib/balance.ts');
        const addResult = await addOrganizationFunds(testOrg.id, 10000n); // Add $100

        if (addResult.success) {
            console.log(`✓ Successfully added funds. New balance: ${addResult.newBalance} cents`);
        } else {
            console.error("✗ Failed to add funds:", addResult.error);
        }

        // Test getting balance
        console.log("Testing getOrganizationBalance...");
        const { getOrganizationBalance } = require('../src/lib/balance.ts');
        const balanceResult = await getOrganizationBalance(testOrg.id);

        if (balanceResult.success) {
            console.log(`✓ Current balance: ${balanceResult.balance} cents`);
        } else {
            console.error("✗ Failed to get balance:", balanceResult.error);
        }

        // Test deducting funds
        console.log("Testing deductOrganizationFunds...");
        const { deductOrganizationFunds } = require('../src/lib/balance.ts');
        const deductResult = await deductOrganizationFunds(testOrg.id, 5000n); // Deduct $50

        if (deductResult.success) {
            console.log(`✓ Successfully deducted funds. New balance: ${deductResult.newBalance} cents`);
        } else {
            console.error("✗ Failed to deduct funds:", deductResult.error);
        }

        console.log("Balance function tests completed!");

    } catch (error) {
        console.error("Test failed:", error);
    }
}

testBalanceFunctions();
