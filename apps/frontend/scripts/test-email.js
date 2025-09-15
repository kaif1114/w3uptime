#!/usr/bin/env node

/**
 * Test script for email notifications
 * Run with: node scripts/test-email.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

// Simple test without importing the full app
const nodemailer = require('nodemailer');

async function testEmailConfiguration() {
  console.log('🧪 Testing Email Configuration...\n');

  // Check environment variables
  const requiredVars = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('\nPlease check your .env file and add the missing variables.');
    process.exit(1);
  }

  console.log('✅ Environment variables configured');
  console.log(`📧 Email Host: ${process.env.EMAIL_HOST}`);
  console.log(`📧 Email Port: ${process.env.EMAIL_PORT}`);
  console.log(`📧 Email User: ${process.env.EMAIL_USER}`);
  console.log(`📧 Email From: ${process.env.EMAIL_FROM || process.env.EMAIL_USER}\n`);

  // Create transporter
  const transporter = nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: parseInt(process.env.EMAIL_PORT) === 465,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  try {
    // Test connection
    console.log('🔌 Testing SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful\n');

    // Send test email
    const testEmail = process.argv[2] || process.env.EMAIL_USER;
    console.log(`📤 Sending test email to: ${testEmail}`);

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to: testEmail,
      subject: '🧪 W3Uptime Email Test - Configuration Successful',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #28a745;">✅ Email Configuration Test Successful!</h2>
          <p>This test email confirms that your W3Uptime email notification system is properly configured.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Configuration Details:</h3>
            <p><strong>SMTP Host:</strong> ${process.env.EMAIL_HOST}</p>
            <p><strong>SMTP Port:</strong> ${process.env.EMAIL_PORT}</p>
            <p><strong>From Address:</strong> ${process.env.EMAIL_FROM || process.env.EMAIL_USER}</p>
            <p><strong>Test Time:</strong> ${new Date().toLocaleString()}</p>
          </div>

          <p>Your escalation policies will now be able to send email notifications when monitors go down.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #6c757d;">
            <p>This is a test message from W3Uptime email configuration script.</p>
          </div>
        </div>
      `,
      text: `
✅ Email Configuration Test Successful!

This test email confirms that your W3Uptime email notification system is properly configured.

Configuration Details:
- SMTP Host: ${process.env.EMAIL_HOST}
- SMTP Port: ${process.env.EMAIL_PORT}
- From Address: ${process.env.EMAIL_FROM || process.env.EMAIL_USER}
- Test Time: ${new Date().toLocaleString()}

Your escalation policies will now be able to send email notifications when monitors go down.

This is a test message from W3Uptime email configuration script.
      `
    });

    console.log('✅ Test email sent successfully!');
    console.log(`📧 Message ID: ${info.messageId}`);
    console.log('\n🎉 Email notification system is ready to use!');

  } catch (error) {
    console.error('❌ Email test failed:');
    console.error(error.message);
    
    if (error.code === 'EAUTH') {
      console.error('\n💡 Authentication failed. For Gmail:');
      console.error('   1. Enable 2-factor authentication');
      console.error('   2. Generate an App Password');
      console.error('   3. Use the App Password as EMAIL_PASS');
    }
    
    if (error.code === 'ECONNECTION') {
      console.error('\n💡 Connection failed. Check:');
      console.error('   1. SMTP host and port are correct');
      console.error('   2. Firewall/network settings');
      console.error('   3. Internet connection');
    }
    
    process.exit(1);
  }
}

// Run the test
testEmailConfiguration().catch(console.error);
