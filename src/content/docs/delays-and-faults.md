---
title: Delays and faults
description: Make a stub slow or make it fail, so you can exercise timeouts and error handling.
---

Two response-level behaviours let a stub misbehave on purpose: a **delay** holds the response back,
and a **fault** ends the request without a usable response.

```json
"response": {
  "status": 200,
  "body": "ok",
  "fixedDelayMilliseconds": 2000
}
```

## Delays

| Field | Shape |
|-------|-------|
| `fixedDelayMilliseconds` | integer — hold the response for exactly this long |
| `delayDistribution` | `{"type":"uniform","lower":n,"upper":n}` — a random delay in that range |

```json
"response": {
  "status": 200,
  "delayDistribution": { "type": "uniform", "lower": 100, "upper": 900 }
}
```

:::caution
`uniform` is the **only** distribution Mockifyr parses. Any other `delayDistribution` — including
the mapping format's `lognormal` — is **silently ignored**: the stub is accepted, no error is reported, and the
response comes back with no delay at all. If a delay you configured never seems to happen, check the
`type` first.
:::

`chunkedDribbleDelay` is likewise not implemented.

## Faults

`fault` takes exactly one of four values:

| Value |
|-------|
| `EMPTY_RESPONSE` |
| `MALFORMED_RESPONSE_CHUNK` |
| `RANDOM_DATA_THEN_CLOSE` |
| `CONNECTION_RESET_BY_PEER` |

```json
"response": { "fault": "CONNECTION_RESET_BY_PEER" }
```

:::caution
Byte-level fault fidelity is **not** reproduced. All four faults surface to a client identically, as a
failed request — the client will not observe the specific wire-level symptom each name describes. Use
faults to exercise your client's failure path (retry, circuit breaker, timeout handling), not to assert
on a particular socket-level behaviour.
:::

## Degrading a whole dependency

`delay` and `fault` describe **one stub**. The question that actually comes up is one level higher:
*what does my system do when this dependency degrades?* Answering it by editing every stub — and then
editing them all back — is why that test usually never happens.

A **degradation profile** applies to the whole tenant at once:

```bash
curl -X PUT http://localhost:8080/__admin/degradation \
  -H 'Content-Type: application/json' \
  -d '{"latency":   {"fixedMs": 200, "jitterMs": 800},
       "errorRate": {"ratio": 0.05, "status": 503},
       "faultRate": {"ratio": 0.01, "fault": "CONNECTION_RESET_BY_PEER"}}'

curl -X DELETE http://localhost:8080/__admin/degradation   # one call ends the drill
```

It **composes** with what each stub already declares: a stub asking for 200 ms still gets its 200 ms,
plus whatever the dependency is adding today. A broken connection outranks an error status — a
dependency that resets the connection does not first explain itself with a 503 — and latency still
applies to a request that then fails, because a degraded dependency is usually slow *and* failing.

### Reproducible, on purpose

Every profile carries a **seed**. Supply one to replay a known sequence, or let the host generate one
and report it back — nobody thinks to record a seed until a run turns up something interesting, by
which point it is too late.

```bash
curl -X PUT http://localhost:8080/__admin/degradation \
  -d '{"errorRate":{"ratio":0.1},"seed":4242}'
```

Same seed, same sequence of decisions. That is what turns a chaos experiment into a regression test.

:::note
The profile is **per tenant** — one team's outage drill leaves everyone else healthy — and the admin
API is never degraded, so you can always undo it. It lives in memory: a restart returns the tenant to
full health.
:::

## Related

- [Writing stubs](/writing-stubs/) — the rest of the response fields.
- [Responses](/responses/) — status, headers and bodies.
- [Limitations](/limitations/) — what else is deliberately not implemented.
