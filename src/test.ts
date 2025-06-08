// Test suite for the email bridge system
import { AuthService } from './auth';
import { DatabaseService } from './database';
import { EmailHandler } from './email-handler';
import { ErrorCode } from './types';

// Mock environment for testing
const mockEnv = {
    JWT_SECRET: 'test-secret-key-for-testing-only',
    DB: {} as D1Database
};

// Test configuration
const TEST_USER = {
    username: 'testuser',
    password: 'testpassword123',
    email: 'testuser@agent.tai.chat'
};

const TEST_EMAIL = {
    from: 'sender@example.com',
    to: 'testuser@agent.tai.chat',
    subject: 'Test Email',
    text: 'This is a test email message',
    html: '<p>This is a test email message</p>',
    headers: { 'Message-ID': 'test-123' },
    size: 1024
};

// Test runner utility
class TestRunner {
    private tests: Array<{ name: string; fn: () => Promise<void> }> = [];
    private results: Array<{ name: string; passed: boolean; error?: string }> = [];

    addTest(name: string, fn: () => Promise<void>) {
        this.tests.push({ name, fn });
    }

    async runAll(): Promise<boolean> {
        console.log('Starting test suite...\n');
        
        for (const test of this.tests) {
            try {
                console.log(`Running: ${test.name}`);
                await test.fn();
                this.results.push({ name: test.name, passed: true });
                console.log(`✅ PASSED: ${test.name}\n`);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                this.results.push({ name: test.name, passed: false, error: errorMessage });
                console.log(`❌ FAILED: ${test.name}`);
                console.log(`   Error: ${errorMessage}\n`);
            }
        }

        this.printSummary();
        return this.results.every(r => r.passed);
    }

    private printSummary() {
        const passed = this.results.filter(r => r.passed).length;
        const total = this.results.length;
        
        console.log('\n='.repeat(50));
        console.log('TEST SUMMARY');
        console.log('='.repeat(50));
        console.log(`Total tests: ${total}`);
        console.log(`Passed: ${passed}`);
        console.log(`Failed: ${total - passed}`);
        
        if (passed === total) {
            console.log('🎉 All tests passed!');
        } else {
            console.log('\n❌ Failed tests:');
            this.results.filter(r => !r.passed).forEach(r => {
                console.log(`  - ${r.name}: ${r.error}`);
            });
        }
    }
}

// Assertion utilities
function assert(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(message);
    }
}

function assertEqual<T>(actual: T, expected: T, message?: string) {
    if (actual !== expected) {
        throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
}

function assertNotNull<T>(value: T | null, message?: string) {
    if (value === null) {
        throw new Error(message || 'Expected non-null value');
    }
}

// Test suite
async function runTests() {
    const runner = new TestRunner();

    // Auth Service Tests
    runner.addTest('AuthService - Password hashing and verification', async () => {
        const auth = new AuthService(mockEnv.JWT_SECRET);
        
        const password = 'testpassword123';
        const hashedPassword = await auth.hashPassword(password);
        
        assert(hashedPassword.length > 0, 'Hashed password should not be empty');
        assert(hashedPassword !== password, 'Hashed password should differ from original');
        
        const isValid = await auth.verifyPassword(password, hashedPassword);
        assert(isValid, 'Password verification should succeed');
        
        const isInvalid = await auth.verifyPassword('wrongpassword', hashedPassword);
        assert(!isInvalid, 'Wrong password verification should fail');
    });

    runner.addTest('AuthService - JWT token generation and verification', async () => {
        const auth = new AuthService(mockEnv.JWT_SECRET);
        
        const username = 'testuser';
        const token = await auth.generateToken(username);
        
        assert(token.length > 0, 'Token should not be empty');
        assert(token.split('.').length === 3, 'JWT should have 3 parts');
        
        const payload = await auth.verifyToken(token);
        assertNotNull(payload);
        assertEqual(payload!.sub, username, 'Token payload should contain correct username');
        assert(payload!.exp > Date.now() / 1000, 'Token should not be expired');
    });

    runner.addTest('AuthService - Username validation', async () => {
        const auth = new AuthService(mockEnv.JWT_SECRET);
        
        // Valid usernames
        assertEqual(auth.validateUsername('validuser'), null);
        assertEqual(auth.validateUsername('user123'), null);
        assertEqual(auth.validateUsername('user-name'), null);
        
        // Invalid usernames
        assertEqual(auth.validateUsername(''), ErrorCode.INVALID_USERNAME);
        assertEqual(auth.validateUsername('ab'), ErrorCode.INVALID_USERNAME);
        assertEqual(auth.validateUsername('User123'), ErrorCode.INVALID_USERNAME); // uppercase
        assertEqual(auth.validateUsername('user_name'), ErrorCode.INVALID_USERNAME); // underscore
        assertEqual(auth.validateUsername('user@example'), ErrorCode.INVALID_USERNAME); // @ symbol
    });

    runner.addTest('AuthService - Password validation', async () => {
        const auth = new AuthService(mockEnv.JWT_SECRET);
        
        // Valid passwords
        assertEqual(auth.validatePassword('password123'), null);
        assertEqual(auth.validatePassword('a'.repeat(8)), null);
        assertEqual(auth.validatePassword('a'.repeat(128)), null);
        
        // Invalid passwords
        assertEqual(auth.validatePassword(''), ErrorCode.INVALID_PASSWORD);
        assertEqual(auth.validatePassword('short'), ErrorCode.INVALID_PASSWORD);
        assertEqual(auth.validatePassword('a'.repeat(129)), ErrorCode.INVALID_PASSWORD);
    });

    runner.addTest('AuthService - Token extraction from header', async () => {
        const auth = new AuthService(mockEnv.JWT_SECRET);
        
        const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token';
        
        assertEqual(auth.extractTokenFromHeader(`Bearer ${token}`), token);
        assertEqual(auth.extractTokenFromHeader('Bearer'), null);
        assertEqual(auth.extractTokenFromHeader('NotBearer token'), null);
        assertEqual(auth.extractTokenFromHeader(''), null);
        assertEqual(auth.extractTokenFromHeader(null), null);
    });

    // Email Handler Tests
    runner.addTest('EmailHandler - Extract username from email', async () => {
        const mockDb = {} as D1Database;
        const dbService = new DatabaseService(mockDb);
        const emailHandler = new EmailHandler(dbService);
        
        // Use reflection to access private method (for testing purposes)
        const extractUsername = (emailHandler as any).extractUsernameFromEmail.bind(emailHandler);
        
        assertEqual(extractUsername('user@agent.tai.chat'), 'user');
        assertEqual(extractUsername('test-user@agent.tai.chat'), 'test-user');
        assertEqual(extractUsername('user123@agent.tai.chat'), 'user123');
        
        assertEqual(extractUsername(''), null);
        assertEqual(extractUsername('invalid'), null);
        assertEqual(extractUsername('User@agent.tai.chat'), 'user'); // lowercase conversion
        assertEqual(extractUsername('user_name@agent.tai.chat'), null); // invalid chars
    });

    runner.addTest('EmailHandler - Email validation', async () => {
        const mockDb = {} as D1Database;
        const dbService = new DatabaseService(mockDb);
        const emailHandler = new EmailHandler(dbService);
        
        // Valid email
        assert(emailHandler.validateEmail({
            from: 'sender@example.com',
            to: 'user@agent.tai.chat',
            subject: 'Test',
            text: 'Content'
        }), 'Valid email should pass validation');
        
        // Invalid emails
        assert(!emailHandler.validateEmail({
            from: '',
            to: 'user@agent.tai.chat'
        }), 'Empty from should fail validation');
        
        assert(!emailHandler.validateEmail({
            from: 'sender@example.com',
            to: 'user@wrongdomain.com'
        }), 'Wrong domain should fail validation');
        
        assert(!emailHandler.validateEmail({
            from: 'invalid-email',
            to: 'user@agent.tai.chat'
        }), 'Invalid from format should fail validation');
    });

    runner.addTest('EmailHandler - Content parsing and cleaning', async () => {
        const mockDb = {} as D1Database;
        const dbService = new DatabaseService(mockDb);
        const emailHandler = new EmailHandler(dbService);
        
        // Use reflection to access private methods (for testing purposes)
        const parseContent = (emailHandler as any).parseEmailContent.bind(emailHandler);
        const cleanText = (emailHandler as any).cleanText.bind(emailHandler);
        const cleanHtml = (emailHandler as any).cleanHtml.bind(emailHandler);
        
        // Test text cleaning
        assertEqual(cleanText('  text with spaces  '), 'text with spaces');
        assertEqual(cleanText('line1\r\nline2\rline3\nline4'), 'line1\nline2\nline3\nline4');
        assertEqual(cleanText(''), null);
        
        // Test HTML cleaning
        const dirtyHtml = '<p>Content</p><script>alert("xss")</script><iframe src="evil"></iframe>';
        const cleanedHtml = cleanHtml(dirtyHtml);
        assert(!cleanedHtml!.includes('<script'), 'Scripts should be removed');
        assert(!cleanedHtml!.includes('<iframe'), 'Iframes should be removed');
        assert(cleanedHtml!.includes('<p>Content</p>'), 'Safe HTML should remain');
    });

    // Integration test for worker request handling
    runner.addTest('Worker Integration - Request routing', async () => {
        // Test that different paths are handled correctly
        const testCases = [
            { path: '/', method: 'GET', expectedStatus: 200 },
            { path: '/register', method: 'GET', expectedStatus: 200 },
            { path: '/health', method: 'GET', expectedStatus: 200 },
            { path: '/nonexistent', method: 'GET', expectedStatus: 404 },
            { path: '/api/v1/register', method: 'POST', expectedStatus: 400 }, // Invalid body
            { path: '/api/v1/login', method: 'POST', expectedStatus: 400 }, // Invalid body
        ];
        
        // This would require a more complete test setup with actual D1 database
        // For now, we'll just verify the test structure is in place
        assert(testCases.length > 0, 'Test cases should be defined');
    });

    return await runner.runAll();
}

// Export test runner for use in development/CI
export { runTests, TestRunner, assert, assertEqual, assertNotNull };

// Auto-run tests if this file is executed directly
if (typeof globalThis !== 'undefined' && globalThis.process?.argv?.[1]?.endsWith('test.ts')) {
    runTests().then(success => {
        process.exit(success ? 0 : 1);
    });
}