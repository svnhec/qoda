const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
    connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
});

async function run() {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Reading migration file...');
    const sql = fs.readFileSync(path.join(__dirname, '../supabase/migrations/015_fix_org_permissions.sql'), 'utf8');
    console.log('Executing SQL...');
    await client.query(sql);
    console.log('Migration applied successfully.');
    await client.end();
}

run().catch(e => {
    console.error('Migration failed:', e);
    process.exit(1);
});
