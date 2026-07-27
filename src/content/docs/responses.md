---
title: Responses
description: Status, headers, body fields and their precedence, plus the response-level behaviour fields.
---

The `response` object of a stub describes what is served once the [request pattern](/request-matching/)
matches.

```json
"response": {
  "status": 201,
  "statusMessage": "Created",
  "headers": { "Content-Type": "application/json" },
  "jsonBody": { "id": 1, "status": "created" }
}
```

## Status and headers

| Field | Notes |
|-------|-------|
| `status` | HTTP status code |
| `statusMessage` | Served as the HTTP reason phrase on the wire |
| `headers` | Single- or multi-value |

## Body fields

Three fields can carry a body. If more than one is present, they are applied in this order:

| Order | Field | Type |
|-------|-------|------|
| 1 | `body` | string |
| 2 | `jsonBody` | object |
| 3 | `base64Body` | base64 string |

`body` wins over `jsonBody`, and `jsonBody` wins over `base64Body`. Set exactly one to avoid ambiguity.

:::caution
`bodyFileName` — a response body referenced out of a `__files/` directory — is **not implemented**. A
stub that uses it still matches, but the response body is empty. This fails quietly: the status and
headers look right, so it is easy to mistake for a serialization problem. Inline the content with
`body` or `jsonBody` instead.
:::

## Templating

Add `"transformers": ["response-template"]` to a response to make its body and headers Handlebars
templates. To enable it for every stub on the host, start the server with
`--global-response-templating`.

```json
"response": {
  "status": 200,
  "transformers": ["response-template"],
  "jsonBody": { "echo": "{{jsonPath request.body '$.name'}}" }
}
```

See [templating](/templating/) for the model and [template helpers](/template-helpers/) for the full
helper reference.

## Stateful responses: the `state` directive

A stub response may declare a `state` directive — a sandbox CRUD operation on a tenant-scoped
[resource collection](/admin-api/#sandbox-resources). `POST /orders` then *creates* a document that
`GET /orders/{id}` *returns*:

```json
{
  "request": { "method": "POST", "urlPath": "/api/orders" },
  "response": {
    "status": 201,
    "body": "{\"id\":\"{{state.id}}\",\"order\":{{state.body}} }",
    "state": { "operation": "create", "collection": "orders" }
  }
}
```

```json
{
  "request": { "method": "GET", "urlPathPattern": "/api/orders/[^/]+" },
  "response": {
    "status": 200,
    "body": "{{state.body}}",
    "state": { "operation": "read", "collection": "orders", "id": "{{request.pathSegments.[2]}}" }
  }
}
```

- `operation` — `create`, `read`, `update`, `delete` or `list`.
- `id` / `document` — template expressions rendered against the request. An absent create `id` is
  generated; an absent `document` stores the request body verbatim.
- The result renders as `{{state.id}}`, `{{state.body}}`, `{{state.version}}`, `{{state.count}}`,
  `{{state.list}}`. Declaring the directive enables templating for that response — no
  `response-template` transformer needed.
- `missStatus` — what read/update/delete answer for an unknown id (default **404**), with an empty
  body, like a real API.
- Serve-time guards mirror the admin API: a document over the body cap answers **413**, non-JSON
  **422** — nothing half-lands.
- State is tenant-scoped and shared with [`/__admin/resources`](/admin-api/#sandbox-resources):
  what a stub creates, the dashboard and the admin API see immediately.

:::caution
Handlebars cannot parse `{{state.body}}}` — an expression followed immediately by a closing JSON
brace reads as a broken triple-stache. Put a space before the brace: `{{state.body}} }`.
:::

## Behaviour fields

These also live on `response` and each has its own page.

| Field | Page |
|-------|------|
| `fixedDelayMilliseconds` | [delays and faults](/delays-and-faults/) |
| `delayDistribution` | [delays and faults](/delays-and-faults/) |
| `fault` | [delays and faults](/delays-and-faults/) |
| `proxyBaseUrl` | [proxying](/proxying/) |
| `additionalProxyRequestHeaders` | [proxying](/proxying/) |
| `proxyUrlPrefixToRemove` | [proxying](/proxying/) |

## Compression

A response is gzipped when the request carries `Accept-Encoding: gzip`, regardless of the response
content type. There is no per-content-type exclusion list.

## Output shape quirks

Some rendered output is formatted in ways that look inconsistent on their own. These shapes are
preserved deliberately, because WireMock produces them and differential parity is the definition of
correct here.

| Case | Rendered as |
|------|-------------|
| `jsonPath` result that is an object | Jackson-pretty (indented) |
| `jsonPath` result that is a top-level array | Compact |
| `toJson` output containing arrays | Spaced |

:::note
Do not treat these as bugs to normalize away. If you compare Mockifyr output against a recorded
WireMock response byte for byte, matching these shapes is what makes the comparison pass.
:::
