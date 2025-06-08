#!/usr/bin/env node

/**
 * Send completion email for date filtering feature implementation
 * Using Resend API directly
 */

import { Resend } from 'resend';

async function sendCompletionEmail() {
    console.log('📧 Sending completion email for date filtering feature...\n');

    try {
        // Initialize Resend with API key from environment
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            throw new Error('RESEND_API_KEY environment variable not found');
        }

        console.log('🔑 Using Resend API key:', apiKey.substring(0, 10) + '...');
        
        const resend = new Resend(apiKey);
        
        // Email content
        const emailData = {
            from: 'noreply@tai.chat',
            to: 'pixelwenbo@gmail.com',
            subject: '✅ Date Filtering Feature Completed - CF Mail Bridge',
            text: createTextContent(),
            html: createHtmlContent(),
            tags: [{ name: 'type', value: 'feature-completion' }]
        };

        console.log('📤 Sending email to:', emailData.to);
        console.log('📋 Subject:', emailData.subject);

        const result = await resend.emails.send(emailData);

        if (result.error) {
            console.error('❌ Failed to send email:', result.error);
            process.exit(1);
        } else {
            console.log('✅ Email sent successfully!');
            console.log('📧 Message ID:', result.data?.id);
            console.log('\n🎉 Date filtering feature implementation completed and notification sent!');
        }

    } catch (error) {
        console.error('❌ Error sending completion email:', error.message);
        process.exit(1);
    }
}

function createTextContent() {
    return `Date Filtering Feature Completed - CF Mail Bridge

Hi there!

I've successfully implemented the date filtering feature for the CF Mail Bridge email retrieval API as requested. Here's what was added:

## New Features Implemented:

✅ Database Layer Updates:
   - Enhanced getMessagesByUserId() method to support date filtering
   - Added date_from and date_to parameters
   - Optimized SQL queries with proper WHERE clauses

✅ API Endpoint Enhancements:
   - Updated /api/v1/messages endpoint to accept date filters
   - Added query parameters: date_from, date_to (YYYY-MM-DD format)
   - Implemented date validation with proper error handling

✅ Testing & Validation:
   - Created comprehensive test suite for date filtering
   - Tested edge cases and invalid date formats
   - Validated API responses and error handling

## API Usage Examples:

1. Get all messages:
   GET /api/v1/messages

2. Get messages from today:
   GET /api/v1/messages?date_from=2025-06-08&date_to=2025-06-08

3. Get messages from last week:
   GET /api/v1/messages?date_from=2025-06-01&date_to=2025-06-08

4. Get messages from specific date range:
   GET /api/v1/messages?date_from=2025-05-01&date_to=2025-05-31

## Technical Details:

- Date format: YYYY-MM-DD (ISO 8601)
- Database queries optimized for performance
- Proper error handling for invalid dates
- Backward compatible with existing API calls
- Combined with existing pagination (limit, offset)

The feature is now ready for deployment and testing!

Best regards,
Claude Code Assistant

---
This email was sent via the CF Mail Bridge service using Resend API.
Timestamp: ${new Date().toISOString()}`;
}

function createHtmlContent() {
    const timestamp = new Date().toISOString();
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Date Filtering Feature Completed</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            background: white;
            border-radius: 8px;
            padding: 30px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }
        h1 {
            color: #0066cc;
            border-bottom: 2px solid #0066cc;
            padding-bottom: 10px;
        }
        h2 {
            color: #333;
            margin-top: 30px;
        }
        .feature-list {
            background: #f8f9fa;
            border-left: 4px solid #28a745;
            padding: 15px;
            margin: 15px 0;
        }
        .feature-list li {
            margin: 8px 0;
        }
        .api-example {
            background: #f1f3f4;
            border: 1px solid #dadce0;
            border-radius: 4px;
            padding: 12px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            margin: 10px 0;
            overflow-x: auto;
        }
        .success-badge {
            background: #28a745;
            color: white;
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: bold;
        }
        .highlight {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 4px;
            padding: 15px;
            margin: 15px 0;
        }
        .footer {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #e0e0e0;
            font-size: 12px;
            color: #666;
            text-align: center;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎉 Date Filtering Feature Completed</h1>
        <p><strong>CF Mail Bridge</strong></p>
        
        <p>Hi there!</p>
        
        <p>I've successfully implemented the date filtering feature for the CF Mail Bridge email retrieval API as requested. Here's what was added:</p>

        <h2>✅ New Features Implemented</h2>
        
        <div class="feature-list">
            <h3><span class="success-badge">DATABASE</span> Layer Updates:</h3>
            <ul>
                <li>Enhanced <code>getMessagesByUserId()</code> method to support date filtering</li>
                <li>Added <code>date_from</code> and <code>date_to</code> parameters</li>
                <li>Optimized SQL queries with proper WHERE clauses</li>
            </ul>
        </div>

        <div class="feature-list">
            <h3><span class="success-badge">API</span> Endpoint Enhancements:</h3>
            <ul>
                <li>Updated <code>/api/v1/messages</code> endpoint to accept date filters</li>
                <li>Added query parameters: <code>date_from</code>, <code>date_to</code> (YYYY-MM-DD format)</li>
                <li>Implemented date validation with proper error handling</li>
            </ul>
        </div>

        <div class="feature-list">
            <h3><span class="success-badge">TESTING</span> & Validation:</h3>
            <ul>
                <li>Created comprehensive test suite for date filtering</li>
                <li>Tested edge cases and invalid date formats</li>
                <li>Validated API responses and error handling</li>
            </ul>
        </div>

        <h2>🚀 API Usage Examples</h2>
        
        <p><strong>1. Get all messages:</strong></p>
        <div class="api-example">GET /api/v1/messages</div>
        
        <p><strong>2. Get messages from today:</strong></p>
        <div class="api-example">GET /api/v1/messages?date_from=2025-06-08&date_to=2025-06-08</div>
        
        <p><strong>3. Get messages from last week:</strong></p>
        <div class="api-example">GET /api/v1/messages?date_from=2025-06-01&date_to=2025-06-08</div>
        
        <p><strong>4. Get messages from specific date range:</strong></p>
        <div class="api-example">GET /api/v1/messages?date_from=2025-05-01&date_to=2025-05-31</div>

        <div class="highlight">
            <h3>💡 Technical Details</h3>
            <ul>
                <li><strong>Date format:</strong> YYYY-MM-DD (ISO 8601)</li>
                <li><strong>Performance:</strong> Database queries optimized for performance</li>
                <li><strong>Error handling:</strong> Proper validation for invalid dates</li>
                <li><strong>Compatibility:</strong> Backward compatible with existing API calls</li>
                <li><strong>Pagination:</strong> Works with existing limit/offset parameters</li>
            </ul>
        </div>

        <p><strong>The feature is now ready for deployment and testing! 🎯</strong></p>
        
        <p>Best regards,<br>
        <strong>Claude Code Assistant</strong></p>
        
        <div class="footer">
            <p>This email was sent via the CF Mail Bridge service using Resend API.<br>
            Timestamp: ${timestamp}</p>
        </div>
    </div>
</body>
</html>`;
}

// Run the email sending
sendCompletionEmail();