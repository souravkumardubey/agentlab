# AgentLab

> AI Agent Orchestration Platform — Build, deploy, and orchestrate AI agents with RAG, workflows, and multi-agent collaboration.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **Multi-Provider LLM Support** — OpenAI, Groq, Gemini, Ollama, Together, Kimi with automatic fallback
- **RAG Pipeline** — Document upload, chunking, embedding, and vector search with pgvector
- **Visual Workflow Editor** — Drag-and-drop workflow builder with 7 node types
- **Agent Orchestration** — Create, configure, and deploy AI agents with tool calling
- **Real-Time Chat** — Streaming responses with WebSocket support
- **Multi-Tenant Workspaces** — Team collaboration with role-based access control
- **Background Processing** — Async document processing with BullMQ workers

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 14, React, Tailwind CSS, React Flow |
| **Backend** | Express, TypeScript, Prisma ORM |
| **Database** | PostgreSQL + pgvector, Redis |
| **AI/ML** | LangGraph.js, Multi-provider LLM |
| **Queue** | BullMQ, Redis |
| **Infra** | Docker, Turborepo |

## Quick Start

### Prerequisites

- Node.js >= 18
- Docker & Docker Compose
- OrbStack (macOS) or Docker Desktop

### 1. Clone & Install

```bash
git clone https://github.com/souravkumardubey/agentlab.git
cd agentlab
npm install
```

### 2. Start Infrastructure

```bash
docker-compose up -d postgres redis
```

### 3. Setup Database

```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

### 4. Configure Environment

```bash
cp .env.example .env
# Edit .env with your API keys
```

### 5. Start Development

```bash
# Terminal 1 - API
npm run dev:api

# Terminal 2 - Worker
npm run dev:worker

# Terminal 3 - Web
npm run dev:web
```

Open [http://localhost:3000](http://localhost:3000)

## Docker Deployment

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down
```

## Project Structure

```
agentlab/
├── apps/
│   ├── api/          # Express REST API
│   ├── web/          # Next.js frontend
│   ├── worker/       # Background job processor
│   └── ws/           # WebSocket gateway
├── packages/
│   ├── shared/       # Types & utilities
│   ├── database/     # Prisma ORM
│   ├── auth/         # JWT authentication
│   ├── llm/          # Multi-provider LLM
│   ├── agents/       # Agent orchestration
│   ├── rag/          # RAG pipeline
│   └── queue/        # BullMQ queue
├── prisma/           # Database schema
├── docker/           # Docker init scripts
└── docs/             # Documentation
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_URL` | Redis connection string | Yes |
| `JWT_SECRET` | Secret for JWT tokens | Yes |
| `LLM_PROVIDER` | Default LLM provider | No |
| `GROQ_API_KEY` | Groq API key | No |
| `GEMINI_API_KEY` | Google Gemini API key | No |
| `OPENAI_API_KEY` | OpenAI API key | No |

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/agents` | List agents |
| POST | `/api/agents` | Create agent |
| POST | `/api/agents/:id/chat` | Chat with agent |
| GET | `/api/documents` | List documents |
| POST | `/api/documents` | Upload document |
| GET | `/api/workflows` | List workflows |
| POST | `/api/workflows` | Create workflow |

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.
