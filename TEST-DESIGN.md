# CF Mail Bridge - Comprehensive Test Architecture

## 1. Test Structure Overview

### Project Tree with Tests

```
cf-mail-bridge/
├── src/
│   ├── index.ts
│   ├── types.ts
│   ├── auth.ts
│   ├── database.ts
│   ├── email-handler.ts
│   ├── resend-service.ts
│   └── retry-service.ts
│
├── tests/
│   ├── unit/
│   │   ├── auth/
│   │   │   ├── auth.test.ts
│   │   │   ├── password.test.ts
│   │   │   ├── jwt.test.ts
│   │   │   └── validation.test.ts
│   │   │
│   │   ├── database/
│   │   │   ├── users.test.ts
│   │   │   ├── messages.test.ts
│   │   │   ├── queries.test.ts
│   │   │   └── transactions.test.ts
│   │   │
│   │   ├── email/
│   │   │   ├── parser.test.ts
│   │   │   ├── validator.test.ts
│   │   │   ├── processor.test.ts
│   │   │   └── content-converter.test.ts
│   │   │
│   │   ├── services/
│   │   │   ├── resend.test.ts
│   │   │   ├── retry.test.ts
│   │   │   └── circuit-breaker.test.ts
│   │   │
│   │   └── api/
│   │       ├── request-handler.test.ts
│   │       ├── response-builder.test.ts
│   │       └── error-handler.test.ts
│   │
│   ├── integration/
│   │   ├── auth-flow.test.ts
│   │   ├── message-flow.test.ts
│   │   ├── email-processing.test.ts
│   │   ├── api-endpoints.test.ts
│   │   └── resend-integration.test.ts
│   │
│   ├── fixtures/
│   │   ├── emails/
│   │   │   ├── basic.json
│   │   │   ├── html-rich.json
│   │   │   ├── multipart.json
│   │   │   ├── malformed.json
│   │   │   └── edge-cases.json
│   │   │
│   │   ├── users.json
│   │   ├── messages.json
│   │   └── api-responses.json
│   │
│   ├── mocks/
│   │   ├── cloudflare/
│   │   │   ├── d1.mock.ts
│   │   │   ├── worker.mock.ts
│   │   │   └── crypto.mock.ts
│   │   │
│   │   ├── external/
│   │   │   ├── resend.mock.ts
│   │   │   └── postal-mime.mock.ts
│   │   │
│   │   └── factories/
│   │       ├── user.factory.ts
│   │       ├── message.factory.ts
│   │       └── email.factory.ts
│   │
│   └── helpers/
│       ├── test-db.ts
│       ├── auth-helpers.ts
│       ├── request-builder.ts
│       └── assertions.ts
│
└── test-config/
    ├── vitest.config.ts
    ├── test-setup.ts
    └── test-teardown.ts
```

## 2. Unit Test Implementation Details

### 2.1 Authentication Module Tests

#### `auth/password.test.ts`
- **Hash Generation Tests**
  - Verify PBKDF2-SHA256 implementation
  - Salt uniqueness for identical passwords
  - Hash format validation (base64 encoding)
  - Performance benchmarks for hash generation

- **Password Verification Tests**
  - Correct password acceptance
  - Incorrect password rejection
  - Empty/null password handling
  - Timing attack resistance validation

#### `auth/jwt.test.ts`
- **Token Generation Tests**
  - Payload structure validation
  - Expiration time calculation
  - Signature algorithm verification
  - Token format compliance (three parts)

- **Token Verification Tests**
  - Valid token acceptance
  - Expired token rejection
  - Malformed token handling
  - Invalid signature detection
  - Clock skew tolerance

#### `auth/validation.test.ts`
- **Username Validation Tests**
  - Length boundaries (3-50 characters)
  - Character set validation (a-z, 0-9, hyphens)
  - Case sensitivity handling
  - SQL injection attempt rejection

- **Password Validation Tests**
  - Length boundaries (8-128 characters)
  - Unicode character support
  - Special character acceptance
  - Common password pattern warnings

### 2.2 Database Module Tests

#### `database/users.test.ts`
- **User Creation Tests**
  - Successful user insertion
  - Duplicate username handling
  - Transaction rollback on failure
  - Auto-increment ID generation
  - Timestamp accuracy

- **User Retrieval Tests**
  - Lookup by username
  - Case-insensitive search
  - Non-existent user handling
  - Index performance validation

#### `database/messages.test.ts`
- **Message Storage Tests**
  - Complete message insertion
  - Null field handling
  - Foreign key constraints
  - Large content storage
  - Concurrent write safety

- **Message Retrieval Tests**
  - Pagination accuracy
  - Sort order verification
  - Filter application
  - Join performance
  - Count query optimization

#### `database/queries.test.ts`
- **Query Building Tests**
  - Parameter binding safety
  - SQL injection prevention
  - Query plan optimization
  - Prepared statement caching

#### `database/transactions.test.ts`
- **Transaction Management Tests**
  - Commit success scenarios
  - Rollback on errors
  - Nested transaction handling
  - Deadlock prevention
  - Isolation level verification

### 2.3 Email Handler Tests

#### `email/parser.test.ts`
- **Email Parsing Tests**
  - Plain text extraction
  - HTML content parsing
  - Multipart message handling
  - Attachment detection
  - Header extraction

- **Edge Case Tests**
  - Malformed MIME structures
  - Missing required headers
  - Encoding issues
  - Large email handling

#### `email/validator.test.ts`
- **Address Validation Tests**
  - RFC-compliant email formats
  - Domain verification
  - Local part extraction
  - International domain support

#### `email/processor.test.ts`
- **Content Processing Tests**
  - HTML to Markdown conversion
  - Text normalization
  - Whitespace handling
  - Character encoding
  - Size calculation

#### `email/content-converter.test.ts`
- **HTML to Text Conversion Tests**
  - Basic HTML stripping
  - Complex nested structures
  - Code block preservation
  - Link conversion
  - Fallback text extraction mechanism

### 2.4 Service Tests

#### `services/resend.test.ts`
- **Email Sending Tests**
  - Single email dispatch
  - Bulk email handling
  - Template rendering
  - Attachment processing
  - Error response handling

#### `services/retry.test.ts`
- **Retry Logic Tests**
  - Exponential backoff calculation
  - Maximum attempt enforcement
  - Retry decision logic
  - Timeout handling
  - Success after retry

#### `services/circuit-breaker.test.ts`
- **Circuit State Tests**
  - Closed to Open transition
  - Open to Half-Open transition
  - Half-Open to Closed recovery
  - Failure threshold calculation
  - Recovery timeout validation

## 3. Integration Test Specifications

### 3.1 `auth-flow.test.ts`
- **Complete Authentication Flow**
  - User registration with token generation
  - Login with credentials validation
  - Token refresh mechanism
  - Protected endpoint access
  - Session expiration handling

### 3.2 `message-flow.test.ts`
- **Message Lifecycle Tests**
  - Message creation via API
  - Retrieval with pagination
  - Mark as read functionality
  - Message deletion
  - Concurrent access handling

### 3.3 `email-processing.test.ts`
- **Email Reception Flow**
  - Cloudflare email worker simulation
  - User matching by email address
  - Content processing pipeline
  - Database persistence
  - Error recovery mechanisms

### 3.4 `api-endpoints.test.ts`
- **Endpoint Integration Tests**
  - Registration endpoint with database
  - Login with JWT generation
  - Message endpoints with auth
  - Error response consistency
  - CORS header validation

### 3.5 `resend-integration.test.ts`
- **External Service Integration**
  - API key validation
  - Request formatting
  - Response parsing
  - Error handling
  - Rate limit compliance

## 4. Mock Strategy

### 4.1 Cloudflare Mocks

#### `d1.mock.ts`
```typescript
interface D1MockConfig {
  simulateLatency?: boolean;
  failureRate?: number;
  connectionLimit?: number;
}

class D1Mock implements D1Database {
  // In-memory SQLite for testing
  // Transaction simulation
  // Prepared statement caching
  // Error injection capabilities
}
```

#### `worker.mock.ts`
```typescript
class WorkerEnvironmentMock {
  // Request/Response simulation
  // ExecutionContext mock
  // Fetch event handling
  // Environment variable injection
}
```

#### `crypto.mock.ts`
```typescript
class CryptoMock {
  // Deterministic random generation
  // Consistent salt generation for tests
  // Performance simulation
  // Algorithm compliance
}
```

### 4.2 External Service Mocks

#### `resend.mock.ts`
```typescript
interface ResendMockConfig {
  defaultResponses?: Map<string, any>;
  simulateRateLimit?: boolean;
  networkLatency?: number;
}

class ResendMock {
  // Response queue management
  // Error injection
  // Rate limit simulation
  // Webhook simulation
}
```

### 4.3 Factory Pattern Implementation

#### `user.factory.ts`
```typescript
class UserFactory {
  static create(overrides?: Partial<User>): User
  static createBatch(count: number): User[]
  static createWithMessages(messageCount: number): UserWithMessages
}
```

#### `message.factory.ts`
```typescript
class MessageFactory {
  static createPlainText(): Message
  static createHtml(): Message
  static createMultipart(): Message
  static createWithAttachments(): Message
}
```

## 5. Test Execution Architecture

### 5.1 Test Runner Configuration

```typescript
// vitest.config.ts
export default {
  test: {
    globals: true,
    environment: 'miniflare',
    setupFiles: ['./test-setup.ts'],
    include: ['tests/**/*.test.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@/': './src/',
      '@test/': './tests/',
    },
  },
}
```

### 5.2 Test Setup and Teardown

```typescript
// test-setup.ts
beforeAll(async () => {
  // Initialize test database
  // Setup global mocks
  // Configure test environment
});

afterEach(async () => {
  // Clear database state
  // Reset mock counters
  // Clean up resources
});

afterAll(async () => {
  // Destroy test database
  // Close connections
  // Generate reports
});
```

## 6. API Endpoint Test Matrix

| Endpoint | Method | Test Scenarios | Mock Requirements |
|----------|--------|----------------|-------------------|
| `/api/v1/register` | POST | • Valid registration<br>• Duplicate username<br>• Invalid username format<br>• Invalid password format<br>• Database failure<br>• Concurrent registration | • D1 Database<br>• Crypto API |
| `/api/v1/login` | POST | • Valid credentials<br>• Invalid username<br>• Invalid password<br>• Non-existent user<br>• Database timeout<br>• Concurrent login | • D1 Database<br>• JWT generation |
| `/api/v1/refresh` | POST | • Valid token refresh<br>• Expired token<br>• Invalid token<br>• Malformed token<br>• Missing header | • JWT verification |
| `/api/v1/messages` | GET | • Successful retrieval<br>• Pagination limits<br>• Empty results<br>• Invalid auth<br>• Database errors<br>• Query injection | • D1 Database<br>• Auth verification |
| `/api/v1/messages/{id}` | GET | • Valid message<br>• Non-existent ID<br>• Wrong user access<br>• Invalid ID format | • D1 Database<br>• Auth verification |
| `/api/v1/messages/{id}` | DELETE | • Successful deletion<br>• Already deleted<br>• Unauthorized<br>• Database constraints | • D1 Database<br>• Auth verification |
| `/api/v1/messages/{id}/read` | PUT | • Mark as read<br>• Already read<br>• Invalid message<br>• Concurrent updates | • D1 Database<br>• Auth verification |
| `/api/v1/send-test-email` | POST | • Successful send<br>• Invalid recipient<br>• Resend API failure<br>• Rate limiting<br>• Malformed content | • Resend API<br>• Email validation |

## 7. Validation Testing Framework

### 7.1 Input Validation Matrix

| Input Type | Validation Rules | Test Cases |
|------------|------------------|-------------|
| Username | • 3-50 characters<br>• Lowercase only<br>• a-z, 0-9, hyphens | • Minimum length<br>• Maximum length<br>• Invalid characters<br>• SQL injection<br>• Unicode attempts |
| Password | • 8-128 characters<br>• Any characters allowed | • Minimum length<br>• Maximum length<br>• Special characters<br>• Unicode support<br>• Empty string |
| Email | • RFC 5322 compliant<br>• @tai.chat domain | • Valid formats<br>• Missing @ symbol<br>• Invalid domain<br>• Multiple @ symbols<br>• Special characters |
| Message ID | • Numeric ID<br>• Positive integer | • Valid numbers<br>• Negative numbers<br>• Non-numeric<br>• Overflow values<br>• Injection attempts |
| Query Params | • limit: 1-200<br>• offset: >= 0 | • Boundary values<br>• Type coercion<br>• Missing params<br>• Invalid types |

### 7.2 Output Validation Tests

```typescript
interface ResponseValidation {
  structure: ValidateResponseStructure;
  types: ValidateDataTypes;
  constraints: ValidateBusinessRules;
  consistency: ValidateCrossFieldRules;
}
```

## 8. Test Data Management

### 8.1 Fixture Organization

```typescript
// fixtures/emails/basic.json
{
  "from": "sender@example.com",
  "to": "testuser@tai.chat",
  "subject": "Test Subject",
  "text": "Plain text content",
  "html": "<p>HTML content</p>",
  "headers": {
    "Message-ID": "<unique-id@example.com>",
    "Date": "2024-01-01T00:00:00Z"
  }
}
```

### 8.2 Test Data Isolation

```typescript
class TestDataManager {
  private testNamespace: string;
  
  async setupTestData(): Promise<void>;
  async cleanupTestData(): Promise<void>;
  async createIsolatedUser(): Promise<User>;
  async createIsolatedMessage(): Promise<Message>;
}
```

## 9. Performance Testing Integration

### 9.1 Benchmark Tests

```typescript
interface PerformanceBenchmark {
  operation: string;
  expectedDuration: number;
  maxDuration: number;
  iterations: number;
}

// Integrated into unit tests
test('password hashing performance', async () => {
  const benchmark = await measurePerformance(
    () => authService.hashPassword('test'),
    { iterations: 100 }
  );
  
  expect(benchmark.average).toBeLessThan(100); // ms
  expect(benchmark.p95).toBeLessThan(150); // ms
});
```

### 9.2 Load Simulation

```typescript
class LoadSimulator {
  async simulateConcurrentRequests(
    endpoint: string,
    concurrency: number,
    duration: number
  ): Promise<LoadTestResults>;
  
  async simulateDatabaseLoad(
    queryType: string,
    concurrency: number
  ): Promise<QueryPerformanceResults>;
}
```

## 10. Security Testing Framework

### 10.1 Security Test Scenarios

```typescript
interface SecurityTestSuite {
  injection: TestSQLInjection[];
  authentication: TestAuthBypass[];
  authorization: TestAccessControl[];
  validation: TestInputSanitization[];
  cryptography: TestCryptoImplementation[];
}
```

### 10.2 Vulnerability Testing

```typescript
class SecurityTester {
  async testSQLInjection(endpoint: string): Promise<VulnerabilityReport>;
  async testJWTManipulation(token: string): Promise<SecurityReport>;
  async testRateLimiting(endpoint: string): Promise<RateLimitReport>;
  async testCORSPolicy(origin: string): Promise<CORSReport>;
}
```

## 11. Continuous Integration Strategy

### 11.1 Test Pipeline Stages

```yaml
test-pipeline:
  - stage: setup
    - Install dependencies
    - Setup test database
    - Generate test fixtures
  
  - stage: unit-tests
    - Run unit tests in parallel
    - Generate test reports
    - Check test failures
  
  - stage: integration-tests
    - Run integration tests
    - Validate API contracts
    - Check external dependencies
  
  - stage: security-tests
    - Run security scans
    - Check vulnerabilities
    - Validate implementations
  
  - stage: performance-tests
    - Run benchmarks
    - Compare with baselines
    - Generate performance reports
```

### 11.2 Test Reporting

```typescript
interface TestReport {
  summary: TestSummary;
  failures: TestFailure[];
  performance: PerformanceMetrics;
  recommendations: TestImprovement[];
}
```

This architecture provides comprehensive testing coverage while maintaining practical implementation focus and clear separation of concerns.