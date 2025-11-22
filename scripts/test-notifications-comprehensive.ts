// Comprehensive Notification Testing Script
// Tests all notification types with different delivery methods

import fs from 'fs';
import path from 'path';

// Load environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        value = value.replace(/^["']|["']$/g, '');
        process.env[key] = value;
      }
    }
  });
}

import { createAdminClient } from '../lib/supabase/server';
import { sendNotification } from '../lib/notifications';
import { sendCheckOutReminder } from '../lib/notifications';
import { sendCheckInReminder, sendLateCheckInAlert, sendForgottenCheckOutAlert } from '../lib/notifications/project-alerts';

interface TestResult {
  name: string;
  success: boolean;
  method?: string;
  error?: string;
  details?: any;
}

async function testNotifications() {
  const email = process.argv[2] || 'oi@johan.com.br';
  const testType = process.argv[3] || 'all'; // 'all', 'push', 'email', 'both'

  console.log('🧪 Comprehensive Notification Testing\n');
  console.log(`📧 Test user: ${email}`);
  console.log(`🔔 Test type: ${testType}\n`);

  try {
    const supabase = createAdminClient();

    // Find user by email
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, org_id')
      .eq('email', email)
      .single();

    if (profileError || !profile) {
      console.error('❌ User not found:', profileError);
      process.exit(1);
    }

    console.log(`✅ Found user: ${profile.full_name || profile.email} (ID: ${profile.id})\n`);

    const results: TestResult[] = [];

    // Update delivery methods based on test type
    const deliveryMethod = testType === 'all' ? 'both' : testType as 'push' | 'email' | 'both';
    
    const { error: prefError } = await supabase
      .from('notification_preferences')
      .upsert({
        user_id: profile.id,
        checkout_reminders: true,
        team_checkins: true,
        approvals_needed: true,
        approval_confirmed: true,
        delivery_methods: {
          checkout_reminders: deliveryMethod,
          team_checkins: deliveryMethod,
          approvals_needed: deliveryMethod,
          approval_confirmed: deliveryMethod,
          ata_updates: deliveryMethod,
          diary_updates: deliveryMethod,
          weekly_summary: deliveryMethod,
          project_checkin_reminders: deliveryMethod,
          project_checkout_reminders: deliveryMethod,
        },
      }, {
        onConflict: 'user_id',
      });

    if (prefError) {
      console.error('⚠️  Could not update preferences:', prefError);
    } else {
      console.log(`✅ Updated delivery methods to: ${deliveryMethod}\n`);
    }

    // Test 1: Generic test notification
    console.log('📋 Test 1: Generic test notification');
    try {
      const result = await sendNotification({
        userId: profile.id,
        type: 'test',
        title: '🎉 Test-notifikation',
        body: 'Detta är en testnotifikation från EP-Tracker.',
        url: '/dashboard',
        orgId: profile.org_id,
      });
      
      results.push({
        name: 'Generic test notification',
        success: result.success,
        method: result.method,
        details: {
          sent: result.sent,
          failed: result.failed,
          pushResult: result.pushResult,
          emailResult: result.emailResult,
        },
      });
      
      console.log(`   ✅ Success: ${result.success}, Method: ${result.method || 'unknown'}`);
      console.log(`   📊 Sent: ${result.sent}, Failed: ${result.failed}\n`);
    } catch (error: any) {
      results.push({
        name: 'Generic test notification',
        success: false,
        error: error.message,
      });
      console.log(`   ❌ Error: ${error.message}\n`);
    }

    // Test 2: Check-out reminder
    console.log('📋 Test 2: Check-out reminder');
    try {
      const result = await sendCheckOutReminder({
        userId: profile.id,
        projectName: 'Test Projekt',
        projectId: 'test-project-id',
        checkInTime: new Date().toISOString(),
        hoursWorked: 8.5,
      });
      
      results.push({
        name: 'Check-out reminder',
        success: result.success,
        method: result.method,
        details: {
          sent: result.sent,
          failed: result.failed,
        },
      });
      
      console.log(`   ✅ Success: ${result.success}, Method: ${result.method || 'unknown'}\n`);
    } catch (error: any) {
      results.push({
        name: 'Check-out reminder',
        success: false,
        error: error.message,
      });
      console.log(`   ❌ Error: ${error.message}\n`);
    }

    // Test 3: Check-in reminder (project alert)
    console.log('📋 Test 3: Project check-in reminder');
    try {
      await sendCheckInReminder({
        projectId: 'test-project-id',
        userId: profile.id,
        userName: profile.full_name || profile.email || 'Test User',
        workDayStart: '07:00',
      });
      
      results.push({
        name: 'Project check-in reminder',
        success: true,
      });
      
      console.log(`   ✅ Success\n`);
    } catch (error: any) {
      results.push({
        name: 'Project check-in reminder',
        success: false,
        error: error.message,
      });
      console.log(`   ❌ Error: ${error.message}\n`);
    }

    // Test 4: Team check-in notification
    console.log('📋 Test 4: Team check-in notification');
    try {
      const result = await sendNotification({
        userId: profile.id,
        type: 'team_checkin',
        title: '👋 Ny check-in',
        body: 'En kollega har checkat in på ett projekt',
        url: '/dashboard',
        orgId: profile.org_id,
      });
      
      results.push({
        name: 'Team check-in notification',
        success: result.success,
        method: result.method,
      });
      
      console.log(`   ✅ Success: ${result.success}, Method: ${result.method || 'unknown'}\n`);
    } catch (error: any) {
      results.push({
        name: 'Team check-in notification',
        success: false,
        error: error.message,
      });
      console.log(`   ❌ Error: ${error.message}\n`);
    }

    // Test 5: Approval needed
    console.log('📋 Test 5: Approval needed notification');
    try {
      const result = await sendNotification({
        userId: profile.id,
        type: 'approval_needed',
        title: '✅ Godkännande väntar',
        body: 'Du har tidrapporter som väntar på godkännande',
        url: '/dashboard/approvals',
        orgId: profile.org_id,
      });
      
      results.push({
        name: 'Approval needed',
        success: result.success,
        method: result.method,
      });
      
      console.log(`   ✅ Success: ${result.success}, Method: ${result.method || 'unknown'}\n`);
    } catch (error: any) {
      results.push({
        name: 'Approval needed',
        success: false,
        error: error.message,
      });
      console.log(`   ❌ Error: ${error.message}\n`);
    }

    // Summary
    console.log('\n📊 Test Summary\n');
    console.log('═'.repeat(60));
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    results.forEach((result, index) => {
      const icon = result.success ? '✅' : '❌';
      const method = result.method ? ` (${result.method})` : '';
      console.log(`${index + 1}. ${icon} ${result.name}${method}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      if (result.details) {
        console.log(`   Details:`, JSON.stringify(result.details, null, 2));
      }
    });
    
    console.log('═'.repeat(60));
    console.log(`\n✅ Passed: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📊 Total: ${results.length}\n`);

    // Check notification log
    console.log('📝 Checking notification log...\n');
    const { data: logs } = await supabase
      .from('notification_log')
      .select('type, title, data, created_at')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (logs && logs.length > 0) {
      console.log('Senaste notifikationer:');
      logs.forEach((log, index) => {
        const method = log.data?.method || 'unknown';
        console.log(`  ${index + 1}. [${method}] ${log.title} (${log.type})`);
      });
    } else {
      console.log('  ⚠️  Inga notifikationer i loggen ännu');
    }

    console.log(`\n📬 Kontrollera din inbox: ${email}`);
    console.log(`🔔 Kontrollera push-notifikationer i webbläsaren\n`);

  } catch (error: any) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Usage instructions
if (process.argv[2] === '--help' || process.argv[2] === '-h') {
  console.log(`
🧪 Comprehensive Notification Testing Script

Usage:
  npx ts-node scripts/test-notifications-comprehensive.ts [email] [test-type]

Arguments:
  email      Email address for test user (default: oi@johan.com.br)
  test-type  'push', 'email', 'both', or 'all' (default: 'all')

Examples:
  # Test all delivery methods
  npx ts-node scripts/test-notifications-comprehensive.ts oi@johan.com.br all

  # Test only email
  npx ts-node scripts/test-notifications-comprehensive.ts oi@johan.com.br email

  # Test only push
  npx ts-node scripts/test-notifications-comprehensive.ts oi@johan.com.br push

  # Test both
  npx ts-node scripts/test-notifications-comprehensive.ts oi@johan.com.br both
`);
  process.exit(0);
}

testNotifications();


