// Change password for user mkmatte@gmail.com to Nellie1234
// Run with: node scripts/change-password.js

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

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function changePassword() {
  const email = 'mkmatte@gmail.com';
  const newPassword = 'Nellie1234';
  
  console.log(`🔍 Looking up user: ${email}`);
  
  // Find user by email using auth admin API
  const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('❌ Error fetching users:', listError.message);
    return;
  }
  
  const user = usersData.users.find(u => u.email === email);
  
  if (!user) {
    console.error(`❌ User not found with email: ${email}`);
    return;
  }
  
  console.log(`✅ Found user: ${user.email} (ID: ${user.id})`);
  
  // Update password using admin API
  console.log(`\n🔐 Updating password...`);
  const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
    user.id,
    {
      password: newPassword,
    }
  );
  
  if (updateError) {
    console.error('❌ Failed to update password:', updateError.message);
    return;
  }
  
  console.log('✅ Password updated successfully!');
  console.log(`   Email: ${email}`);
  console.log(`   New password: ${newPassword}`);
  console.log('\n🎉 User can now log in with the new password.');
}

changePassword().catch(console.error);




