# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## CF Mail Bridge - Cloudflare Workers Email Service

A production-ready email message queue system built on Cloudflare Workers that provides email registration, authentication, and message retrieval via REST API.

## Architecture Overview

**Core Components:**
- **Email Handler** (`src/email-handler.ts`): Processes incoming emails via Cloudflare Email Workers, extracts usernames from email addresses, and stores messages in D1
- **Authentication** (`src/auth.ts`): JWT-based auth with PBKDF2-SHA256 password hashing
- **Database Service** (`src/database.ts`): D1 operations for users and messages tables
- **Resend Integration** (`src/resend-service.ts`): Outbound email sending with retry logic
- **Main Router** (`src/index.ts`): HTTP request routing, CORS handling, and web interface

**Email Flow:**
1. Emails sent to `*@tai.chat` trigger the email handler
2. Username extracted from email address (supports prefixes like `desktop.wenbo@tai.chat` -> `wenbo`)
3. Email content parsed with postal-mime and stored in D1
4. Users access messages via authenticated API endpoints

## Development Commands

**Core Development:**
```bash
npx wrangler dev              # Local development server
npx wrangler deploy           # Deploy to production
npm run cf-typegen            # Generate TypeScript types
```

**Database Operations:**
```bash
npm run db-init               # Initialize database schema
npm run db-reset              # Reset database (drops all data)
npx wrangler d1 execute mails --file=./schema.sql  # Local DB setup
npx wrangler d1 execute mails --file=./schema.sql --remote  # Production DB setup
```

**Testing:**
```bash
npm test                      # Run all 107+ unit tests with Vitest
npm run test:watch            # Watch mode for development
npm run test:run tests/unit/auth/  # Run specific test categories
npm run test-api-dev          # Test API endpoints locally
npm run test-email-dev        # Test email handling locally
```

**Monitoring:**
```bash
npx wrangler tail             # Watch logs (local)
npx wrangler tail --format pretty  # Pretty formatted logs
```

## Configuration Notes

- **Always use `npx wrangler`** instead of `wrangler` directly (global wrangler uninstalled)
- **Config file**: `wrangler.jsonc` (not wrangler.toml)
- **Worker URL**: `tai.chat` (production deployment)
- **Database**: Cloudflare D1 with binding name `DB`
- **Secrets**: `RESEND_API_KEY` configured via `npx wrangler secret put`

## Development Workflow

**To implement and test new features:**
1. Make code changes
2. Test locally: `npx wrangler dev` + `npm test`
3. Deploy: `npx wrangler deploy`
4. Wait 10 seconds for propagation
5. Test production: `curl https://tai.chat/health`

## Email Testing

**Email addresses follow pattern:** `username@tai.chat` or `prefix.username@tai.chat`
- Example: `wenbo@tai.chat` maps to user `wenbo`
- Example: `desktop.wenbo@tai.chat` also maps to user `wenbo`

**Test outbound emails:**
```bash
curl -X POST https://tai.chat/api/v1/send-test-email \
  -H "Content-Type: application/json" \
  -d '{"to": "test@example.com", "subject": "Test", "message": "Hello"}'
```

## Testing Framework

**Vitest-based testing with 107+ tests covering:**
- Authentication: password hashing, JWT generation/verification, input validation
- Email handling: incoming email processing, content parsing, Resend integration
- API endpoints: registration, login, message retrieval
- Database operations: user/message CRUD operations

**Key test categories:**
- `tests/unit/auth/` - 86 authentication tests
- `tests/unit/email/` - 21 email handling tests  
- `tests/integration/` - API endpoint integration tests
- `tests/helpers/` - Shared test utilities and mocks

## Security Implementation

- **Password Security**: PBKDF2-SHA256 with 100,000 iterations, 16-byte salt
- **JWT**: HS256 algorithm, 24-hour expiry, username in `sub` claim
- **Input Validation**: Username (3-50 chars, a-z0-9-), Password (8-128 chars)
- **Content Processing**: HTML preserved as-is, no sanitization (by design)

## Database Schema

**Users table:** id, username (unique), password_hash, created_at, last_access
**Messages table:** id, user_id (FK), message_id (unique), from_address, to_address, subject, body_text, body_html, raw_headers, raw_size, received_at, is_read

## Critical Implementation Details

- **Email routing:** Configured via Cloudflare dashboard to send `*@tai.chat` to worker
- **CORS:** Configured for cross-origin requests with proper headers
- **Error handling:** Unified error response format with specific error codes
- **Retry logic:** Built-in retry service for Resend API calls with circuit breaker
- **Content parsing:** Uses postal-mime for robust email parsing
- **HTML conversion:** Custom HTML-to-text fallback when needed