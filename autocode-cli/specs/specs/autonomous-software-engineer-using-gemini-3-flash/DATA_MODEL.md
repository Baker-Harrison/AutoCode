# Data Model

## Entities
| Entity | Attributes | Relationships |
|---|---|---|
| **AutonomousAgent** | `agent_id` (PK), `name`, `owner_user_id` (FK), `status` (`active`, `paused`), `skill_level`, `configuration_id` (FK), `created_at` | `N:1` with `User` (owner), `1:N` with `Project` (can manage multiple) |
| **Project** | `project_id` (PK), `name`, `description`, `repository_url`, `main_branch`, `tech_stack_config`, `owner_user_id` (FK), `status` (`active`, `archived`) | `N:1` with `User` (owner), `1:N` with `Task` |
| **Task** | `task_id` (PK), `project_id` (FK), `description`, `type` (`feature`, `bug_fix`, `refactor`), `status` (`planning`, `coding`, `review`, `completed`), `priority`, `assigned_agent_id` (FK), `human_reviewer_user_id` (FK), `created_at` | `N:1` with `Project`, `N:1` with `AutonomousAgent` (assigned), `N:1` with `User` (reviewer), `1:N` with `AgentAction` |
| **AgentAction** | `action_id` (PK), `task_id` (FK), `agent_id` (FK), `type` (`plan`, `code_gen`, `test_exec`, `debug`, `deploy`), `description`, `status` (`executing`, `succeeded`, `failed`), `start_time`, `end_time`, `output_logs_url`, `associated_artifact_id` (FK, optional) | `N:1` with `Task`, `N:1` with `AutonomousAgent`, `1:1` with `CodeArtifact` (if generates artifact) |
| **CodeArtifact** | `artifact_id` (PK), `agent_action_id` (FK), `project_id` (FK), `type` (`code`, `test`, `doc`), `content_url`, `vcs_reference` (e.g., `commit_hash`, `pr_url`), `is_approved`, `approved_by_user_id` (FK), `generated_at`, `approval_timestamp` | `N:1` with `AgentAction`, `N:1` with `Project`, `N:1` with `User` (approver) |

## Schema Versioning
TBD - Schema evolution strategy

## Data Retention
| Data Type | Retention | Justification |
|-----------|-----------|---------------|
| TBD | TBD | TBD |

## Migrations
TBD - Migration strategy and tooling
