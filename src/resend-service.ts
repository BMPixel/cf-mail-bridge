import { Resend } from 'resend';
import { ResendEmailOptions, ResendEmailResponse, EmailSendResult } from './types';
import { EnhancedRetryService, RetryConfig } from './retry-service';

export class ResendEmailService {
    private resend: Resend | null = null;
    private apiKey: string | null = null;
    private initialized = false;
    private retryService: EnhancedRetryService;

    constructor(apiKey?: string, retryConfig?: Partial<RetryConfig>) {
        this.retryService = new EnhancedRetryService(retryConfig);
        if (apiKey) {
            this.initialize(apiKey);
        }
    }

    initialize(apiKey: string): void {
        if (!apiKey) {
            throw new Error('Resend API key is required');
        }
        
        this.apiKey = apiKey;
        this.resend = new Resend(apiKey);
        this.initialized = true;
        console.log('[RESEND] Service initialized');
    }

    private ensureInitialized(): void {
        if (!this.initialized || !this.resend) {
            throw new Error('Resend service not initialized. Call initialize() with API key first.');
        }
    }

    async sendEmail(options: ResendEmailOptions): Promise<EmailSendResult> {
        this.ensureInitialized();
        
        return await this.retryService.executeEmailOperation(
            async () => {
                console.log('[RESEND] Sending email:', {
                    from: options.from,
                    to: Array.isArray(options.to) ? options.to : [options.to],
                    subject: options.subject
                });

                const emailData: any = {
                    from: options.from,
                    to: Array.isArray(options.to) ? options.to : [options.to],
                    subject: options.subject,
                    cc: options.cc,
                    bcc: options.bcc,
                    replyTo: options.replyTo,
                    tags: options.tags,
                    headers: options.headers,
                    attachments: options.attachments
                };

                // Add content - at least one of text or html is required
                if (options.html) {
                    emailData.html = options.html;
                }
                if (options.text) {
                    emailData.text = options.text;
                }
                
                // If neither html nor text is provided, add a default text
                if (!options.html && !options.text) {
                    emailData.text = 'This email was sent via Resend service.';
                }

                const result = await this.resend!.emails.send(emailData);

                if (result.error) {
                    console.error('[RESEND] Send failed:', result.error);
                    const error = new Error(result.error.message);
                    (error as any).retryable = this.isRetryableError(result.error);
                    (error as any).status = result.error.name === 'rate_limit_exceeded' ? 429 : 500;
                    throw error;
                }

                console.log('[RESEND] Email sent successfully:', result.data?.id);
                return {
                    success: true,
                    messageId: result.data?.id
                };
            },
            `send email to ${Array.isArray(options.to) ? options.to[0] : options.to}`
        );
    }

    async sendTemplatedEmail(
        templateId: string,
        templateData: Record<string, any>,
        options: Omit<ResendEmailOptions, 'html' | 'text'>
    ): Promise<EmailSendResult> {
        this.ensureInitialized();
        
        try {
            console.log('[RESEND] Sending templated email:', {
                template: templateId,
                from: options.from,
                to: Array.isArray(options.to) ? options.to : [options.to],
                subject: options.subject
            });

            const emailData: any = {
                from: options.from,
                to: Array.isArray(options.to) ? options.to : [options.to],
                subject: options.subject,
                cc: options.cc,
                bcc: options.bcc,
                replyTo: options.replyTo,
                tags: options.tags,
                headers: options.headers,
                attachments: options.attachments,
                // Template support might vary
                template: templateId,
                template_data: templateData
            };

            const result = await this.resend!.emails.send(emailData);

            if (result.error) {
                console.error('[RESEND] Template send failed:', result.error);
                return {
                    success: false,
                    error: result.error.message,
                    retryable: this.isRetryableError(result.error)
                };
            }

            console.log('[RESEND] Templated email sent successfully:', result.data?.id);
            return {
                success: true,
                messageId: result.data?.id
            };

        } catch (error) {
            console.error('[RESEND] Unexpected template error:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                retryable: this.isRetryableError(error)
            };
        }
    }

    async sendBulkEmails(emails: ResendEmailOptions[]): Promise<EmailSendResult[]> {
        this.ensureInitialized();
        
        const results: EmailSendResult[] = [];
        const batchSize = 100; // Resend's typical batch limit
        
        for (let i = 0; i < emails.length; i += batchSize) {
            const batch = emails.slice(i, i + batchSize);
            const batchPromises = batch.map(email => this.sendEmail(email));
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
            
            // Rate limiting - small delay between batches
            if (i + batchSize < emails.length) {
                await this.delay(100);
            }
        }
        
        return results;
    }

    async validateEmailAddress(email: string): Promise<boolean> {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return false;
        }

        // Additional validation can be added here
        // For now, basic regex validation
        return true;
    }

    async getEmailStatus(messageId: string): Promise<any> {
        this.ensureInitialized();
        
        try {
            // Note: Resend API might not have direct status endpoint
            // This would depend on webhook implementation
            console.log('[RESEND] Getting email status for:', messageId);
            
            // Placeholder for status retrieval
            return {
                id: messageId,
                status: 'unknown'
            };
        } catch (error) {
            console.error('[RESEND] Error getting email status:', error);
            throw error;
        }
    }

    private isRetryableError(error: any): boolean {
        if (!error) return false;
        
        // Network errors are generally retryable
        if (error.name === 'NetworkError' || error.name === 'TimeoutError') {
            return true;
        }
        
        // Rate limit errors are retryable
        if (error.message && error.message.includes('rate limit')) {
            return true;
        }
        
        // Server errors (5xx) are generally retryable
        if (error.status && error.status >= 500) {
            return true;
        }
        
        // Specific Resend error codes that are retryable
        if (error.message && (
            error.message.includes('rate_limit_exceeded') ||
            error.message.includes('temporary_failure') ||
            error.message.includes('server_error')
        )) {
            return true;
        }
        
        return false;
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async healthCheck(): Promise<boolean> {
        if (!this.initialized || !this.resend) {
            return false;
        }
        
        try {
            // Basic health check - attempt to access the API
            // Note: Resend might not have a dedicated health endpoint
            // This is a placeholder implementation
            return true;
        } catch (error) {
            console.error('[RESEND] Health check failed:', error);
            return false;
        }
    }

    getConfiguration(): { 
        initialized: boolean; 
        hasApiKey: boolean;
        retry: {
            retry: RetryConfig;
            circuitBreaker: { state: string; failures: number; lastFailureTime: number };
        };
    } {
        return {
            initialized: this.initialized,
            hasApiKey: !!this.apiKey,
            retry: this.retryService.getConfiguration()
        };
    }
}

// Singleton instance for the service
let resendServiceInstance: ResendEmailService | null = null;

export function getResendService(apiKey?: string): ResendEmailService {
    if (!resendServiceInstance) {
        resendServiceInstance = new ResendEmailService(apiKey);
    } else if (apiKey && !resendServiceInstance.getConfiguration().initialized) {
        resendServiceInstance.initialize(apiKey);
    }
    
    return resendServiceInstance;
}

export function resetResendService(): void {
    resendServiceInstance = null;
}