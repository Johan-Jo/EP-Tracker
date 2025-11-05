// Complete notification test script with hardcoded IDs
// Paste this in your browser console (F12) while logged in as oi@johan.com.br

(async () => {
  // Hardcoded IDs from your earlier messages
  const projectId = '6646f08f-2b4f-4976-bea1-0519b6e69db8'; // Testa Liggaren
  const userId = '1ae11b07-ce3c-4d7c-bf2d-c0093bf76c58'; // j@johan.com.br
  
  console.log('🚀 Testing notification with:');
  console.log('   Project ID:', projectId);
  console.log('   User ID (check-in):', userId);
  
  // Test notification using existing endpoint
  console.log('\n📡 Calling /api/test/checkin-notification...');
  const testResponse = await fetch('/api/test/checkin-notification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: projectId,
      userId: userId
    })
  });
  
  if (!testResponse.ok) {
    const errorText = await testResponse.text();
    console.error('❌ Request failed:', testResponse.status, testResponse.statusText);
    console.error('Response:', errorText);
    return;
  }
  
  const result = await testResponse.json();
  
  console.log('\n=== DEBUG INFO ===');
  console.log('Project:', result.debug?.projectName);
  console.log('User:', result.debug?.userName);
  console.log('Notify on checkin:', result.debug?.alertSettings?.notify_on_checkin);
  console.log('Alert recipients:', result.debug?.alertSettings?.alert_recipients);
  
  console.log('\n=== RECIPIENTS FOUND ===');
  if (result.debug?.recipients?.length > 0) {
    result.debug.recipients.forEach((r, i) => {
      console.log(`${i + 1}. ${r.name || r.email} (${r.role})`);
    });
  } else {
    console.log('⚠️ No recipients found!');
  }
  
  console.log('\n=== NOTIFICATION RESULT ===');
  if (result.notification?.success) {
    console.log('✅ Notification sent successfully');
  } else {
    console.error('❌ Notification failed:', result.notification?.error);
  }
  
  console.log('\n=== FULL RESULT (copy this) ===');
  console.log(JSON.stringify(result, null, 2));
  
  return result;
})();

