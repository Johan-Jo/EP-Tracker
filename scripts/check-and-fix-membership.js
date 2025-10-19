// Check and fix membership for oi@johan.com.br
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

async function checkAndFixMembership() {
  const email = 'oi@johan.com.br';
  
  console.log(`🔍 Checking user: ${email}\n`);
  
  // Get user
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('email', email)
    .single();
  
  if (!profile) {
    console.error('❌ User not found');
    return;
  }
  
  console.log(`✅ User found: ${profile.full_name}`);
  console.log(`   ID: ${profile.id}\n`);
  
  // Check all memberships (including inactive)
  const { data: allMemberships } = await supabase
    .from('memberships')
    .select(`
      id,
      role,
      is_active,
      organizations (id, name)
    `)
    .eq('user_id', profile.id);
  
  console.log(`📋 Existing memberships: ${allMemberships?.length || 0}`);
  if (allMemberships && allMemberships.length > 0) {
    allMemberships.forEach(m => {
      console.log(`   - ${m.organizations?.name}: ${m.role} (${m.is_active ? 'active' : 'inactive'})`);
    });
  }
  
  // Get first organization
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name')
    .limit(1);
  
  if (!orgs || orgs.length === 0) {
    console.error('\n❌ No organizations found in database');
    return;
  }
  
  const org = orgs[0];
  console.log(`\n🏢 Using organization: ${org.name}`);
  
  // Check if membership exists for this org
  const existingMembership = allMemberships?.find(m => m.organizations?.id === org.id);
  
  if (existingMembership) {
    // Update existing membership
    console.log('\n🔄 Updating existing membership...');
    const { error } = await supabase
      .from('memberships')
      .update({
        role: 'admin',
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingMembership.id);
    
    if (error) {
      console.error('❌ Failed to update:', error.message);
      return;
    }
    
    console.log('✅ Updated existing membership to admin!');
  } else {
    // Create new membership
    console.log('\n➕ Creating new membership...');
    const { error } = await supabase
      .from('memberships')
      .insert({
        org_id: org.id,
        user_id: profile.id,
        role: 'admin',
        is_active: true
      });
    
    if (error) {
      console.error('❌ Failed to create:', error.message);
      return;
    }
    
    console.log('✅ Created new admin membership!');
  }
  
  console.log('\n🎉 Done! User is now an admin. Refresh the browser to see changes.');
}

checkAndFixMembership().catch(console.error);

