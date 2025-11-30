# Chunk API Documentation

## Overview

The ChunkHub API provides a registry for modpack metadata, versioning, and distribution.

## Base URL

```
https://api.chunkhub.io/v1
```

## Authentication

Most endpoints are public. Write operations require authentication via JWT tokens.

```bash
# Register
POST /auth/register
{
  "username": "myuser",
  "email": "user@example.com",
  "password": "securepassword"
}

# Login
POST /auth/login
{
  "username": "myuser",
  "password": "securepassword"
}

# Returns
{
  "access_token": "eyJ...",
  "token_type": "bearer"
}
```

Use the token in subsequent requests:
```bash
Authorization: Bearer eyJ...
```

## Endpoints

### Search Modpacks

```bash
GET /search?q=<query>&mc_version=<version>&loader=<loader>
```

**Query Parameters:**
- `q` - Search query (required)
- `mc_version` - Filter by Minecraft version (optional)
- `loader` - Filter by mod loader: forge, fabric, neoforge (optional)
- `skip` - Pagination offset (default: 0)
- `limit` - Results per page (default: 20, max: 100)

**Response:**
```json
[
  {
    "id": 1,
    "name": "All The Mods 9",
    "slug": "atm9",
    "description": "Kitchen sink modpack for 1.20.1",
    "mc_version": "1.20.1",
    "loader": "forge",
    "downloads": 15420
  }
]
```

### Get Modpack Details

```bash
GET /modpacks/<slug>
```

**Response:**
```json
{
  "id": 1,
  "name": "All The Mods 9",
  "slug": "atm9",
  "description": "Kitchen sink modpack for 1.20.1",
  "mc_version": "1.20.1",
  "loader": "forge",
  "loader_version": "47.2.0",
  "downloads": 15420,
  "author": "ATM Team",
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-11-15T14:30:00Z"
}
```

### List Versions

```bash
GET /modpacks/<slug>/versions?stable_only=true
```

**Query Parameters:**
- `stable_only` - Only return stable versions (default: false)

**Response:**
```json
[
  {
    "id": 42,
    "modpack_id": 1,
    "version": "1.2.0",
    "mc_version": "1.20.1",
    "loader": "forge",
    "loader_version": "47.2.0",
    "changelog": "Added new mods, fixed bugs",
    "download_url": "/uploads/atm9-1.2.0.mrpack",
    "file_size": 45678901,
    "downloads": 823,
    "is_stable": true
  }
]
```

### Get Latest Version

```bash
GET /modpacks/<slug>/versions/latest?stable_only=true
```

**Response:** Same as single version object above.

### Get Specific Version

```bash
GET /modpacks/<slug>/versions/<version>
```

**Response:** Single version object.

### Upload Modpack File

```bash
POST /upload/modpack/<slug>?version=<version>
Authorization: Bearer <token>
Content-Type: multipart/form-data

file: <binary .mrpack or .zip file>
```

**Response:**
```json
{
  "message": "File uploaded successfully",
  "filename": "atm9-1.2.0.mrpack",
  "size": 45678901,
  "hash": "sha256:abc123...",
  "download_url": "/uploads/atm9-1.2.0.mrpack"
}
```

### Create Modpack

```bash
POST /modpacks
Authorization: Bearer <token>

{
  "name": "My Custom Pack",
  "slug": "my-custom-pack",
  "description": "A custom modpack",
  "mc_version": "1.20.1",
  "loader": "forge",
  "loader_version": "47.2.0"
}
```

### Create Version

```bash
POST /modpacks/<slug>/versions
Authorization: Bearer <token>

{
  "version": "1.0.0",
  "mc_version": "1.20.1",
  "loader": "forge",
  "loader_version": "47.2.0",
  "changelog": "Initial release",
  "is_stable": true
}
```

## Rate Limiting

- Public endpoints: 30 requests/minute
- Authenticated endpoints: 100 requests/minute
- Search endpoint: 30 requests/minute

Rate limit headers:
```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 25
X-RateLimit-Reset: 1234567890
```

## Error Responses

```json
{
  "error": "Not Found",
  "message": "Modpack not found"
}
```

**Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `413` - File Too Large
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error

## Deployment

### Docker

```bash
cd api
docker-compose up -d
```

### Manual

```bash
# Install dependencies
cd api
uv sync

# Set environment variables
cp .env.example .env
# Edit .env with your configuration

# Run migrations (if using Alembic)
# uv run alembic upgrade head

# Start server
uv run uvicorn api.main:app --host 0.0.0.0 --port 8000
```

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/chunkhub

# Security
SECRET_KEY=your-secret-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=524288000

# API
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=False
```

## Interactive Documentation

FastAPI provides automatic interactive documentation:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- OpenAPI JSON: `http://localhost:8000/openapi.json`
