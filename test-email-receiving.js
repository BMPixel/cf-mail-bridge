#!/usr/bin/env node

/**
 * Local test script for email receiving functionality
 * Tests the EmailHandler.handleIncomingEmail() method with sample data
 */

import { readFileSync } from 'fs';
import path from 'path';

// Mock environment for testing
const mockEnv = {
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    JWT_SECRET: 'test-secret'
};

// Mock database implementation for testing
class MockDatabaseService {
    constructor() {
        // Mock database service
    }
    
    async getUserByUsername(username) {
        // Mock user data
        console.log(`[MOCK DB] Looking up user: ${username}`);
        if (username === 'testuser') {
            return {
                id: 1,
                username: 'testuser',
                email: 'testuser@agent.tai.chat',
                created_at: new Date().toISOString()
            };
        }
        return null;
    }
    
    async createMessage(userId, messageId, from, to, subject, text, html, headers, size) {
        console.log(`[MOCK DB] Creating message:`, {
            userId,
            messageId,
            from,
            to,
            subject: subject?.substring(0, 50) + '...',
            textLength: text?.length || 0,
            htmlLength: html?.length || 0,
            size
        });
        
        // Return mock saved message
        return {
            id: Math.floor(Math.random() * 1000),
            user_id: userId,
            message_id: messageId,
            from_address: from,
            to_address: to,
            subject,
            text_content: text,
            html_content: html,
            headers,
            size,
            created_at: new Date().toISOString()
        };
    }
}

async function testEmailReceiving() {
    console.log('🧪 Starting email receiving functionality test...\n');
    
    // Initialize services
    const mockDb = new MockDatabaseService();
    const emailHandler = new EmailHandler(mockDb, mockEnv);
    
    // Test cases
    const testCases = [
        {
            name: 'Valid email to existing user',
            file: 'sample-email-1.json'
        },
        {
            name: 'Another valid email',
            file: 'sample-email-2.json'
        }
    ];
    
    for (const testCase of testCases) {
        console.log(`\n📧 Testing: ${testCase.name}`);
        console.log('=' * 50);
        
        try {
            // Load test email data
            const emailPath = path.join('email-test-samples', testCase.file);
            const emailData = JSON.parse(readFileSync(emailPath, 'utf8'));
            
            console.log(`📄 Loaded email from: ${testCase.file}`);
            console.log(`   From: ${emailData.from}`);
            console.log(`   To: ${emailData.to}`);
            console.log(`   Subject: ${emailData.subject}`);
            
            // Test email validation
            const isValid = emailHandler.validateEmail(emailData);
            console.log(`✅ Email validation: ${isValid ? 'PASSED' : 'FAILED'}`);
            
            if (!isValid) {
                console.log('❌ Email validation failed, skipping processing');
                continue;
            }
            
            // Test email processing
            const result = await emailHandler.handleIncomingEmail(emailData);
            console.log(`📥 Email processing: ${result ? 'SUCCESS' : 'FAILED'}`);
            
            if (result) {
                console.log('✅ Email was successfully processed and stored');
            } else {
                console.log('❌ Email processing failed');
            }
            
        } catch (error) {
            console.error(`❌ Test failed with error:`, error.message);
        }
    }
    
    console.log('\n🏁 Email receiving test completed!');
}

// Test invalid email scenarios
async function testInvalidEmails() {
    console.log('\n🚫 Testing invalid email scenarios...\n');
    
    const mockDb = new MockDatabaseService();
    const emailHandler = new EmailHandler(mockDb, mockEnv);
    
    const invalidEmails = [
        {
            name: 'Invalid email format',
            email: {
                from: 'invalid-email',
                to: 'testuser@agent.tai.chat',
                subject: 'Test',
                text: 'Test message'
            }
        },
        {
            name: 'Wrong domain',
            email: {
                from: 'sender@example.com',
                to: 'testuser@wrong-domain.com',
                subject: 'Test',
                text: 'Test message'
            }
        },
        {
            name: 'Non-existent user',
            email: {
                from: 'sender@example.com',
                to: 'nonexistent@agent.tai.chat',
                subject: 'Test',
                text: 'Test message'
            }
        }
    ];
    
    for (const testCase of invalidEmails) {
        console.log(`\n🧪 Testing: ${testCase.name}`);
        
        try {
            const isValid = emailHandler.validateEmail(testCase.email);
            console.log(`   Validation: ${isValid ? 'PASSED' : 'FAILED'}`);
            
            if (isValid) {
                const result = await emailHandler.handleIncomingEmail(testCase.email);
                console.log(`   Processing: ${result ? 'SUCCESS' : 'FAILED'}`);
            }
        } catch (error) {
            console.log(`   Error: ${error.message}`);
        }
    }
}

// Test Resend service configuration
async function testResendConfig() {
    console.log('\n🔧 Testing Resend service configuration...\n');
    
    const mockDb = new MockDatabaseService();
    const emailHandler = new EmailHandler(mockDb, mockEnv);
    
    const config = emailHandler.getResendConfiguration();
    console.log('📊 Resend configuration:', config);
    
    const healthCheck = await emailHandler.healthCheckResend();
    console.log(`💚 Resend health check: ${healthCheck ? 'HEALTHY' : 'UNHEALTHY'}`);
    
    // Test email validation
    const testEmails = [
        'valid@example.com',
        'invalid-email',
        'test@domain',
        'user@example.org'
    ];
    
    console.log('\n📧 Testing email validation:');
    for (const email of testEmails) {
        const isValid = await emailHandler.validateEmailAddress(email);
        console.log(`   ${email}: ${isValid ? 'VALID' : 'INVALID'}`);
    }
}

// Main test runner
async function runTests() {
    console.log('🚀 CF Mail Bridge - Email Receiving Test Suite');
    console.log('===============================================\n');
    
    try {
        await testResendConfig();
        await testEmailReceiving();
        await testInvalidEmails();
        
        console.log('\n✅ All tests completed successfully!');
    } catch (error) {
        console.error('\n❌ Test suite failed:', error);
        process.exit(1);
    }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    runTests();
}

export { runTests, testEmailReceiving, testInvalidEmails, testResendConfig };