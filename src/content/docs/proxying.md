---
title: Proxying
description: Forward matched requests to a real service instead of returning a canned response.
---

A stub with `proxyBaseUrl` forwards the request to another service and returns that service's response.
Use it to stub part of an API while the rest still hits the real thing.

```json
{
  "request": { "method": "GET", "urlPathPattern": "/api/.*" },
  "response": { "proxyBaseUrl": "https://api.example.com" }
}
```

## Fields

| Field | Effect |
|-------|--------|
| `proxyBaseUrl` | The target base URL |
| `additionalProxyRequestHeaders` | Headers added to the outbound request |
| `proxyUrlPrefixToRemove` | Strip this prefix from the path before forwarding |

The proxy forwards the method, path, query string, body and headers — with the exception of `Host`,
which is set for the target.

```json
"response": {
  "proxyBaseUrl": "https://api.example.com",
  "proxyUrlPrefixToRemove": "/legacy",
  "additionalProxyRequestHeaders": { "X-Forwarded-By": "mockifyr" }
}
```

:::note
`removeProxyRequestHeaders` is deliberately **not** implemented. WireMock forwards the named header
anyway, so honouring the field would diverge from the oracle Mockifyr is differential-tested against.
Response-header rewriting is not implemented either.
:::

## Environment substitution

Proxy targets are resolved through [environments](/environments/), so a `{{key}}` in `proxyBaseUrl` is
substituted at serve time:

```json
"response": { "proxyBaseUrl": "{{upstreamBaseUrl}}" }
```

That lets the same stub set point at a different backend per tenant without editing the mapping.

## Proxying to a service on your host from a container

This is the failure most people hit first. A `proxyBaseUrl` of `http://localhost:PORT` inside a
container resolves to the **container's own loopback**, not your machine's — so the service you meant to
reach is not there.

Mockifyr handles this: a loopback target that refuses the connection is retried once against
`host.docker.internal`. If that also fails, the response is a **502 Bad Gateway naming the cause**
rather than an opaque 500, so the journal tells you what happened instead of leaving you guessing.

```bash
# disable the retry — a refused loopback proxy then returns a plain 500
docker run -p 8080:8080 ghcr.io/omercelikdev/mockifyr --outbound-host-fallback false
```

:::caution
On plain Linux Docker, `host.docker.internal` exists only if the container was started with
`--add-host=host.docker.internal:host-gateway`. Without it the fallback has nothing to resolve to.
:::

## Related

- [HTTPS, HTTP/2 and mTLS](/https-and-mtls/) — outbound TLS to an untrusted target.
- [Record and playback](/record-and-playback/) — turn proxied traffic into stubs.
- [Environments](/environments/) — `{{key}}` resolution.
