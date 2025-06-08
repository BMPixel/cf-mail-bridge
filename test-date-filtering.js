#!/usr/bin/env node

/**
 * Test script for date filtering functionality in the messages API
 */

// Configuration
const API_BASE = 'http://localhost:8787'; // Local dev server
const TEST_USERNAME = 'testuser';
const TEST_PASSWORD = 'testpassword123';

async function testDateFiltering() {
    console.log('🧪 Testing Date Filtering Functionality');
    console.log('========================================\n');

    let authToken;

    try {
        // Step 1: Login to get auth token
        console.log('1️⃣ Logging in...');
        const loginResponse = await fetch(`${API_BASE}/api/v1/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: TEST_USERNAME,
                password: TEST_PASSWORD
            })
        });

        if (!loginResponse.ok) {
            throw new Error(`Login failed: ${loginResponse.status}`);
        }

        const loginData = await loginResponse.json();
        if (!loginData.success) {
            throw new Error(`Login failed: ${loginData.error.message}`);
        }

        authToken = loginData.data.token;
        console.log('✅ Login successful\n');

        // Step 2: Test basic messages retrieval (no date filter)
        console.log('2️⃣ Testing basic messages retrieval...');
        await testMessagesEndpoint(authToken, {}, 'Basic retrieval');

        // Step 3: Test date filtering - today only
        console.log('3️⃣ Testing date filtering - today only...');
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        await testMessagesEndpoint(authToken, {
            date_from: today,
            date_to: today
        }, 'Today only');

        // Step 4: Test date filtering - last 7 days
        console.log('4️⃣ Testing date filtering - last 7 days...');
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];
        
        await testMessagesEndpoint(authToken, {
            date_from: sevenDaysAgoStr,
            date_to: today
        }, 'Last 7 days');

        // Step 5: Test date filtering - last 30 days
        console.log('5️⃣ Testing date filtering - last 30 days...');
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
        
        await testMessagesEndpoint(authToken, {
            date_from: thirtyDaysAgoStr,
            date_to: today
        }, 'Last 30 days');

        // Step 6: Test invalid date formats
        console.log('6️⃣ Testing invalid date formats...');
        await testInvalidDates(authToken);

        // Step 7: Test edge cases
        console.log('7️⃣ Testing edge cases...');
        await testEdgeCases(authToken);

        console.log('\n✅ All date filtering tests completed successfully!');

    } catch (error) {
        console.error('\n❌ Test failed:', error.message);
        process.exit(1);
    }
}

async function testMessagesEndpoint(authToken, params, testName) {
    const url = new URL(`${API_BASE}/api/v1/messages`);
    
    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
            url.searchParams.append(key, value);
        }
    });

    console.log(`   📡 Request: ${url.toString()}`);

    const response = await fetch(url.toString(), {
        headers: {
            'Authorization': `Bearer ${authToken}`
        }
    });

    if (!response.ok) {
        throw new Error(`${testName} failed: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
        throw new Error(`${testName} failed: ${data.error.message}`);
    }

    console.log(`   ✅ ${testName}: Found ${data.data.messages.length} messages (total: ${data.data.count})`);
    
    // Show first few messages if any
    if (data.data.messages.length > 0) {
        console.log(`   📧 Sample messages:`);
        data.data.messages.slice(0, 3).forEach(msg => {
            const date = new Date(msg.received_at).toISOString().split('T')[0];
            console.log(`      - ${date}: ${msg.subject || '(No subject)'} from ${msg.from}`);
        });
    }
    console.log();
}

async function testInvalidDates(authToken) {
    const invalidDates = [
        { date_from: 'invalid-date', name: 'Invalid date format' },
        { date_from: '2025-13-01', name: 'Invalid month' },
        { date_from: '2025-02-30', name: 'Invalid day' },
        { date_to: '25-06-08', name: 'Wrong format (YY-MM-DD)' },
        { date_from: '2025-6-8', name: 'Missing leading zeros' }
    ];

    for (const testCase of invalidDates) {
        console.log(`   🚫 Testing: ${testCase.name}`);
        
        const url = new URL(`${API_BASE}/api/v1/messages`);
        Object.entries(testCase).forEach(([key, value]) => {
            if (key !== 'name') {
                url.searchParams.append(key, value);
            }
        });

        const response = await fetch(url.toString(), {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            console.log(`   ⚠️  Expected error but got success for: ${testCase.name}`);
        } else {
            console.log(`   ✅ Correctly rejected: ${testCase.name} (${response.status})`);
        }
    }
    console.log();
}

async function testEdgeCases(authToken) {
    const edgeCases = [
        {
            params: { date_from: '2030-01-01' },
            name: 'Future date (should return no results)'
        },
        {
            params: { date_to: '1990-01-01' },
            name: 'Very old date (should return no results)'
        },
        {
            params: { date_from: '2025-06-08', date_to: '2025-06-07' },
            name: 'date_from after date_to (should return no results)'
        },
        {
            params: { date_from: '2025-06-08', date_to: '2025-06-08' },
            name: 'Same date for from and to (single day)'
        }
    ];

    for (const testCase of edgeCases) {
        console.log(`   🔍 Testing: ${testCase.name}`);
        try {
            await testMessagesEndpoint(authToken, testCase.params, testCase.name);
        } catch (error) {
            console.log(`   ⚠️  ${testCase.name} failed: ${error.message}`);
        }
    }
}

// Helper function to test with real deployment
async function testWithDeployment() {
    console.log('\n🚀 Testing with deployed service...');
    console.log('Note: Make sure the service is deployed first\n');
    
    // You can update this URL to your actual deployment
    const DEPLOYED_API = 'https://cf-mail-bridge.your-subdomain.workers.dev';
    
    try {
        const response = await fetch(`${DEPLOYED_API}/health`);
        if (response.ok) {
            console.log('✅ Deployed service is healthy');
            // Run the same tests but with deployed URL
            // (You would need to modify API_BASE variable)
        } else {
            console.log('❌ Deployed service is not available');
        }
    } catch (error) {
        console.log('❌ Cannot reach deployed service:', error.message);
    }
}

// Main execution
if (process.argv.includes('--deployed')) {
    testWithDeployment();
} else {
    console.log('💡 Usage:');
    console.log('  node test-date-filtering.js           # Test with local dev server');
    console.log('  node test-date-filtering.js --deployed # Test with deployed service');
    console.log();
    console.log('📝 Prerequisites:');
    console.log('  1. Start local dev server: npx wrangler dev');
    console.log('  2. Make sure test user exists (register via /register)');
    console.log('  3. Have some test messages in the database');
    console.log();
    
    testDateFiltering();
}

export { testDateFiltering };