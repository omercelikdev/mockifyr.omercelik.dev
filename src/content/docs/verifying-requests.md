---
title: Verifying requests
description: Assert that your code called the API the way you expected — and find out why a request did not match.
---

A mock answers requests. The other half of the job is telling you what was asked: that your code
really did send the `POST`, that it sent it once and not three times, and — when a stub did not fire
— what actually arrived instead.

Mockifyr records every request in a per-tenant **journal** and answers questions about it over the
admin API.

## Did my code call it?

`POST /__admin/requests/count` takes a **request pattern** — the same matchers a stub's `request`
block uses, so anything you can match on, you can count on:

```bash
curl -X POST http://localhost:8080/__admin/requests/count \
  -H 'Content-Type: application/json' \
  -d '{"method":"POST","urlPath":"/api/orders"}'
# → {"count":1}
```

```bash
# Everything the tenant received
curl -X POST http://localhost:8080/__admin/requests/count -d '{}'
```

Because it is the full matcher vocabulary, "called with the right body" is one call rather than a
fetch-and-inspect loop:

```json
{
  "method": "POST",
  "urlPath": "/api/orders",
  "bodyPatterns": [{ "matchesJsonPath": "$.customer.id" }],
  "headers": { "X-Correlation-Id": { "matches": "[0-9a-f-]{36}" } }
}
```

See [request matching](/request-matching/) for the full list.

## Why didn't my stub match?

Ask for the requests nothing matched:

```bash
curl 'http://localhost:8080/__admin/requests?unmatched=true'
```

Then read one in full — the exact URL, headers and body that arrived, plus the response served and
any webhooks the stub fired:

```bash
curl http://localhost:8080/__admin/requests/{id}
```

Comparing that against the stub you wrote is usually the whole debugging session: a trailing slash, a
header the client adds that your `equalTo` did not expect, a JSON body with different key casing.

The [dashboard](/the-dashboard/)'s **Journal** screen is the same data with the comparison already
laid out, which is generally faster than curl for this particular question.

:::note
Mockifyr serves a plain **404** for an unmatched request — it does not write a diagnostic body
explaining the closest stub. The journal is where that question gets answered instead. This is a
[known difference](/limitations/) from the reference engine's verbose near-miss output.
:::

## What the journal keeps

The journal is **bounded per tenant** — 1000 entries by default, oldest evicted first. Counts and
verification see retained entries only, so a very long run answers about its recent history rather
than growing without limit.

```bash
mockifyr --journal-limit 5000     # a bigger window
mockifyr --journal-limit 0        # unbounded (the pre-1.0 behaviour)
mockifyr --journal-disabled       # keep nothing
```

Disabling the journal also disables counting and the dashboard's Journal screen — they read the same
store. That is the trade, and it is worth making on a high-throughput load test where nobody is going
to read it.

## Keeping secrets out of it

The journal stores what arrived, which on a real integration includes bearer tokens and card numbers.
Two flags keep named things out of storage entirely — not redacted on display, never written:

```bash
mockifyr --mask-headers Authorization,X-Api-Key \
         --mask-body-fields pan,cvv,password
```

Masking is opt-in because the journal also backs verification: a masked field cannot be counted on
afterwards. Decide once, per environment — most teams mask in shared environments and leave it off
locally.

## Resetting between tests

```bash
curl -X DELETE http://localhost:8080/__admin/requests        # clear the journal
curl -X POST   http://localhost:8080/__admin/mappings/reset  # clear the stubs
curl -X POST   http://localhost:8080/__admin/scenarios/reset # back to Started
```

Journal reset is a `DELETE` on the collection, not a `/reset` sibling — the one place the three do not
rhyme, and the spelling the reference engine uses.

In a suite that shares one host, clearing the journal in setup is what makes counts assertable — and
[per-tenant](/multi-tenancy/) journals let parallel suites skip even that, since each tenant only ever
sees its own traffic.

## Related

- [Admin API](/admin-api/#request-journal) — every route, parameter and response shape.
- [Request matching](/request-matching/) — the pattern vocabulary counting shares with stubs.
- [The dashboard](/the-dashboard/) — the Journal screen.
- [Performance and sizing](/performance/) — what the journal costs at volume.
