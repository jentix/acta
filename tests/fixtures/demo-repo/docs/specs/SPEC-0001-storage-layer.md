---
id: SPEC-0001
kind: spec
title: Storage layer
status: active
date: 2026-02-20T10:00:00.000Z
tags: [storage, postgres]
component: [demo]
owners: [Demo]
summary: Defines how the demo application talks to PostgreSQL and manages migrations.
links:
  related: []
  decidedBy: [ADR-0002]
  dependsOn: []
  validates: []
  references: []
---

# Summary

The storage layer exposes a small repository API over PostgreSQL with strict typing and parameterized queries.

# Goals

- Encapsulate SQL behind typed repositories.
- Run migrations deterministically in CI.
- Centralize connection pooling.

# Requirements

- Connection pool with configurable size.
- Migrations execute under transactions.
- Health checks expose connection status.

# Proposed design

A `db/` package wraps `pg`, owns the pool, and provides per-domain repository modules. Migrations live in `db/migrations` and use `node-pg-migrate`.

# Open questions

- Whether to add read replica routing in Phase 2.
