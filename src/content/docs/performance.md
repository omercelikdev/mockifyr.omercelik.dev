---
title: Performance and sizing
description: What one request costs, how it scales with stub count, and what to request in Kubernetes.
---

Two questions come up in every serious evaluation: how much can one instance take, and what should we
request in Kubernetes. This page answers both with measured numbers rather than adjectives.

## What one request costs

Measured on the engine itself — no network, no client — on an Apple M5 (10 cores, 24 GB), .NET 10,
Release build, against a store of **1000 stubs**.

| Case | Mean | Allocated |
|------|-----:|----------:|
| Static stub, matched by method and path | **385 ns** | 1.32 KB |
| Matching the **last** of 1000 stubs | **392 ns** | 1.33 KB |
| With the request journal on | 520 ns | 1.32 KB |
| Structural `equalToJson` body matching | 678 ns | 1.98 KB |
| Templated response | 1.15 µs | 4.73 KB |
| 256 KiB templated response body | 274 µs | 2.49 MB |

What these mean in practice:

- **Matching is not your bottleneck.** A static stub resolves in well under a microsecond. For
  ordinary mocking, the network costs more than Mockifyr does.
- **The journal costs about 110 ns per request** and no extra steady-state allocation. Worth turning
  off with `--journal-disabled` in a load test; rarely worth it otherwise.
- **Templating costs about 800 ns over a static match.** Compiled templates are cached, so a templated
  stub is roughly 3× a static one — not a reason to avoid templating.
- **Matching does not scale with stub count.** Finding the last of 1000 stubs costs the same as
  matching a single one, because stubs are indexed by method and path. The exception is stubs whose
  URL is a **pattern** rather than a literal path — a regex, a URI template, or a full URL with a
  query string. Those are evaluated on every request, so a stub set that is mostly patterns behaves
  like a linear scan.
- **Large bodies cost roughly 10× their size in allocations.** For multi-megabyte payloads, prefer
  proxying to a real service over serving them from a stub.

## Sizing

Starting points. Measure with your own stubs — the harnesses are in the repository under `bench/`.

| Workload | CPU request | Memory request |
|----------|------------:|---------------:|
| A team's static mocks (< 200 stubs, low hundreds of rps) | 100m | 256 Mi |
| A shared sandbox (1000+ stubs, templated responses) | 500m–1 | 512 Mi |
| Large payloads (≥ 256 KiB bodies) | 500m | 1 Gi |
| Load-test target | 1–2 | 512 Mi (add `--journal-disabled`) |

The first two are the Helm chart's defaults and one step up from them.

## Memory: what grows, and what bounds it

Everything that accumulates is bounded, per tenant, and the bound is yours to set:

| Holds | Flag | Default |
|-------|------|---------|
| Request journal (including bodies) | `--journal-limit` | 1000 per tenant |
| Message inbox | `--message-limit` | 1000 per tenant |
| Sandbox documents | `--resource-limit` | 1000 per collection |
| Audit trail | `--audit-limit` | 1000 per tenant |

The journal is the one to watch: it retains request and response **bodies**, so on a host serving
256 KiB responses, 1000 entries per tenant is measured in hundreds of megabytes. Lower the bound or
disable it.

## Scaling out

Mockifyr is stateless apart from its stores, so with a shared persistence backend (PostgreSQL or
Redis) you can run several replicas serving the same tenants. With in-memory or file-based
persistence, replicas do not share state — that is a persistence choice, not a scaling limit. See
[persistence](/persistence/) and [deploying in production](/deploying-in-production/).
