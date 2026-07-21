---
title: Scenarios
description: Give stubs state so the same request returns different responses as a flow progresses.
---

A scenario is a named state machine. Stubs join it by name, declare which state they require, and
optionally move it on when they match. That is how the same request returns one thing the first time
and something else the second.

```json
{
  "scenarioName": "checkout",
  "requiredScenarioState": "Started",
  "newScenarioState": "paid",
  "request": { "method": "POST", "url": "/pay" },
  "response": { "status": 202, "body": "accepted" }
}
```

## The three fields

| Field | Meaning |
|-------|---------|
| `scenarioName` | The scenario this stub belongs to |
| `requiredScenarioState` | The stub only matches while the scenario is in this state |
| `newScenarioState` | On a match, move the scenario to this state |

Every scenario starts in `Started`. A stub whose `requiredScenarioState` is `Started` is therefore the
entry point of the flow.

:::note
A stub with a `scenarioName` but **no** `requiredScenarioState` is eligible in *any* state. That is
useful for a fallback inside a flow, but it also means such a stub never stops matching — give it a
required state if you meant it to apply only at one step.
:::

State is keyed by **(tenant, scenario name)**. Two tenants running the same scenario name advance
independently — see [multi-tenancy](/multi-tenancy/).

## Inspecting and driving state

`GET /__admin/scenarios` lists every scenario the current tenant's stubs define:

```json
{
  "scenarios": [
    { "id": "…", "name": "checkout", "state": "paid", "possibleStates": ["Started", "paid"] }
  ]
}
```

`possibleStates` is derived from the states the stubs mention, so a state no stub refers to will not
appear.

Move a scenario directly — useful to jump into the middle of a flow in a test setup:

```bash
curl -X PUT http://localhost:8080/__admin/scenarios/checkout/state \
  -d '{"state":"paid"}'
```

Omitting `state` in the body resets that scenario to `Started`.

To reset everything at once, for example between test cases:

```bash
curl -X POST http://localhost:8080/__admin/scenarios/reset
```

That returns every scenario to `Started`.

## In the dashboard

The **Scenarios** page shows each stateful stub group as a card with its states as chips. Click a chip
to move the scenario to that state, or use **Reset all** to send every scenario back to `Started`.
It is the quickest way to step a flow by hand while you develop against it.

## Related

- [Writing stubs](/writing-stubs/) — where these fields sit in a mapping.
- [Admin API](/admin-api/) — the full endpoint reference.
