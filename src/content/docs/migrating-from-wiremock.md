---
title: Migrating from WireMock
description: Import your existing WireMock stubs into Mockifyr.
---

Mockifyr reads the WireMock JSON stub format, so migrating is mostly **import and go**.

## Import your stubs

Export from WireMock (`GET /__admin/mappings`, or your `mappings/*.json` files), then import into
Mockifyr — three shapes are accepted:

- a `{"mappings": [ … ]}` bundle,
- a **bare JSON array** `[ { … }, { … } ]` (no wrapper),
- a single mapping.

```bash
curl -X POST http://localhost:8080/__admin/mappings/import \
  -H 'X-Mockifyr-Tenant: default' \
  --data-binary @wiremock-export.json
```

Or use the dashboard's **Import** button (it targets the selected tenant).

## What carries over

Request matching, response templating, faults, delays, scenarios, proxy, and record & playback all
follow the WireMock semantics — and each is verified byte-for-byte against real WireMock in CI.

## Known differences

:::caution
`bodyFileName` (a response body referenced from a `__files/` directory) is **not yet resolved** — such
a stub matches but returns an empty body. Inline the body (`body` / `jsonBody`) for now, or open an
issue if you need `__files` support.
:::

A handful of edge behaviours are deferred and documented per feature group in the repository's
`docs/parity/` notes. If a stub behaves differently than WireMock, it's a bug — please
[report it](https://github.com/omercelikdev/mockifyr/issues).
