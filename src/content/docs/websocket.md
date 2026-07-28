---
title: WebSocket
description: Serve templated WebSocket messages from trigger/action message mappings.
---

Mockifyr accepts WebSocket connections and replies to inbound messages from **message mappings** — a
trigger that matches the message body, and one or more send actions whose payload is templated.

:::caution
This is the one area of Mockifyr that is **not** validated against the reference oracle. The reference
engine's WebSocket support is still beta and is not present in the pinned reference image, so there is no stable
implementation to differentially test against. WebSocket serving is validated by **self-test**: a real
client drives a live host and the replies are asserted directly. Everywhere else in Mockifyr, "correct"
means "byte-identical to the reference engine"; here it means "does what this page says".
:::

## Connecting

WebSocket upgrades are accepted on **any path**, by a middleware at the front of the pipeline — before
mock serving. There is nothing to configure and no path to register; `ws://localhost:8080/anything`
connects.

The tenant comes from the `X-Mockifyr-Tenant` header on the upgrade request, as everywhere else — see
[multi-tenancy](/multi-tenancy/).

## Registering a message mapping

```bash
curl -X POST http://localhost:8080/__admin/message-mappings \
  -H 'X-Mockifyr-Tenant: team-payments' \
  -d '{
    "trigger": { "message": { "body": { "equalTo": "ping" } } },
    "actions": [
      { "type": "send", "message": { "body": { "data": "pong" } } }
    ]
  }'
```

`201` with `{"id": "…"}` on success. Malformed JSON, or a well-formed document with a wrong-typed field,
returns **422**.

Every inbound message is matched against every mapping of the tenant, and **each** matching mapping's
actions fire — matching is not first-wins the way stub matching is.

## Triggers

| `trigger` | Fires on |
|-----------|----------|
| `{ "message": { "body": { …matcher… } } }` | An inbound message whose body the matcher accepts |
| `{ "type": "connection" }` | Connect time — the actions are sent once, unsolicited, as soon as a client connects |
| Absent trigger body | Every inbound message |

The message trigger reuses the **standard body value-matcher set** — `equalTo`, `matches`,
`contains`, `equalToJson`, `matchesJsonPath` and the rest all work exactly as in
[request matching](/request-matching/).

```json
{
  "trigger": { "message": { "body": { "matchesJsonPath": "$.subscribe" } } },
  "actions": [
    { "type": "send", "message": { "body": { "data": "{\"ack\":true}" } } }
  ]
}
```

Connection-triggered mappings are excluded from the per-message loop, so a connect-time mapping never
also fires in response to traffic.

## Send actions

A send action's `message.body` carries **either** `data` or `filePath`.

### `data` — an inline template

The payload renders through the same Handlebars engine and helpers as response
[templating](/templating/), with the inbound message exposed as `{{message.body}}` at the template root.

```json
{
  "trigger": { "message": { "body": { "matchesJsonPath": "$.id" } } },
  "actions": [
    {
      "type": "send",
      "message": { "body": { "data": "Echo {{jsonPath message.body '$.id'}} at {{now}}" } }
    }
  ]
}
```

For a connect-time mapping there is no inbound message, so templates render against an **empty** body.

### `filePath` — a file from `__files`

```json
{ "type": "send", "message": { "body": { "filePath": "welcome.json" } } }
```

The name resolves under `<root-dir>/__files`, the mapping format's convention — see
[persistence](/persistence/).

:::caution
`filePath` is read **at registration time**, not at send time. The file's contents are captured when you
POST the mapping; editing the file afterwards changes nothing until you register the mapping again.
:::

## Broadcasting

A send action's `channelTarget` defaults to the originating channel. Setting it to **anything other than
originating** broadcasts the message to **all** of the tenant's open channels.

```json
{
  "type": "send",
  "channelTarget": { "type": "broadcast" },
  "message": { "body": { "data": "someone said {{message.body}}" } }
}
```

## Server-initiated push

To send a message that no client asked for, push it through the admin API. It goes to every open channel
of the tenant.

```bash
curl -X POST http://localhost:8080/__admin/channels/send \
  -H 'X-Mockifyr-Tenant: team-payments' \
  -d '{"message":{"body":{"data":"deploy finished"}}}'
```

A body missing `message.body.data`, or with a non-string `data`, returns **422**.

## Not supported

| Feature | Status |
|---------|--------|
| Per-path or per-pattern `channelTarget` targeting | Not implemented — a broadcast reaches all of the tenant's channels |
| Binary frames | Not implemented — text only |
| Listing message mappings | Not implemented — registration is write-only |
| Resetting message mappings | Not implemented — restart the host to clear them |

Because mappings can be neither listed nor reset, treat registration as append-only for the lifetime of
the process. Registering the same trigger twice means both mappings fire.

## Related

- [Request matching](/request-matching/) — the matcher set triggers reuse.
- [Templating](/templating/) — the engine `data` renders through.
- [Multi-tenancy](/multi-tenancy/)
- [Known limitations](/limitations/)
