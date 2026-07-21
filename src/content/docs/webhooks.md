---
title: Webhooks
description: Fire an outbound HTTP callback when a stub matches.
---

A webhook is an outbound call Mockifyr makes after a stub matches — the way a real service would call
you back once it has accepted your request.

```json
{
  "request": { "method": "POST", "url": "/orders" },
  "response": { "status": 202 },
  "postServeActions": [
    {
      "name": "webhook",
      "parameters": {
        "method": "POST",
        "url": "http://localhost:9000/callback",
        "headers": { "Content-Type": "application/json" },
        "body": "{\"orderId\":\"{{jsonPath originalRequest.body '$.id'}}\"}",
        "delay": { "type": "fixed", "milliseconds": 500 }
      }
    }
  ]
}
```

Both envelope names are accepted: `postServeActions` and `serveEventListeners`. They behave identically.

## Parameters

| Parameter | Notes |
|-----------|-------|
| `method` | Defaults to `GET` |
| `url` | Target URL — path and query are templated |
| `headers` | Object of header names to values; values are templated |
| `body` / `base64Body` | The request body; `body` is templated |
| `delay` | `{"type":"fixed","milliseconds":N}` |

Webhooks fire **only when the stub matches**. Delivery is fire-and-forget: the mock response is
returned to the caller immediately and is never held waiting for the callback, so a `delay` postpones
the outbound call, not the response.

## Templating

The URL, header values and body are templated **automatically** — you do **not** add a `transformers`
entry the way you would for a [response](/responses/).

:::note
The template root is `originalRequest`, not `request` — `{{originalRequest.body}}`,
`{{originalRequest.headers.Authorization}}`. This trips people up when copying an expression across
from a response template; see [templating](/templating/) for the model.

Named path variables are not available in the webhook model. They are response-side only.
:::

Webhook URLs, bodies and headers are also resolved through [environments](/environments/), so a
`{{key}}` is substituted at serve time.

## Seeing what was delivered

Each delivery records `WEBHOOK_REQUEST`, `WEBHOOK_RESPONSE` and `ERROR` sub-events.
`GET /__admin/requests/{id}` returns them in a `webhooks[]` array:

```json
{
  "webhooks": [
    {
      "method": "POST",
      "url": "http://localhost:9000/callback",
      "headers": [ … ],
      "body": "…",
      "delivered": true,
      "response": { "status": 200, "headers": [ … ], "body": "…" },
      "error": null
    }
  ]
}
```

The dashboard's journal detail view shows the same thing under a **Callback** tab — the outbound
request, the response it got, and any error. Since delivery is fire-and-forget, this is the only place
a failed callback shows up.

## Calling back to your host from a container

Same trap as [proxying](/proxying/): a callback URL on `http://localhost:PORT` inside a container hits
the container's own loopback. A refused loopback callback is retried once via `host.docker.internal`,
and **both attempts appear in the journal**, so you can see the fallback happen.

```bash
docker run -p 8080:8080 ghcr.io/omercelikdev/mockifyr --outbound-host-fallback false
```

:::note
`--outbound-host-fallback` disables the retry for webhooks and proxying alike. The older flag name
`--webhook-host-fallback` still works as an alias.
:::

## Related

- [Templating](/templating/) — helpers available in webhook fields.
- [Proxying](/proxying/) — the other outbound path.
- [Admin API](/admin-api/) — the request journal.
