#!/usr/bin/env node
/**
 * Grant Super Admin Privileges
 * 
 * Usage: node scripts/grant-super-admin.js <email>
 * Example: node scripts/grant-super-admin.js admin@example.com
 * 
 * This script grants super admin privileges to a user by their email.
 */

const { createClient } = require('@supabase/supabase-js');

async function grantSuperAdmin(email) {
  // Check for environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('\n❌ Missing Supabase credentials');
    console.error('Required environment variables:');
    console.error('  - NEXT_PUBLIC_SUPABASE_URL');
    console.error('  - SUPABASE_SERVICE_ROLE_KEY');
    console.error('\nMake sure these are set in your .env.local file\n');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('\n🔍 Looking up user...');

  // Find user by email
  const { data: users, error: userError } = await supabase.auth.admin.listUsers();

  if (userError) {
    console.error('❌ Error fetching users:', userError.message);
    process.exit(1);
  }

  const user = users.users.find(u => u.email === email);

  if (!user) {
    console.error(`❌ User not found with email: ${email}`);
    console.error('Available users:');
    users.users.forEach(u => console.error(`  - ${u.email}`));
    process.exit(1);
  }

  console.log(`✅ Found user: ${user.email} (ID: ${user.id})\n`);

  // Check if already super admin
  const { data: existing, error: checkError } = await supabase
    .from('super_admins')
    .select('id, revoked_at')
    .eq('user_id', user.id)
    .maybeSingle();

  if (checkError) {
    console.error('❌ Error checking existing super admin:', checkError.message);
    process.exit(1);
  }

  if (existing && !existing.revoked_at) {
    console.log('⚠️  User is already a super admin!');
    console.log('Nothing to do.\n');
    process.exit(0);
  }

  if (existing && existing.revoked_at) {
    console.log('🔄 User was previously a super admin (revoked)');
    console.log('   Un-revoking super admin privileges...\n');

    const { error: updateError } = await supabase
      .from('super_admins')
      .update({ revoked_at: null })
      .eq('id', existing.id);

    if (updateError) {
      console.error('❌ Error un-revoking super admin:', updateError.message);
      process.exit(1);
    }
  } else {
    console.log('✨ Granting super admin privileges...\n');

    const { error: insertError } = await supabase
      .from('super_admins')
      .insert({
        user_id: user.id,
        granted_by: user.id, // Self-granted for first admin
      });

    if (insertError) {
      console.error('❌ Error granting super admin:', insertError.message);
      process.exit(1);
    }
  }

  console.log('✅ Success! Super admin privileges granted to:', email);
  console.log('\n📝 Next steps:');
  console.log('   1. Log in with this account');
  console.log('   2. Navigate to: /super-admin');
  console.log('   3. You should see the Super Admin dashboard\n');
}

// Main
const email = process.argv[2];

if (!email) {
  console.error('\n❌ Usage: node scripts/grant-super-admin.js <email>');
  console.error('Example: node scripts/grant-super-admin.js admin@example.com\n');
  process.exit(1);
}

// Validate email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
if (!emailRegex.test(email)) {
  console.error('\n❌ Invalid email format:', email);
  console.error('Please provide a valid email address\n');
  process.exit(1);
}

grantSuperAdmin(email).catch(err => {
  console.error('\n💥 Unexpected error:', err);
  process.exit(1);
});

