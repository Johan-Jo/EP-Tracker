// Test Resend Email Sending
// Run with: node scripts/test-email.js

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function testEmail() {
  console.log('🔍 Testing Resend email...');
  
  try {
    const { data, error } = await resend.emails.send({
      from: 'EP Tracker <onboarding@resend.dev>', // Resend's test domain
      to: ['din-email@example.com'], // ÄNDRA DETTA TILL DIN EMAIL!
      subject: 'Test från EP Tracker',
      html: '<h1>Fungerar!</h1><p>Din Resend-integration fungerar perfekt! 🎉</p>',
    });

    if (error) {
      console.error('❌ Fel:', error);
      return;
    }

    console.log('✅ E-post skickad!');
    console.log('📧 Message ID:', data.id);
    console.log('\n🎉 Kontrollera din inkorg!');
  } catch (error) {
    console.error('❌ Oväntat fel:', error);
  }
}

testEmail();

