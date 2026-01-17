# Observability

## Logs
TBD - Log structure and retention

## Metrics
| Metric | Type | SLO | SLI |
|---|---|---|---|
| **Task Completion Success Rate** | Reliability | >= 90% of tasks completed end-to-end | (Number of tasks successfully completed without critical errors / Total tasks attempted) |
| **End-to-End Task Latency (P90)** | Performance | P90 < 15 minutes for typical tasks | Time elapsed from task initiation to final output (e.g., PR creation, deployment confirmation) |
| **Code Quality Score** | Quality | >= 85% average score from static analysis tools | Average aggregate score (e.g., SonarQube, Linting) across all AI-generated or modified code |
| **Human Intervention Rate** | Efficiency/Autonomy | <= 15% of tasks requiring significant human-initiated revision | (Number of tasks where human-initiated changes exceed a threshold / Total completed tasks) |
| **Cost per Successful Task** | Cost Efficiency | Average < $5 per successful task completion | (Total LLM API + compute costs for successful tasks / Number of successful tasks) |
| **AI-Generated PR Acceptance Rate** | Trust/Quality | >= 75% of AI-generated PRs merged with minimal revisions (<10% LOC change) | (Number of AI-generated PRs merged with <10% LOC changes / Total AI-generated PRs) |
| **Security Vulnerability Density** | Security/Quality | <= 0.05 Critical/High vulnerabilities per 1000 lines of AI-generated code | (Number of Critical/High vulnerabilities detected by SAST/DAST tools / Total lines of AI-generated code) |

## Traces
TBD - Trace sampling and instrumentation

## Alerting
| Alert | Severity | Threshold | Response |
|-------|----------|-----------|----------|
| TBD | P1 | TBD | TBD |

## SLOs
1. **SLO-001:** TBD - 99.9% availability
2. **SLO-002:** TBD - < 500ms p99 latency
