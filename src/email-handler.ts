import { EmailMessage, ResendEmailOptions, EmailSendResult, Env } from './types';
import { DatabaseService } from './database';
import { getResendService, ResendEmailService } from './resend-service';
import PostalMime from 'postal-mime';
import TurndownService from 'turndown';

export class EmailHandler {
    private turndownService: any;
    private resendService: ResendEmailService;

    constructor(private dbService: DatabaseService, private env?: Env) {
        // Initialize TurndownService with error handling for Cloudflare Workers
        try {
            this.turndownService = new TurndownService({
                headingStyle: 'atx',
                codeBlockStyle: 'fenced',
                bulletListMarker: '-'
            });
            console.log('[EMAIL] TurndownService initialized successfully');
        } catch (error) {
            console.warn('[EMAIL] TurndownService initialization failed:', error);
            this.turndownService = null;
        }
        
        // Initialize Resend service if API key is available
        this.resendService = getResendService(env?.RESEND_API_KEY);
    }

    async handleIncomingEmail(message: EmailMessage): Promise<boolean> {
        try {
            // Extract username from email address (part before @)
            const toAddress = message.to;
            const username = this.extractUsernameFromEmail(toAddress);
            
            if (!username) {
                console.error('Invalid email format:', toAddress);
                return false;
            }

            // Find user by username
            const user = await this.dbService.getUserByUsername(username);
            if (!user) {
                console.error('User not found for email:', toAddress);
                return false;
            }

            // Generate unique message ID if not provided
            const messageId = this.generateMessageId();

            // Parse and clean email content
            const parsedMessage = this.parseEmailContent(message);

            // Store message in database
            const savedMessage = await this.dbService.createMessage(
                user.id,
                messageId,
                message.from,
                toAddress,
                parsedMessage.subject,
                parsedMessage.text,
                parsedMessage.html,
                JSON.stringify(message.headers || {}),
                message.size || 0
            );

            if (savedMessage) {
                console.log(`Message saved for user ${username}, message ID: ${messageId}`);
                return true;
            } else {
                console.error('Failed to save message to database');
                return false;
            }
        } catch (error) {
            console.error(`[EMAIL] Error handling incoming email from ${message.from}:`, error);
            return false;
        }
    }

    private extractUsernameFromEmail(email: string): string | null {
        try {
            // Validate email format
            if (!email || !email.includes('@')) {
                return null;
            }

            const parts = email.split('@');
            if (parts.length !== 2) {
                return null;
            }

            const fullUsername = parts[0].toLowerCase().trim();
            
            // Extract base username from prefix format (e.g., desktop.wenbo -> wenbo)
            // Support formats: prefix.username@tai.chat or just username@tai.chat
            let username = fullUsername;
            
            // Check if there's a prefix (contains a dot)
            if (fullUsername.includes('.')) {
                const prefixParts = fullUsername.split('.');
                // Take the last part as the username (e.g., desktop.wenbo -> wenbo)
                username = prefixParts[prefixParts.length - 1];
            }
            
            // Validate username format (alphanumeric and hyphens only)
            if (!/^[a-z0-9-]+$/.test(username)) {
                return null;
            }

            console.log(`[EMAIL] Extracted username '${username}' from email '${email}'`);
            return username;
        } catch (error) {
            return null;
        }
    }

    private parseEmailContent(message: EmailMessage): {
        subject: string | null;
        text: string | null;
        html: string | null;
    } {
        const cleanedHtml = this.cleanHtml(message.html);
        let textContent: string | null = null;

        // Convert HTML to markdown if HTML is available, otherwise use plain text
        if (cleanedHtml) {
            try {
                if (this.turndownService) {
                    textContent = this.turndownService.turndown(cleanedHtml);
                    console.log('[EMAIL] HTML to markdown conversion successful');
                } else {
                    console.warn('[EMAIL] TurndownService not available, using HTML stripping fallback');
                    textContent = this.htmlToTextFallback(cleanedHtml);
                }
            } catch (error) {
                console.warn('[EMAIL] Failed to convert HTML to markdown:', error);
                console.log('[EMAIL] Attempting HTML stripping fallback');
                textContent = this.htmlToTextFallback(cleanedHtml) || this.cleanText(message.text) || null;
            }
        } else {
            textContent = this.cleanText(message.text) || null;
        }

        return {
            subject: this.cleanText(message.subject) || null,
            text: textContent,
            html: cleanedHtml
        };
    }

    private cleanText(text: string | undefined): string | null {
        if (!text) return null;
        
        // Remove excessive whitespace and normalize line endings
        return text
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\n{3,}/g, '\n\n')
            .trim() || null;
    }

    private cleanHtml(html: string | undefined): string | null {
        if (!html) return null;
        
        console.log('[EMAIL] Processing HTML content');
        
        // Return HTML content as-is without sanitization
        return html.trim() || null;
    }

    private htmlToTextFallback(html: string): string | null {
        if (!html) return null;
        
        console.log('[EMAIL] Using HTML to text fallback conversion');
        
        try {
            // Basic HTML stripping fallback when TurndownService is not available
            let text = html
                // First, handle code blocks BEFORE other conversions to preserve formatting
                .replace(/<pre[^>]*><code[^>]*class=["']language-([^"']*)["'][^>]*>(.*?)<\/code><\/pre>/gis, (match, lang, code) => {
                    // Code block with language - decode entities and clean
                    const cleanCode = code
                        .replace(/<[^>]*>/g, '')
                        .replace(/&nbsp;/g, ' ')
                        .replace(/&amp;/g, '&')
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&quot;/g, '"')
                        .replace(/&#39;/g, "'")
                        .trim();
                    return `\n\`\`\`${lang}\n${cleanCode}\n\`\`\`\n`;
                })
                .replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, (match, code) => {
                    // Code block without language - decode entities and clean
                    const cleanCode = code
                        .replace(/<[^>]*>/g, '')
                        .replace(/&nbsp;/g, ' ')
                        .replace(/&amp;/g, '&')
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&quot;/g, '"')
                        .replace(/&#39;/g, "'")
                        .trim();
                    return `\n\`\`\`\n${cleanCode}\n\`\`\`\n`;
                })
                .replace(/<pre[^>]*>(.*?)<\/pre>/gis, (match, code) => {
                    // Plain pre block (fallback) - decode entities and clean
                    const cleanCode = code
                        .replace(/<[^>]*>/g, '')
                        .replace(/&nbsp;/g, ' ')
                        .replace(/&amp;/g, '&')
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&quot;/g, '"')
                        .replace(/&#39;/g, "'")
                        .trim();
                    return `\n\`\`\`\n${cleanCode}\n\`\`\`\n`;
                })
                
                // Convert common block elements to line breaks
                .replace(/<\/?(p|div|br|h[1-6]|li|tr|td|th)[^>]*>/gi, '\n')
                .replace(/<\/?(ul|ol|table)[^>]*>/gi, '\n\n')
                .replace(/<hr[^>]*>/gi, '\n---\n')
                
                // Convert basic formatting (inline code AFTER code blocks)
                .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
                .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
                .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
                .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
                .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
                
                // Convert monospace elements
                .replace(/<(tt|kbd|samp)[^>]*>(.*?)<\/\1>/gi, '`$2`')
                
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
                .replace(/&lt;/g, '&TEMP_LT;') // Temporary replacement to avoid conflict
                .replace(/&gt;/g, '&TEMP_GT;') // Temporary replacement to avoid conflict
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&hellip;/g, '...')
                
                // Remove all HTML tags
                .replace(/<[^>]*>/g, '')
                
                // Restore the temporary replacements
                .replace(/&TEMP_LT;/g, '<')
                .replace(/&TEMP_GT;/g, '>')
                
                // Clean up whitespace
                .replace(/\n\s*\n\s*\n/g, '\n\n') // Multiple line breaks to double
                .replace(/[ \t]+/g, ' ') // Multiple spaces to single space
                .trim();
            
            console.log('[EMAIL] HTML fallback conversion completed');
            return text || null;
            
        } catch (error) {
            console.error('[EMAIL] HTML fallback conversion failed:', error);
            return null;
        }
    }

    private generateMessageId(): string {
        // Generate a unique message ID
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        return `${timestamp}-${random}`;
    }

    // Process raw email from Cloudflare Email Workers
    async processCloudflareEmail(message: any): Promise<boolean> {
        try {
            console.log('[EMAIL] Message object received');
            console.log('[EMAIL] Message from:', message.from);
            console.log('[EMAIL] Message to:', message.to);
            
            // Extract basic metadata
            const from = message.from;
            const to = message.to;
            
            // Use postal-mime to parse the raw email stream
            let emailContent: any;
            
            try {
                // Get the raw email stream
                const rawEmail = new Response(message.raw);
                const arrayBuffer = await rawEmail.arrayBuffer();
                
                console.log('[EMAIL] Raw email size:', arrayBuffer.byteLength);
                
                // Parse using postal-mime
                const parser = new PostalMime();
                emailContent = await parser.parse(arrayBuffer);
                
                console.log('[EMAIL] Parsed email content:', {
                    hasText: !!emailContent.text,
                    hasHtml: !!emailContent.html,
                    subject: emailContent.subject,
                    textLength: emailContent.text?.length || 0,
                    htmlLength: emailContent.html?.length || 0
                });
            } catch (error) {
                console.error('[EMAIL] Error parsing email with postal-mime:', error);
                return false;
            }
            
            // Extract headers
            const headers: Record<string, string> = {};
            if (emailContent.headers && Array.isArray(emailContent.headers)) {
                for (const header of emailContent.headers) {
                    if (header && typeof header === 'object') {
                        for (const [key, value] of Object.entries(header)) {
                            headers[key.toLowerCase()] = String(value);
                        }
                    }
                }
            }
            
            const emailMessage: EmailMessage = {
                from: from || emailContent.from?.address || '',
                to: to || emailContent.to?.[0]?.address || '',
                subject: emailContent.subject || headers['subject'] || '',
                text: emailContent.text || '',
                html: emailContent.html || '',
                headers: headers,
                size: (emailContent.text?.length || 0) + (emailContent.html?.length || 0)
            };
            
            console.log('[EMAIL] Final email message:', {
                from: emailMessage.from,
                to: emailMessage.to,
                subject: emailMessage.subject,
                textLength: emailMessage.text?.length || 0,
                htmlLength: emailMessage.html?.length || 0,
                headersCount: Object.keys(emailMessage.headers || {}).length
            });

            return await this.handleIncomingEmail(emailMessage);
        } catch (error) {
            console.error('[EMAIL] Error processing Cloudflare email:', error);
            return false;
        }
    }


    private parseHeaders(headers: any): Record<string, string> {
        if (!headers) return {};
        
        try {
            if (typeof headers === 'string') {
                return JSON.parse(headers);
            }
            
            if (typeof headers === 'object') {
                return headers;
            }
            
            return {};
        } catch (error) {
            return {};
        }
    }

    private calculateEmailSize(email: any): number {
        try {
            const textSize = email.text ? new TextEncoder().encode(email.text).length : 0;
            const htmlSize = email.html ? new TextEncoder().encode(email.html).length : 0;
            const headersSize = email.headers ? new TextEncoder().encode(JSON.stringify(email.headers)).length : 0;
            
            return textSize + htmlSize + headersSize;
        } catch (error) {
            return 0;
        }
    }

    // Validate email before processing
    validateEmail(email: EmailMessage): boolean {
        if (!email.from || !email.to) {
            return false;
        }

        // Basic email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!emailRegex.test(email.from) || !emailRegex.test(email.to)) {
            return false;
        }

        // Check if it's for our domain (tai.chat)
        if (!email.to.endsWith('@tai.chat')) {
            return false;
        }

        return true;
    }

    // Resend email sending methods
    async sendEmail(options: ResendEmailOptions): Promise<EmailSendResult> {
        try {
            console.log('[EMAIL] Sending email via Resend:', {
                from: options.from,
                to: options.to,
                subject: options.subject
            });

            const result = await this.resendService.sendEmail(options);
            
            if (result.success) {
                console.log('[EMAIL] Email sent successfully:', result.messageId);
            } else {
                console.error('[EMAIL] Failed to send email:', result.error);
            }
            
            return result;
        } catch (error) {
            console.error('[EMAIL] Error sending email:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                retryable: false
            };
        }
    }

    async sendReply(originalMessage: EmailMessage, replyContent: string, replyHtml?: string): Promise<EmailSendResult> {
        try {
            const subject = originalMessage.subject?.startsWith('Re:') 
                ? originalMessage.subject 
                : `Re: ${originalMessage.subject || 'No Subject'}`;

            const emailOptions: ResendEmailOptions = {
                from: 'noreply@tai.chat', // Default reply address
                to: originalMessage.from,
                subject: subject,
                text: replyContent,
                html: replyHtml,
                replyTo: originalMessage.to,
                headers: {
                    'In-Reply-To': originalMessage.headers?.['message-id'] || '',
                    'References': originalMessage.headers?.['message-id'] || ''
                }
            };

            return await this.sendEmail(emailOptions);
        } catch (error) {
            console.error('[EMAIL] Error sending reply:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                retryable: false
            };
        }
    }

    async sendNotification(to: string, subject: string, message: string, messageHtml?: string): Promise<EmailSendResult> {
        try {
            const emailOptions: ResendEmailOptions = {
                from: 'notifications@tai.chat', // Default notification address
                to: to,
                subject: subject,
                text: message,
                html: messageHtml,
                tags: [{ name: 'type', value: 'notification' }]
            };

            return await this.sendEmail(emailOptions);
        } catch (error) {
            console.error('[EMAIL] Error sending notification:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                retryable: false
            };
        }
    }

    async sendBulkEmails(emails: ResendEmailOptions[]): Promise<EmailSendResult[]> {
        try {
            console.log('[EMAIL] Sending bulk emails:', emails.length);
            const results = await this.resendService.sendBulkEmails(emails);
            
            const successCount = results.filter(r => r.success).length;
            const failureCount = results.length - successCount;
            
            console.log('[EMAIL] Bulk email results:', { 
                total: results.length, 
                success: successCount, 
                failed: failureCount 
            });
            
            return results;
        } catch (error) {
            console.error('[EMAIL] Error sending bulk emails:', error);
            return emails.map(() => ({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                retryable: false
            }));
        }
    }

    async validateEmailAddress(email: string): Promise<boolean> {
        return await this.resendService.validateEmailAddress(email);
    }

    getResendConfiguration(): { initialized: boolean; hasApiKey: boolean } {
        return this.resendService.getConfiguration();
    }

    async healthCheckResend(): Promise<boolean> {
        return await this.resendService.healthCheck();
    }
}