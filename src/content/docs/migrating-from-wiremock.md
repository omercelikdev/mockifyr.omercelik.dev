---
title: Migrating from WireMock
description: Import your existing WireMock stubs into Mockifyr, and the differences worth knowing first.
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

Or use the dashboard's **Import** button, which targets the selected tenant. Files mounted into
`<root-dir>/mappings` are loaded at startup instead, always into the **default** tenant — see
[multi-tenancy](/multi-tenancy/).

## What carries over

[Request matching](/request-matching/), [response templating](/templating/),
[delays and faults](/delays-and-faults/), [scenarios](/scenarios/), [proxying](/proxying/),
[webhooks](/webhooks/) and [record and playback](/record-and-playback/) all follow WireMock semantics,
and each is verified against a real WireMock instance in CI.

## Read this before you migrate

The differences are not a long list, but a few of them fail quietly rather than loudly — which is the
expensive kind. The four that catch people most often:

| WireMock | In Mockifyr |
|---|---|
| `bodyFileName` | **Not implemented.** The stub still matches, but the response body is empty. Inline the body with `body` or `jsonBody`. |
| `equalToIgnoreCase` | Not a key. Use `{"equalTo": "X", "caseInsensitive": true}`. |
| `delayDistribution` with `lognormal` | Only `uniform` is parsed. Anything else is ignored silently — no error, and no delay. |
| `{{add a b}}` and friends | No such helper. Arithmetic is `{{math a '+' b}}`, and it supports only `+ - * /`. |

:::caution
The first and third fail **without an error**. A stub with `bodyFileName` looks healthy and returns
nothing; a lognormal `delayDistribution` looks configured and never delays. If either behaviour seems
missing, check here first.
:::

The complete list — matching, templating, faults, proxying, recording, persistence, gRPC and
WebSocket — is in [known limitations](/limitations/).

## Where the differences come from

Correctness is established by running the same scenario through both engines and diffing the result,
so a difference is either a bug or a documented decision. Some gaps are deliberate: `clientIp` and the
standalone number matchers belong to WireMock Cloud and the open-source WireMock rejects them too, and
`removeProxyRequestHeaders` is unimplemented precisely *because* WireMock still forwards the header, so
implementing it would diverge.

If a stub behaves differently from WireMock and is not listed in [known limitations](/limitations/),
that is a bug — please [report it](https://github.com/omercelikdev/mockifyr/issues). Per-feature parity
notes live in the repository's `docs/parity/` directory.
