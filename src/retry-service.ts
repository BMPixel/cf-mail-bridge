import { EmailSendResult } from './types';

export interface RetryConfig {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
}

export class RetryService {
    private defaultConfig: RetryConfig = {
        maxRetries: 3,
        baseDelay: 1000, // 1 second
        maxDelay: 30000, // 30 seconds
        backoffMultiplier: 2
    };

    constructor(private config: Partial<RetryConfig> = {}) {
        this.config = { ...this.defaultConfig, ...config };
    }

    async executeWithRetry<T>(
        operation: () => Promise<T>,
        shouldRetry: (error: any) => boolean = () => true,
        context: string = 'operation'
    ): Promise<T> {
        let lastError: any;
        let attempt = 0;

        while (attempt <= this.config.maxRetries!) {
            try {
                console.log(`[RETRY] ${context} - Attempt ${attempt + 1}/${this.config.maxRetries! + 1}`);
                const result = await operation();
                
                if (attempt > 0) {
                    console.log(`[RETRY] ${context} succeeded after ${attempt + 1} attempts`);
                }
                
                return result;
            } catch (error) {
                lastError = error;
                attempt++;
                
                console.error(`[RETRY] ${context} failed on attempt ${attempt}:`, error);
                
                if (attempt > this.config.maxRetries!) {
                    console.error(`[RETRY] ${context} exhausted all ${this.config.maxRetries! + 1} attempts`);
                    break;
                }
                
                if (!shouldRetry(error)) {
                    console.log(`[RETRY] ${context} error is not retryable, stopping`);
                    break;
                }
                
                const delay = this.calculateDelay(attempt - 1);
                console.log(`[RETRY] ${context} waiting ${delay}ms before retry`);
                await this.delay(delay);
            }
        }
        
        throw lastError;
    }

    async executeEmailOperationWithRetry<T>(
        operation: () => Promise<EmailSendResult>,
        context: string = 'email operation'
    ): Promise<EmailSendResult> {
        try {
            return await this.executeWithRetry(
                operation,
                (error) => this.isEmailRetryableError(error),
                context
            );
        } catch (error) {
            // If all retries failed, return a failed result
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error after retries',
                retryable: false
            };
        }
    }

    private calculateDelay(attemptNumber: number): number {
        const delay = this.config.baseDelay! * Math.pow(this.config.backoffMultiplier!, attemptNumber);
        return Math.min(delay, this.config.maxDelay!);
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private isEmailRetryableError(error: any): boolean {
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
            error.message.includes('server_error') ||
            error.message.includes('timeout') ||
            error.message.includes('connection')
        )) {
            return true;
        }
        
        // Check if the error result indicates it's retryable
        if (error.retryable === true) {
            return true;
        }
        
        return false;
    }

    getConfiguration(): RetryConfig {
        return { ...this.config } as RetryConfig;
    }
}

// Circuit breaker pattern for additional resilience
export class CircuitBreaker {
    private failures = 0;
    private lastFailureTime = 0;
    private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

    constructor(
        private failureThreshold: number = 5,
        private recoveryTimeout: number = 60000, // 1 minute
        private successThreshold: number = 3
    ) {}

    async execute<T>(operation: () => Promise<T>, context: string = 'operation'): Promise<T> {
        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime < this.recoveryTimeout) {
                throw new Error(`Circuit breaker is OPEN for ${context}`);
            } else {
                this.state = 'HALF_OPEN';
                console.log(`[CIRCUIT_BREAKER] ${context} - Moving to HALF_OPEN state`);
            }
        }

        try {
            const result = await operation();
            this.onSuccess(context);
            return result;
        } catch (error) {
            this.onFailure(context);
            throw error;
        }
    }

    private onSuccess(context: string): void {
        this.failures = 0;
        if (this.state === 'HALF_OPEN') {
            this.state = 'CLOSED';
            console.log(`[CIRCUIT_BREAKER] ${context} - Circuit breaker CLOSED`);
        }
    }

    private onFailure(context: string): void {
        this.failures++;
        this.lastFailureTime = Date.now();

        if (this.failures >= this.failureThreshold) {
            this.state = 'OPEN';
            console.log(`[CIRCUIT_BREAKER] ${context} - Circuit breaker OPENED after ${this.failures} failures`);
        }
    }

    getState(): { state: string; failures: number; lastFailureTime: number } {
        return {
            state: this.state,
            failures: this.failures,
            lastFailureTime: this.lastFailureTime
        };
    }

    reset(): void {
        this.failures = 0;
        this.lastFailureTime = 0;
        this.state = 'CLOSED';
    }
}

// Enhanced Resend service with retry and circuit breaker
export class EnhancedRetryService {
    private retryService: RetryService;
    private circuitBreaker: CircuitBreaker;

    constructor(
        retryConfig: Partial<RetryConfig> = {},
        circuitBreakerConfig: {
            failureThreshold?: number;
            recoveryTimeout?: number;
            successThreshold?: number;
        } = {}
    ) {
        this.retryService = new RetryService(retryConfig);
        this.circuitBreaker = new CircuitBreaker(
            circuitBreakerConfig.failureThreshold,
            circuitBreakerConfig.recoveryTimeout,
            circuitBreakerConfig.successThreshold
        );
    }

    async executeEmailOperation<T>(
        operation: () => Promise<T>,
        context: string = 'email operation'
    ): Promise<T> {
        return await this.circuitBreaker.execute(
            () => this.retryService.executeWithRetry(
                operation,
                (error) => this.isEmailRetryableError(error),
                context
            ),
            context
        );
    }

    private isEmailRetryableError(error: any): boolean {
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
            error.message.includes('server_error') ||
            error.message.includes('timeout') ||
            error.message.includes('connection')
        )) {
            return true;
        }
        
        return false;
    }

    getConfiguration(): {
        retry: RetryConfig;
        circuitBreaker: { state: string; failures: number; lastFailureTime: number };
    } {
        return {
            retry: this.retryService.getConfiguration(),
            circuitBreaker: this.circuitBreaker.getState()
        };
    }

    reset(): void {
        this.circuitBreaker.reset();
    }
}