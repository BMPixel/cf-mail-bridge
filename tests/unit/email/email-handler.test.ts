import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmailHandler } from '../../../src/email-handler';

// Mock postal-mime
vi.mock('postal-mime', () => {
  return {
    default: vi.fn(() => ({
      parse: vi.fn().mockResolvedValue({
        from: { address: 'sender@example.com' },
        to: [{ address: 'testuser@tai.chat' }],
        subject: 'Test Subject',
        text: 'Test body text',
        html: '<p>Test body html</p>',
        headers: [{ 'message-id': '<test@example.com>' }]
      })
    }))
  };
});

// Mock turndown
vi.mock('turndown', () => {
  return {
    default: vi.fn(() => ({
      turndown: vi.fn((html) => `# Converted\n${html.replace(/<[^>]*>/g, '')}`)
    }))
  };
});

// Mock resend service
vi.mock('../../../src/resend-service', () => {
  const mockResendService = {
    sendEmail: vi.fn().mockResolvedValue({
      success: true,
      messageId: 'test-message-id-123'
    }),
    sendBulkEmails: vi.fn().mockResolvedValue([
      { success: true, messageId: 'bulk-1' },
      { success: true, messageId: 'bulk-2' }
    ]),
    validateEmailAddress: vi.fn().mockResolvedValue(true),
    getConfiguration: vi.fn().mockReturnValue({
      initialized: true,
      hasApiKey: true,
      retry: {
        retry: { maxAttempts: 3, initialDelay: 1000 },
        circuitBreaker: { state: 'closed', failures: 0, lastFailureTime: 0 }
      }
    }),
    healthCheck: vi.fn().mockResolvedValue(true)
  };

  return {
    getResendService: vi.fn(() => mockResendService),
    ResendEmailService: vi.fn(() => mockResendService)
  };
});

describe('EmailHandler', () => {
  let emailHandler: EmailHandler;
  let mockDbService: any;
  let mockEnv: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockDbService = {
      getUserByUsername: vi.fn(),
      createMessage: vi.fn(),
      getUserByEmail: vi.fn()
    };
    
    mockEnv = {
      RESEND_API_KEY: 'test-key'
    };
    
    emailHandler = new EmailHandler(mockDbService, mockEnv);
  });

  describe('Email Processing', () => {
    it('should handle incoming email successfully', async () => {
      // Mock successful user lookup
      mockDbService.getUserByUsername.mockResolvedValue({
        id: 1,
        username: 'testuser',
        password_hash: 'hash',
        created_at: '2024-01-01'
      });
      
      // Mock successful message creation
      mockDbService.createMessage.mockResolvedValue({
        id: 1,
        user_id: 1,
        from_address: 'sender@example.com',
        to_address: 'testuser@tai.chat',
        subject: 'Test Subject',
        body_text: 'Test body',
        received_at: '2024-01-01'
      });

      const emailMessage = {
        from: 'sender@example.com',
        to: 'testuser@tai.chat',
        subject: 'Test Subject',
        text: 'Test body',
        html: '<p>Test body</p>',
        headers: {},
        size: 100
      };

      const result = await emailHandler.handleIncomingEmail(emailMessage);

      expect(result).toBe(true);
      expect(mockDbService.getUserByUsername).toHaveBeenCalledWith('testuser');
      expect(mockDbService.createMessage).toHaveBeenCalled();
    });

    it('should handle email for non-existent user', async () => {
      // Mock user not found
      mockDbService.getUserByUsername.mockResolvedValue(null);

      const emailMessage = {
        from: 'sender@example.com',
        to: 'nonexistent@tai.chat',
        subject: 'Test Subject',
        text: 'Test body'
      };

      const result = await emailHandler.handleIncomingEmail(emailMessage);

      expect(result).toBe(false);
      expect(mockDbService.getUserByUsername).toHaveBeenCalledWith('nonexistent');
      expect(mockDbService.createMessage).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      mockDbService.getUserByUsername.mockRejectedValue(new Error('Database connection failed'));

      const emailMessage = {
        from: 'sender@example.com',
        to: 'testuser@tai.chat',
        subject: 'Test Subject',
        text: 'Test body'
      };

      const result = await emailHandler.handleIncomingEmail(emailMessage);

      expect(result).toBe(false);
    });

    it('should handle email with prefix format', async () => {
      // Mock successful user lookup
      mockDbService.getUserByUsername.mockResolvedValue({
        id: 1,
        username: 'testuser',
        password_hash: 'hash',
        created_at: '2024-01-01'
      });
      
      mockDbService.createMessage.mockResolvedValue({
        id: 1,
        user_id: 1,
        from_address: 'sender@example.com',
        to_address: 'desktop.testuser@tai.chat',
        subject: 'Test Subject',
        body_text: 'Test body',
        received_at: '2024-01-01'
      });

      const emailMessage = {
        from: 'sender@example.com',
        to: 'desktop.testuser@tai.chat', // Prefix format
        subject: 'Test Subject',
        text: 'Test body'
      };

      const result = await emailHandler.handleIncomingEmail(emailMessage);

      expect(result).toBe(true);
      expect(mockDbService.getUserByUsername).toHaveBeenCalledWith('testuser');
    });

    it('should reject invalid email addresses', async () => {
      const emailMessage = {
        from: 'sender@example.com',
        to: 'invalid-email',
        subject: 'Test Subject',
        text: 'Test body'
      };

      const result = await emailHandler.handleIncomingEmail(emailMessage);

      expect(result).toBe(false);
      expect(mockDbService.getUserByUsername).not.toHaveBeenCalled();
    });
  });

  describe('Email Validation', () => {
    it('should validate tai.chat emails', () => {
      const validEmail = {
        from: 'sender@example.com',
        to: 'user@tai.chat',
        subject: 'Test'
      };

      const result = emailHandler.validateEmail(validEmail);
      expect(result).toBe(true);
    });

    it('should reject non-tai.chat emails', () => {
      const invalidEmail = {
        from: 'sender@example.com',
        to: 'user@example.com',
        subject: 'Test'
      };

      const result = emailHandler.validateEmail(invalidEmail);
      expect(result).toBe(false);
    });

    it('should reject malformed email addresses', () => {
      const invalidEmail = {
        from: 'invalid-email',
        to: 'user@tai.chat',
        subject: 'Test'
      };

      const result = emailHandler.validateEmail(invalidEmail);
      expect(result).toBe(false);
    });

    it('should reject emails without from or to', () => {
      const invalidEmail1 = {
        to: 'user@tai.chat',
        subject: 'Test'
      };

      const invalidEmail2 = {
        from: 'sender@example.com',
        subject: 'Test'
      };

      expect(emailHandler.validateEmail(invalidEmail1 as any)).toBe(false);
      expect(emailHandler.validateEmail(invalidEmail2 as any)).toBe(false);
    });
  });

  describe('Cloudflare Email Processing', () => {
    it('should process Cloudflare email message', async () => {
      // Mock successful processing
      mockDbService.getUserByUsername.mockResolvedValue({
        id: 1,
        username: 'testuser',
        password_hash: 'hash',
        created_at: '2024-01-01'
      });
      
      mockDbService.createMessage.mockResolvedValue({
        id: 1,
        user_id: 1,
        from_address: 'sender@example.com',
        to_address: 'testuser@tai.chat',
        subject: 'Test Subject',
        body_text: 'Test body text',
        received_at: '2024-01-01'
      });

      const cloudflareMessage = {
        from: 'sender@example.com',
        to: 'testuser@tai.chat',
        raw: new ReadableStream({
          start(controller) {
            const email = `From: sender@example.com
To: testuser@tai.chat
Subject: Test Subject
Content-Type: text/plain

Test body text`;
            controller.enqueue(new TextEncoder().encode(email));
            controller.close();
          }
        })
      };

      const result = await emailHandler.processCloudflareEmail(cloudflareMessage);

      expect(result).toBe(true);
    });

    it('should handle Cloudflare email parsing errors', async () => {
      const cloudflareMessage = {
        from: 'sender@example.com',
        to: 'testuser@tai.chat',
        raw: null // Invalid raw data
      };

      const result = await emailHandler.processCloudflareEmail(cloudflareMessage);

      expect(result).toBe(false);
    });
  });

  describe('Email Sending', () => {
    it('should send email using Resend service', async () => {
      const emailOptions = {
        from: 'test@tai.chat',
        to: 'recipient@example.com',
        subject: 'Test Email',
        text: 'Test content'
      };

      // The method should not throw
      const result = await emailHandler.sendEmail(emailOptions);
      
      // Result depends on Resend service mock, but should be defined
      expect(result).toBeDefined();
      expect(result).toHaveProperty('success');
    });

    it('should send reply email', async () => {
      const originalMessage = {
        from: 'sender@example.com',
        to: 'user@tai.chat',
        subject: 'Original Subject',
        headers: { 'message-id': '<original@example.com>' }
      };

      const result = await emailHandler.sendReply(originalMessage, 'Reply content');
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('success');
    });

    it('should send notification email', async () => {
      const result = await emailHandler.sendNotification(
        'user@example.com',
        'Notification Subject',
        'Notification message'
      );
      
      expect(result).toBeDefined();
      expect(result).toHaveProperty('success');
    });

    it('should send bulk emails', async () => {
      const emails = [
        {
          from: 'test@tai.chat',
          to: 'user1@example.com',
          subject: 'Test 1',
          text: 'Content 1'
        },
        {
          from: 'test@tai.chat',
          to: 'user2@example.com',
          subject: 'Test 2',
          text: 'Content 2'
        }
      ];

      const results = await emailHandler.sendBulkEmails(emails);
      
      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results).toHaveLength(2);
    });
  });

  describe('Resend Integration', () => {
    it('should validate email address', async () => {
      const result = await emailHandler.validateEmailAddress('test@example.com');
      
      expect(typeof result).toBe('boolean');
    });

    it('should get Resend configuration', () => {
      const config = emailHandler.getResendConfiguration();
      
      expect(config).toBeDefined();
      expect(config).toHaveProperty('initialized');
      expect(config).toHaveProperty('hasApiKey');
    });

    it('should perform Resend health check', async () => {
      const result = await emailHandler.healthCheckResend();
      
      expect(typeof result).toBe('boolean');
    });
  });

  describe('Error Handling', () => {
    it('should handle email processing errors gracefully', async () => {
      // Mock error in user lookup
      mockDbService.getUserByUsername.mockRejectedValue(new Error('Database error'));

      const emailMessage = {
        from: 'sender@example.com',
        to: 'testuser@tai.chat',
        subject: 'Test Subject',
        text: 'Test body'
      };

      const result = await emailHandler.handleIncomingEmail(emailMessage);

      expect(result).toBe(false);
    });

    it('should handle message creation failures', async () => {
      // Mock successful user lookup but failed message creation
      mockDbService.getUserByUsername.mockResolvedValue({
        id: 1,
        username: 'testuser'
      });
      mockDbService.createMessage.mockResolvedValue(null);

      const emailMessage = {
        from: 'sender@example.com',
        to: 'testuser@tai.chat',
        subject: 'Test Subject',
        text: 'Test body'
      };

      const result = await emailHandler.handleIncomingEmail(emailMessage);

      expect(result).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should process emails within performance bounds', async () => {
      mockDbService.getUserByUsername.mockResolvedValue({
        id: 1,
        username: 'testuser'
      });
      mockDbService.createMessage.mockResolvedValue({
        id: 1,
        user_id: 1
      });

      const emailMessage = {
        from: 'sender@example.com',
        to: 'testuser@tai.chat',
        subject: 'Performance Test',
        text: 'Test body'
      };

      const startTime = Date.now();
      
      await emailHandler.handleIncomingEmail(emailMessage);
      
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});