# Chunk API Documentation

## Overview

The ChunkHub API provides a registry for project metadata, versioning, and distribution. It supports multiple project types including mods, modpacks, resource packs, shaders, plugins, and datapacks.

## Project Types

The API supports the following project types:
- `MOD` - Individual modifications
- `MODPACK` - Collections of mods (default)
- `RESOURCEPACK` - Texture and resource packs
- `SHADER` - Shader packs
- `PLUGIN` - Server plugins
- `DATAPACK` - Data packs

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

### Search Projects

```bash
GET /search?q=<query>&mc_version=<version>&loader=<loader>&type=<type>
```

**Query Parameters:**
- `q` - Search query (optional)
- `mc_version` - Filter by Minecraft version (optional)
- `loader` - Filter by mod loader: forge, fabric, neoforge (optional)
- `type` - Filter by project type: mod, modpack, resourcepack, shader, plugin, datapack (optional)
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 20, max: 100)

**Response:**
```json
{
  "data": [
    {
      "id": 1,
      "name": "All The Mods 9",
      "slug": "atm9",
      "description": "Kitchen sink modpack for 1.20.1",
      "projectType": "MODPACK",
      "mcVersion": "1.20.1",
      "loader": "forge",
      "downloads": 15420
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### List Projects (Modpacks Endpoint)

```bash
GET /modpacks?type=<type>&mc_version=<version>&loader=<loader>
```

**Query Parameters:**
- `type` - Filter by project type: mod, modpack, resourcepack, shader, plugin, datapack (optional)
- `mcVersion` - Filter by Minecraft version (optional)
- `loader` - Filter by mod loader: forge, fabric, neoforge (optional)
- `page` - Page number (default: 1)
- `limit` - Results per page (default: 20, max: 100)

**Response:**
```json
{
  "data": [...],
  "pagination": {...}
}
```

### Get Project Details

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
  "projectType": "MODPACK",
  "mcVersion": "1.20.1",
  "loader": "forge",
  "loaderVersion": "47.2.0",
  "downloads": 15420,
  "author": {
    "id": 1,
    "username": "atmteam"
  },
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-11-15T14:30:00Z"
}
```

### List User Projects

```bash
GET /projects/<username>?type=<type>
```

**Query Parameters:**
- `type` - Filter by project type (optional)

**Response:** Array of project objects.

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
    "modpackId": 1,
    "version": "1.2.0",
    "mcVersion": "1.20.1",
    "loader": "forge",
    "loaderVersion": "47.2.0",
    "changelog": "Added new mods, fixed bugs",
    "downloadUrl": "/uploads/atm9-1.2.0.mrpack",
    "fileSize": 45678901,
    "downloads": 823,
    "isStable": true
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

### Upload Project File

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
  "downloadUrl": "/uploads/atm9-1.2.0.mrpack"
}
```

### Create Project

```bash
POST /modpacks
Authorization: Bearer <token>

{
  "name": "My Custom Pack",
  "description": "A custom modpack",
  "projectType": "MODPACK",
  "mcVersion": "1.20.1",
  "loader": "forge",
  "loaderVersion": "47.2.0"
}
```

**Request Body:**
- `name` - Project name (required)
- `description` - Project description (optional)
- `projectType` - Project type: MOD, MODPACK, RESOURCEPACK, SHADER, PLUGIN, DATAPACK (optional, defaults to MODPACK)
- `mcVersion` - Minecraft version (required)
- `loader` - Mod loader (required)
- `loaderVersion` - Loader version (optional)
- `recommendedRamGb` - Recommended RAM in GB (optional, default: 4)

### Update Project

```bash
PATCH /modpacks/<slug>
Authorization: Bearer <token>

{
  "description": "Updated description",
  "projectType": "MOD",
  "isPublished": true
}
```

### Create Version

```bash
POST /modpacks/<slug>/versions
Authorization: Bearer <token>

{
  "version": "1.0.0",
  "mcVersion": "1.20.1",
  "loader": "forge",
  "loaderVersion": "47.2.0",
  "changelog": "Initial release",
  "isStable": true
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
pnpm install

# Set environment variables
cp .env.example .env
# Edit .env with your configuration

# Generate Prisma client
pnpm prisma:generate

# Run migrations
pnpm prisma:migrate

# Start server
pnpm dev
```

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/chunkhub

# Security
JWT_SECRET=your-secret-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=30

# File Upload
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=524288000

# API
API_HOST=0.0.0.0
API_PORT=8000
NODE_ENV=development
```

## Interactive Documentation

Fastify provides automatic interactive documentation:

- Swagger UI: `http://localhost:8000/docs`
- OpenAPI JSON: `http://localhost:8000/openapi.json`
