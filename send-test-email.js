/**
 * Script to send a test email using the new Resend integration
 */

const BASE_URL = process.env.TEST_URL || 'https://cf-mail-bridge.panwenbo.workers.dev';

async function sendTestEmail(toEmail) {
    console.log('📧 Sending test email via Resend integration...');
    console.log(`📍 Target URL: ${BASE_URL}/api/v1/send-test-email`);
    console.log(`📮 Recipient: ${toEmail}`);
    
    try {
        const response = await fetch(`${BASE_URL}/api/v1/send-test-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                to: toEmail,
                subject: '🎉 Resend Integration Test - CF Mail Bridge',
                message: 'This test email confirms that the Resend integration is working correctly with your CF Mail Bridge service!',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #0066cc; margin-bottom: 10px;">🎉 Resend Integration Success!</h1>
                            <p style="color: #666; font-size: 18px;">CF Mail Bridge × Resend</p>
                        </div>
                        
                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px;">
                            <h2 style="margin: 0 0 15px 0;">✅ Integration Test Successful</h2>
                            <p style="margin: 0; opacity: 0.9;">Your Cloudflare Mail Bridge service is now successfully integrated with Resend!</p>
                        </div>
                        
                        <div style="background: #f8f9fa; padding: 25px; border-radius: 8px; margin-bottom: 25px;">
                            <h3 style="color: #333; margin: 0 0 15px 0;">📊 Service Details</h3>
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr style="border-bottom: 1px solid #e9ecef;">
                                    <td style="padding: 8px 0; font-weight: bold; color: #555;">Service:</td>
                                    <td style="padding: 8px 0; color: #333;">CF Mail Bridge</td>
                                </tr>
                                <tr style="border-bottom: 1px solid #e9ecef;">
                                    <td style="padding: 8px 0; font-weight: bold; color: #555;">Email Provider:</td>
                                    <td style="padding: 8px 0; color: #333;">Resend</td>
                                </tr>
                                <tr style="border-bottom: 1px solid #e9ecef;">
                                    <td style="padding: 8px 0; font-weight: bold; color: #555;">From Domain:</td>
                                    <td style="padding: 8px 0; color: #333;">agent.tai.chat</td>
                                </tr>
                                <tr style="border-bottom: 1px solid #e9ecef;">
                                    <td style="padding: 8px 0; font-weight: bold; color: #555;">Test Time:</td>
                                    <td style="padding: 8px 0; color: #333;">${new Date().toLocaleString()}</td>
                                </tr>
                                <tr>
                                    <td style="padding: 8px 0; font-weight: bold; color: #555;">Status:</td>
                                    <td style="padding: 8px 0; color: #28a745; font-weight: bold;">🟢 Active & Working</td>
                                </tr>
                            </table>
                        </div>
                        
                        <div style="background: #e7f3ff; border: 1px solid #b8daff; padding: 20px; border-radius: 6px; margin-bottom: 25px;">
                            <h4 style="color: #004085; margin: 0 0 10px 0;">🚀 What's Next?</h4>
                            <ul style="color: #004085; margin: 0; padding-left: 20px;">
                                <li>Your Resend integration is fully operational</li>
                                <li>Email sending capabilities are now available</li>
                                <li>Retry logic and error handling are configured</li>
                                <li>Circuit breaker protection is active</li>
                            </ul>
                        </div>
                        
                        <div style="text-align: center; padding: 20px 0; border-top: 1px solid #eee;">
                            <p style="color: #666; margin: 0; font-size: 14px;">
                                This email was sent via <strong>CF Mail Bridge</strong> using <strong>Resend</strong><br>
                                Powered by Cloudflare Workers
                            </p>
                        </div>
                    </div>
                `
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            console.log('✅ Email sent successfully!');
            console.log('📧 Details:');
            console.log(`   - Message ID: ${data.data.messageId}`);
            console.log(`   - To: ${data.data.to}`);
            console.log(`   - Subject: ${data.data.subject}`);
            console.log(`   - Timestamp: ${data.data.timestamp}`);
            console.log('\n🎉 Check your inbox for the test email!');
        } else {
            console.error('❌ Email sending failed:');
            console.error('   Error:', data.error?.message || 'Unknown error');
            console.error('   Status:', response.status);
        }
        
    } catch (error) {
        console.error('❌ Network error occurred:');
        console.error('   Error:', error.message);
        console.error('\n💡 Make sure the service is deployed and RESEND_API_KEY is configured.');
    }
}

// Get email from command line argument or use default
const targetEmail = process.argv[2] || 'panwenbo@gmail.com';

console.log('🧪 CF Mail Bridge - Resend Integration Test');
console.log('=============================================');

sendTestEmail(targetEmail);