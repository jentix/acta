---
id: ADR-0002
kind: adr
title: Use PostgreSQL as the primary database
status: accepted
date: 2026-02-15T11:30:00.000Z
tags: [storage, postgres]
component: [demo]
owners: [Demo]
summary: PostgreSQL is the canonical relational store for the demo application.
links:
  related: [ADR-0001]
  supersedes: []
  replacedBy: []
  decidedBy: []
  dependsOn: [ADR-0001]
  validates: []
  references: ["https://www.postgresql.org/"]
---

# Context

The demo service stores transactional data and needs a mature relational engine with strong consistency guarantees.

# Decision

Use PostgreSQL 16 as the primary database, deployed via managed RDS.

# Consequences

Application code targets PostgreSQL dialect; migrations live in `db/migrations`.

# Alternatives

MySQL, SQLite (insufficient for production load), DynamoDB (relational model not a good fit).
