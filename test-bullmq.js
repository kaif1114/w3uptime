#!/usr/bin/env node

// Simple test script to verify BullMQ alert system
const axios = require('axios');

const BASE_URL = 'http://localhost:8000';

async function testBullMQSystem() {
  console.log('🧪 Testing BullMQ Alert System...\n');

  try {
    // Test 1: Check if server is running
    console.log('1. Testing server connectivity...');
    try {
      await axios.get(BASE_URL);
      console.log('✅ Server is running');
    } catch (error) {
      console.log('❌ Server is not running. Please start it with: npm run dev');
      return;
    }

    // Test 2: Check queue statistics (requires authentication)
    console.log('\n2. Testing queue statistics...');
    try {
      const response = await axios.get(`${BASE_URL}/api/queue/stats`);
      console.log('✅ Queue stats endpoint accessible');
      console.log('📊 Stats:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('⚠️ Queue stats require authentication (expected)');
      } else {
        console.log('❌ Queue stats error:', error.message);
      }
    }

    // Test 3: Check Redis connection
    console.log('\n3. Testing Redis connection...');
    const { exec } = require('child_process');
    exec('docker exec redis redis-cli ping', (error, stdout) => {
      if (error) {
        console.log('❌ Redis not accessible:', error.message);
      } else {
        console.log('✅ Redis is responding:', stdout.trim());
      }
    });

    console.log('\n🎉 Basic connectivity tests completed!');
    console.log('\nNext steps:');
    console.log('1. Create a monitor with an escalation policy in the UI');
    console.log('2. Use the test API to trigger alerts:');
    console.log('   POST /api/queue/test');
    console.log('3. Check the queue stats to see job processing:');
    console.log('   GET /api/queue/stats');
    console.log('4. Configure email settings in .env to test notifications');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testBullMQSystem();
