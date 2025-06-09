import { describe, it, expect, beforeAll, afterEach } from 'vitest';

// Test configuration
const TEST_BASE_URL = process.env.TEST_URL || 'http://localhost:8787';
const TEST_TIMEOUT = 10000;

describe('API Endpoints Integration Tests', () => {
  // Test data
  const testUser = {
    username: 'testuser123',
    password: 'testpassword123'
  };

  let authToken: string;

  beforeAll(async () => {
    // Wait for server to be ready
    await waitForServer();
  });

  afterEach(async () => {
    // Clean up: delete the test user and their messages
    if (authToken) {
      try {
        // Get user messages and delete them
        const messagesResponse = await fetch(`${TEST_BASE_URL}/api/v1/messages`, {
          headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        if (messagesResponse.ok) {
          const messagesData = await messagesResponse.json();
          for (const message of messagesData.data.messages) {
            await fetch(`${TEST_BASE_URL}/api/v1/messages/${message.id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${authToken}` }
            });
          }
        }
      } catch (error) {
        // Ignore cleanup errors
      }
    }
  });

  describe('User Registration', () => {
    it('should register a new user successfully', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/v1/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testUser)
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.username).toBe(testUser.username);
      expect(data.data.email).toBe(`${testUser.username}@tai.chat`);
      expect(data.data.token).toBeTypeOf('string');
      
      // Store token for future tests
      authToken = data.data.token;
    });

    it('should reject duplicate username registration', async () => {
      // First registration
      await fetch(`${TEST_BASE_URL}/api/v1/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'duplicate123',
          password: 'password123'
        })
      });

      // Attempt duplicate registration
      const response = await fetch(`${TEST_BASE_URL}/api/v1/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'duplicate123',
          password: 'differentpassword'
        })
      });

      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('USER_EXISTS');
    });

    it('should reject invalid username format', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/v1/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'AB', // Too short
          password: 'validpassword123'
        })
      });

      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_USERNAME');
    });

    it('should reject invalid password format', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/v1/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'validuser123',
          password: '123' // Too short
        })
      });

      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_PASSWORD');
    });

    it('should reject malformed requests', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/v1/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'validuser123'
          // Missing password
        })
      });

      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_REQUEST');
    });
  });

  describe('User Login', () => {
    beforeAll(async () => {
      // Register a user for login tests
      await fetch(`${TEST_BASE_URL}/api/v1/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'loginuser123',
          password: 'loginpassword123'
        })
      });
    });

    it('should login with correct credentials', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/v1/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'loginuser123',
          password: 'loginpassword123'
        })
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.token).toBeTypeOf('string');
      expect(data.data.expires_at).toBeTypeOf('string');
    });

    it('should reject wrong password', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/v1/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'loginuser123',
          password: 'wrongpassword'
        })
      });

      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject non-existent user', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/v1/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'nonexistentuser',
          password: 'somepassword'
        })
      });

      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('Token Refresh', () => {
    let validToken: string;

    beforeAll(async () => {
      // Get a valid token
      const loginResponse = await fetch(`${TEST_BASE_URL}/api/v1/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'loginuser123',
          password: 'loginpassword123'
        })
      });
      const loginData = await loginResponse.json();
      validToken = loginData.data.token;
    });

    it('should refresh valid token', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/v1/refresh`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${validToken}` }
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.token).toBeTypeOf('string');
      expect(data.data.expires_at).toBeTypeOf('string');
    });

    it('should reject invalid token', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/v1/refresh`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer invalid-token' }
      });

      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject missing authorization header', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/v1/refresh`, {
        method: 'POST'
      });

      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Messages API', () => {
    let userToken: string;

    beforeAll(async () => {
      // Register and login a user for message tests
      const registerResponse = await fetch(`${TEST_BASE_URL}/api/v1/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'messageuser123',
          password: 'messagepassword123'
        })
      });
      const registerData = await registerResponse.json();
      userToken = registerData.data.token;
    });

    it('should retrieve empty messages list for new user', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/v1/messages`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.messages).toEqual([]);
      expect(data.data.count).toBe(0);
      expect(data.data.has_more).toBe(false);
    });

    it('should handle pagination parameters', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/v1/messages?limit=10&offset=0`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });

      expect(response.status).toBe(200);
      
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('messages');
      expect(data.data).toHaveProperty('count');
      expect(data.data).toHaveProperty('has_more');
    });

    it('should reject unauthorized access', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/v1/messages`, {
        headers: { 'Authorization': 'Bearer invalid-token' }
      });

      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should return 404 for non-existent message', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/v1/messages/99999`, {
        headers: { 'Authorization': `Bearer ${userToken}` }
      });

      expect(response.status).toBe(404);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('NOT_FOUND');
    });
  });

  describe('Send Test Email', () => {
    let userToken: string;

    beforeAll(async () => {
      // Register and login a user for email tests
      const registerResponse = await fetch(`${TEST_BASE_URL}/api/v1/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: 'emailuser123',
          password: 'emailpassword123'
        })
      });
      const registerData = await registerResponse.json();
      userToken = registerData.data.token;
    });

    it('should handle email request with valid sender', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/v1/send-email`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: 'test@example.com',
          from: 'emailuser123@tai.chat',
          subject: 'Test Email',
          message: 'This is a test email.'
        })
      });

      // Note: This might fail if Resend is not configured, but should handle gracefully
      expect([200, 500]).toContain(response.status);
      
      const data = await response.json();
      expect(data).toHaveProperty('success');
    });

    it('should allow authenticated user to send from their own username', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/v1/send-email`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: 'test@example.com',
          from: 'emailuser123@tai.chat',
          subject: 'Test Email',
          message: 'Test message'
        })
      });

      expect([200, 500]).toContain(response.status);
      
      const data = await response.json();
      expect(data).toHaveProperty('success');
    });

    it('should allow authenticated user to send from prefixed address', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/v1/send-email`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: 'test@example.com',
          from: 'desktop.emailuser123@tai.chat',
          subject: 'Test Email',
          message: 'Test message'
        })
      });

      expect([200, 500]).toContain(response.status);
      
      const data = await response.json();
      expect(data).toHaveProperty('success');
    });

    it('should reject user trying to send from different username', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/v1/send-email`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: 'test@example.com',
          from: 'otheruser@tai.chat',
          subject: 'Test Email',
          message: 'Test message'
        })
      });

      expect(response.status).toBe(403);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
      expect(data.error.message).toContain('sender address');
    });

    it('should reject user trying to send from different username with prefix', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/v1/send-email`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${userToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: 'test@example.com',
          from: 'mobile.admin@tai.chat',
          subject: 'Test Email',
          message: 'Test message'
        })
      });

      expect(response.status).toBe(403);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('FORBIDDEN');
      expect(data.error.message).toContain('sender address');
    });

    it('should reject unauthorized email request', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/v1/send-email`, {
        method: 'POST',
        headers: { 
          'Authorization': 'Bearer invalid-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: 'test@tai.chat',
          from: 'test@tai.chat',
          subject: 'Test',
          message: 'Test'
        })
      });

      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject request without authentication', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/v1/send-email`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          to: 'test@example.com',
          from: 'test@tai.chat',
          subject: 'Test',
          message: 'Test'
        })
      });

      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('CORS and Security', () => {
    it('should include appropriate CORS headers', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/v1/messages`, {
        method: 'OPTIONS'
      });

      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
      expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Authorization');
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/v1/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{invalid json'
      });

      expect(response.status).toBe(400);
      
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error.code).toBe('INVALID_REQUEST');
    });

    it('should handle unsupported HTTP methods', async () => {
      const response = await fetch(`${TEST_BASE_URL}/api/v1/register`, {
        method: 'PATCH'
      });

      expect(response.status).toBe(405);
      
      const data = await response.json();
      expect(data.success).toBe(false);
    });
  });
});

// Helper function to wait for server to be ready
async function waitForServer(retries = 30): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(`${TEST_BASE_URL}/api/v1/messages`, {
        headers: { 'Authorization': 'Bearer dummy-token' }
      });
      // If we get any response (even unauthorized), server is ready
      if (response.status === 401) {
        return;
      }
    } catch (error) {
      // Server not ready, wait and retry
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  throw new Error('Server did not become ready within timeout period');
}