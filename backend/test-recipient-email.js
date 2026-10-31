const nodemailer = require('nodemailer');
require('dotenv').config();

async function testRecipientEmail() {
  console.log('📧 Testing Email to Specific Recipient...\n');
  
  // Prompt for recipient email
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('Enter recipient email address to test: ', async (recipientEmail) => {
    console.log(`\n📤 Sending test email to: ${recipientEmail}`);
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
    
    try {
      const info = await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: recipientEmail,
        subject: '🧪 Test Email - CSE Attendance System',
        text: 'This is a test email from the CSE Attendance System. If you receive this, the email configuration is working correctly!',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #2563eb;">🧪 Test Email - CSE Attendance System</h2>
            <p>This is a test email from the CSE Attendance System.</p>
            <div style="background-color: #f0f9ff; border: 1px solid #0ea5e9; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>✅ Success!</strong> If you receive this email, the system is configured correctly.</p>
            </div>
            <p>Please check:</p>
            <ul>
              <li>📥 Your inbox</li>
              <li>📧 Spam/Junk folder</li>
              <li>📂 Promotions tab (Gmail)</li>
              <li>⏰ Allow 5-10 minutes for delivery</li>
            </ul>
            <hr style="margin: 30px 0;">
            <p style="color: #6b7280; font-size: 14px;">
              Sent from: CSE Attendance System<br>
              Time: ${new Date().toLocaleString()}
            </p>
          </div>
        `
      });
      
      console.log('✅ Email sent successfully!');
      console.log('📋 Message ID:', info.messageId);
      console.log('📨 Response:', info.response);
      console.log('\n💡 Instructions for recipient:');
      console.log('1. Check inbox in 5-10 minutes');
      console.log('2. Check spam/junk folder');
      console.log('3. Check promotions tab (Gmail)');
      console.log('4. Add sender to contacts to avoid spam');
      
    } catch (error) {
      console.log('❌ Failed to send email:');
      console.log('Error:', error.message);
    }
    
    rl.close();
  });
}

testRecipientEmail();
