#!/usr/bin/env node

/**
 * Test script to investigate TurndownService HTML to markdown conversion
 */

import TurndownService from 'turndown';

function testTurndownService() {
    console.log('🧪 Testing TurndownService HTML to Markdown Conversion');
    console.log('====================================================\n');

    // Initialize TurndownService with same config as EmailHandler
    const turndownService = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
        bulletListMarker: '-'
    });

    // Test cases with various HTML content
    const testCases = [
        {
            name: 'Simple HTML',
            html: '<p>This is a <strong>simple</strong> test message.</p>'
        },
        {
            name: 'Complex Email HTML',
            html: `<html><body>
                <h1>Welcome Email</h1>
                <p>Hello <strong>User</strong>,</p>
                <p>Thank you for signing up! Here are some important details:</p>
                <ul>
                    <li>Your account is now active</li>
                    <li>You can login anytime</li>
                    <li>Support is available 24/7</li>
                </ul>
                <p>Best regards,<br>The Team</p>
                <hr>
                <p style="color: #666; font-size: 12px;">
                    This is an automated email. Please do not reply.
                </p>
                </body></html>`
        },
        {
            name: 'Email with Links',
            html: `<p>Please <a href="https://example.com/verify">click here</a> to verify your account.</p>
                   <p>Or visit: <a href="https://example.com">https://example.com</a></p>`
        },
        {
            name: 'Newsletter Style',
            html: `<div style="font-family: Arial, sans-serif; max-width: 600px;">
                <h2 style="color: #333;">📧 Weekly Newsletter</h2>
                <p>Here are this week's highlights:</p>
                <ol>
                    <li><strong>Feature Update:</strong> New dashboard released</li>
                    <li><strong>Bug Fix:</strong> Login issues resolved</li>
                    <li><strong>Announcement:</strong> Maintenance scheduled for Sunday</li>
                </ol>
                <blockquote style="border-left: 3px solid #ccc; padding-left: 15px; margin: 20px 0;">
                    "Great software is built by great teams." - Someone Famous
                </blockquote>
                </div>`
        },
        {
            name: 'Rich Formatting',
            html: `<div>
                <p>This email contains <em>italic text</em>, <strong>bold text</strong>, and <code>inline code</code>.</p>
                <pre><code>function hello() {
    console.log("Hello World!");
}</code></pre>
                <table border="1">
                    <tr><th>Name</th><th>Value</th></tr>
                    <tr><td>Test</td><td>123</td></tr>
                </table>
                </div>`
        },
        {
            name: 'Malformed HTML',
            html: `<p>This is <strong>bold text without closing tag
                   <div>Nested improperly</div>
                   <p>Another paragraph</p>`
        },
        {
            name: 'HTML from email-test-samples',
            html: '<html><body><p>This is an <strong>HTML</strong> test message.</p><p>Best regards,<br>Test Sender</p></body></html>'
        }
    ];

    testCases.forEach((testCase, index) => {
        console.log(`${index + 1}️⃣ Testing: ${testCase.name}`);
        console.log('-'.repeat(50));
        
        try {
            console.log('📥 Input HTML:');
            console.log(testCase.html);
            console.log();
            
            const markdown = turndownService.turndown(testCase.html);
            
            console.log('📤 Output Markdown:');
            console.log(markdown);
            console.log();
            
            console.log('✅ Conversion successful');
            
            // Check for common issues
            const issues = [];
            if (markdown.includes('<')) {
                issues.push('Contains HTML tags (incomplete conversion)');
            }
            if (markdown.trim() === '') {
                issues.push('Empty output');
            }
            if (markdown.includes('undefined') || markdown.includes('null')) {
                issues.push('Contains undefined/null values');
            }
            
            if (issues.length > 0) {
                console.log('⚠️  Potential issues detected:');
                issues.forEach(issue => console.log(`   - ${issue}`));
            }
            
        } catch (error) {
            console.log('❌ Conversion failed:');
            console.error(error.message);
        }
        
        console.log('═'.repeat(70));
        console.log();
    });
}

function testEmailHandlerLikeConversion() {
    console.log('\n🔧 Testing EmailHandler-like Conversion Process');
    console.log('===============================================\n');

    const turndownService = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
        bulletListMarker: '-'
    });

    // Simulate the same process as EmailHandler
    function parseEmailContent(message) {
        const cleanedHtml = cleanHtml(message.html);
        let textContent = null;

        console.log('📧 Processing message:', message.subject);
        console.log('🧹 Cleaned HTML:', cleanedHtml ? 'Available' : 'Not available');

        // Convert HTML to markdown if HTML is available, otherwise use plain text
        if (cleanedHtml) {
            try {
                textContent = turndownService.turndown(cleanedHtml);
                console.log('✅ HTML to markdown conversion successful');
            } catch (error) {
                console.warn('⚠️  Failed to convert HTML to markdown:', error.message);
                textContent = cleanText(message.text) || null;
                console.log('📝 Fallback to plain text');
            }
        } else {
            textContent = cleanText(message.text) || null;
            console.log('📝 Using plain text (no HTML available)');
        }

        return {
            subject: cleanText(message.subject) || null,
            text: textContent,
            html: cleanedHtml
        };
    }

    function cleanText(text) {
        if (!text) return null;
        
        // Remove excessive whitespace and normalize line endings
        return text
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim() || null;
    }

    function cleanHtml(html) {
        if (!html) return null;
        
        console.log('🧹 Processing HTML content');
        
        // Return HTML content as-is without sanitization
        return html.trim() || null;
    }

    // Test with sample email data
    const testMessages = [
        {
            subject: 'Test Email #1',
            text: 'This is a plain text test message.\n\nBest regards,\nTest Sender',
            html: '<html><body><p>This is an <strong>HTML</strong> test message.</p><p>Best regards,<br>Test Sender</p></body></html>'
        },
        {
            subject: 'Plain Text Only',
            text: 'This message only has plain text content.',
            html: null
        },
        {
            subject: 'Empty Content',
            text: '',
            html: ''
        },
        {
            subject: 'Rich HTML Email',
            text: null,
            html: `<div style="font-family: Arial;">
                <h1>Welcome!</h1>
                <p>Thanks for joining us. Here's what you can do:</p>
                <ul>
                    <li>Update your profile</li>
                    <li>Explore features</li>
                    <li>Contact support</li>
                </ul>
                </div>`
        }
    ];

    testMessages.forEach((message, index) => {
        console.log(`\n${index + 1}️⃣ Testing message: "${message.subject}"`);
        console.log('-'.repeat(60));
        
        const result = parseEmailContent(message);
        
        console.log('📊 Results:');
        console.log('  Subject:', result.subject);
        console.log('  Text length:', result.text?.length || 0);
        console.log('  HTML available:', !!result.html);
        
        if (result.text) {
            console.log('  Text preview:', result.text.substring(0, 100) + (result.text.length > 100 ? '...' : ''));
        }
        
        console.log();
    });
}

// Run tests
console.log('🚀 TurndownService Investigation\n');

testTurndownService();
testEmailHandlerLikeConversion();

console.log('\n✅ TurndownService investigation completed!');
console.log('\n💡 Key findings will help identify any HTML to markdown conversion issues.');