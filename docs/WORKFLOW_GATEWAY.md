# WORKFLOW GATEWAY — REQUIRED PROCEDURE

This is a repository-local engineering standard. It supplements, and never replaces, the Ashford-specific authority order and project isolation rules in AGENTS.md and docs/MASTER_SPEC.md.

## Mandatory preflight
Read AGENTS.md, docs/MASTER_SPEC.md, docs/legacy/LEGACY_REGISTER.md, applicable subsystem specifications, and this policy set. Confirm repository, branch, remote, remote HEAD, local HEAD/divergence, worktree changes, recent commits, PRs/issues/workflows, handoffs, task scope, permissions, and prohibited paths. Record a baseline. Preserve unrelated work.

## Evidence and change control
Record claim → evidence/source → confidence/status → action. Preserve raw failure evidence. Derive expected behavior from Ashford's approved specifications and authoritative API/platform contracts—not from legacy code or tests alone. Make the smallest in-scope root-cause change. No force-push, destructive reset, unauthorized merge, release, deployment, production mutation, or secret exposure.

## Completion
Investigate → derive expected behavior → implement → focused tests → integration/CI → build/package → inspect artifacts → verify final repository state → report. Track asynchronous jobs and perform independent work in parallel. Never leave jobs untracked.

## Project isolation
Do not import or depend on another project's source, prompts, specifications, infrastructure, credentials, or tests. Shared generic engineering practices are allowed only when consistent with Ashford's own approved specifications.
