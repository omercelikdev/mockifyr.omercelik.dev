---
title: Record and playback
description: Capture live traffic against a real service and turn it into stubs.
---

Recording points Mockifyr at a real service, forwards what you send it, and builds a stub from each
exchange. You then replay those stubs with the real service switched off.

## Start a session

```bash
curl -X POST http://localhost:8080/__admin/recordings/start \
  -d '{"targetBaseUrl":"https://api.example.com"}'
```

`targetBaseUrl` is required — omitting it returns **422**.

Now drive traffic through Mockifyr's mock surface as usual; each request is forwarded to the target and
recorded.

## Endpoints

| Endpoint | Result |
|----------|--------|
| `POST /__admin/recordings/start` | Begin recording against `{"targetBaseUrl":"…"}` |
| `GET /__admin/recordings/status` | `{"status":"Recording"}` or `{"status":"Stopped"}` |
| `POST /__admin/recordings/snapshot` | `{"mappings":[…]}` captured so far; the session **continues** |
| `POST /__admin/recordings/stop` | `{"mappings":[…]}` and the session **ends** |

Snapshot is the one to use while iterating — it lets you inspect what has been captured without
tearing the session down.

## What a generated stub contains

- The exact URL and method of the request.
- An `equalTo` body pattern, when the request carried a body.
- The captured status, body and response headers.

Transport headers are not baked into the generated stub, so a recorded mapping does not carry
connection-level noise that would make it fail to match on replay.

:::caution
The recording session is **global, not tenant-scoped** — unlike nearly everything else in Mockifyr.
There is one session per server, so starting a recording affects every tenant, and a second `start`
does not give another tenant its own independent session. Coordinate before recording on a shared
instance.
:::

## Not implemented

| WireMock feature | Status |
|------------------|--------|
| Record `filters` | Not implemented |
| `allowNonProxied` | Not implemented |
| Body-file (`__files`) extraction | Not implemented — bodies stay inline |
| Response `transformers` on generated stubs | Not implemented |
| Repeat requests generating a scenario | Not implemented |

Recorded stubs are therefore flat and literal. If you want templating, delays or scenario state, add
them to the generated mappings yourself — see [templating](/templating/) and [scenarios](/scenarios/).

## In the dashboard

The **Recordings** page takes a target base URL and a **Start** button, polls the live status, and
offers **Snapshot** and **Stop**. Captured stubs are listed with their raw JSON, so you can read exactly
what would be saved before committing to it.

## Related

- [Proxying](/proxying/) — the forwarding behaviour recording builds on, including the
  container-localhost caveat.
- [Writing stubs](/writing-stubs/) — the format of what comes out.
