const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
});

async function applyMigration(migrationFile) {
    console.log(`Applying migration: ${migrationFile}`);
    const sql = fs.readFileSync(path.join(__dirname, '../supabase/migrations', migrationFile), 'utf8');
    await client.query(sql);
    console.log(`✓ ${migrationFile} applied successfully`);
}

async function run() {
    try {
        console.log('Connecting to database...');
        await client.connect();

        // Apply the new migrations in order
        await applyMigration('018_fix_balance_column.sql');
        await applyMigration('019_fix_rls_security.sql');

        console.log('All new migrations applied successfully!');
        await client.end();
    } catch (e) {
        console.error('Migration failed:', e);
        process.exit(1);
    }
}

run();
