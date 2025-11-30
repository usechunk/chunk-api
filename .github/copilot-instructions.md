# GitHub Copilot Instructions for ChunkHub API

## Project Context
FastAPI backend for ChunkHub registry. Handles mod/modpack metadata, search, and user authentication.

## Code Style
- Python 3.11+ with type hints
- Follow PEP 8
- Use async/await for all endpoints
- Docstrings for all public functions

## Patterns
- SQLAlchemy for ORM
- Pydantic for request/response models
- Dependency injection for database sessions
- JWT for authentication
- Structured logging

## API Design
- RESTful endpoints under `/api/`
- Paginated responses for lists
- Consistent error responses
- OpenAPI/Swagger docs at `/docs`

## Database
- PostgreSQL in production
- SQLite for local dev
- Alembic for migrations
- Use async SQLAlchemy

## Testing
- pytest for all tests
- Use fixtures for database setup
- Mock external API calls

## Don't
- No blocking I/O in async functions
- No bare except clauses
- No print statements (use logging)
- No secrets in code
