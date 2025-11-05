// Simple notification test script
// Paste this in your browser console (F12) while logged in as oi@johan.com.br

(async () => {
  console.log('🔍 Finding project "Testa Liggaren"...');
  
  // Get projects
  const projectsResponse = await fetch('/api/projects');
  const projectsData = await projectsResponse.json();
  const project = projectsData.projects?.find(p => 
    p.name === 'Testa Liggaren' || 
    p.name.toLowerCase().includes('testa') || 
    p.name.toLowerCase().includes('liggaren')
  );
  
  if (!project) {
    console.error('❌ Project "Testa Liggaren" not found');
    console.log('Available projects:', projectsData.projects?.map(p => ({ name: p.name, id: p.id })));
    return;
  }
  
  console.log('✅ Found project:', project.name);
  console.log('   Project ID:', project.id);
  
  // Get users to find j@johan.com.br
  console.log('\n🔍 Finding user j@johan.com.br...');
  const usersResponse = await fetch('/api/users');
  const usersData = await usersResponse.json();
  const checkInUser = usersData.users?.find(u => u.email === 'j@johan.com.br');
  
  if (!checkInUser) {
    console.error('❌ User j@johan.com.br not found');
    console.log('Available users:', usersData.users?.map(u => ({ email: u.email, id: u.id })));
    return;
  }
  
  console.log('✅ Found user:', checkInUser.email);
  console.log('   User ID:', checkInUser.id);
  
  // Test notification using existing endpoint
  console.log('\n🚀 Testing notification...');
  const testResponse = await fetch('/api/test/checkin-notification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectId: project.id,
      userId: checkInUser.id
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
  
  console.log('\n=== RECIPIENTS ===');
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
  
  console.log('\n=== FULL RESULT ===');
  console.log(JSON.stringify(result, null, 2));
  
  return result;
})();

