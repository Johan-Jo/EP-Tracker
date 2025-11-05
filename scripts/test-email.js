// Test Resend Email Sending
// Run with: node scripts/test-email.js

const fs = require('fs');
const path = require('path');
const { Resend } = require('resend');

// Read .env.local file
const envPath = path.join(__dirname, '..', '.env.local');
let resendApiKey = null;

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/RESEND_API_KEY=(.+)/);
  if (match) {
    resendApiKey = match[1].trim();
  }
}

if (!resendApiKey) {
  console.error('❌ RESEND_API_KEY not found in .env.local');
  process.exit(1);
}

const resend = new Resend(resendApiKey);

async function testEmail() {
  console.log('🔍 Testing Resend email...');
  
  try {
    const { data, error } = await resend.emails.send({
      from: 'EP Tracker <noreply@eptracker.app>',
      to: ['oi@johan.com.br'],
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

