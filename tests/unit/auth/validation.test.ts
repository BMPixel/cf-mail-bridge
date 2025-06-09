import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '../../../src/auth';
import { ErrorCode } from '../../../src/types';

describe('AuthService - Input Validation', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService('test-secret-key');
  });

  describe('Username Validation', () => {
    describe('Valid Usernames', () => {
      it('should accept valid usernames with minimum length', () => {
        const result = authService.validateUsername('abc');
        expect(result).toBeNull();
      });

      it('should accept valid usernames with maximum length', () => {
        const username = 'a'.repeat(50);
        const result = authService.validateUsername(username);
        expect(result).toBeNull();
      });

      it('should accept usernames with lowercase letters', () => {
        const result = authService.validateUsername('testuser');
        expect(result).toBeNull();
      });

      it('should accept usernames with numbers', () => {
        const result = authService.validateUsername('user123');
        expect(result).toBeNull();
      });

      it('should accept usernames with hyphens', () => {
        const result = authService.validateUsername('test-user');
        expect(result).toBeNull();
      });

      it('should accept usernames with all allowed characters', () => {
        const result = authService.validateUsername('user-123-test');
        expect(result).toBeNull();
      });
    });

    describe('Invalid Usernames', () => {
      it('should reject usernames below minimum length', () => {
        const result = authService.validateUsername('ab');
        expect(result).toBe(ErrorCode.INVALID_USERNAME);
      });

      it('should reject usernames above maximum length', () => {
        const username = 'a'.repeat(51);
        const result = authService.validateUsername(username);
        expect(result).toBe(ErrorCode.INVALID_USERNAME);
      });

      it('should reject usernames with uppercase letters', () => {
        const result = authService.validateUsername('TestUser');
        expect(result).toBe(ErrorCode.INVALID_USERNAME);
      });

      it('should reject usernames with special characters', () => {
        const invalidChars = ['@', '#', '$', '%', '^', '&', '*', '(', ')', '+', '=', '[', ']', '{', '}', '|', '\\', ':', ';', '"', "'", '<', '>', ',', '.', '?', '/', '~', '`'];
        
        for (const char of invalidChars) {
          const result = authService.validateUsername(`user${char}name`);
          expect(result).toBe(ErrorCode.INVALID_USERNAME);
        }
      });

      it('should reject usernames with spaces', () => {
        const result = authService.validateUsername('test user');
        expect(result).toBe(ErrorCode.INVALID_USERNAME);
      });

      it('should reject usernames with underscores', () => {
        const result = authService.validateUsername('test_user');
        expect(result).toBe(ErrorCode.INVALID_USERNAME);
      });

      it('should reject empty username', () => {
        const result = authService.validateUsername('');
        expect(result).toBe(ErrorCode.INVALID_USERNAME);
      });

      it('should reject null username', () => {
        const result = authService.validateUsername(null as any);
        expect(result).toBe(ErrorCode.INVALID_USERNAME);
      });

      it('should reject undefined username', () => {
        const result = authService.validateUsername(undefined as any);
        expect(result).toBe(ErrorCode.INVALID_USERNAME);
      });

      it('should reject non-string username', () => {
        const result = authService.validateUsername(123 as any);
        expect(result).toBe(ErrorCode.INVALID_USERNAME);
      });

      it('should reject username with unicode characters', () => {
        const result = authService.validateUsername('üser');
        expect(result).toBe(ErrorCode.INVALID_USERNAME);
      });

      it('should reject username with emoji', () => {
        const result = authService.validateUsername('user😀');
        expect(result).toBe(ErrorCode.INVALID_USERNAME);
      });
    });

    describe('SQL Injection Prevention', () => {
      it('should reject SQL injection attempts in username', () => {
        const injectionAttempts = [
          "'; DROP TABLE users; --",
          "admin'--",
          "' OR '1'='1",
          "'; DELETE FROM users; --",
          "admin'; UPDATE users SET password_hash='hack'; --"
        ];

        for (const attempt of injectionAttempts) {
          const result = authService.validateUsername(attempt);
          expect(result).toBe(ErrorCode.INVALID_USERNAME);
        }
      });
    });
  });

  describe('Password Validation', () => {
    describe('Valid Passwords', () => {
      it('should accept password with minimum length', () => {
        const result = authService.validatePassword('12345678');
        expect(result).toBeNull();
      });

      it('should accept password with maximum length', () => {
        const password = 'a'.repeat(128);
        const result = authService.validatePassword(password);
        expect(result).toBeNull();
      });

      it('should accept password with special characters', () => {
        const result = authService.validatePassword('pass@word!123');
        expect(result).toBeNull();
      });

      it('should accept password with unicode characters', () => {
        const result = authService.validatePassword('pässwörd123');
        expect(result).toBeNull();
      });

      it('should accept password with emoji', () => {
        const result = authService.validatePassword('password🔒');
        expect(result).toBeNull();
      });

      it('should accept password with spaces', () => {
        const result = authService.validatePassword('pass word 123');
        expect(result).toBeNull();
      });

      it('should accept password with all printable ASCII', () => {
        const result = authService.validatePassword('!@#$%^&*()_+-=[]{}|;:,.<>?');
        expect(result).toBeNull();
      });

      it('should accept password with mixed case', () => {
        const result = authService.validatePassword('PassWord123');
        expect(result).toBeNull();
      });

      it('should accept password with numbers only', () => {
        const result = authService.validatePassword('12345678');
        expect(result).toBeNull();
      });

      it('should accept password with letters only', () => {
        const result = authService.validatePassword('abcdefgh');
        expect(result).toBeNull();
      });
    });

    describe('Invalid Passwords', () => {
      it('should reject password below minimum length', () => {
        const result = authService.validatePassword('1234567');
        expect(result).toBe(ErrorCode.INVALID_PASSWORD);
      });

      it('should reject password above maximum length', () => {
        const password = 'a'.repeat(129);
        const result = authService.validatePassword(password);
        expect(result).toBe(ErrorCode.INVALID_PASSWORD);
      });

      it('should reject empty password', () => {
        const result = authService.validatePassword('');
        expect(result).toBe(ErrorCode.INVALID_PASSWORD);
      });

      it('should reject null password', () => {
        const result = authService.validatePassword(null as any);
        expect(result).toBe(ErrorCode.INVALID_PASSWORD);
      });

      it('should reject undefined password', () => {
        const result = authService.validatePassword(undefined as any);
        expect(result).toBe(ErrorCode.INVALID_PASSWORD);
      });

      it('should reject non-string password', () => {
        const result = authService.validatePassword(12345678 as any);
        expect(result).toBe(ErrorCode.INVALID_PASSWORD);
      });
    });

    describe('Edge Cases', () => {
      it('should handle password at exact boundaries', () => {
        // Exactly 8 characters
        expect(authService.validatePassword('12345678')).toBeNull();
        
        // Exactly 128 characters
        const password128 = 'a'.repeat(128);
        expect(authService.validatePassword(password128)).toBeNull();
      });

      it('should handle password with only whitespace', () => {
        const result = authService.validatePassword('        '); // 8 spaces
        expect(result).toBeNull(); // Spaces are allowed
      });

      it('should handle password with newlines and tabs', () => {
        const result = authService.validatePassword('pass\nword\ttab');
        expect(result).toBeNull(); // Control characters are allowed
      });
    });
  });

  describe('Integration Tests', () => {
    it('should validate both username and password together', () => {
      const validUsername = 'testuser';
      const validPassword = 'password123';

      const usernameResult = authService.validateUsername(validUsername);
      const passwordResult = authService.validatePassword(validPassword);

      expect(usernameResult).toBeNull();
      expect(passwordResult).toBeNull();
    });

    it('should reject invalid combinations', () => {
      const invalidUsername = 'ab'; // Too short
      const invalidPassword = '123'; // Too short

      const usernameResult = authService.validateUsername(invalidUsername);
      const passwordResult = authService.validatePassword(invalidPassword);

      expect(usernameResult).toBe(ErrorCode.INVALID_USERNAME);
      expect(passwordResult).toBe(ErrorCode.INVALID_PASSWORD);
    });
  });
});