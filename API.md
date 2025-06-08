# CF Mail Bridge API Specification

## Overview

CF Mail Bridge is a Cloudflare Workers-based email bridge service that provides email message queuing functionality. It allows users to register, authenticate, and access their email messages through a RESTful API.

**Base URL**: `https://your-worker-domain.workers.dev`

## Authentication

The API uses JWT (JSON Web Token) based authentication. Tokens are included in the `Authorization` header:

```
Authorization: Bearer <token>
```

**Token Expiration**: 24 hours

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message"
  }
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `INVALID_REQUEST` | Malformed request body or parameters |
| `INVALID_USERNAME` | Username validation failed |
| `INVALID_PASSWORD` | Password validation failed |
| `USER_EXISTS` | Username already registered |
| `INVALID_CREDENTIALS` | Login credentials are incorrect |
| `UNAUTHORIZED` | Missing or invalid authentication token |
| `NOT_FOUND` | Requested resource not found |
| `RATE_LIMIT` | Too many requests |
| `INTERNAL_ERROR` | Server-side error |

## Endpoints

### 1. User Registration

**Endpoint**: `POST /api/v1/register`

**Description**: Register a new user account

**Request Body**:
```json
{
  "username": "string",
  "password": "string"
}
```

**Validation Rules**:
- Username: 3-50 characters, letters/numbers/hyphens only
- Password: 8-128 characters

**Response (Success)**:
```json
{
  "success": true,
  "data": {
    "username": "string",
    "email": "username@agent.tai.chat",
    "token": "jwt_token_string"
  }
}
```

**Example**:
```bash
curl -X POST https://your-worker.workers.dev/api/v1/register \
  -H "Content-Type: application/json" \
  -d '{"username": "johndoe", "password": "mypassword123"}'
```

### 2. User Login

**Endpoint**: `POST /api/v1/login`

**Description**: Authenticate user and receive access token

**Request Body**:
```json
{
  "username": "string",
  "password": "string"
}
```

**Response (Success)**:
```json
{
  "success": true,
  "data": {
    "token": "jwt_token_string",
    "expires_at": "2024-01-01T12:00:00.000Z"
  }
}
```

**Example**:
```bash
curl -X POST https://your-worker.workers.dev/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{"username": "johndoe", "password": "mypassword123"}'
```

### 3. Token Refresh

**Endpoint**: `POST /api/v1/refresh`

**Description**: Refresh an existing token to extend its validity

**Headers**:
```
Authorization: Bearer <current_token>
```

**Response (Success)**:
```json
{
  "success": true,
  "data": {
    "token": "new_jwt_token_string",
    "expires_at": "2024-01-01T12:00:00.000Z"
  }
}
```

**Example**:
```bash
curl -X POST https://your-worker.workers.dev/api/v1/refresh \
  -H "Authorization: Bearer your_current_token"
```

### 4. Get Messages

**Endpoint**: `GET /api/v1/messages`

**Description**: Retrieve user's email messages with pagination and filtering

**Headers**:
```
Authorization: Bearer <token>
```

**Query Parameters**:
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | integer | 50 | Number of messages to return (max: 200) |
| `offset` | integer | 0 | Number of messages to skip |
| `date_from` | string | - | Start date filter (YYYY-MM-DD format) |
| `date_to` | string | - | End date filter (YYYY-MM-DD format) |

**Response (Success)**:
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": 1,
        "message_id": "unique_email_id",
        "from": "sender@example.com",
        "subject": "Email subject",
        "body_text": "Plain text content",
        "body_html": "<p>HTML content</p>",
        "received_at": "2024-01-01T12:00:00.000Z",
        "size": 1024
      }
    ],
    "count": 1,
    "has_more": false
  }
}
```

**Examples**:

Basic request:
```bash
curl -X GET https://your-worker.workers.dev/api/v1/messages \
  -H "Authorization: Bearer your_token"
```

With pagination:
```bash
curl -X GET "https://your-worker.workers.dev/api/v1/messages?limit=10&offset=20" \
  -H "Authorization: Bearer your_token"
```

With date filtering:
```bash
curl -X GET "https://your-worker.workers.dev/api/v1/messages?date_from=2024-01-01&date_to=2024-01-31" \
  -H "Authorization: Bearer your_token"
```

### 5. Get Single Message

**Endpoint**: `GET /api/v1/messages/{messageId}`

**Description**: Retrieve a specific message by ID

**Headers**:
```
Authorization: Bearer <token>
```

**Path Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `messageId` | integer | Message ID |

**Response (Success)**:
```json
{
  "success": true,
  "data": {
    "id": 1,
    "message_id": "unique_email_id",
    "from": "sender@example.com",
    "subject": "Email subject",
    "body_text": "Plain text content",
    "body_html": "<p>HTML content</p>",
    "received_at": "2024-01-01T12:00:00.000Z",
    "size": 1024
  }
}
```

**Example**:
```bash
curl -X GET https://your-worker.workers.dev/api/v1/messages/123 \
  -H "Authorization: Bearer your_token"
```

### 6. Send Test Email

**Endpoint**: `POST /api/v1/send-test-email`

**Description**: Send a test email via the Resend service

**Request Body**:
```json
{
  "to": "recipient@example.com",
  "subject": "Optional subject",
  "message": "Optional plain text message",
  "html": "Optional HTML content"
}
```

**Response (Success)**:
```json
{
  "success": true,
  "data": {
    "messageId": "resend_message_id",
    "to": "recipient@example.com",
    "subject": "Email subject",
    "timestamp": "2024-01-01T12:00:00.000Z"
  }
}
```

**Example**:
```bash
curl -X POST https://your-worker.workers.dev/api/v1/send-test-email \
  -H "Content-Type: application/json" \
  -d '{"to": "test@example.com", "subject": "Test Email"}'
```

### 7. Health Check

**Endpoint**: `GET /health`

**Description**: Check service health and database connectivity

**Response (Success)**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Response (Failure)**:
```json
{
  "status": "unhealthy",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

**Example**:
```bash
curl -X GET https://your-worker.workers.dev/health
```

## Data Models

### User
```typescript
interface User {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
  last_access?: string;
}
```

### Message
```typescript
interface Message {
  id: number;
  user_id: number;
  message_id?: string;
  from_address: string;
  to_address: string;
  subject?: string;
  body_text?: string;
  body_html?: string;
  raw_headers?: string;
  raw_size?: number;
  received_at: string;
}
```

### Message Response (API)
```typescript
interface MessageResponse {
  id: number;
  message_id?: string;
  from: string;
  subject?: string;
  body_text?: string;
  body_html?: string;
  received_at: string;
  size?: number;
}
```

## Web Interface Endpoints

The service also provides web interface endpoints:

- `GET /` - Homepage with API documentation
- `GET /register` - User registration page
- `GET /login` - User login page
- `GET /messages` - Messages interface (requires authentication)

## Email Processing

The service automatically processes incoming emails via Cloudflare's Email Routing:

- Emails sent to `*@agent.tai.chat` are automatically processed
- Messages are parsed and stored in the database
- Users can access their messages via the API

## Rate Limiting

The service implements rate limiting to prevent abuse. Specific limits depend on the deployment configuration.

## CORS

All API endpoints support CORS with the following configuration:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization`

## Environment Variables

The service requires the following environment variables:

- `JWT_SECRET` - Secret key for JWT token signing
- `RESEND_API_KEY` - API key for Resend email service (optional)

## Database

The service uses Cloudflare D1 database with the following tables:

- `users` - User accounts
- `messages` - Email messages

Refer to `schema.sql` for the complete database schema.