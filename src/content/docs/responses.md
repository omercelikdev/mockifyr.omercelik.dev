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
