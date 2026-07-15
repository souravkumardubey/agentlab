# Changelog

All notable changes to AgentLab will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Added
- Project documentation (docs/ folder)
- Comprehensive architecture documentation
- API documentation
- Database schema documentation
- Agent system documentation
- RAG pipeline docs
- Workflow engine docs

---

## [0.2.0-alpha] - 2026-07-11

### Added

#### Frontend Streaming Chat
- SSE (Server-Sent Events) client in API client
- Real-time streaming responses in chat UI
- Streaming placeholder with live content updates
- Conversation history support in streaming endpoint

#### Production Hardening
- Rate limiting (express-rate-limit)
  - General: 100 requests per 15 minutes
  - Auth: 20 requests per 15 minutes
  - Chat: 30 requests per minute
- Structured logging (pino with pino-pretty for dev)
- Request timeouts (configurable via REQUEST_TIMEOUT env)
- Custom error classes (AppError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError)
- Improved error handler with proper logging
- Health check endpoint (/health with timestamp)

#### Deployment
- Dockerfile for api (multi-stage build)
- Dockerfile for web (Next.js optimized)
- Dockerfile for worker (multi-stage build)
- Dockerfile for ws (multi-stage build)
- docker-compose.yml with all services
- Health checks for all services
- Environment variable configuration
- Volume persistence for data
- .dockerignore file

#### Testing
- Vitest setup for monorepo
- Unit tests for auth package (password hashing, token generation/verification)
- Unit tests for shared utils (cn, truncate, formatTokenCount, formatLatency, generateId)
- Unit tests for LLM package (provider creation, interface verification)
- Test coverage configuration (v8 provider)
- 28 tests passing

#### LLM Provider Resilience
- FallbackProvider class (tries multiple providers in order)
- Automatic provider selection based on available API keys
- Ollama as last-resort fallback (always available locally)
- Graceful degradation when providers fail
- Updated agents and API to use fallback provider

#### Configuration
- turbo.json updated with all LLM provider env variables
- tsconfig excludes test files from build

### Fixed
- Auth test types (JwtPayload uses userId, not id)
- Test file imports (using index.js instead of utils.js)
- Build errors caused by test files

---

## [0.1.0-alpha] - 2026-06-16

### Added

#### Project Setup
- Turborepo monorepo configuration
- TypeScript configuration
- ESLint + Prettier configuration
- Environment variables template
- Docker Compose with PostgreSQL + Redis
- Gitignore

#### Database Layer
- Prisma schema with 12 models
- Database client singleton
- Seed script with default data
- Migration scripts

#### Authentication
- JWT token generation
- Refresh token support
- Password hashing (bcrypt)
- Auth middleware
- Role-based access control

#### LLM Integration
- OpenAI provider
- Together.ai provider
- Gemini provider
- Groq provider
- Ollama provider (local)
- Kimi provider
- Chat completion
- Streaming support
- Embedding generation

#### Agent System
- LangGraph.js integration
- State annotation
- Chat Agent graph
- RAG Agent graph
- Router Agent graph
- Agent factory

#### RAG Pipeline
- Text chunking
- Embedding generation
- pgvector storage
- Cosine similarity search
- Hybrid search support

#### Queue System
- BullMQ integration
- Document processing queue
- Worker factory

#### API Endpoints
- Auth routes (register, login, refresh)
- Workspace routes (CRUD)
- Agent routes (CRUD + chat + streaming)
- Document routes (upload, search, delete)
- Conversation routes (list, get, search, delete)
- Workflow routes (CRUD + run + runs history)

#### Worker Service
- Document processing worker
- Text extraction
- Chunking pipeline
- Embedding generation
- Error handling + retries
- Workflow execution with topological sort

#### WebSocket Gateway
- Socket.io server
- JWT authentication
- Workspace room join
- Real-time chat
- Message persistence

#### Frontend
- Landing page
- Login page
- Register page
- Forgot/reset password pages
- Dashboard layout
- Agent list page
- Agent chat page
- Document list page
- Workflow list page
- Settings page
- Auth store (Zustand)
- API client
- Tailwind CSS styling

#### Workflow Visual Editor
- React Flow canvas
- Node palette (7 node types)
- Node config panel
- Custom node components
- Visual edge connections
- Save/load workflows
- Run workflows from editor

#### Bug Fixes & Security
- Removed eval() RCE vulnerability
- Fixed SQL injection in RAG search
- Fixed route shadowing
- Added multi-turn conversation history
- Removed hardcoded JWT fallback
- Added missing package dependencies

---

## [0.0.1] - 2026-06-16

### Added
- Initial project structure
- README.md
- LICENSE (MIT)

---

## Roadmap

### Upcoming

- [ ] Markdown rendering in chat (react-markdown)
- [ ] Agent tool use (external API calls)
- [ ] Human-in-the-loop
- [ ] Document preprocessing (PDF, DOCX, CSV)
- [ ] Multi-modal support
- [ ] Agent marketplace/templates
- [ ] Usage analytics
- [ ] Billing system
- [ ] Dark mode toggle
- [ ] Toast notifications
- [ ] Error boundaries
- [ ] 404 page
- [ ] Responsive design improvements
- [ ] Integration tests
- [ ] E2E tests (Playwright)

---

## Version History

| Version | Date | Status |
|---------|------|--------|
| 0.0.1 | June 2026 | Initial |
| 0.1.0-alpha | June 2026 | Alpha |
| 0.2.0-alpha | July 2026 | Alpha |
| 0.3.0-alpha | August 2026 | Planned |
| 1.0.0 | November 2026 | Planned |

---

## Support

For support, please:
- Check the documentation (docs/)
- Search existing issues
- Open a new issue
- Join our Discord (planned)

---

## License

MIT License - see [LICENSE](./LICENSE) for details.
