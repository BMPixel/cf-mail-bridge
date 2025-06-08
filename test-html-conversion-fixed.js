#!/usr/bin/env node

/**
 * Test the improved HTML to markdown conversion with fallback
 */

function testHtmlToTextFallback() {
    console.log('🧪 Testing HTML to Text Fallback Conversion');
    console.log('============================================\n');

    // Replicate the fallback function from EmailHandler
    function htmlToTextFallback(html) {
        if (!html) return null;
        
        console.log('[TEST] Using HTML to text fallback conversion');
        
        try {
            // Basic HTML stripping fallback when TurndownService is not available
            let text = html
                // Convert common block elements to line breaks
                .replace(/<\/?(p|div|br|h[1-6]|li|tr|td|th)[^>]*>/gi, '\n')
                .replace(/<\/?(ul|ol|table)[^>]*>/gi, '\n\n')
                .replace(/<hr[^>]*>/gi, '\n---\n')
                
                // Convert basic formatting
                .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
                .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
                .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
                .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
                .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
                
                // Convert links
                .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)')
                
                // Convert headings
                .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
                .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
                .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n')
                .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n')
                .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n')
                .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n')
                
                // Remove all other HTML tags
                .replace(/<[^>]*>/g, '')
                
                // Decode common HTML entities
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&hellip;/g, '...')
                
                // Clean up whitespace
                .replace(/\n\s*\n\s*\n/g, '\n\n') // Multiple line breaks to double
                .replace(/[ \t]+/g, ' ') // Multiple spaces to single space
                .trim();
            
            console.log('[TEST] HTML fallback conversion completed');
            return text || null;
            
        } catch (error) {
            console.error('[TEST] HTML fallback conversion failed:', error);
            return null;
        }
    }

    const testCases = [
        {
            name: 'Sample Email HTML (from test samples)',
            html: '<html><body><p>This is an <strong>HTML</strong> test message.</p><p>Best regards,<br>Test Sender</p></body></html>'
        },
        {
            name: 'Rich Newsletter Email',
            html: `<div style="font-family: Arial, sans-serif; max-width: 600px;">
                <h2 style="color: #333;">📧 Weekly Newsletter</h2>
                <p>Here are this week's highlights:</p>
                <ul>
                    <li><strong>Feature Update:</strong> New dashboard released</li>
                    <li><strong>Bug Fix:</strong> Login issues resolved</li>
                    <li><strong>Announcement:</strong> Maintenance scheduled for Sunday</li>
                </ul>
                <p>Visit our <a href="https://example.com">website</a> for more details.</p>
                <hr>
                <p><em>This is an automated email.</em></p>
                </div>`
        },
        {
            name: 'Complex HTML with Tables',
            html: `<html><body>
                <h1>Monthly Report</h1>
                <p>Dear User,</p>
                <p>Here's your <strong>monthly summary</strong>:</p>
                <table border="1">
                    <tr><th>Metric</th><th>Value</th></tr>
                    <tr><td>Messages</td><td>42</td></tr>
                    <tr><td>Storage</td><td>1.2GB</td></tr>
                </table>
                <p>Thanks for using our service!</p>
                </body></html>`
        },
        {
            name: 'Email with Entities',
            html: `<p>Price: $99 &amp; up</p>
                   <p>Quote: &quot;Hello World&quot;</p>
                   <p>Spaces:&nbsp;&nbsp;&nbsp;multiple&nbsp;spaces</p>
                   <p>More: &lt;tag&gt; &hellip;</p>`
        },
        {
            name: 'Malformed HTML',
            html: `<p>Unclosed tags <strong>bold text
                   <div>Mixed content</div>
                   <br>Line break
                   Missing closing tags`
        }
    ];

    testCases.forEach((testCase, index) => {
        console.log(`${index + 1}️⃣ Testing: ${testCase.name}`);
        console.log('-'.repeat(60));
        
        console.log('📥 Input HTML:');
        console.log(testCase.html);
        console.log();
        
        const result = htmlToTextFallback(testCase.html);
        
        console.log('📤 Output Text/Markdown:');
        console.log(result || '(null)');
        console.log();
        
        // Quality checks
        const issues = [];
        if (result && result.includes('<')) {
            issues.push('Contains HTML tags (incomplete conversion)');
        }
        if (!result || result.trim() === '') {
            issues.push('Empty or null output');
        }
        if (result && result.includes('&')) {
            const unconvertedEntities = result.match(/&[a-zA-Z0-9#]+;/g);
            if (unconvertedEntities) {
                issues.push(`Unconverted HTML entities: ${unconvertedEntities.join(', ')}`);
            }
        }
        
        if (issues.length > 0) {
            console.log('⚠️  Issues detected:');
            issues.forEach(issue => console.log(`   - ${issue}`));
        } else {
            console.log('✅ Conversion looks good');
        }
        
        console.log('═'.repeat(70));
        console.log();
    });
}

function testEmailHandlerLogic() {
    console.log('\n🔧 Testing Complete EmailHandler Logic');
    console.log('======================================\n');

    // Mock TurndownService that fails (simulating Cloudflare Workers issue)
    const mockTurndownService = {
        turndown: function(html) {
            throw new Error('TurndownService not available in Cloudflare Workers');
        }
    };

    function parseEmailContent(message, useFallback = false) {
        const cleanedHtml = message.html ? message.html.trim() : null;
        let textContent = null;

        console.log(`📧 Processing: ${message.subject}`);
        console.log(`🧹 Cleaned HTML: ${cleanedHtml ? 'Available' : 'Not available'}`);

        if (cleanedHtml) {
            try {
                if (!useFallback) {
                    textContent = mockTurndownService.turndown(cleanedHtml);
                    console.log('✅ TurndownService conversion successful');
                } else {
                    throw new Error('Using fallback mode');
                }
            } catch (error) {
                console.warn('⚠️  TurndownService failed:', error.message);
                console.log('🔄 Attempting HTML stripping fallback');
                textContent = htmlToTextFallback(cleanedHtml) || message.text || null;
            }
        } else {
            textContent = message.text || null;
            console.log('📝 Using plain text (no HTML available)');
        }

        return {
            subject: message.subject,
            text: textContent,
            html: cleanedHtml
        };
    }

    // Same fallback function as above
    function htmlToTextFallback(html) {
        if (!html) return null;
        
        try {
            let text = html
                .replace(/<\/?(p|div|br|h[1-6]|li|tr|td|th)[^>]*>/gi, '\n')
                .replace(/<\/?(ul|ol|table)[^>]*>/gi, '\n\n')
                .replace(/<hr[^>]*>/gi, '\n---\n')
                .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
                .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
                .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
                .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
                .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
                .replace(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi, '[$2]($1)')
                .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n')
                .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n')
                .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n')
                .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n')
                .replace(/<h5[^>]*>(.*?)<\/h5>/gi, '##### $1\n')
                .replace(/<h6[^>]*>(.*?)<\/h6>/gi, '###### $1\n')
                .replace(/<[^>]*>/g, '')
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&hellip;/g, '...')
                .replace(/\n\s*\n\s*\n/g, '\n\n')
                .replace(/[ \t]+/g, ' ')
                .trim();
            
            return text || null;
        } catch (error) {
            return null;
        }
    }

    const testMessage = {
        subject: 'Test Email with HTML',
        text: 'This is plain text fallback.',
        html: '<html><body><h1>Welcome!</h1><p>This is an <strong>HTML</strong> message with <a href="https://example.com">a link</a>.</p><ul><li>Item 1</li><li>Item 2</li></ul></body></html>'
    };

    console.log('Testing with fallback mode (simulating TurndownService failure)...');
    const result = parseEmailContent(testMessage, true);
    
    console.log('\n📊 Final Result:');
    console.log('Subject:', result.subject);
    console.log('Text length:', result.text?.length || 0);
    console.log('HTML available:', !!result.html);
    console.log('\nProcessed text:');
    console.log(result.text);
}

// Run tests
testHtmlToTextFallback();
testEmailHandlerLogic();

console.log('\n✅ HTML to Markdown conversion testing completed!');
console.log('\n💡 The fallback mechanism should handle TurndownService failures gracefully.');