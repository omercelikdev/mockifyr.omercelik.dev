---
title: gRPC
description: Serve gRPC from ordinary stubs, using compiled protobuf descriptor sets.
---

Mockifyr serves gRPC from the same stubs you already write. There is no separate gRPC stub format: the
service and method become a URL path, the request message is matched as proto3 JSON, and the response
message is a `jsonBody`.

## Turning it on

gRPC serving turns on **automatically** when compiled protobuf descriptor sets are present at
`<root-dir>/grpc/*.dsc`. There is no flag. If the directory holds no `.dsc` file, nothing is served and
the rest of Mockifyr behaves as usual.

```bash
protoc --descriptor_set_in= \
  --include_imports \
  --descriptor_set_out=./mockifyr-root/grpc/orders.dsc \
  orders.proto
```

`--root-dir` is the same root used for stub files and `__files` — see [persistence](/persistence/).

:::caution
gRPC runs over HTTP/2. In practice that means the **`--https-port` listener**: plaintext h2c is not an
asserted path, so point your client at the TLS port. See
[HTTPS, HTTP/2 and mTLS](/https-and-mtls/).
:::

## Writing a gRPC stub

The stub is an ordinary mapping. `urlPath` is `/{package.Service}/{Method}`, the body pattern matches
the request message as proto3 JSON, and the response is a `jsonBody`.

```json
{
  "request": {
    "method": "POST",
    "urlPath": "/orders.OrderService/GetOrder",
    "bodyPatterns": [ { "equalToJson": { "orderId": "A-1" } } ]
  },
  "response": {
    "status": 200,
    "jsonBody": {
      "orderId": "A-1",
      "state": "SHIPPED",
      "totalCents": "19900"
    }
  }
}
```

Because it is a normal stub, everything else that applies to stubs applies here:
[request matching](/request-matching/), [templating](/templating/),
[scenarios](/scenarios/), [delays and faults](/delays-and-faults/).

## Codec coverage

The protobuf ↔ JSON codec covers:

| Feature | Rendered as |
|---------|-------------|
| proto3 scalars | JSON numbers / booleans |
| `string` | JSON string |
| `bytes` | base64 string |
| Nested messages | Nested JSON objects |
| Enums | The enum value **name**, not its number |
| Maps | JSON objects |
| Repeated fields | JSON arrays (packed and unpacked wire forms) |
| `oneof` | The set field only |
| Well-known wrappers (`StringValue`, `Int32Value`, …) | Bare scalars, not `{"value": …}` |

:::note
64-bit integers (`int64`, `uint64`, `sint64`, `fixed64`, …) render as **JSON strings**, per the proto3
JSON specification. Write `"totalCents": "19900"` in your `jsonBody`, not `19900` — a number will not
round-trip.
:::

## Returning an error status

To return a gRPC error instead of a message, set two response headers:

| Header | Meaning |
|--------|---------|
| `grpc-status-name` | The status code name, e.g. `NOT_FOUND` |
| `grpc-status-reason` | The detail message |

```json
{
  "request": {
    "method": "POST",
    "urlPath": "/orders.OrderService/GetOrder",
    "bodyPatterns": [ { "matchesJsonPath": "$.orderId" } ]
  },
  "response": {
    "status": 200,
    "headers": {
      "grpc-status-name": "NOT_FOUND",
      "grpc-status-reason": "no such order"
    }
  }
}
```

:::caution
When an error status is returned the response **body is not delivered**. A `jsonBody` alongside
`grpc-status-name` is silently discarded, which is correct gRPC behaviour but easy to misread as a
broken stub.
:::

## Streaming

| Pattern | Supported |
|---------|-----------|
| Unary | Yes |
| Server-streaming, single message | Yes |
| Client-streaming, single message | Yes |
| Multi-message streams | No |
| Bidirectional streaming | No |

The unsupported cases are not an oversight of scope. The WireMock gRPC extension does not implement
them either, so there is no reference implementation to differentially test Mockifyr against — and
Mockifyr does not ship behaviour it cannot verify against the oracle.

## Not supported

- Multi-message and bidirectional streaming (above).
- A gRPC-specific admin reset. Use the ordinary stub admin routes to clear mappings.

## Tenants

Tenancy works exactly as elsewhere: the `X-Mockifyr-Tenant` header selects the tenant, and the gRPC
middleware honours it. See [multi-tenancy](/multi-tenancy/).

## Related

- [Writing stubs](/writing-stubs/) — the stub format used here unchanged.
- [HTTPS, HTTP/2 and mTLS](/https-and-mtls/) — the listener gRPC arrives on.
- [Persistence](/persistence/) — where `--root-dir` points.
- [Known limitations](/limitations/)
