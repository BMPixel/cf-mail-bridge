#!/usr/bin/env node

/**
 * Simple test script for email receiving functionality
 * Tests email validation and basic processing logic
 */

import { readFileSync } from 'fs';
import path from 'path';

// Simple email validation function (copied from EmailHandler)
function validateEmail(email) {
    if (!email.from || !email.to) {
        return false;
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(email.from) || !emailRegex.test(email.to)) {
        return false;
    }

    // Check if it's for our domain (agent.tai.chat)
    if (!email.to.endsWith('@agent.tai.chat')) {
        return false;
    }

    return true;
}

// Extract username from email (copied from EmailHandler)
function extractUsernameFromEmail(email) {
    try {
        // Validate email format
        if (!email || !email.includes('@')) {
            return null;
        }

        const parts = email.split('@');
        if (parts.length !== 2) {
            return null;
        }

        const username = parts[0].toLowerCase().trim();
        
        // Validate username format
        if (!/^[a-z0-9-]+$/.test(username)) {
            return null;
        }

        return username;
    } catch (error) {
        return null;
    }
}

// Clean text function (copied from EmailHandler)
function cleanText(text) {
    if (!text) return null;
    
    // Remove excessive whitespace and normalize line endings
    return text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim() || null;
}

// Parse email content (simplified)
function parseEmailContent(message) {
    return {
        subject: cleanText(message.subject) || null,
        text: cleanText(message.text) || null,
        html: message.html ? message.html.trim() || null : null
    };
}

// Mock process incoming email
function mockProcessIncomingEmail(message) {
    console.log(`📧 Processing email from ${message.from} to ${message.to}`);
    
    // Extract username
    const username = extractUsernameFromEmail(message.to);
    if (!username) {
        console.log('❌ Invalid email format or username extraction failed');
        return false;
    }
    
    console.log(`👤 Extracted username: ${username}`);
    
    // Mock user lookup
    if (username === 'testuser') {
        console.log('✅ User found in database');
    } else {
        console.log('❌ User not found in database');
        return false;
    }
    
    // Parse content
    const parsedContent = parseEmailContent(message);
    console.log('📄 Parsed content:', {
        subject: parsedContent.subject,
        textLength: parsedContent.text?.length || 0,
        hasHtml: !!parsedContent.html
    });
    
    // Mock saving to database
    const messageId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
    console.log(`💾 Mock saved message with ID: ${messageId}`);
    
    return true;
}

async function testEmailReceiving() {
    console.log('🧪 Testing Email Receiving Functionality');
    console.log('==========================================\n');
    
    // Test sample emails
    const sampleFiles = ['sample-email-1.json', 'sample-email-2.json'];
    
    for (const file of sampleFiles) {
        console.log(`\n📄 Testing with ${file}`);
        console.log('-'.repeat(40));
        
        try {
            const emailPath = path.join('email-test-samples', file);
            const emailData = JSON.parse(readFileSync(emailPath, 'utf8'));
            
            console.log(`📋 Email details:`);
            console.log(`   From: ${emailData.from}`);
            console.log(`   To: ${emailData.to}`);
            console.log(`   Subject: ${emailData.subject}`);
            console.log(`   Size: ${emailData.size} bytes`);
            
            // Test validation
            const isValid = validateEmail(emailData);
            console.log(`✓ Validation: ${isValid ? 'PASSED' : 'FAILED'}`);
            
            if (isValid) {
                // Test processing
                const processed = mockProcessIncomingEmail(emailData);
                console.log(`✓ Processing: ${processed ? 'SUCCESS' : 'FAILED'}`);
            }
            
        } catch (error) {
            console.error(`❌ Error testing ${file}:`, error.message);
        }
    }
}

async function testInvalidEmails() {
    console.log('\n\n🚫 Testing Invalid Email Scenarios');
    console.log('====================================\n');
    
    const invalidEmails = [
        {
            name: 'Missing @ symbol',
            email: { from: 'invalid-email', to: 'testuser@agent.tai.chat', subject: 'Test' }
        },
        {
            name: 'Wrong domain',
            email: { from: 'sender@example.com', to: 'testuser@wrong-domain.com', subject: 'Test' }
        },
        {
            name: 'Invalid characters in username',
            email: { from: 'sender@example.com', to: 'test@user@agent.tai.chat', subject: 'Test' }
        },
        {
            name: 'Empty from field',
            email: { from: '', to: 'testuser@agent.tai.chat', subject: 'Test' }
        }
    ];
    
    for (const testCase of invalidEmails) {
        console.log(`\n🧪 Testing: ${testCase.name}`);
        const isValid = validateEmail(testCase.email);
        console.log(`   Result: ${isValid ? 'UNEXPECTEDLY VALID' : 'CORRECTLY INVALID'}`);
        
        if (isValid) {
            console.log('   ⚠️  This should have been invalid!');
        }
    }
}

async function testEmailValidation() {
    console.log('\n\n📧 Testing Email Address Validation');
    console.log('=====================================\n');
    
    const testEmails = [
        'valid@example.com',
        'invalid-email',
        'test@domain',
        'user@example.org',
        'user.name+tag@example.com',
        '@example.com',
        'user@',
        'user@.com'
    ];
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    for (const email of testEmails) {
        const isValid = emailRegex.test(email);
        console.log(`   ${email.padEnd(25)} : ${isValid ? 'VALID' : 'INVALID'}`);
    }
}

async function testResendConfig() {
    console.log('\n\n🔧 Testing Resend Configuration');
    console.log('=================================\n');
    
    const apiKey = process.env.RESEND_API_KEY;
    console.log(`📊 Resend API Key: ${apiKey ? 'SET (' + apiKey.substring(0, 10) + '...)' : 'NOT SET'}`);
    
    if (apiKey) {
        console.log('✅ Resend API key is available for testing');
        
        // Basic API key validation
        if (apiKey.startsWith('re_')) {
            console.log('✅ API key format appears correct');
        } else {
            console.log('⚠️  API key format may be incorrect (should start with "re_")');
        }
    } else {
        console.log('❌ Resend API key not found in environment variables');
    }
}

// Main test runner
async function runTests() {
    console.log('🚀 CF Mail Bridge - Email Receiving Test Suite');
    console.log('===============================================\n');
    
    try {
        await testResendConfig();
        await testEmailValidation();
        await testEmailReceiving();
        await testInvalidEmails();
        
        console.log('\n\n✅ All tests completed!');
        console.log('\n💡 Next steps:');
        console.log('   - Test with real Cloudflare Workers environment');
        console.log('   - Test email parsing with postal-mime');
        console.log('   - Test database integration');
        console.log('   - Test Resend email sending');
        
    } catch (error) {
        console.error('\n❌ Test suite failed:', error);
        process.exit(1);
    }
}

// Run tests
runTests();