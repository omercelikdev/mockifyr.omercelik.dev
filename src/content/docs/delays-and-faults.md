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
WireMock's `lognormal` — is **silently ignored**: the stub is accepted, no error is reported, and the
response comes back with no delay at all. If a delay you configured never seems to happen, check the
`type` first.
:::

WireMock's `chunkedDribbleDelay` is likewise not implemented.

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

## Related

- [Writing stubs](/writing-stubs/) — the rest of the response fields.
- [Responses](/responses/) — status, headers and bodies.
- [Limitations](/limitations/) — what else is deliberately not implemented.
