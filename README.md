# ChunkHub API

Modern REST API for the Chunk modpack server toolkit. Built with Fastify 5.6.x, TypeScript, and Prisma.

## Stack

- **Fastify 5.6.x** - Web framework
- **TypeScript** - Type safety
- **Prisma** - Database ORM
- **Zod** - Validation
- **PostgreSQL** - Database
- **Vitest** - Testing
- **pnpm** - Package manager

## Quick Start

```bash
# Install dependencies
pnpm install

# Configure environment
cp .env.example .env
# Edit .env with your DATABASE_URL and JWT_SECRET (min 32 chars)

# Setup database
pnpm prisma:generate
pnpm prisma:migrate

# Start dev server
pnpm dev
```

Server runs at `http://localhost:8000`

## Environment Variables

Required in `.env`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/chunkhub"
JWT_SECRET="your-secret-key-min-32-characters"
NODE_ENV="development"
API_HOST="0.0.0.0"
API_PORT=8000
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register user
- `POST /auth/token` - Login
- `GET /auth/me` - Get current user (auth required)

### Modpacks
- `GET /modpacks` - List modpacks (paginated)
- `GET /modpacks/:slug` - Get modpack
- `POST /modpacks` - Create modpack (auth required)
- `PATCH /modpacks/:slug` - Update modpack (auth required)
- `DELETE /modpacks/:slug` - Delete modpack (auth required)

### Versions
- `GET /modpacks/:slug/versions` - List versions
- `GET /modpacks/:slug/versions/:id` - Get version
- `POST /modpacks/:slug/versions` - Create version (auth required)
- `PATCH /modpacks/:slug/versions/:id` - Update version (auth required)
- `DELETE /modpacks/:slug/versions/:id` - Delete version (auth required)

### Other
- `GET /search?q=query` - Search modpacks
- `GET /projects/:username` - User's modpacks
- `POST /upload` - Upload file (auth required)
- `GET /health` - Health check

## Scripts

```bash
pnpm dev              # Development with hot reload
pnpm build            # Build for production
pnpm start            # Start production server
pnpm test             # Run tests
pnpm test:coverage    # Test coverage
pnpm prisma:generate  # Generate Prisma client
pnpm prisma:migrate   # Run migrations
pnpm prisma:studio    # Database GUI
pnpm lint             # Lint code
pnpm format           # Format code
```

## Docker

```bash
# Start with Docker Compose
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop
docker-compose down
```

## Project Structure

```
src/
├── routes/          # API endpoints
├── schemas/         # Zod validation schemas
├── plugins/         # Fastify plugins
├── utils/           # Utilities (password, slug, errors)
├── types/           # TypeScript definitions
├── config.ts        # Environment config
├── prisma.ts        # Database client
└── index.ts         # App entry point

prisma/
└── schema.prisma    # Database schema

tests/               # Test files
```

## Features

- JWT authentication
- Rate limiting (100 req/min)
- Password hashing (bcrypt)
- File uploads
- CORS support
- Input validation
- Type-safe database queries
- Error handling
- Pagination

## Database Models

- **User** - Authentication and profile
- **Modpack** - Modpack metadata (no file storage)
- **ModpackVersion** - Version information with download URLs

## Development

The API uses:
- TypeScript strict mode
- ESLint + Prettier
- Zod for runtime validation
- Prisma for type-safe queries
- Pino for logging

## Authentication

All protected endpoints require JWT token in `Authorization` header:

```
Authorization: Bearer <token>
```

Get token from `/auth/token` or `/auth/register`.

## Example Usage

```bash
# Register
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"user","email":"user@example.com","password":"password123"}'

# Login
curl -X POST http://localhost:8000/auth/token \
  -H "Content-Type: application/json" \
  -d '{"username":"user","password":"password123"}'

# Create modpack (with token)
curl -X POST http://localhost:8000/modpacks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"My Pack","mcVersion":"1.20.1","loader":"fabric"}'

# Search
curl "http://localhost:8000/search?q=fabric&mcVersion=1.20.1"
```

## Requirements

- Node.js 20+
- PostgreSQL 14+
- pnpm 9+

## License

See LICENSE file.
