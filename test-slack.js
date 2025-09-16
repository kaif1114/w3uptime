#!/usr/bin/env node

/**
 * Test Slack Integration
 * 
 * This script tests the Slack integration by sending a test message
 * Run: node test-slack.js
 */

require('dotenv').config();
const { WebClient } = require('@slack/web-api');

async function testSlackIntegration() {
  console.log('🧪 Testing Slack Integration...\n');

  // Check environment variables
  const token = process.env.SLACK_BOT_TOKEN;
  const defaultChannel = process.env.SLACK_DEFAULT_CHANNEL || '#alerts';

  if (!token) {
    console.error('❌ SLACK_BOT_TOKEN is not set in environment variables');
    console.log('Please add SLACK_BOT_TOKEN to your .env file');
    process.exit(1);
  }

  console.log('✅ Environment variables found');
  console.log(`📱 Default channel: ${defaultChannel}`);
  console.log(`🔑 Token: ${token.substring(0, 12)}...`);

  try {
    // Initialize Slack client
    const slack = new WebClient(token);
    console.log('\n🔗 Connecting to Slack...');

    // Test authentication
    const authTest = await slack.auth.test();
    console.log(`✅ Connected as: ${authTest.user} in ${authTest.team}`);

    // Send test message
    console.log(`\n📤 Sending test message to ${defaultChannel}...`);
    
    const testMessage = {
      channel: defaultChannel,
      text: '🧪 W3Uptime Slack Integration Test',
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🧪 W3Uptime Integration Test',
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Congratulations!* Your Slack integration is working correctly.'
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Bot User:*\n${authTest.user}`
            },
            {
              type: 'mrkdwn',
              text: `*Workspace:*\n${authTest.team}`
            },
            {
              type: 'mrkdwn',
              text: `*Channel:*\n${defaultChannel}`
            },
            {
              type: 'mrkdwn',
              text: `*Time:*\n${new Date().toLocaleString()}`
            }
          ]
        },
        {
          type: 'divider'
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '🎉 You can now receive incident alerts in this channel!'
          }
        }
      ]
    };

    const result = await slack.chat.postMessage(testMessage);
    
    if (result.ok) {
      console.log('✅ Test message sent successfully!');
      console.log(`📝 Message ID: ${result.ts}`);
      console.log(`📍 Channel: ${result.channel}`);
      
      console.log('\n🎉 Slack Integration Test PASSED!');
      console.log('\nNext steps:');
      console.log('1. Create escalation policies with SLACK channel');
      console.log('2. Add Slack channels to escalation levels');
      console.log('3. Test with real incidents');
      
    } else {
      console.error('❌ Failed to send test message:', result.error);
    }

  } catch (error) {
    console.error('❌ Slack integration test failed:', error.message);
    
    if (error.code === 'slack_webapi_platform_error') {
      console.log('\nCommon issues:');
      console.log('- Check if the bot token is correct');
      console.log('- Ensure the bot is added to the target channel');
      console.log('- Verify bot permissions include chat:write');
    }
  }
}

// Run the test
testSlackIntegration().catch(console.error);
