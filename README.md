# Natural-Language Video Search & Orchestration Prototype

A research prototype exploring how natural-language prompts can drive semantic video search, scene judging, and media operation selection using LLMs and vector embeddings.

> **Portfolio note:** This is a gutted, non-functional prototype derived from commercial software. The original product code is proprietary and licensed — this repo preserves only the architectural patterns, prompt engineering, and orchestration logic to demonstrate AI/LLM integration skills. Media processing, file I/O, and database operations are stubbed or incomplete by design.

## Architecture

```text
User prompt
    ↓
Intent classification (structured JSON output)
    ↓
Semantic scene search (pgvector / embeddings)
    ↓
Candidate scene judging (LLM constraint filtering)
    ↓
Tool selection (clip / composite / mixture / playback)
    ↓
Media operation (stubbed in this prototype)
```

### Key components

| Layer | File | Purpose |
|---|---|---|
| API | `src/graphql/` | Apollo Server with GraphQL schema and resolvers |
| Orchestration | `src/services/VideoOrchestration.ts` | Intent parsing → semantic search → scene judging pipeline |
| Tool routing | `src/services/ToolCallingService.ts` | LLM-driven selection of media operations from candidate scenes |
| AI provider | `src/services/GoogleAIProvider.ts` | Google Generative AI integration (embeddings, structured output, transcription) |
| Prompts | `src/prompts/*.md` | System prompts for intent parsing, tool routing, and content judging |
| Data | `src/models/` | PostgreSQL models for videos, scenes, clips, composites, and mixtures |
| Migrations | `migrations/` | Schema evolution including pgvector HNSW indexes |

## Example request

```
Find all vegan plating scenes and create a short montage
```

The system classifies this as a `MIXTURE` action, generates visual search phrases (`plating`, `food presentation`, `placing food on plate`), runs vector similarity search against scene embeddings, judges candidates against the "vegan" constraint, and selects the `remix_mixture` tool.

## Running locally

The CI pipeline uses Docker to provision PostgreSQL (pgvector) and run migrations:

```bash
cp .env.clean .env
cd tests && docker compose -f docker-compose.test.yml up -d --build
docker compose -f docker-compose.test.yml exec -T discovery_engine_be bash -l -c "npm ci"
docker compose -f docker-compose.test.yml exec -T discovery_engine_be bash -l -c "npm run migrate:up"
docker compose -f docker-compose.test.yml exec -T discovery_engine_be bash -l -c "npm test"
```

### Prerequisites

- Docker and Docker Compose
- A Google AI API key (for embedding and generative model calls)

## Tech stack

- **Runtime:** Node.js 20, TypeScript 5.9
- **API:** Apollo Server 5, Express 5, GraphQL
- **Database:** PostgreSQL 16 with pgvector
- **AI:** Google Generative AI (Gemini) for embeddings and structured output
- **Testing:** Jest, Supertest
- **CI:** GitHub Actions with Docker sandbox

## Limitations

- Media processing operations (clipping, compositing, remixing) are represented in the schema but not executed in this prototype.
- Test fixtures use small synthetic media samples.
- This repo demonstrates orchestration and prompt engineering patterns — not a complete video processing pipeline.
