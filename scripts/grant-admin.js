// Grant admin privileges to oi@johan.com.br
// Run with: node scripts/grant-admin.js

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local file
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!');
  console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function grantAdminPrivileges() {
  const email = 'oi@johan.com.br';
  
  console.log(`🔍 Looking up user: ${email}`);
  
  // Get user ID
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('email', email)
    .single();
  
  if (profileError || !profile) {
    console.error('❌ User not found:', profileError?.message || 'No profile found');
    return;
  }
  
  console.log(`✅ Found user: ${profile.full_name || email} (${profile.id})`);
  
  // Update membership to admin
  const { data: memberships, error: updateError } = await supabase
    .from('memberships')
    .update({ 
      role: 'admin',
      updated_at: new Date().toISOString()
    })
    .eq('user_id', profile.id)
    .eq('is_active', true)
    .select();
  
  if (updateError) {
    console.error('❌ Failed to update role:', updateError.message);
    return;
  }
  
  if (!memberships || memberships.length === 0) {
    console.error('❌ No active memberships found for this user');
    return;
  }
  
  console.log('✅ Successfully granted admin privileges!');
  console.log(`   Updated ${memberships.length} membership(s)`);
  console.log(`   New Role: admin`);
  console.log('\n🎉 User is now an admin! Refresh the browser to see changes.');
}

grantAdminPrivileges().catch(console.error);
