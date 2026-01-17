# API Contracts

## Endpoints
| Method | Path | Description |
|---|---|---|
| `POST` | `/projects` | Creates a new autonomous software engineering project, initializing the AI agent. |
| `POST` | `/projects/{projectId}/tasks` | Assigns a new software engineering task (e.g., "Implement user auth", "Fix bug #123") to the autonomous agent within a project. |
| `GET` | `/projects/{projectId}/tasks/{taskId}/status` | Retrieves the real-time status, progress, and current actions of a specific engineering task. |
| `GET` | `/projects/{projectId}/tasks/{taskId}/proposals` | Fetches the AI agent's proposed code changes, architectural designs, or solutions for human review. |
| `POST` | `/projects/{projectId}/tasks/{taskId}/proposals/{proposalId}/approve` | Approves the AI agent's proposed solution, triggering its implementation, integration, or deployment. |
| `POST` | `/projects/{projectId}/tasks/{taskId}/feedback` | Provides feedback, rejection reasons, or additional guidance to the AI agent on a specific task or proposal. |
| `PUT` | `/projects/{projectId}/configuration` | Updates project-specific settings for the autonomous agent, including coding standards, security policies, and toolchain integrations. |

## Schemas
TBD - Request/response schemas

## Authentication
TBD - Auth strategy (OAuth2, API keys, etc.)

## Rate Limiting
TBD - Rate limits by tier

## Events
| Event | Payload | Consumers |
|-------|---------|-----------|
| TBD | TBD | TBD |
