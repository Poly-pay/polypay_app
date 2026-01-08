# API Documentation

PolyPay provides a comprehensive RESTful API for privacy-preserving payroll operations. This guide covers how to interact with the API using various methods.

## Quick Links

- **Swagger UI (Interactive)**: `http://localhost:4000/api/swagger`
- **OpenAPI JSON**: `http://localhost:4000/api/swagger-json`
- **Backend Repository**: [packages/backend](../../packages/backend)

## Accessing the API

### 1. Swagger UI (Recommended)

The easiest and most interactive way to explore and test the API.

**URL**: `http://localhost:4000/api/swagger`

**Features**:
- Interactive endpoint testing with "Try it out" buttons
- Complete schema documentation for requests and responses
- Built-in authentication with JWT token persistence
- Organized by feature tags (auth, accounts, wallets, etc.)
- Real-time request/response examples

**How to Use**:

1. Start the backend server:
   ```bash
   cd packages/backend
   yarn start:dev
   ```

2. Open Swagger UI in your browser:
   ```
   http://localhost:4000/api/swagger
   ```

3. Authenticate:
   - First, use the `/api/auth/login` endpoint to get your JWT token
   - Click the "Authorize" button (lock icon) at the top right
   - Enter your token in the format: `Bearer <your-token>`
   - Click "Authorize" - your token will persist for all subsequent requests

4. Test Endpoints:
   - Expand any endpoint section
   - Click "Try it out"
   - Fill in the required parameters
   - Click "Execute"
   - View the response below

### 2. Postman or Insomnia

Import the OpenAPI specification for a powerful REST client experience.

**Import URL**: `http://localhost:4000/api/swagger-json`

**Steps**:
1. Open Postman/Insomnia
2. Import → Link → Paste the Swagger JSON URL
3. All endpoints will be automatically imported with schemas
4. Set up authentication headers manually

### 3. cURL (Command Line)

Direct HTTP requests from the terminal.

**Example - Login**:
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "commitment": "your-commitment-hash",
    "proof": "your-zk-proof"
  }'
```

**Example - Get Account (Authenticated)**:
```bash
curl -X GET http://localhost:4000/api/accounts/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 4. HTTPie (Enhanced Command Line)

A more user-friendly alternative to cURL.

**Installation**:
```bash
brew install httpie  # macOS
pip install httpie   # Python
```

**Example - Login**:
```bash
http POST http://localhost:4000/api/auth/login \
  commitment="your-commitment-hash" \
  proof="your-zk-proof"
```

**Example - Get Account**:
```bash
http GET http://localhost:4000/api/accounts/me \
  Authorization:"Bearer YOUR_JWT_TOKEN"
```

## API Structure

### Base URL

```
http://localhost:4000/api
```

### Endpoints by Feature

#### Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/auth/login` | Login with ZK proof | No |
| POST | `/auth/refresh` | Refresh access token | No |

#### Accounts (`/api/accounts`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/accounts` | Create new account | No |
| GET | `/accounts/me` | Get current user account | Yes |
| GET | `/accounts/me/wallets` | Get user's wallets | Yes |
| PATCH | `/accounts/me` | Update current account | Yes |
| GET | `/accounts` | List all accounts | Yes |

#### Wallets (`/api/wallets`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/wallets` | Create new wallet | Yes |
| GET | `/wallets/:address` | Get wallet details | Yes |
| PATCH | `/wallets/:address` | Update wallet | Yes |
| POST | `/wallets/:address/join` | Join existing wallet | Yes |

#### Transactions (`/api/transactions`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/transactions` | Create transaction | Yes |
| GET | `/transactions` | List transactions | Yes |
| GET | `/transactions/:id` | Get transaction details | Yes |
| POST | `/transactions/:id/approve` | Approve transaction | Yes |
| POST | `/transactions/:id/deny` | Deny transaction | Yes |
| POST | `/transactions/:id/execute` | Execute approved transaction | Yes |

#### Batch Items (`/api/batch-items`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/batch-items` | Create batch item | Yes |
| GET | `/batch-items` | List batch items | Yes |

#### Address Book (`/api/address-book`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/address-book/groups` | Create address group | Yes |
| GET | `/address-book/groups` | List groups | Yes |
| PATCH | `/address-book/groups/:id` | Update group | Yes |
| DELETE | `/address-book/groups/:id` | Delete group | Yes |
| POST | `/address-book/contacts` | Add contact | Yes |
| GET | `/address-book/contacts` | List contacts | Yes |
| PATCH | `/address-book/contacts/:id` | Update contact | Yes |
| DELETE | `/address-book/contacts/:id` | Delete contact | Yes |

#### Notifications (`/api/notifications`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/notifications` | List notifications | Yes |
| PATCH | `/notifications/:id/read` | Mark as read | Yes |

## Authentication

PolyPay uses JWT (JSON Web Tokens) for authentication.

### Getting a Token

1. **Login** via `/api/auth/login` with your zero-knowledge proof:
   ```json
   {
     "commitment": "your-commitment-hash",
     "proof": "your-zk-proof"
   }
   ```

2. **Response** includes access and refresh tokens:
   ```json
   {
     "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   }
   ```

### Using the Token

Include the access token in the `Authorization` header:

```
Authorization: Bearer <your-access-token>
```

### Token Expiration

- **Access Token**: Expires after 15 minutes
- **Refresh Token**: Expires after 7 days

When your access token expires, use the refresh token at `/api/auth/refresh`:

```json
{
  "refreshToken": "your-refresh-token"
}
```

## Request/Response Format

### Content Type

All requests and responses use JSON:

```
Content-Type: application/json
```

### Standard Response Format

**Success Response**:
```json
{
  "id": "resource-id",
  "field1": "value1",
  "field2": "value2",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

**Error Response**:
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request"
}
```

## Common Status Codes

| Code | Meaning | Description |
|------|---------|-------------|
| 200 | OK | Request successful |
| 201 | Created | Resource created successfully |
| 400 | Bad Request | Invalid request data |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource conflict (duplicate) |
| 500 | Internal Server Error | Server error |

## Rate Limiting

Currently, there is no rate limiting on the API. This may be added in future versions.

## CORS Configuration

The API allows cross-origin requests from:
- `http://localhost:3000` (default frontend)
- Configurable via `CORS_ORIGIN` environment variable

## WebSocket Support

Real-time notifications are available via WebSocket at:

```
ws://localhost:4000
```

## OpenAPI Specification

The full OpenAPI 3.0 specification is available at:

```
http://localhost:4000/api/swagger-json
```

Use this for:
- Generating client SDKs
- Importing into API testing tools
- Automated API documentation
- Contract testing

## Example: Complete Authentication Flow

### 1. Create Account

```bash
curl -X POST http://localhost:4000/api/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "commitment": "0x1234567890abcdef...",
  }'
```

### 2. Login

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "commitment": "0x1234567890abcdef...",
    "proof": "0xproof..."
  }'
```

**Response**:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 3. Access Protected Endpoint

```bash
curl -X GET http://localhost:4000/api/accounts/me \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 4. Refresh Token (When Expired)

```bash
curl -X POST http://localhost:4000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

## Additional Resources

- [Getting Started](./getting-started.md) - Project setup guide
- [Architecture](../architecture.md) - System architecture overview
- [Zero-Knowledge Implementation](../zero-knowledge-implementation.md) - ZK proof details
- [GitBook Documentation](https://q3labs.gitbook.io/polypay) - Full documentation

## Support

If you encounter issues with the API:
1. Check the Swagger UI for endpoint documentation
2. Review the backend logs for error details
3. Open an issue on [GitHub](https://github.com/Poly-pay/polypay_app/issues)
