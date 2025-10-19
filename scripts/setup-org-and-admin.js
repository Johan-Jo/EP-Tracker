// Create organization and add user as admin
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
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupOrgAndAdmin() {
  const email = 'oi@johan.com.br';
  const orgName = 'EP Tracker Organization';
  
  console.log(`🚀 Setting up organization and admin...\n`);
  
  // Get user
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('email', email)
    .single();
  
  if (profileError || !profile) {
    console.error('❌ User not found:', profileError?.message);
    return;
  }
  
  console.log(`✅ User: ${profile.full_name} (${profile.email})`);
  
  // Create organization
  console.log(`\n🏢 Creating organization: ${orgName}`);
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: orgName
    })
    .select()
    .single();
  
  if (orgError) {
    console.error('❌ Failed to create organization:', orgError.message);
    return;
  }
  
  console.log(`✅ Organization created: ${org.name}`);
  console.log(`   ID: ${org.id}`);
  
  // Create admin membership
  console.log(`\n👤 Adding user as admin...`);
  const { error: membershipError } = await supabase
    .from('memberships')
    .insert({
      org_id: org.id,
      user_id: profile.id,
      role: 'admin',
      is_active: true,
      hourly_rate_sek: 250.00 // Default rate
    });
  
  if (membershipError) {
    console.error('❌ Failed to create membership:', membershipError.message);
    return;
  }
  
  console.log(`✅ Admin membership created!`);
  console.log(`   Role: admin`);
  console.log(`   Hourly rate: 250.00 SEK`);
  
  console.log(`\n🎉 Setup complete!`);
  console.log(`\n📋 Summary:`);
  console.log(`   • Organization: ${org.name}`);
  console.log(`   • Admin user: ${profile.full_name} (${profile.email})`);
  console.log(`   • Role: admin`);
  console.log(`\n✨ Refresh your browser to see the changes!`);
}

setupOrgAndAdmin().catch(console.error);

