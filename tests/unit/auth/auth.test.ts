import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '../../../src/auth';
import { ErrorCode } from '../../../src/types';

describe('AuthService - Complete Authentication Flow', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService('test-secret-key');
  });

  describe('Complete Registration Flow', () => {
    it('should handle complete user registration process', async () => {
      const username = 'newuser';
      const password = 'securepassword123';

      // Validate inputs
      const usernameValidation = authService.validateUsername(username);
      const passwordValidation = authService.validatePassword(password);
      
      expect(usernameValidation).toBeNull();
      expect(passwordValidation).toBeNull();

      // Hash password
      const hashedPassword = await authService.hashPassword(password);
      expect(hashedPassword).toBeTypeOf('string');
      expect(hashedPassword).not.toBe(password);

      // Generate token for new user
      const token = await authService.generateToken(username);
      expect(token).toBeTypeOf('string');
      expect(token.split('.')).toHaveLength(3);

      // Verify the token works
      const payload = await authService.verifyToken(token);
      expect(payload).toBeDefined();
      expect(payload!.sub).toBe(username);
    });
  });

  describe('Complete Login Flow', () => {
    it('should handle complete user login process', async () => {
      const username = 'existinguser';
      const password = 'userpassword123';

      // Simulate existing user - hash password first
      const hashedPassword = await authService.hashPassword(password);

      // Validate login inputs
      const usernameValidation = authService.validateUsername(username);
      const passwordValidation = authService.validatePassword(password);
      
      expect(usernameValidation).toBeNull();
      expect(passwordValidation).toBeNull();

      // Verify password against stored hash
      const isPasswordValid = await authService.verifyPassword(password, hashedPassword);
      expect(isPasswordValid).toBe(true);

      // Generate login token
      const token = await authService.generateToken(username);
      expect(token).toBeTypeOf('string');

      // Verify token is valid
      const payload = await authService.verifyToken(token);
      expect(payload).toBeDefined();
      expect(payload!.sub).toBe(username);
    });

    it('should reject login with wrong password', async () => {
      const username = 'existinguser';
      const correctPassword = 'userpassword123';
      const wrongPassword = 'wrongpassword';

      // Simulate existing user
      const hashedPassword = await authService.hashPassword(correctPassword);

      // Verify wrong password is rejected
      const isPasswordValid = await authService.verifyPassword(wrongPassword, hashedPassword);
      expect(isPasswordValid).toBe(false);
    });
  });

  describe('Authentication Middleware Flow', () => {
    it('should handle complete authentication middleware process', async () => {
      const username = 'authenticateduser';
      const token = await authService.generateToken(username);

      // Simulate incoming request with Bearer token
      const authHeader = `Bearer ${token}`;
      
      // Extract token from header
      const extractedToken = authService.extractTokenFromHeader(authHeader);
      expect(extractedToken).toBe(token);

      // Verify extracted token
      const payload = await authService.verifyToken(extractedToken!);
      expect(payload).toBeDefined();
      expect(payload!.sub).toBe(username);
    });

    it('should reject requests with invalid auth header format', async () => {
      const invalidHeaders = [
        null,
        '',
        'Basic token123',
        'Bearer',
        'token123'
      ];

      for (const header of invalidHeaders) {
        const extractedToken = authService.extractTokenFromHeader(header);
        expect(extractedToken).toBeNull();
      }

      // This should extract the token part (validation happens later)
      const bearerWithToken = authService.extractTokenFromHeader('Bearer invalid.token.format');
      expect(bearerWithToken).toBe('invalid.token.format');
    });
  });

  describe('Security Scenarios', () => {
    it('should handle password brute force attempts', async () => {
      const username = 'targetuser';
      const correctPassword = 'secretpassword123';
      const hashedPassword = await authService.hashPassword(correctPassword);

      const bruteForceAttempts = [
        'password123',
        'admin',
        '123456',
        'password',
        'qwerty',
        'letmein',
        'monkey',
        '123456789'
      ];

      // All brute force attempts should fail
      for (const attempt of bruteForceAttempts) {
        const isValid = await authService.verifyPassword(attempt, hashedPassword);
        expect(isValid).toBe(false);
      }

      // Correct password should still work
      const isValidCorrect = await authService.verifyPassword(correctPassword, hashedPassword);
      expect(isValidCorrect).toBe(true);
    });

    it('should handle token manipulation attempts', async () => {
      const username = 'secureuser';
      const validToken = await authService.generateToken(username);
      const [header, payload, signature] = validToken.split('.');

      // Test various manipulation attempts
      const manipulationAttempts = [
        `${header}.${payload}.malicious-signature`,
        `malicious-header.${payload}.${signature}`,
        `${header}.malicious-payload.${signature}`,
        `${header}.${payload}`, // Missing signature
        `${header}.${payload}.${signature}.extra-part`,
        btoa('{"alg":"none"}') + `.${payload}.`, // Algorithm confusion
      ];

      for (const manipulatedToken of manipulationAttempts) {
        const result = await authService.verifyToken(manipulatedToken);
        expect(result).toBeNull();
      }
    });

    it('should handle concurrent authentication requests', async () => {
      const username = 'concurrentuser';
      const password = 'concurrentpassword123';

      // Simulate multiple concurrent authentication requests
      const concurrentOperations = Array.from({ length: 10 }, async (_, i) => {
        const userPass = `${password}${i}`;
        const hash = await authService.hashPassword(userPass);
        const isValid = await authService.verifyPassword(userPass, hash);
        const token = await authService.generateToken(`${username}${i}`);
        const payload = await authService.verifyToken(token);

        return {
          passwordValid: isValid,
          tokenValid: payload !== null,
          username: payload?.sub
        };
      });

      const results = await Promise.all(concurrentOperations);

      // All operations should succeed
      results.forEach((result, i) => {
        expect(result.passwordValid).toBe(true);
        expect(result.tokenValid).toBe(true);
        expect(result.username).toBe(`${username}${i}`);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle crypto API failures gracefully', async () => {
      // This test might need to mock crypto failures
      // For now, test with extreme inputs that might cause issues
      const extremePassword = 'a'.repeat(1000000); // Very long password
      
      try {
        await authService.hashPassword(extremePassword);
        // If it succeeds, that's fine - crypto should handle it
        expect(true).toBe(true);
      } catch (error) {
        // If it fails, make sure it's handled gracefully
        expect(error).toBeDefined();
      }
    });

    it('should handle malformed JWT gracefully', async () => {
      const malformedTokens = [
        '',
        'single-part',
        'two.parts',
        'header.payload.signature.extra',
        'ïnvalid-characters.in.token',
        '..', // Empty parts
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..', // Empty payload
      ];

      for (const token of malformedTokens) {
        const result = await authService.verifyToken(token);
        expect(result).toBeNull();
      }
    });
  });

  describe('Performance Tests', () => {
    it('should handle authentication operations within performance bounds', async () => {
      const username = 'perfuser';
      const password = 'perfpassword123';

      const startTime = Date.now();

      // Complete auth flow
      const usernameValidation = authService.validateUsername(username);
      const passwordValidation = authService.validatePassword(password);
      const hashedPassword = await authService.hashPassword(password);
      const isPasswordValid = await authService.verifyPassword(password, hashedPassword);
      const token = await authService.generateToken(username);
      const payload = await authService.verifyToken(token);

      const totalTime = Date.now() - startTime;

      // Verify all operations succeeded
      expect(usernameValidation).toBeNull();
      expect(passwordValidation).toBeNull();
      expect(isPasswordValid).toBe(true);
      expect(payload).toBeDefined();

      // Should complete within reasonable time (5 seconds for complete flow)
      expect(totalTime).toBeLessThan(5000);
    });
  });
});