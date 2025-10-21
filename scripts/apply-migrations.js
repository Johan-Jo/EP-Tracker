#!/usr/bin/env node
/**
 * Apply Super Admin Migrations
 * Run this with: node scripts/apply-migrations.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  console.log('\n🚀 EP Tracker - Super Admin Migrations Setup\n');
  console.log('This script will help you run the Phase 2 database migrations.\n');
  
  // Read the migration files
  const schemaFile = path.join(__dirname, '../supabase/migrations/20241020000009_super_admin_billing_schema_safe.sql');
  const seedFile = path.join(__dirname, '../supabase/migrations/20241021000000_pricing_plans_seed.sql');
  
  if (!fs.existsSync(schemaFile)) {
    console.error('❌ Schema migration file not found!');
    console.error(`   Expected: ${schemaFile}`);
    process.exit(1);
  }
  
  if (!fs.existsSync(seedFile)) {
    console.error('❌ Seed data file not found!');
    console.error(`   Expected: ${seedFile}`);
    process.exit(1);
  }
  
  console.log('✅ Migration files found:\n');
  console.log('   1. Schema & Tables (safe version)');
  console.log('   2. Pricing Plans Seed Data\n');
  
  console.log('📋 INSTRUCTIONS:\n');
  console.log('Since we need to run these against your remote Supabase project,');
  console.log('the easiest way is to copy-paste them in Supabase SQL Editor.\n');
  
  const proceed = await question('Would you like to open the files? (y/n): ');
  
  if (proceed.toLowerCase() !== 'y') {
    console.log('\n👍 No problem! You can run them manually later.');
    rl.close();
    return;
  }
  
  console.log('\n📂 Opening migration files...\n');
  
  // On Windows, use 'start' to open with default editor
  const { exec } = require('child_process');
  
  exec(`start "" "${schemaFile}"`, (err) => {
    if (err) console.error('Could not open schema file:', err.message);
    else console.log('✅ Opened: Schema migration');
  });
  
  setTimeout(() => {
    exec(`start "" "${seedFile}"`, (err) => {
      if (err) console.error('Could not open seed file:', err.message);
      else console.log('✅ Opened: Seed data migration');
    });
  }, 1000);
  
  console.log('\n📝 NEXT STEPS:\n');
  console.log('1. Go to: https://supabase.com/dashboard');
  console.log('2. Select your project');
  console.log('3. Click "SQL Editor" in the sidebar');
  console.log('4. Click "New Query"');
  console.log('5. Copy the contents of the SCHEMA file (first file opened)');
  console.log('6. Paste into SQL Editor and click "Run"');
  console.log('7. Create another new query');
  console.log('8. Copy the contents of the SEED DATA file (second file)');
  console.log('9. Paste and click "Run"\n');
  
  console.log('✅ Both migrations should complete successfully!\n');
  
  rl.close();
}

main().catch(err => {
  console.error('\n❌ Error:', err);
  rl.close();
  process.exit(1);
});

