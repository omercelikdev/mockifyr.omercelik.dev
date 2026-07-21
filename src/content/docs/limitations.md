---
title: Known limitations
description: What Mockifyr deliberately does not do, and where its WireMock parity stops.
---

Mockifyr's correctness is proven **differentially against real Java WireMock** in CI: the same scenario
is loaded into both, the same request is driven through both, and the responses are compared. This page
lists what that testing has deliberately left out or deferred — so you find it here rather than the hard
way.

## Response bodies

`bodyFileName` — a response body loaded from a `__files/` directory — is **not implemented**. The stub
still matches, but the response body is empty.

:::caution
This fails quietly. A stub with `bodyFileName` returns its configured status with **no body**, which
looks like a matching problem but isn't. Inline the body instead.
:::

See [responses](/responses/).

## Matching

| Area | Limitation |
|------|------------|
| `equalToIgnoreCase` | Not a key — use `equalTo` with `caseInsensitive` |
| Empty request body | Counts as absent, so `equalTo ""` does not match |
| Equal priorities | Tie-breaking is load-path dependent — give stubs distinct priorities when order matters |
| `clientIp` | Not supported |
| `equalToNumber`, `greaterThanNumber` and siblings | Not supported |
| JSON Schema Draft 4 (`V4`) | Unsupported |
| Multi-value headers | Not claimed — multi-value matching is verified on query parameters only |
| `matchesJsonPath` | Filter functions such as `.length()`, and some type-coercion edges, are deferred |
| XML | Explicit `namespaceAwareness` modes and mixed content are deferred |

`clientIp` and the standalone number matchers are **WireMock Cloud** features that open-source WireMock
itself rejects, so there is no oracle to test against and Mockifyr does not support them.

Date/time matching does not support:

- `now`-relative expected values
- `expectedOffset`
- The truncation options
- Anything outside the pattern subset shared by Java and .NET, for `actualFormat`

See [request matching](/request-matching/).

## Templating

There is no `add`, `subtract`, `multiply`, `divide`, `round`, `abs` or `soapXPath` helper. Arithmetic is
the single `math` helper, and it supports only `+ - * /`.

| Helper area | Limitation |
|-------------|------------|
| `systemValue` | Deny-by-default, with no allowlist |
| Faker | Expressions taking arguments (for example `Number.numberBetween`) and locale selection are unsupported |
| JWT | HS256 and RS256 only; no configurable signing secret, no `nbf`, no array or object claims |

See [templating](/templating/) and the [template helper reference](/template-helpers/).

## Delays and faults

Only the `uniform` delay distribution is parsed — **anything else is silently ignored**, with no error
and no delay. Lognormal and `chunkedDribbleDelay` are not implemented.

Byte-level fault fidelity is not reproduced: all four faults surface to a client identically, as a
failed request. See [delays and faults](/delays-and-faults/).

## Proxying

- `removeProxyRequestHeaders` is **deliberately** not implemented — WireMock itself still forwards the
  header, so implementing it would diverge from the oracle rather than match it.
- Response-header rewriting is not implemented.

See [proxying](/proxying/).

## Record and playback

The recording session is **global rather than tenant-scoped**. Also not implemented:

| Feature | Status |
|---------|--------|
| Record `filters` | Not implemented |
| `allowNonProxied` | Not implemented |
| `__files` body extraction | Not implemented |
| Response `transformers` on generated stubs | Not implemented |
| Repeat requests generating a scenario | Not implemented |

See [record and playback](/record-and-playback/).

## Unmatched requests

When nothing matches, only the **404 status** is served. WireMock's verbose near-miss diagnostic body is
not reproduced.

:::tip
To diagnose a request that didn't match, use `GET /__admin/requests?unmatched=true` or the
[dashboard](/the-dashboard/) journal instead of reading the 404 body.
:::

## Persistence

- Reload from a plain mappings directory covers only the **default tenant**, at startup.
- WireMock's per-stub `persistent: false` opt-out is not supported: with a root directory set, **every**
  admin mutation persists.
- The change feed does not cover environments, so multi-instance hosts pick up
  [environment](/environments/) changes only after a restart.
- Environment values are plaintext — there is no secret type.

See [persistence](/persistence/).

## gRPC

Multi-message streams and bidirectional streaming are not supported: the WireMock gRPC extension lacks
them, so there is no oracle to test against. There is also no gRPC-specific admin reset. See
[gRPC](/grpc/).

## WebSocket

Per-path or per-pattern `channelTarget`, binary frames, and listing or resetting message mappings are
not supported.

:::note
WireMock's own WebSocket support is in **beta**, so this area is validated by self-test rather than
differentially against the oracle. Treat its parity claims as weaker than the rest of the engine's.
:::

See [WebSocket](/websocket/).

## Extension seams not yet wired

| Seam |
|------|
| `IResponseDefinitionTransformer` |
| `ITemplateModelProvider` |
| `IRequestFilter` |
| Template-helper hash arguments |
| Helper providers |

See [extending Mockifyr](/extending/).

## Anything else

If Mockifyr behaves differently from WireMock in a way that is **not** on this list, that is a bug worth
reporting at <https://github.com/omercelikdev/mockifyr/issues>. Per-feature parity notes — including the
behaviours the differential harness discovered — live in the repository's `docs/parity/` directory.
