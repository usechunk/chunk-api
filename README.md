# Chunk API - ChunkHub Registry Backend

> **Part of the [Chunk ecosystem](https://github.com/usechunk/chunk-docs) - see [Architecture](https://github.com/usechunk/chunk-docs/blob/main/ARCHITECTURE.md)**

FastAPI-based backend for the ChunkHub modpack registry, providing the API service for discovering, publishing, and managing Minecraft modpack metadata.

## 🏗️ Tech Stack

- **Framework:** FastAPI (Python 3.11+)
- **ORM:** SQLAlchemy
- **Database:** PostgreSQL (production), SQLite (dev)
- **Auth:** JWT tokens
- **Package Manager:** uv

## 📦 Installation

### Prerequisites

- Python 3.11+
- uv ([install guide](https://docs.astral.sh/uv/))
- PostgreSQL (for production)

### Quick Start

```bash
# Install dependencies
uv sync

# Run development server
uv run uvicorn main:app --reload

# API will be available at:
# - Main API: http://localhost:8000
# - Swagger Docs: http://localhost:8000/docs
# - ReDoc: http://localhost:8000/redoc
```

## 🔧 Configuration

Create a `.env` file (use `.env.example` as template):

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/chunkhub
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=30
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=524288000
```

## 🐳 Docker Deployment

```bash
# Development
docker-compose up -d

# Production
docker-compose -f docker-compose.prod.yml up -d
```

## 🧪 Testing

```bash
# Run tests
uv run pytest

# Run with coverage
uv run pytest --cov=.
```

## 📚 API Documentation

See the [Chunk API Reference](https://github.com/usechunk/chunk-docs/blob/main/API.md) for complete endpoint documentation.

## 🔗 Related Projects

- [chunk-docs](https://github.com/usechunk/chunk-docs) - Central documentation
- [chunk-cli](https://github.com/usechunk/chunk-cli) - CLI tool
- [chunk-app](https://github.com/usechunk/chunk-app) - Web interface

## 📄 License

See [LICENSE](../chunk-cli/LICENSE.md) in the main Chunk repository.
