#!/usr/bin/env node

/**
 * Test code and monospace handling in HTML to markdown conversion
 */

import TurndownService from 'turndown';

function testCodeHandling() {
    console.log('🧪 Testing Code and Monospace Handling');
    console.log('======================================\n');

    // Test with TurndownService first
    const turndownService = new TurndownService({
        headingStyle: 'atx',
        codeBlockStyle: 'fenced',
        bulletListMarker: '-'
    });

    // Current fallback function
    function htmlToTextFallback(html) {
        if (!html) return null;
        
        console.log('[FALLBACK] Processing HTML with fallback method');
        
        try {
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
                
                // Decode common HTML entities first (before removing tags)
                .replace(/&nbsp;/g, ' ')
                .replace(/&amp;/g, '&')
                .replace(/&lt;/g, '&TEMP_LT;')
                .replace(/&gt;/g, '&TEMP_GT;')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&hellip;/g, '...')
                
                // Remove all HTML tags
                .replace(/<[^>]*>/g, '')
                
                // Restore the temporary replacements
                .replace(/&TEMP_LT;/g, '<')
                .replace(/&TEMP_GT;/g, '>')
                
                // Clean up whitespace
                .replace(/\n\s*\n\s*\n/g, '\n\n')
                .replace(/[ \t]+/g, ' ')
                .trim();
            
            return text || null;
        } catch (error) {
            console.error('[FALLBACK] Conversion failed:', error);
            return null;
        }
    }

    const codeTestCases = [
        {
            name: 'Inline Code',
            html: '<p>Use the <code>console.log()</code> function to debug.</p>'
        },
        {
            name: 'Code Block with <pre><code>',
            html: `<pre><code>function hello() {
    console.log("Hello World!");
    return true;
}</code></pre>`
        },
        {
            name: 'Code Block with Language',
            html: `<pre><code class="language-javascript">const greeting = "Hello";
console.log(greeting + " World!");</code></pre>`
        },
        {
            name: 'Multiple Code Blocks',
            html: `<p>JavaScript example:</p>
                   <pre><code>let x = 5;
let y = 10;</code></pre>
                   <p>Python example:</p>
                   <pre><code>x = 5
y = 10</code></pre>`
        },
        {
            name: 'Mixed Content with Code',
            html: `<h2>API Documentation</h2>
                   <p>To make a request, use <code>fetch()</code>:</p>
                   <pre><code>fetch('/api/messages')
  .then(response => response.json())
  .then(data => console.log(data));</code></pre>
                   <p>The response will be in <code>JSON</code> format.</p>`
        },
        {
            name: 'Code with HTML Entities',
            html: `<pre><code>if (x &lt; y &amp;&amp; y &gt; 0) {
    console.log(&quot;condition met&quot;);
}</code></pre>`
        },
        {
            name: 'Monospace Font Elements',
            html: `<p>File path: <tt>/var/log/app.log</tt></p>
                   <p>Command: <kbd>npm install</kbd></p>
                   <p>Output: <samp>Package installed successfully</samp></p>`
        },
        {
            name: 'Complex Email with Code',
            html: `<div>
                <h1>Welcome to our API</h1>
                <p>Here's how to get started:</p>
                <ol>
                    <li>Install the SDK: <code>npm install our-sdk</code></li>
                    <li>Initialize in your code:</li>
                </ol>
                <pre><code>const SDK = require('our-sdk');
const client = new SDK({
    apiKey: 'your-key-here',
    endpoint: 'https://api.example.com'
});

// Make your first request
client.getMessages()
    .then(messages => {
        console.log('Messages:', messages);
    })
    .catch(error => {
        console.error('Error:', error);
    });</code></pre>
                <p>For more examples, visit our <a href="https://docs.example.com">documentation</a>.</p>
                </div>`
        }
    ];

    codeTestCases.forEach((testCase, index) => {
        console.log(`${index + 1}️⃣ Testing: ${testCase.name}`);
        console.log('-'.repeat(60));
        
        console.log('📥 Input HTML:');
        console.log(testCase.html);
        console.log();
        
        // Test with TurndownService
        console.log('🔄 TurndownService Result:');
        try {
            const turndownResult = turndownService.turndown(testCase.html);
            console.log(turndownResult);
        } catch (error) {
            console.log('❌ TurndownService failed:', error.message);
        }
        console.log();
        
        // Test with fallback
        console.log('🔄 Fallback Result:');
        const fallbackResult = htmlToTextFallback(testCase.html);
        console.log(fallbackResult || '(null)');
        console.log();
        
        // Quality assessment
        const issues = [];
        if (fallbackResult) {
            if (!fallbackResult.includes('`') && testCase.html.includes('<code>')) {
                issues.push('Missing inline code formatting (backticks)');
            }
            if (!fallbackResult.includes('```') && testCase.html.includes('<pre><code>')) {
                issues.push('Missing code block formatting (fenced blocks)');
            }
            if (fallbackResult.includes('<') && fallbackResult.includes('>')) {
                issues.push('Unprocessed HTML tags or entities');
            }
        }
        
        if (issues.length > 0) {
            console.log('⚠️  Issues detected:');
            issues.forEach(issue => console.log(`   - ${issue}`));
        } else {
            console.log('✅ Code handling looks good');
        }
        
        console.log('═'.repeat(80));
        console.log();
    });
}

// Run the test
testCodeHandling();

console.log('\n📊 Summary:');
console.log('- TurndownService handles code blocks excellently with fenced blocks');
console.log('- Current fallback handles inline code well but needs improvement for code blocks');
console.log('- Need to enhance fallback for <pre><code> -> ``` conversion');