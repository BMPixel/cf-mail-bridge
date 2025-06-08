import { EmailMessage } from './types';
import { DatabaseService } from './database';

export class EmailHandler {
    constructor(private dbService: DatabaseService) {}

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

    private parseEmailContent(message: EmailMessage): {
        subject: string | null;
        text: string | null;
        html: string | null;
    } {
        return {
            subject: this.cleanText(message.subject) || null,
            text: this.cleanText(message.text) || null,
            html: this.cleanHtml(message.html) || null
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
        
        console.log('[EMAIL] Sanitizing HTML content');
        const originalLength = html.length;
        
        // Basic HTML cleaning - remove dangerous scripts and normalize
        const cleaned = html
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '')
            .trim() || null;
            
        if (cleaned && cleaned.length < originalLength) {
            console.log(`[EMAIL] Removed ${originalLength - cleaned.length} chars of potentially malicious content`);
        }
        
        return cleaned;
    }

    private generateMessageId(): string {
        // Generate a unique message ID
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 15);
        return `${timestamp}-${random}`;
    }

    // Process raw email from Cloudflare Email Workers
    async processCloudflareEmail(email: any): Promise<boolean> {
        try {
            console.log('[EMAIL] Raw email object received:', JSON.stringify(email, null, 2));
            console.log('[EMAIL] Email properties available:', Object.keys(email));
            
            // Check if email has a ReadableStream for content
            if (email.stream && typeof email.stream.getReader === 'function') {
                console.log('[EMAIL] Email has ReadableStream, attempting to read content');
                const reader = email.stream.getReader();
                const chunks: Uint8Array[] = [];
                
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        chunks.push(value);
                    }
                } finally {
                    reader.releaseLock();
                }
                
                // Combine chunks and decode
                const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
                const combined = new Uint8Array(totalLength);
                let offset = 0;
                for (const chunk of chunks) {
                    combined.set(chunk, offset);
                    offset += chunk.length;
                }
                
                const rawContent = new TextDecoder().decode(combined);
                console.log('[EMAIL] Raw email content from stream:', rawContent.substring(0, 1000) + '...');
                
                // Parse the raw email content (basic MIME parsing)
                const parsedContent = this.parseRawEmail(rawContent);
                
                const emailMessage: EmailMessage = {
                    from: email.from || parsedContent.from || '',
                    to: email.to || parsedContent.to || '',
                    subject: email.subject || parsedContent.subject,
                    text: parsedContent.text,
                    html: parsedContent.html,
                    headers: this.parseHeaders(email.headers || parsedContent.headers),
                    size: rawContent.length
                };
                
                console.log('[EMAIL] Parsed email message:', {
                    from: emailMessage.from,
                    to: emailMessage.to,
                    subject: emailMessage.subject,
                    textLength: emailMessage.text?.length || 0,
                    htmlLength: emailMessage.html?.length || 0
                });
                
                return await this.handleIncomingEmail(emailMessage);
            } else {
                // Direct property access (fallback)
                console.log('[EMAIL] No stream found, using direct property access');
                const emailMessage: EmailMessage = {
                    from: email.from || '',
                    to: email.to || '',
                    subject: email.subject,
                    text: email.text,
                    html: email.html,
                    headers: this.parseHeaders(email.headers),
                    size: this.calculateEmailSize(email)
                };
                
                console.log('[EMAIL] Direct access email message:', {
                    from: emailMessage.from,
                    to: emailMessage.to,
                    subject: emailMessage.subject,
                    textLength: emailMessage.text?.length || 0,
                    htmlLength: emailMessage.html?.length || 0
                });

                return await this.handleIncomingEmail(emailMessage);
            }
        } catch (error) {
            console.error('[EMAIL] Error processing Cloudflare email:', error);
            return false;
        }
    }

    private parseRawEmail(rawContent: string): {
        from?: string;
        to?: string;
        subject?: string;
        text?: string;
        html?: string;
        headers?: Record<string, string>;
    } {
        const lines = rawContent.split('\n');
        const headers: Record<string, string> = {};
        let bodyStartIndex = 0;
        let currentHeader = '';
        
        // Parse headers
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Empty line indicates end of headers
            if (line.trim() === '') {
                bodyStartIndex = i + 1;
                break;
            }
            
            // Check if this is a continuation of the previous header
            if (line.startsWith(' ') || line.startsWith('\t')) {
                if (currentHeader) {
                    headers[currentHeader] += ' ' + line.trim();
                }
            } else {
                // New header
                const colonIndex = line.indexOf(':');
                if (colonIndex > 0) {
                    currentHeader = line.substring(0, colonIndex).toLowerCase().trim();
                    headers[currentHeader] = line.substring(colonIndex + 1).trim();
                }
            }
        }
        
        // Extract body content
        const bodyContent = lines.slice(bodyStartIndex).join('\n');
        
        // Simple MIME parsing for multipart content
        let text: string | undefined;
        let html: string | undefined;
        
        const contentType = headers['content-type'] || '';
        if (contentType.includes('multipart/')) {
            const boundaryMatch = contentType.match(/boundary=([^;]+)/);
            if (boundaryMatch) {
                const boundary = boundaryMatch[1].replace(/"/g, '');
                const parts = bodyContent.split(`--${boundary}`);
                
                for (const part of parts) {
                    const partLines = part.split('\n');
                    let partBodyStart = 0;
                    let partContentType = '';
                    
                    // Parse part headers
                    for (let i = 0; i < partLines.length; i++) {
                        if (partLines[i].trim() === '') {
                            partBodyStart = i + 1;
                            break;
                        }
                        if (partLines[i].toLowerCase().startsWith('content-type:')) {
                            partContentType = partLines[i].substring(13).trim();
                        }
                    }
                    
                    const partBody = partLines.slice(partBodyStart).join('\n').trim();
                    
                    if (partContentType.includes('text/plain') && !text) {
                        text = partBody;
                    } else if (partContentType.includes('text/html') && !html) {
                        html = partBody;
                    }
                }
            }
        } else {
            // Single part email
            if (contentType.includes('text/html')) {
                html = bodyContent;
            } else {
                text = bodyContent;
            }
        }
        
        return {
            from: headers['from'],
            to: headers['to'],
            subject: headers['subject'],
            text: text || undefined,
            html: html || undefined,
            headers
        };
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

        // Check if it's for our domain (agent.tai.chat)
        if (!email.to.endsWith('@agent.tai.chat')) {
            return false;
        }

        return true;
    }
}