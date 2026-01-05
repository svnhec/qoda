/**
 * CONCURRENCY TEST SCRIPT
 * =============================================================================
 * Tests race condition fixes for balance updates.
 * Simulates multiple concurrent requests to verify atomicity.
 * =============================================================================
 */

const http = require('http');

// Test configuration
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL;
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD;

// Test parameters
const CONCURRENT_REQUESTS = 5;
const AMOUNT_PER_REQUEST = 10000; // $100 each
const EXPECTED_TOTAL = CONCURRENT_REQUESTS * AMOUNT_PER_REQUEST; // $500

async function loginAndGetToken() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD,
    });

    const options = {
      hostname: new URL(BASE_URL).hostname,
      port: new URL(BASE_URL).port || 80,
      path: '/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (response.error) {
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function makeFundingRequest(sessionToken) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      amount_cents: AMOUNT_PER_REQUEST,
    });

    const options = {
      hostname: new URL(BASE_URL).hostname,
      port: new URL(BASE_URL).port || 80,
      path: '/api/funding/add',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Cookie': `session=${sessionToken}`,
      },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve({ status: res.statusCode, data: response });
        } catch (e) {
          resolve({ status: res.statusCode, data: { error: 'Parse error', raw: data } });
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function runConcurrencyTest() {
  console.log('🧪 STARTING CONCURRENCY TEST');
  console.log(`📊 Making ${CONCURRENT_REQUESTS} concurrent funding requests of $${AMOUNT_PER_REQUEST / 100} each`);
  console.log(`🎯 Expected total: $${EXPECTED_TOTAL / 100}`);

  try {
    // Login first
    console.log('🔐 Logging in...');
    const loginResult = await loginAndGetToken();
    console.log('✅ Login successful');

    // Launch concurrent requests
    console.log('🚀 Launching concurrent requests...');
    const startTime = Date.now();

    const promises = [];
    for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
      promises.push(makeFundingRequest(loginResult.sessionToken));
    }

    const results = await Promise.all(promises);
    const endTime = Date.now();

    console.log(`⏱️  Completed in ${endTime - startTime}ms`);

    // Analyze results
    const successful = results.filter(r => r.status === 200 && !r.data.error);
    const failed = results.filter(r => r.status !== 200 || r.data.error);

    console.log(`✅ Successful requests: ${successful.length}`);
    console.log(`❌ Failed requests: ${failed.length}`);

    if (failed.length > 0) {
      console.log('🚨 FAILED REQUESTS:');
      failed.forEach((f, i) => {
        console.log(`  ${i + 1}. Status: ${f.status}, Error: ${JSON.stringify(f.data)}`);
      });
    }

    // Check for race conditions
    const allSuccessful = failed.length === 0;
    console.log(`🎯 Race condition test: ${allSuccessful ? 'PASSED' : 'FAILED'}`);

    if (allSuccessful) {
      console.log('🎉 CONCURRENCY TEST PASSED - No race conditions detected!');
    } else {
      console.log('💥 CONCURRENCY TEST FAILED - Race conditions detected!');
      process.exit(1);
    }

  } catch (error) {
    console.error('💥 Test failed with error:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  runConcurrencyTest().catch(console.error);
}

module.exports = { runConcurrencyTest };



