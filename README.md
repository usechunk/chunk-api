# Chunk API - ChunkHub Registry Backend

> **FastAPI-based backend for the ChunkHub modpack registry**

This is the API backend for [Chunk](https://github.com/usechunk/chunk-cli), providing the ChunkHub registry service for discovering, publishing, and managing Minecraft modpack metadata.

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

See the [API Reference](docs/API_REFERENCE.md) for complete endpoint documentation.

## 🔗 Related Projects

- [chunk-cli](https://github.com/usechunk/chunk-cli) - The CLI tool that uses this API

## 📄 License

See [LICENSE](../chunk-cli/LICENSE.md) in the main Chunk repository.
