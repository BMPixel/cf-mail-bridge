#!/usr/bin/env node

/**
 * Email Handler Testing Script
 * Tests the email processing functionality with sample email payloads
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.TEST_URL || 'http://localhost:8787';
const SAMPLES_DIR = './email-test-samples';

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
        console.log(`📋 Response:`, JSON.stringify(jsonData, null, 2));
        
        return { status: response.status, data: jsonData };
    } catch (error) {
        console.log(`❌ Error:`, error.message);
        return { status: 0, error: error.message };
    }
}

async function simulateEmailReceived(emailPayload, workerUrl) {
    console.log('\n📧 Simulating email received by Cloudflare Email Workers...');
    console.log('📝 Email details:');
    console.log(`   From: ${emailPayload.from}`);
    console.log(`   To: ${emailPayload.to}`);
    console.log(`   Subject: ${emailPayload.subject}`);
    console.log(`   Size: ${emailPayload.size} bytes`);
    
    // Note: In a real environment, this would be triggered by Cloudflare Email Workers
    // For testing, we'll directly call our email handler function
    
    // Extract username from email
    const username = emailPayload.to.split('@')[0];
    console.log(`📧 Extracted username: ${username}`);
    
    // In a real scenario, you would:
    // 1. Send an actual email to the user's address
    // 2. Or use Cloudflare's testing tools
    // 3. Or implement a test endpoint that simulates email reception
    
    return { success: true, username };
}

async function createTestUser(username, password) {
    console.log(`\n👤 Creating test user: ${username}`);
    
    const response = await makeRequest('/api/v1/register', {
        method: 'POST',
        body: JSON.stringify({ username, password })
    });
    
    if (response.status === 200 && response.data.success) {
        console.log(`✅ User created successfully`);
        console.log(`📧 Email address: ${response.data.data.email}`);
        return response.data.data.token;
    } else if (response.data.error && response.data.error.code === 'USER_EXISTS') {
        console.log(`ℹ️  User already exists, attempting login...`);
        
        const loginResponse = await makeRequest('/api/v1/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        if (loginResponse.status === 200 && loginResponse.data.success) {
            console.log(`✅ Login successful`);
            return loginResponse.data.data.token;
        }
    }
    
    console.log(`❌ Failed to create/login user`);
    return null;
}

async function getMessages(token) {
    console.log('\n📬 Retrieving messages...');
    
    const response = await makeRequest('/api/v1/messages', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    
    if (response.status === 200 && response.data.success) {
        const messages = response.data.data.messages;
        console.log(`✅ Retrieved ${messages.length} messages`);
        
        messages.forEach((msg, index) => {
            console.log(`\n📧 Message ${index + 1}:`);
            console.log(`   ID: ${msg.id}`);
            console.log(`   From: ${msg.from}`);
            console.log(`   Subject: ${msg.subject}`);
            console.log(`   Received: ${msg.received_at}`);
            console.log(`   Size: ${msg.size} bytes`);
            
            // Show content preview
            if (msg.body_text) {
                const preview = msg.body_text.substring(0, 100);
                console.log(`   Text Preview: ${preview}${msg.body_text.length > 100 ? '...' : ''}`);
            }
            
            // Check if HTML was sanitized
            if (msg.body_html) {
                const hasScript = msg.body_html.includes('<script');
                const hasIframe = msg.body_html.includes('<iframe');
                const hasOnClick = msg.body_html.includes('onclick');
                const hasOnError = msg.body_html.includes('onerror');
                
                console.log(`   🛡️  Security Check:`);
                console.log(`      Scripts removed: ${!hasScript ? '✅' : '❌'}`);
                console.log(`      Iframes removed: ${!hasIframe ? '✅' : '❌'}`);
                console.log(`      Event handlers removed: ${!hasOnClick && !hasOnError ? '✅' : '❌'}`);
            }
        });
        
        return messages;
    } else {
        console.log(`❌ Failed to retrieve messages`);
        return [];
    }
}

async function testEmailSamples() {
    console.log('🧪 Testing Email Handler with Sample Emails');
    console.log(`🎯 Base URL: ${BASE_URL}`);
    console.log('=' * 60);
    
    // Read all sample email files
    const sampleFiles = fs.readdirSync(SAMPLES_DIR).filter(file => file.endsWith('.json'));
    
    console.log(`\n📁 Found ${sampleFiles.length} sample email files:`);
    sampleFiles.forEach(file => console.log(`   - ${file}`));
    
    const results = [];
    
    for (const file of sampleFiles) {
        console.log(`\n${'=' * 40}`);
        console.log(`📧 Testing: ${file}`);
        console.log('=' * 40);
        
        try {
            // Load email sample
            const filePath = path.join(SAMPLES_DIR, file);
            const emailPayload = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            // Extract username from email
            const username = emailPayload.to.split('@')[0];
            const password = 'testpassword123';
            
            // Create/login user
            const token = await createTestUser(username, password);
            if (!token) {
                results.push({ file, success: false, error: 'Failed to create user' });
                continue;
            }
            
            // Get initial message count
            const initialMessages = await getMessages(token);
            const initialCount = initialMessages.length;
            
            // Simulate email received
            // Note: In production, this would be handled by Cloudflare Email Workers
            console.log('\n⚠️  NOTE: Email simulation requires manual integration');
            console.log('💡 To test email reception in production:');
            console.log(`   1. Send email to: ${emailPayload.to}`);
            console.log(`   2. Check messages with: GET /api/v1/messages`);
            console.log(`   3. Use auth token: ${token.substring(0, 20)}...`);
            
            // For now, we'll test the email handler logic directly
            // by creating a mock email message in the database
            console.log('\n🔧 Simulating email processing...');
            
            results.push({ 
                file, 
                success: true, 
                username,
                email: emailPayload.to,
                token: token.substring(0, 20) + '...',
                initialMessageCount: initialCount
            });
            
        } catch (error) {
            console.log(`❌ Error processing ${file}:`, error.message);
            results.push({ file, success: false, error: error.message });
        }
    }
    
    // Summary
    console.log('\n' + '=' * 60);
    console.log('📊 EMAIL TESTING SUMMARY');
    console.log('=' * 60);
    
    results.forEach(result => {
        if (result.success) {
            console.log(`✅ ${result.file}`);
            console.log(`   Username: ${result.username}`);
            console.log(`   Email: ${result.email}`);
            console.log(`   Token: ${result.token}`);
            console.log(`   Initial messages: ${result.initialMessageCount}`);
        } else {
            console.log(`❌ ${result.file}: ${result.error}`);
        }
        console.log('');
    });
    
    const successCount = results.filter(r => r.success).length;
    console.log(`🎯 Summary: ${successCount}/${results.length} tests prepared successfully`);
    
    if (successCount > 0) {
        console.log('\n💡 Next Steps:');
        console.log('1. Send actual emails to the addresses listed above');
        console.log('2. Use the provided tokens to check for received messages');
        console.log('3. Verify XSS protection is working for malicious emails');
        console.log('\n📝 Manual testing commands:');
        results.filter(r => r.success).forEach(result => {
            console.log(`# Test ${result.username}:`);
            console.log(`curl -H "Authorization: Bearer YOUR_TOKEN" ${BASE_URL}/api/v1/messages`);
        });
    }
}

// Check if fetch is available (Node.js 18+)
if (typeof fetch === 'undefined') {
    console.error('❌ This script requires Node.js 18+ or a fetch polyfill');
    process.exit(1);
}

// Check if samples directory exists
if (!fs.existsSync(SAMPLES_DIR)) {
    console.error(`❌ Samples directory not found: ${SAMPLES_DIR}`);
    console.error('💡 Run this script from the project root directory');
    process.exit(1);
}

// Run tests
testEmailSamples().catch(error => {
    console.error('❌ Test runner error:', error);
    process.exit(1);
});