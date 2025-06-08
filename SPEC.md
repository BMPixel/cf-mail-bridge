# Email Message Queue System - Technical Implementation Specification

## 1. System Overview

### 1.1 System Purpose
A lightweight email message queue system based on Cloudflare Workers, providing programmatic email registration and message retrieval services.

### 1.2 Core Features
- User registration (username/password)
- JWT authentication login
- Receive emails and store as messages
- Read message list via API

### 1.3 Tech Stack
- **Runtime**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Email Handler**: Cloudflare Email Workers
- **Authentication**: JWT (JSON Web Token)

## 2. Project Structure

```
.
├── src/
│   ├── index.ts               # Worker main entry
│   ├── types.ts               # TypeScript type definitions
│   ├── auth.ts                # JWT and password handling
│   ├── database.ts            # Database operations
│   └── email-handler.ts       # Email processing logic
├── migrations/
│   └── schema.sql             # Database initialization script
├── public/
│   ├── index.html             # Homepage
│   └── register.html          # Registration page
├── package.json
├── tsconfig.json
├── wrangler.jsonc
└── README.md
```

## 3. Database Design

### 3.1 Table Structure

```sql
-- Users table
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_access TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);

-- Messages table
CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    message_id VARCHAR(255) UNIQUE,
    from_address VARCHAR(255) NOT NULL,
    to_address VARCHAR(255) NOT NULL,
    subject TEXT,
    body_text TEXT,
    body_html TEXT,
    raw_headers TEXT,
    raw_size INTEGER,
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_messages_user_id ON messages(user_id);
CREATE INDEX idx_messages_received_at ON messages(received_at);
```

## 4. API Endpoints

### 4.1 Endpoint List

| Method | Path | Function | Auth |
|--------|------|----------|------|
| GET | / | Homepage | No |
| GET | /register | Registration page | No |
| POST | /api/v1/register | User registration | No |
| POST | /api/v1/login | User login | No |
| POST | /api/v1/refresh | Refresh token | JWT |
| GET | /api/v1/messages | Get message list | JWT |
| GET | /api/v1/messages/{id} | Get single message | JWT |
| GET | /health | Health check | No |

### 4.2 Request/Response Format

#### Registration Request
```json
{
    "username": "john-doe",
    "password": "secure-password"
}
```

#### Registration Response
```json
{
    "success": true,
    "data": {
        "username": "john-doe",
        "email": "john-doe@agent.tai.chat",
        "token": "eyJhbGciOiJIUzI1NiIs..."
    }
}
```

#### Login Request
```json
{
    "username": "john-doe",
    "password": "secure-password"
}
```

#### Login Response
```json
{
    "success": true,
    "data": {
        "token": "eyJhbGciOiJIUzI1NiIs...",
        "expires_at": "2025-01-09T10:00:00Z"
    }
}
```

#### Message List Request
```
GET /api/v1/messages?limit=50&offset=0
Authorization: Bearer <jwt-token>
```

#### Message List Response
```json
{
    "success": true,
    "data": {
        "messages": [
            {
                "id": 123,
                "message_id": "unique-message-id",
                "from": "sender@example.com",
                "subject": "Hello World",
                "body_text": "Message content...",
                "body_html": "<html>...</html>",
                "received_at": "2025-01-08T10:00:00Z",
                "size": 2048
            }
        ],
        "count": 1,
        "has_more": false
    }
}
```

### 4.3 Error Response Format
```json
{
    "success": false,
    "error": {
        "code": "ERROR_CODE",
        "message": "Error description"
    }
}
```

### 4.4 Error Codes

| Error Code | Description |
|------------|-------------|
| INVALID_REQUEST | Invalid request format |
| INVALID_USERNAME | Invalid username format |
| INVALID_PASSWORD | Invalid password format |
| USER_EXISTS | Username already exists |
| INVALID_CREDENTIALS | Invalid username or password |
| UNAUTHORIZED | Unauthorized access |
| NOT_FOUND | Resource not found |
| RATE_LIMIT | Too many requests |
| INTERNAL_ERROR | Internal server error |

## 5. Authentication Mechanism

### 5.1 JWT Configuration
- **Algorithm**: HS256
- **Secret**: Configured via JWT_SECRET environment variable
- **Expiry**: 24 hours
- **Payload fields**:
  - sub: username
  - iat: issued at
  - exp: expiration time

### 5.2 Password Handling
- **Algorithm**: PBKDF2-SHA256
- **Iterations**: 100,000
- **Salt**: 16-byte random value
- **Storage format**: base64(salt + hash)

## 6. Email Processing

### 6.1 Processing Flow
1. Receive email sent to @agent.tai.chat
2. Extract username (part before @ symbol)
3. Check if user exists
4. Parse email content
5. Store in messages table
6. Forward email (optional)

### 6.2 Email Parsing
- Extract plain text and HTML content
- Save raw email headers as JSON
- Record email size

## 7. Environment Configuration

### 7.1 Environment Variables
```jsonc
// wrangler.jsonc
{
    "name": "email-bridge",
    "main": "src/index.ts",
    "compatibility_date": "2025-01-08",
    "vars": {
        "JWT_SECRET": "your-secret-key-here"
    },
    "d1_databases": [
        {
            "binding": "DB",
            "database_name": "email-queue",
            "database_id": "your-database-id"
        }
    ],
    "email_routing_rules": [
        {
            "type": "forward",
            "value": "worker"
        }
    ]
}
```

### 7.2 Type Definitions
```typescript
interface Env {
    DB: D1Database;
    JWT_SECRET: string;
}
```

## 8. Implementation Notes

### 8.1 Routing
- Use URL path matching for different endpoints
- Distinguish GET/POST request methods
- Serve static files from public directory

### 8.2 Database Operations
- Use D1 prepared statements to prevent SQL injection
- Transaction handling for data consistency
- Proper indexing for query performance

### 8.3 Error Handling
- Unified error response format
- Appropriate HTTP status codes
- Don't expose internal error details

### 8.4 Input Validation
- Username: 3-50 characters, lowercase letters, numbers, hyphens
- Password: 8-128 characters
- Query parameter limits (max limit: 200)

## 9. Deployment Steps

1. Install dependencies: `npm install`
2. Create database: `wrangler d1 create email-queue`
3. Run migrations: `wrangler d1 execute email-queue --file=./migrations/schema.sql`
4. Configure environment variables (set JWT_SECRET in wrangler.jsonc)
5. Deploy: `wrangler deploy`

## 10. Usage Examples

### Register User
```bash
curl -X POST https://tai.chat/api/v1/register \
  -H "Content-Type: application/json" \
  -d '{"username": "test-user", "password": "password123"}'
```

### Login
```bash
curl -X POST https://tai.chat/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{"username": "test-user", "password": "password123"}'
```

### Get Messages
```bash
curl -X GET https://tai.chat/api/v1/messages \
  -H "Authorization: Bearer <jwt-token>"
```