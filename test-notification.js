// Complete notification test script
// Paste this in your browser console (F12) while logged in as oi@johan.com.br

(async () => {
  console.log('🔍 Finding project and user IDs...');
  
  // Step 1: Get current user info
  const userResponse = await fetch('/api/auth/user');
  const userData = await userResponse.json();
  console.log('Current user:', userData);
  
  // Step 2: Find project "Testa Liggaren"
  const projectsResponse = await fetch('/api/projects');
  const projectsData = await projectsResponse.json();
  const project = projectsData.projects?.find(p => p.name === 'Testa Liggaren' || p.name.includes('Testa Liggaren'));
  
  if (!project) {
    console.error('❌ Project "Testa Liggaren" not found');
    console.log('Available projects:', projectsData.projects?.map(p => p.name));
    return;
  }
  
  console.log('✅ Found project:', project.name, 'ID:', project.id);
  
  // Step 3: Find user oi@johan.com.br
  const userId = userData.user?.id;
  if (!userId) {
    console.error('❌ Could not get current user ID');
    return;
  }
  
  console.log('✅ Current user ID:', userId);
  
  // Step 4: Test notification
  console.log('\n🚀 Testing notification...');
  const testResponse = await fetch('/api/test/notify-debug', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: project.id,
      userId: userId // User who "checked in"
    })
  });
  
  const result = await testResponse.json();
  
  console.log('\n=== FULL DEBUG RESULT ===');
  console.log(JSON.stringify(result, null, 2));
  
  console.log('\n=== STEPS TAKEN ===');
  result.debugInfo?.steps?.forEach((step, i) => {
    console.log(`${i + 1}. ${step}`);
  });
  
  console.log('\n=== ERRORS ===');
  if (result.debugInfo?.errors?.length > 0) {
    result.debugInfo.errors.forEach((error, i) => {
      console.error(`${i + 1}. ${error}`);
    });
  } else {
    console.log('✅ No errors!');
  }
  
  console.log('\n=== RECIPIENTS FOUND ===');
  console.log(`Found ${result.debugInfo?.recipients?.length || 0} recipients:`);
  result.debugInfo?.recipients?.forEach((r, i) => {
    console.log(`  ${i + 1}. User ID: ${r.user_id}`);
  });
  
  console.log('\n=== PROJECT SETTINGS ===');
  console.log('notify_on_checkin:', result.debugInfo?.project?.alert_settings?.notify_on_checkin);
  console.log('alert_recipients:', result.debugInfo?.project?.alert_settings?.alert_recipients);
  
  console.log('\n=== RECENT NOTIFICATIONS (last 5) ===');
  if (result.debugInfo?.results?.recentNotifications?.length > 0) {
    result.debugInfo.results.recentNotifications.forEach((n, i) => {
      console.log(`${i + 1}. ${n.type} - ${n.title} (${n.status})`);
    });
  } else {
    console.log('⚠️ No notifications found in notification_log table');
  }
  
  console.log('\n=== RECENT EMAILS (last 5) ===');
  if (result.debugInfo?.results?.recentEmails?.length > 0) {
    result.debugInfo.results.recentEmails.forEach((e, i) => {
      console.log(`${i + 1}. To: ${e.to_email} - ${e.subject} (${e.status})`);
    });
  } else {
    console.log('⚠️ No emails found in email_logs table');
  }
  
  console.log('\n=== SUMMARY ===');
  if (result.success) {
    console.log('✅ Test completed successfully');
  } else {
    console.error('❌ Test failed:', result.error);
  }
  
  return result;
})();

