---
title: Writing stubs
description: The shape of a Mockifyr / WireMock stub — request matching and response.
---

A stub is a **request pattern** paired with a **response**. Mockifyr reads the WireMock JSON format, so
existing stubs work unchanged.

```json
{
  "request": {
    "method": "POST",
    "urlPath": "/api/orders",
    "headers": { "Content-Type": { "equalTo": "application/json" } },
    "bodyPatterns": [ { "matchesJsonPath": { "expression": "$.type", "equalTo": "express" } } ]
  },
  "response": {
    "status": 201,
    "headers": { "Content-Type": "application/json" },
    "jsonBody": { "id": "{{randomValue type='UUID'}}", "status": "created" },
    "transformers": ["response-template"]
  }
}
```

## Request matching

| Field | Matches on |
|-------|-----------|
| `method` | HTTP method (or `ANY`) |
| `url` · `urlPath` · `urlPattern` · `urlPathPattern` | exact URL, path, or regex |
| `headers` · `queryParameters` · `cookies` | per-key matchers |
| `bodyPatterns` | `equalTo`, `equalToJson`, `matchesJsonPath`, `equalToXml`, `matchesXPath`, `matches` (regex), `contains`, `matchesJsonSchema`, … |

Matchers compose with `and` / `or`, and stubs carry a `priority` (lower wins; ties broken by recency).

## Response

- `status`, `statusMessage`, `headers` (single- or multi-value)
- Body: `body` (string), `jsonBody` (object), or `base64Body`
- `transformers: ["response-template"]` enables [templating](/templating/)
- Behaviour: `fixedDelayMilliseconds`, `delayDistribution`, `fault`, `proxyBaseUrl`

## Tenants

Every stub belongs to a tenant. The dashboard's tenant switcher (and the `X-Mockifyr-Tenant` header on
the admin API) scopes everything — a tenant can never see another's stubs.
