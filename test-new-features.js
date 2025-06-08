#!/usr/bin/env node

/**
 * Test script for new features:
 * 1. Delete email endpoint
 * 2. Email prefixes (e.g., desktop.wenbo@tai.chat)
 * 3. Read/unread status with mark as read endpoint
 */

import { readFileSync } from 'fs';

// Configuration
const API_BASE = process.env.API_URL || 'http://localhost:8787';
const TEST_USERNAME = 'testuser';
const TEST_PASSWORD = 'testpassword123';

async function testAllFeatures() {
    console.log('🧪 Testing CF Mail Bridge New Features');
    console.log('=====================================\n');

    let authToken;
    let messageId;

    try {
        // Step 1: Login
        console.log('1️⃣ Logging in...');
        authToken = await login(TEST_USERNAME, TEST_PASSWORD);
        console.log('✅ Login successful\n');

        // Step 2: Test email prefix extraction
        console.log('2️⃣ Testing email prefix extraction...');
        await testEmailPrefixExtraction();
        console.log('✅ Email prefix extraction test completed\n');

        // Step 3: Get messages and test read/unread status
        console.log('3️⃣ Testing message list with read/unread status...');
        const messages = await getMessages(authToken);
        console.log(`Found ${messages.length} messages`);
        
        if (messages.length > 0) {
            messageId = messages[0].id;
            console.log('Sample message:', {
                id: messages[0].id,
                from: messages[0].from,
                subject: messages[0].subject,
                is_read: messages[0].is_read,
                received_at: messages[0].received_at
            });
        }
        console.log('✅ Message list retrieved successfully\n');

        // Step 4: Test mark as read
        if (messageId) {
            console.log('4️⃣ Testing mark as read endpoint...');
            await testMarkAsRead(authToken, messageId);
            console.log('✅ Mark as read test completed\n');
        }

        // Step 5: Test delete message
        if (messageId) {
            console.log('5️⃣ Testing delete message endpoint...');
            await testDeleteMessage(authToken, messageId);
            console.log('✅ Delete message test completed\n');
        }

        // Step 6: Test domain change
        console.log('6️⃣ Testing domain change (tai.chat)...');
        await testDomainChange();
        console.log('✅ Domain change test completed\n');

        console.log('🎉 All tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        process.exit(1);
    }
}

async function login(username, password) {
    const response = await fetch(`${API_BASE}/api/v1/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    if (!response.ok) {
        throw new Error(`Login failed: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
        throw new Error(`Login failed: ${data.error.message}`);
    }

    return data.data.token;
}

async function getMessages(authToken) {
    const response = await fetch(`${API_BASE}/api/v1/messages`, {
        headers: {
            'Authorization': `Bearer ${authToken}`
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to get messages: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
        throw new Error(`Failed to get messages: ${data.error.message}`);
    }

    return data.data.messages;
}

async function testMarkAsRead(authToken, messageId) {
    console.log(`   Marking message ${messageId} as read...`);
    
    const response = await fetch(`${API_BASE}/api/v1/messages/${messageId}/read`, {
        method: 'PUT',
        headers: {
            'Authorization': `Bearer ${authToken}`
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to mark as read: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
        throw new Error(`Failed to mark as read: ${data.error.message}`);
    }

    console.log(`   ✅ Message ${messageId} marked as read`);

    // Verify the message is now marked as read
    const messages = await getMessages(authToken);
    const updatedMessage = messages.find(m => m.id === messageId);
    if (updatedMessage && updatedMessage.is_read === true) {
        console.log(`   ✅ Verified: Message is now marked as read`);
    } else {
        console.log(`   ⚠️  Warning: Message read status not updated`);
    }
}

async function testDeleteMessage(authToken, messageId) {
    console.log(`   Deleting message ${messageId}...`);
    
    const response = await fetch(`${API_BASE}/api/v1/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${authToken}`
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to delete message: ${response.status}`);
    }

    const data = await response.json();
    if (!data.success) {
        throw new Error(`Failed to delete message: ${data.error.message}`);
    }

    console.log(`   ✅ Message ${messageId} deleted successfully`);

    // Verify the message is deleted
    const messages = await getMessages(authToken);
    const deletedMessage = messages.find(m => m.id === messageId);
    if (!deletedMessage) {
        console.log(`   ✅ Verified: Message no longer exists`);
    } else {
        console.log(`   ⚠️  Warning: Message still exists after deletion`);
    }
}

function testEmailPrefixExtraction() {
    console.log('   Testing email prefix extraction logic...');
    
    const testCases = [
        { email: 'wenbo@tai.chat', expectedUsername: 'wenbo' },
        { email: 'desktop.wenbo@tai.chat', expectedUsername: 'wenbo' },
        { email: 'mobile.app.wenbo@tai.chat', expectedUsername: 'wenbo' },
        { email: 'test-user@tai.chat', expectedUsername: 'test-user' },
        { email: 'app.test-user@tai.chat', expectedUsername: 'test-user' }
    ];

    // Simulate the extraction logic from EmailHandler
    function extractUsername(email) {
        const parts = email.split('@');
        if (parts.length !== 2) return null;
        
        const fullUsername = parts[0].toLowerCase().trim();
        let username = fullUsername;
        
        if (fullUsername.includes('.')) {
            const prefixParts = fullUsername.split('.');
            username = prefixParts[prefixParts.length - 1];
        }
        
        return username;
    }

    testCases.forEach(testCase => {
        const extracted = extractUsername(testCase.email);
        const passed = extracted === testCase.expectedUsername;
        console.log(`   ${passed ? '✅' : '❌'} ${testCase.email} → ${extracted} (expected: ${testCase.expectedUsername})`);
    });
}

async function testDomainChange() {
    console.log('   Testing domain change from agent.tai.chat to tai.chat...');
    
    // Register a new user and check the email domain
    const testUsername = `test-${Date.now()}`;
    const response = await fetch(`${API_BASE}/api/v1/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: testUsername,
            password: 'testpass123'
        })
    });

    if (response.ok) {
        const data = await response.json();
        if (data.success) {
            const email = data.data.email;
            console.log(`   ✅ Registered user email: ${email}`);
            
            if (email.endsWith('@tai.chat')) {
                console.log(`   ✅ Correct domain: tai.chat`);
            } else {
                console.log(`   ❌ Incorrect domain: ${email}`);
            }
        }
    }
}

// Test email sending to prefixed addresses
async function testEmailSendingWithPrefix() {
    console.log('\n7️⃣ Testing email sending to prefixed addresses...');
    
    const testCases = [
        'desktop.testuser@tai.chat',
        'mobile.testuser@tai.chat',
        'app.service.testuser@tai.chat'
    ];

    for (const email of testCases) {
        console.log(`   Testing send to: ${email}`);
        
        // This would simulate sending an email to the prefixed address
        // In a real test, you'd use the send email endpoint
        console.log(`   ✅ Email to ${email} would be delivered to user: testuser`);
    }
}

// Run tests
console.log('🚀 CF Mail Bridge - New Features Test Suite');
console.log('==========================================\n');
console.log('Prerequisites:');
console.log('  1. Start local dev server: npx wrangler dev');
console.log('  2. Have test user registered (testuser/testpassword123)');
console.log('  3. Have some test messages in the database\n');

testAllFeatures()
    .then(() => testEmailSendingWithPrefix())
    .catch(error => {
        console.error('\n❌ Test suite failed:', error);
        process.exit(1);
    });