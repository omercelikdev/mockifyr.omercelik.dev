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

Create one over the admin API, or in the dashboard's stub editor:

```bash
curl -X POST http://localhost:8080/__admin/mappings --data-binary @stub.json
```

## Request matching

| Field | Matches on |
|-------|-----------|
| `method` | HTTP method, or `ANY` |
| `url` · `urlPath` · `urlPattern` · `urlPathPattern` · `urlPathTemplate` | exact URL, path, regex, or a templated path with named variables |
| `headers` · `queryParameters` · `cookies` · `formParameters` | per-key value matchers |
| `bodyPatterns` | `equalTo`, `equalToJson`, `matchesJsonPath`, `equalToXml`, `matchesXPath`, `matches`, `contains`, `matchesJsonSchema`, and more |
| `scheme` · `host` · `port` | multi-domain routing |

Matchers compose with `and`, `or` and `not`. The full set, including the gotchas worth knowing before
you hit them, is in [request matching](/request-matching/).

Stubs carry a `priority`, defaulting to `5`, where the **lowest number wins**.

:::caution
Equal-priority ties are **not** resolved deterministically — the winner depends on how the stubs were
loaded. Give competing stubs distinct priorities when the order matters.
:::

## Response

- `status`, `statusMessage`, `headers` — single- or multi-value
- Body: `body` (string), `jsonBody` (object) or `base64Body`
- `transformers: ["response-template"]` enables [templating](/templating/)
- Behaviour: [delays and faults](/delays-and-faults/), [proxying](/proxying/)

The full field list is in [responses](/responses/).

## Stateful stubs

`scenarioName`, `requiredScenarioState` and `newScenarioState` make a stub respond differently
depending on what came before — see [scenarios](/scenarios/).

## Tenants

Every stub belongs to a tenant. The dashboard's tenant switcher, and the `X-Mockifyr-Tenant` header on
the admin API, scope everything — a tenant can never see another's stubs. See
[multi-tenancy](/multi-tenancy/).

## Related

- [Request matching](/request-matching/) — every matcher
- [Responses](/responses/) — every response field
- [Migrating from WireMock](/migrating-from-wiremock/) — bring your existing stubs
