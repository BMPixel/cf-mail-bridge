import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '../../../src/auth';

describe('AuthService - Password Management', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService('test-secret-key');
  });

  describe('Password Hashing', () => {
    it('should generate a valid hash for a password', async () => {
      const password = 'testpassword123';
      const hash = await authService.hashPassword(password);

      expect(hash).toBeTypeOf('string');
      expect(hash.length).toBeGreaterThan(0);
      expect(hash).not.toBe(password);
      expect(hash).toMatch(/^[A-Za-z0-9+/=]+$/); // Base64 pattern
    });

    it('should generate different hashes for the same password (salt uniqueness)', async () => {
      const password = 'testpassword123';
      const hash1 = await authService.hashPassword(password);
      const hash2 = await authService.hashPassword(password);

      expect(hash1).not.toBe(hash2);
      expect(hash1.length).toBe(hash2.length);
    });

    it('should generate hashes of consistent format and length', async () => {
      const passwords = ['short', 'medium-length-password', 'very-long-password-with-special-chars-!@#$%^&*()'];
      
      for (const password of passwords) {
        const hash = await authService.hashPassword(password);
        // 48 bytes (16 salt + 32 hash) encoded as base64 = 64 characters
        expect(hash.length).toBe(64);
      }
    });

    it('should handle unicode characters in passwords', async () => {
      const unicodePassword = 'pässwörd123🔒';
      const hash = await authService.hashPassword(unicodePassword);

      expect(hash).toBeTypeOf('string');
      expect(hash.length).toBe(64);
    });

    it('should complete hashing within performance bounds', async () => {
      const password = 'testpassword123';
      const startTime = Date.now();
      
      await authService.hashPassword(password);
      
      const executionTime = Date.now() - startTime;
      expect(executionTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });

  describe('Password Verification', () => {
    it('should verify correct password', async () => {
      const password = 'testpassword123';
      const hash = await authService.hashPassword(password);
      
      const isValid = await authService.verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'testpassword123';
      const wrongPassword = 'wrongpassword';
      const hash = await authService.hashPassword(password);
      
      const isValid = await authService.verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });

    it('should handle empty password', async () => {
      const password = 'testpassword123';
      const hash = await authService.hashPassword(password);
      
      const isValid = await authService.verifyPassword('', hash);
      expect(isValid).toBe(false);
    });

    it('should handle malformed hash gracefully', async () => {
      const password = 'testpassword123';
      const malformedHash = 'invalid-hash!@#$%'; // Invalid base64 characters
      
      const isValid = await authService.verifyPassword(password, malformedHash);
      expect(isValid).toBe(false);
    });

    it('should handle empty hash gracefully', async () => {
      const password = 'testpassword123';
      
      const isValid = await authService.verifyPassword(password, '');
      expect(isValid).toBe(false);
    });

    it('should resist timing attacks (consistent execution time)', async () => {
      const password = 'testpassword123';
      const hash = await authService.hashPassword(password);
      const wrongPassword = 'wrongpassword';

      // Measure time for correct password
      const start1 = Date.now();
      await authService.verifyPassword(password, hash);
      const time1 = Date.now() - start1;

      // Measure time for incorrect password
      const start2 = Date.now();
      await authService.verifyPassword(wrongPassword, hash);
      const time2 = Date.now() - start2;

      // Times should be relatively similar (within 50ms difference)
      const timeDiff = Math.abs(time1 - time2);
      expect(timeDiff).toBeLessThan(50);
    });

    it('should verify password with unicode characters', async () => {
      const unicodePassword = 'pässwörd123🔒';
      const hash = await authService.hashPassword(unicodePassword);
      
      const isValid = await authService.verifyPassword(unicodePassword, hash);
      expect(isValid).toBe(true);
    });

    it('should handle verification performance within bounds', async () => {
      const password = 'testpassword123';
      const hash = await authService.hashPassword(password);
      
      const startTime = Date.now();
      await authService.verifyPassword(password, hash);
      const executionTime = Date.now() - startTime;
      
      expect(executionTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });
});