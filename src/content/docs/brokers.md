---
title: Message brokers
description: Emit the event your API would have emitted, and assert on the events your system publishes — without standing up the real producer or writing a consumer in every test.
---

An integration is rarely just HTTP. The call that *starts* a payment is a REST request; the message
that says it *settled* is an event on a topic — and that second half is the one that is hard to test,
because there is no synchronous reply to assert on.

Mockifyr's broker channel covers both directions:

| | |
|---|---|
| **Publish** | A stub answers a request **and** emits the event the rest of the system is waiting for |
| **Capture** | Messages your system publishes land in the message inbox, so you can assert on them |

Both are opt-in. A host started without `--kafka-bootstrap` builds no producer, joins no consumer
group, and attempts no connection.

```bash
mockifyr --kafka-bootstrap localhost:9092 \
         --kafka-subscribe orders.events,payments.events
```

## Emit an event when a stub matches

A `publish` action sits beside `webhook` in the same `postServeActions` array:

```json
{
  "request": { "method": "POST", "urlPath": "/payments" },
  "response": { "status": 201, "body": "{\"accepted\":true}" },
  "postServeActions": [{
    "name": "publish",
    "parameters": {
      "topic": "payments.events",
      "key": "{{jsonPath originalRequest.body '$.orderId'}}",
      "body": "{\"type\":\"PaymentAccepted\",\"order\":\"{{jsonPath originalRequest.body '$.orderId'}}\"}",
      "headers": { "correlation-id": "{{originalRequest.headers.X-Correlation-Id}}" }
    }
  }]
}
```

The caller gets its `201` synchronously — publishing never delays or fails the response. **Every field
is templated** against the triggering request, which is what makes a partition key taken from the
request body (the thing that gives you per-entity ordering) the obvious thing to write.

`delay` works exactly as it does on a webhook, and several `publish` actions on one stub all fire, in
order.

### When the broker is unreachable

The response still goes out. The failure is recorded on the [journal](/verifying-requests/) entry:

```json
"publishes": [{
  "topic": "payments.events", "key": "ord-7", "body": "{\"type\":\"PaymentAccepted\"}",
  "delivered": false, "error": "Local: Message timed out"
}]
```

A failure records **what it was carrying**, not just that it failed — otherwise a template mistake and
an unreachable broker look identical afterwards. A `null` key and body mean rendering itself failed, so
there was never a message; the error says which template.

A successful delivery is recorded the same way, with `delivered: true` — a stub that claims to emit an
event and quietly fails to would be worse than one that never claimed it.

### Without `--kafka-bootstrap`

A `publish` action is still accepted, and the stub still serves its response — but nothing is emitted,
because there is no producer to emit it. That is easy to mistake for a broker outage, so it is reported
when the stub is created and again at startup for mappings loaded from disk:

```json
{ "id": "…", "warnings": ["a 'publish' post-serve action was accepted but this host has no broker — …"] }
```

The stub is not rejected: the goal is to be loud, not strict.

## Assert on what your system published

Point Mockifyr at the topics your system writes to, and the messages land in the tenant's inbox:

```bash
mockifyr --kafka-bootstrap localhost:9092 --kafka-subscribe orders.events
```

```bash
curl "http://localhost:8080/__admin/messages?channel=broker"
curl "http://localhost:8080/__admin/messages/count?channel=broker"   # → {"count":1}
```

There is **no separate broker API**: captured messages use the same [inbox](/messages/) as email and
SMS, so everything you already know about listing, filtering, counting and resetting applies.

Each message carries where it came from:

```json
{ "channel": "broker", "from": "orders.events", "body": "{\"type\":\"OrderSettled\"}",
  "meta": { "topic": "orders.events", "partition": "0", "offset": "41", "key": "ord-7",
            "header.correlation-id": "abc" } }
```

The **topic stands in for the sender**; there are no recipients, because a published message is
addressed to a topic rather than to anybody. Producer headers are stored under a `header.` prefix so a
producer cannot overwrite the `topic` or `offset` you are reading.

### Multi-tenant capture

A topic carries no tenancy of its own. A producer can address one with a message header, and its
absence lands in the default tenant — the same [chain](/multi-tenancy/) every other channel uses:

```
X-Mockifyr-Tenant: acme
```

### Consumer groups and offsets

`--kafka-group` names the consumer group (default `mockifyr`), so two replicas **share** a subscription
rather than each receiving every message.

Offsets are committed **after** a message is in the inbox, never before. A host that crashed in between
would otherwise have acknowledged a message nobody can see: redelivery is preferred to silent loss.

:::note
The inbox is bounded and in memory, like every other channel — see [`--message-limit`](/cli/). It is a
place to assert on recent traffic, not a durable log.
:::

## Reply to a message with a message

Publishing from an HTTP stub covers "my API emits an event". The other half — "my *component* consumes
a command and emits an event" — is a **broker mapping**: a trigger over an inbound message and the
messages it sends in reply.

```bash
curl -X POST http://localhost:8080/__admin/broker-mappings -d '{
  "whenTopic":   { "equalTo": "orders.commands" },
  "whenMessage": [{ "matchesJsonPath": { "expression": "$.type", "equalTo": "SettleOrder" } }],
  "publish": [{
    "topic": "orders.events",
    "key":   "{{jsonPath message.body \'$.orderId\'}}",
    "body":  "{\"type\":\"OrderSettled\",\"orderId\":\"{{jsonPath message.body \'$.orderId\'}}\"}"
  }]
}'
```

Produce a `SettleOrder` on `orders.commands`, and your own consumer receives `OrderSettled` on
`orders.events`. Mockifyr is standing in for the component in between.

Mappings are listed, deleted and reset the same way:

```bash
curl http://localhost:8080/__admin/broker-mappings
curl -X DELETE http://localhost:8080/__admin/broker-mappings/<id>
curl -X POST http://localhost:8080/__admin/broker-mappings/reset
```

:::note
These routes exist only when the host was started with `--kafka-bootstrap`. A mapping you could post
but that would never be evaluated is a trap, so there is nothing to post to.
:::

### Matching

Three optional parts, and **all** of them must match:

| Field | Matches on | Matchers |
|---|---|---|
| `whenTopic` | the topic it arrived on | any [value matcher](/matching/) — `equalTo`, `matches`, `contains`, … |
| `whenHeaders` | message headers, by name | any value matcher, per header |
| `whenMessage` | the payload | any [body matcher](/matching/) — `equalToJson`, `matchesJsonPath`, `equalToXml`, … |

These are the **same matchers as everywhere else** — nothing was invented for this channel, so
`equalToJson`'s array handling and `matchesJsonPath`'s expressions behave exactly as they do on an HTTP
stub. A mapping with no trigger at all matches every message on the subscribed topics.

### What a reply can say

Every field of a `publish` is templated, against the inbound message:

| | |
|---|---|
| `{{message.body}}` | the payload — use with `jsonPath`, `xPath` and the rest |
| `{{message.topic}}` | where it arrived |
| `{{message.key}}` | its partition key, empty when the producer set none |
| `{{message.headers.<name>}}` | one header by name |

The destination `topic` is templated too, so one mapping can route by content instead of one mapping
per destination. Your tenant's [environment keys](/environments/) and [clock](/admin-api/) resolve here
exactly as they do in an HTTP response.

### Rules worth knowing

- **Every matching mapping fires**, not just the first. A fan-out — one command producing an event
  *and* an audit record from separate mappings — is a real pattern, and a broker can carry any number
  of replies where HTTP can send one response.
- **The inbound message is still captured.** Serving does not consume it; it is in the inbox
  afterwards, which is how you debug a mapping that did not fire.
- **An unmatched message is acknowledged, not parked.** A forgotten mapping must not stall a partition.
- **A broken template drops its own message and no other**, so a typo in an audit mapping cannot stop
  the event your system is waiting for.
- **Offsets commit after the reply is dispatched**, so a host that died mid-reply redelivers rather
  than losing it.

## What is not here yet

- **AMQP / RabbitMQ.** Kafka is the transport that exists.
- **Schema registries** (Avro, Protobuf). Bodies are text.
- **A dashboard screen.** Broker mappings are API-only for now; captured messages do show on the
  Messages screen.

## Related

- [Email & SMS mocking](/messages/) — the inbox captured messages share.
- [Webhooks](/webhooks/) — the other post-serve action, with the same templating.
- [Verifying requests](/verifying-requests/) — where delivery successes and failures are recorded.
- [CLI](/cli/) — `--kafka-bootstrap`, `--kafka-subscribe`, `--kafka-group`.
