---
id: SPEC-0002
kind: spec
title: API versioning
status: draft
date: 2026-03-05T12:00:00.000Z
tags: [api, versioning]
component: [demo]
owners: [Demo]
summary: How the demo application versions its public HTTP API.
links:
  related: [SPEC-0001]
  decidedBy: [ADR-0001]
  dependsOn: [SPEC-0001]
  validates: []
  references: []
---

# Summary

The demo application exposes a public REST API that needs an explicit versioning strategy.

# Goals

- Provide backward-compatible evolution.
- Make breaking changes opt-in for clients.

# Requirements

- Version prefix in URL path: `/v1/...`.
- Deprecation policy of at least six months.
- Changelog generated from spec annotations.

# Proposed design

URL-based major versioning, additive minor changes within a version, deprecation surfaced via `Deprecation` and `Sunset` HTTP headers.

# Open questions

- Whether to publish an OpenAPI bundle per version.
