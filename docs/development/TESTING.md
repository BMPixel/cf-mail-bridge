# Testing Guide

This document provides comprehensive instructions for running tests in the Cloudflare Workers email bridge application.

## Overview

The project uses **Vitest** as the testing framework with a comprehensive test suite covering:
- Authentication (password hashing, JWT, validation)
- Email handling (incoming/outgoing emails, Resend integration)
- API endpoints (registration, login, messages)
- Database operations
- Error handling and edge cases

## Test Structure

```
tests/
├── helpers/           # Test utilities and helpers
│   ├── assertions.ts  # Custom test assertions
│   ├── auth-helpers.ts # JWT and password test utilities
│   ├── request-builder.ts # HTTP request builder for tests
│   └── test-db.ts     # Database test utilities
├── integration/       # Integration tests
│   └── api-endpoints.test.ts # API endpoint tests
└── unit/             # Unit tests
    ├── auth/         # Authentication tests
    │   ├── auth.test.ts      # Complete auth flows
    │   ├── jwt.test.ts       # JWT token tests
    │   ├── password.test.ts  # Password hashing tests
    │   └── validation.test.ts # Input validation tests
    └── email/        # Email handling tests
        └── email-handler.test.ts # Email processing tests
```

## Running Tests

### Prerequisites

Ensure all dependencies are installed:
```bash
npm install
```

### Basic Test Commands

#### Run All Tests
```bash
npm test
# or
npm run test:run
```

#### Run Tests in Watch Mode
```bash
npm run test:watch
```

#### Run Specific Test Files
```bash
# Run all authentication tests
npm run test:run tests/unit/auth/

# Run specific test file
npm run test:run tests/unit/auth/jwt.test.ts

# Run email handler tests
npm run test:run tests/unit/email/email-handler.test.ts
```

#### Run Tests with Verbose Output
```bash
npm run test:run -- --reporter=verbose
```

#### Run Integration Tests
```bash
npm run test:run tests/integration/
```

### Test Categories

#### 1. Authentication Tests (86 tests)
```bash
# All auth tests
npm run test:run tests/unit/auth/

# Password hashing and verification
npm run test:run tests/unit/auth/password.test.ts

# JWT generation and verification
npm run test:run tests/unit/auth/jwt.test.ts

# Input validation
npm run test:run tests/unit/auth/validation.test.ts

# Complete authentication flows
npm run test:run tests/unit/auth/auth.test.ts
```

#### 2. Email Handler Tests (21 tests)
```bash
# All email tests
npm run test:run tests/unit/email/

# Email processing, validation, and sending
npm run test:run tests/unit/email/email-handler.test.ts
```

#### 3. Integration Tests
```bash
# API endpoint tests (requires wrangler dev)
npm run test:run tests/integration/api-endpoints.test.ts
```

## Test Configuration

### Vitest Configuration
- **Config file**: `vitest.config.ts`
- **Environment**: Node.js (for unit tests)
- **Global setup**: `test-config/test-setup.ts`
- **Teardown**: `test-config/test-teardown.ts`
- **Timeout**: 10 seconds per test
- **Coverage**: Available via `--coverage` flag

### Key Test Settings
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['./test-config/test-setup.ts'],
    include: ['tests/**/*.test.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
    environment: 'node',
  }
});
```

## Mock Strategy

### External Dependencies
Tests use comprehensive mocking to ensure fast, reliable unit tests:

#### Mocked Services
- **postal-mime**: Email parsing library
- **ResendService**: Email sending service
- **Database**: SQLite operations

#### Mock Examples
```typescript
// postal-mime mock
vi.mock('postal-mime', () => ({
  default: vi.fn(() => ({
    parse: vi.fn().mockResolvedValue(mockEmailData)
  }))
}));

// ResendService mock
vi.mock('../../../src/resend-service', () => ({
  getResendService: vi.fn(() => mockResendService),
  ResendEmailService: vi.fn(() => mockResendService)
}));
```

## Running Integration Tests

### Prerequisites for Integration Tests
Integration tests require a running wrangler dev instance:

```bash
# Terminal 1: Start wrangler dev
npx wrangler dev

# Terminal 2: Run integration tests
npm run test:run tests/integration/
```

### Integration Test Coverage
- User registration
- User login
- Token refresh
- Message retrieval
- Email sending
- Authentication middleware

## Test Performance

### Expected Test Times
- **Unit tests**: ~400ms for all 107 tests
- **Integration tests**: ~2-5 seconds (depends on wrangler dev)
- **Individual test files**: <100ms each

### Performance Tips
1. **Use mocks**: All external services are mocked for speed
2. **Parallel execution**: Tests run in parallel by default
3. **Selective running**: Run specific test files during development

## Debugging Tests

### Verbose Output
```bash
npm run test:run -- --reporter=verbose
```

### Debug Specific Test
```bash
npm run test:run tests/unit/auth/jwt.test.ts -- --reporter=verbose
```

### Check Test Coverage
```bash
npm run test:run -- --coverage
```

## Common Issues and Solutions

### 1. Tests Timeout
- **Issue**: Tests taking too long
- **Solution**: Check if external services are properly mocked
- **Check**: Verify no real API calls are being made

### 2. Database Connection Errors
- **Issue**: D1 database access errors in tests
- **Solution**: Tests use mocked database service, not real D1
- **Note**: Unit tests don't require actual database connection

### 3. Email Sending Errors
- **Issue**: ResendService API errors
- **Solution**: Verify ResendService is properly mocked
- **Check**: Tests should not make real email API calls

### 4. JWT Verification Failures
- **Issue**: JWT tests failing
- **Solution**: Check if test secret keys match between generation and verification
- **Note**: Tests use consistent test secret keys

## Test Data and Fixtures

### Test Users
```typescript
const testUser = {
  username: 'testuser',
  password: 'testpassword123'
};
```

### Test Email Data
```typescript
const testEmail = {
  from: 'sender@example.com',
  to: 'testuser@tai.chat',
  subject: 'Test Subject',
  text: 'Test body',
  html: '<p>Test body</p>'
};
```

## Continuous Integration

### Running Tests in CI
```bash
# CI command for all tests
npm run test:run

# CI command with coverage
npm run test:run -- --coverage
```

### Environment Variables
No special environment variables required for unit tests. All external dependencies are mocked.

## Writing New Tests

### Test File Naming
- Unit tests: `*.test.ts` in `tests/unit/`
- Integration tests: `*.test.ts` in `tests/integration/`
- Test helpers: `*.ts` in `tests/helpers/`

### Test Structure Example
```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('Feature Name', () => {
  beforeEach(() => {
    // Setup before each test
    vi.clearAllMocks();
  });

  describe('Specific Functionality', () => {
    it('should do something specific', async () => {
      // Arrange
      const input = 'test input';
      
      // Act
      const result = await functionUnderTest(input);
      
      // Assert
      expect(result).toBe('expected output');
    });
  });
});
```

### Adding Mocks
```typescript
// Mock external dependency
vi.mock('external-library', () => ({
  default: vi.fn(() => ({
    method: vi.fn().mockResolvedValue('mock result')
  }))
}));
```

## Summary

- **Total Tests**: 107+ tests covering core functionality
- **Framework**: Vitest with Node.js environment
- **Speed**: ~400ms for all unit tests
- **Coverage**: Authentication, email handling, API endpoints
- **Mocking**: Comprehensive mocking of external dependencies
- **Commands**: Use `npm test` for quick runs, `npm run test:run -- --reporter=verbose` for detailed output

For any issues or questions about testing, refer to the test files themselves as they contain comprehensive examples of testing patterns used in this project.