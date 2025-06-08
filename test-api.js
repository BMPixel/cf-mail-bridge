#!/usr/bin/env node

/**
 * API Testing Script for Email Bridge Service
 * Run this script to test the deployed API endpoints
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:8787';

async function makeRequest(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;
    console.log(`\n🔄 ${options.method || 'GET'} ${endpoint}`);
    
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        const data = await response.text();
        let jsonData;
        
        try {
            jsonData = JSON.parse(data);
        } catch {
            jsonData = data;
        }
        
        console.log(`📊 Status: ${response.status}`);
        console.log(`📋 Response:`, jsonData);
        
        return { status: response.status, data: jsonData };
    } catch (error) {
        console.log(`❌ Error:`, error.message);
        return { status: 0, error: error.message };
    }
}

async function runApiTests() {
    console.log('🚀 Starting API Tests for Email Bridge Service');
    console.log(`🎯 Base URL: ${BASE_URL}`);
    console.log('=' * 60);
    
    const testUser = {
        username: `testuser${Date.now()}`,
        password: 'testpassword123'
    };
    
    let authToken = null;
    
    // Test 1: Health Check
    console.log('\n📋 Test 1: Health Check');
    await makeRequest('/health');
    
    // Test 2: Homepage
    console.log('\n📋 Test 2: Homepage');
    await makeRequest('/');
    
    // Test 3: Register Page
    console.log('\n📋 Test 3: Register Page');
    await makeRequest('/register');
    
    // Test 4: Register User
    console.log('\n📋 Test 4: Register User');
    const registerResponse = await makeRequest('/api/v1/register', {
        method: 'POST',
        body: JSON.stringify(testUser)
    });
    
    if (registerResponse.status === 200 && registerResponse.data.success) {
        authToken = registerResponse.data.data.token;
        console.log('✅ Registration successful');
        console.log(`📧 Email: ${registerResponse.data.data.email}`);
    } else {
        console.log('❌ Registration failed');
    }
    
    // Test 5: Login User
    console.log('\n📋 Test 5: Login User');
    const loginResponse = await makeRequest('/api/v1/login', {
        method: 'POST',
        body: JSON.stringify(testUser)
    });
    
    if (loginResponse.status === 200 && loginResponse.data.success) {
        authToken = loginResponse.data.data.token;
        console.log('✅ Login successful');
    } else {
        console.log('❌ Login failed');
    }
    
    // Test 6: Get Messages (Empty)
    if (authToken) {
        console.log('\n📋 Test 6: Get Messages (should be empty)');
        await makeRequest('/api/v1/messages', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
    }
    
    // Test 7: Token Refresh
    if (authToken) {
        console.log('\n📋 Test 7: Token Refresh');
        await makeRequest('/api/v1/refresh', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
    }
    
    // Test 8: Invalid Token
    console.log('\n📋 Test 8: Invalid Token Test');
    await makeRequest('/api/v1/messages', {
        headers: {
            'Authorization': 'Bearer invalid-token'
        }
    });
    
    // Test 9: Missing Token
    console.log('\n📋 Test 9: Missing Token Test');
    await makeRequest('/api/v1/messages');
    
    // Test 10: Invalid Username Registration
    console.log('\n📋 Test 10: Invalid Username Registration');
    await makeRequest('/api/v1/register', {
        method: 'POST',
        body: JSON.stringify({
            username: 'ab', // too short
            password: 'validpassword123'
        })
    });
    
    // Test 11: Invalid Password Registration
    console.log('\n📋 Test 11: Invalid Password Registration');
    await makeRequest('/api/v1/register', {
        method: 'POST',
        body: JSON.stringify({
            username: 'validusername',
            password: 'short' // too short
        })
    });
    
    // Test 12: Duplicate Username
    console.log('\n📋 Test 12: Duplicate Username Registration');
    await makeRequest('/api/v1/register', {
        method: 'POST',
        body: JSON.stringify(testUser) // same user as before
    });
    
    // Test 13: Invalid Login
    console.log('\n📋 Test 13: Invalid Login');
    await makeRequest('/api/v1/login', {
        method: 'POST',
        body: JSON.stringify({
            username: testUser.username,
            password: 'wrongpassword'
        })
    });
    
    // Test 14: Nonexistent Endpoint
    console.log('\n📋 Test 14: Nonexistent Endpoint');
    await makeRequest('/api/v1/nonexistent');
    
    console.log('\n' + '=' * 60);
    console.log('🎉 API Tests Completed!');
    console.log('\n💡 Tips:');
    console.log('- Check the logs above for any failed tests');
    console.log('- Verify the database is properly configured');
    console.log('- Make sure JWT_SECRET is set in wrangler.jsonc');
    console.log(`- Test email address: ${testUser.username}@agent.tai.chat`);
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
    console.error('❌ This script requires Node.js 18+ or a fetch polyfill');
    console.error('💡 Try: npm install node-fetch');
    process.exit(1);
}

// Run tests
runApiTests().catch(error => {
    console.error('❌ Test runner error:', error);
    process.exit(1);
});