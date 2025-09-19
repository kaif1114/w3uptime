#!/usr/bin/env node

/**
 * Slack Integration Setup Test
 * 
 * This script helps test the Slack integration setup
 * Run: node setup-slack-test.js
 */

require('dotenv').config();

console.log('🧪 Slack Integration Setup Test\n');

// Check required environment variables
const requiredVars = [
  'SLACK_CLIENT_ID',
  'SLACK_CLIENT_SECRET',
  'NEXT_PUBLIC_APP_URL'
];

const optionalVars = [
  'SLACK_REDIRECT_URI',
  'SLACK_BOT_TOKEN',
  'SLACK_DEFAULT_CHANNEL'
];

console.log('📋 Checking Environment Variables:\n');

let hasErrors = false;

// Check required variables
console.log('Required Variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 12)}...`);
  } else {
    console.log(`❌ ${varName}: Not set`);
    hasErrors = true;
  }
});

console.log('\nOptional Variables:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✅ ${varName}: ${value.substring(0, 12)}...`);
  } else {
    console.log(`⚠️  ${varName}: Not set (optional)`);
  }
});

console.log('\n' + '='.repeat(50));

if (hasErrors) {
  console.log('\n❌ Setup Issues Found!\n');
  console.log('To fix these issues:');
  console.log('1. Create a Slack app at https://api.slack.com/apps');
  console.log('2. Get your Client ID and Client Secret from the app settings');
  console.log('3. Add these to your .env file:');
  console.log('');
  console.log('SLACK_CLIENT_ID=your_client_id_here');
  console.log('SLACK_CLIENT_SECRET=your_client_secret_here');
  console.log('SLACK_REDIRECT_URI=http://localhost:8000/api/integrations/slack/callback');
  console.log('NEXT_PUBLIC_APP_URL=http://localhost:8000');
  console.log('');
  console.log('4. Configure OAuth redirect URL in your Slack app:');
  console.log('   http://localhost:8000/api/integrations/slack/callback');
  console.log('');
  console.log('5. Add these scopes to your Slack app:');
  console.log('   Bot Token Scopes: channels:read, chat:write, users:read');
  console.log('   User Token Scopes: channels:read');
} else {
  console.log('\n✅ All required environment variables are set!');
  console.log('\nNext steps:');
  console.log('1. Make sure your Slack app is configured with the correct redirect URI');
  console.log('2. Test the integration by visiting: http://localhost:8000/settings/integrations');
  console.log('3. Click "Connect Slack" to test the OAuth flow');
}

console.log('\n📖 For detailed setup instructions, see:');
console.log('   docs/SLACK_INTEGRATION_SETUP.md');
console.log('');
