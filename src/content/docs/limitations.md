---
title: Known limitations
description: What Mockifyr deliberately does not do, and where its reference parity stops.
---

Mockifyr's correctness is proven **differentially against a real reference engine** in CI (the
OSS engine named in the [migration guide](/migration/)): the same scenario
is loaded into both, the same request is driven through both, and the responses are compared. This page
lists what that testing has deliberately left out or deferred — so you find it here rather than the hard
way.

Where a gap could otherwise be discovered from behaviour, the engine now says so at import time: a
mapping using an unimplemented field is still accepted, and the response carries a `warnings` array
explaining what will happen instead. See [the admin API](/admin-api/#import-warnings).

## Response bodies

`bodyFileName` is supported: a response body may live in a file under `<root-dir>/__files` instead of
being inlined. See [responses](/responses/#file-backed-bodies).

Two edges remain: recording does not extract bodies into `__files`, and generated stubs always inline
their bodies.

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

`clientIp` and the standalone number matchers are **commercial cloud-edition** features that the open-source reference engine
itself rejects, so there is no oracle to test against and Mockifyr does not support them.

Date/time matching does not support:

- `now`-relative expected values
- `expectedOffset`
- The truncation options
- Anything outside the pattern subset shared by Java and .NET, for `actualFormat`

See [request matching](/request-matching/).

## Templating

Arithmetic is the single `math` helper, supporting `+ - * / %`. There is no `soapXPath` helper.

:::note
`add`, `subtract`, `multiply`, `divide`, `round` and `abs` were listed here as gaps. They are not —
the reference engine rejects them too, so implementing them would diverge from it rather than match
it. Use `{{math 2 '+' 3}}`. Verified by driving each one through both engines.
:::

Integer division rounds half **away from zero** (`{{math -9 '/' 2}}` is `-5`), matching the reference
engine. Division or modulo by zero renders an empty value where the reference engine returns 500.

| Helper area | Limitation |
|-------------|------------|
| `systemValue` | Deny-by-default, with no allowlist |
| Faker | Expressions taking arguments (for example `Number.numberBetween`) and locale selection are unsupported |
| JWT | HS256 and RS256 only; no configurable signing secret, no `nbf`, no array or object claims |

See [templating](/templating/) and the [template helper reference](/template-helpers/).

## Delays and faults

Only the `uniform` delay distribution is parsed. Anything else means **no delay at all** — reported
as an import warning since 1.0, rather than silently ignored as it was before. Lognormal and
`chunkedDribbleDelay` are not implemented.

Byte-level fault fidelity is not reproduced: all four faults surface to a client identically, as a
failed request. See [delays and faults](/delays-and-faults/).

## Proxying

- `removeProxyRequestHeaders` is **deliberately** not implemented — the reference engine itself still forwards the
  header, so implementing it would diverge from the oracle rather than match it.
- Response-header rewriting is not implemented.

See [proxying](/proxying/).

## Record and playback

Recording is tenant-scoped: two tenants can record at once against their own upstreams, and one
tenant's session neither discards another's captures nor proxies their traffic. Not implemented:

| Feature | Status |
|---------|--------|
| Record `filters` | Not implemented |
| `allowNonProxied` | Not implemented |
| `__files` body extraction | Not implemented |
| Response `transformers` on generated stubs | Not implemented |
| Repeat requests generating a scenario | Not implemented |

See [record and playback](/record-and-playback/).

## Unmatched requests

When nothing matches, only the **404 status** is served. The reference engine's verbose near-miss diagnostic body is
not reproduced.

:::tip
To diagnose a request that didn't match, use `GET /__admin/requests?unmatched=true` or the
[dashboard](/the-dashboard/) journal instead of reading the 404 body.
:::

## Persistence

- Reload from a plain mappings directory covers only the **default tenant**, at startup.
- The mapping format's per-stub `persistent: false` opt-out is not supported: with a root directory set, **every**
  admin mutation persists.
- The change feed does not cover environments, so multi-instance hosts pick up
  [environment](/environments/) changes only after a restart.
- Environment values are plaintext — there is no secret type.

See [persistence](/persistence/).

## gRPC

Multi-message streams and bidirectional streaming are not supported: the reference gRPC extension lacks
them, so there is no oracle to test against. There is also no gRPC-specific admin reset. See
[gRPC](/grpc/).

## WebSocket

Per-path or per-pattern `channelTarget`, binary frames, and listing or resetting message mappings are
not supported.

:::note
The reference engine's WebSocket support is in **beta**, so this area is validated by self-test rather than
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

If Mockifyr behaves differently from the reference engine in a way that is **not** on this list, that is a bug worth
reporting at <https://github.com/qorpe/mockifyr/issues>. Per-feature parity notes — including the
behaviours the differential harness discovered — live in the repository's `docs/parity/` directory.

## Message channels (email & SMS)

- The message inbox is **in-memory only** — messages do not survive a restart (stubs do, via the
  persistence providers).
- **No inbound simulation**: Mockifyr never initiates a message toward your application (no
  incoming-SMS webhooks, no Twilio status callbacks yet).
- SMTP fault directives are tenant-wide, not rule-based; STARTTLS is not implemented.
- `twilio` is the only SMS provider profile so far; other providers can still be mocked with
  ordinary stubs.
