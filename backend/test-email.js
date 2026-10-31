const nodemailer = require('nodemailer');
require('dotenv').config();

async function testEmail() {
  console.log('🧪 Testing Email Configuration...\n');
  
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
  
  console.log('📧 Email User:', process.env.EMAIL_USER);
  console.log('🔑 Email Pass:', process.env.EMAIL_PASS ? 'Set (length: ' + process.env.EMAIL_PASS.length + ')' : 'Not set');
  
  try {
    console.log('\n🔍 Verifying transporter...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully');
    
    console.log('\n📤 Sending test email...');
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER, // Send to yourself for testing
      subject: 'Test Email from CSE Attendance System',
      text: 'This is a test email to verify the email configuration.',
      html: '<h2>✅ Test Email Success</h2><p>This is a test email to verify the email configuration.</p><p>If you receive this, your email setup is working correctly!</p>'
    });
    
    console.log('✅ Email sent successfully!');
    console.log('📋 Message ID:', info.messageId);
    console.log('📨 Response:', info.response);
    console.log('\n💡 Check your inbox (and spam folder) for the test email');
    
  } catch (error) {
    console.log('❌ Email test failed:');
    console.log('Error Code:', error.code);
    console.log('Error Message:', error.message);
    
    if (error.code === 'EAUTH') {
      console.log('\n💡 Authentication failed. Possible issues:');
      console.log('1. ❌ Email address is incorrect');
      console.log('2. ❌ App Password is incorrect (should be 16 characters)');
      console.log('3. ❌ 2FA is not enabled on Gmail account');
      console.log('4. ❌ App Password was not generated correctly');
    } else if (error.code === 'ENOTFOUND') {
      console.log('\n💡 Network issue - check internet connection');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('\n💡 Connection timeout - check firewall/network settings');
    }
  }
}

testEmail();
