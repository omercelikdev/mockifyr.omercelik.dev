---
title: Admin API
description: Reference for the /__admin REST surface — mappings, the request journal, scenarios, environments, recordings, outbound trust, Git sync and extensions.
---

Everything Mockifyr does at runtime is driven through `/__admin`. The [dashboard](/the-dashboard/) is a
client of this API and nothing more.

## Tenancy

Requests carry their tenant in the `X-Mockifyr-Tenant` header. Absent means the **default tenant**. See
[multi-tenancy](/multi-tenancy/).

```bash
curl -H 'X-Mockifyr-Tenant: team-payments' http://localhost:8080/__admin/mappings
```

:::caution
Not everything under `/__admin` is tenant-scoped. `recordings/*`, `git/*`, `outbound-trust*`, `ext/*`,
`health` and `tenants` are **host-level**: they act on the whole instance, and sending an
`X-Mockifyr-Tenant` header does not narrow them.
:::

Authentication — HTTP Basic, off by default — is covered in
[securing the admin API](/securing-the-admin-api/).

## Health and tenants

| Method | Path | Purpose | Response |
|--------|------|---------|----------|
| `GET` | `/__admin/health` | Liveness and a snapshot of the instance | `{name, version, persistence, tenants, totalStubs}` |
| `GET` | `/__admin/tenants` | Tenants currently holding stubs | `{tenants:[…]}` |

```json
{
  "name": "Mockifyr",
  "version": "1.0",
  "persistence": "InMemory",
  "tenants": 2,
  "totalStubs": 14
}
```

`persistence` is the provider name of the configured store.

:::caution
The `version` field is hard-coded `"1.0"` and does **not** track the release version. Do not use it for
version detection.
:::

## Mappings

| Method | Path | Purpose | Response |
|--------|------|---------|----------|
| `GET` | `/__admin/mappings` | List the tenant's stubs | `{mappings:[…]}` |
| `POST` | `/__admin/mappings` | Create a stub | 201 `{id, uuid}` · 422 on malformed or wrongly-typed JSON |
| `GET` | `/__admin/mappings/{id}` | Fetch one stub | 200 `{id}` · 404 |
| `PUT` | `/__admin/mappings/{id}` | Replace in place | 200 `{id, uuid}` · 422 |
| `DELETE` | `/__admin/mappings/{id}` | Delete | 200, idempotent |
| `POST` | `/__admin/mappings/import` | Load a `{"mappings":[…]}` bundle | 200 · 422 |
| `POST` | `/__admin/mappings/reset` | Clear the tenant's mappings | 200 |

Each entry in the `GET /__admin/mappings` list is the stub's **own source JSON**, with `id` and `uuid`
stamped in. What you wrote is what comes back.

:::note
`GET /__admin/mappings/{id}` returns only the id — `{id}` — not the stub body. Read the full definition
from the list endpoint.
:::

On `PUT`, the **route id is authoritative**: an `id` in the body does not move the stub.

```bash
curl -X POST http://localhost:8080/__admin/mappings \
  -d '{"request":{"method":"GET","url":"/hello"},"response":{"status":200,"body":"world"}}'
# → 201 {"id":"…","uuid":"…"}
```

See [writing stubs](/writing-stubs/).

## Request journal

| Method | Path | Purpose | Response |
|--------|------|---------|----------|
| `POST` | `/__admin/requests/count` | Count requests matching a pattern | `{count:n}` |
| `GET` | `/__admin/requests` | List logged requests | `{requests:[…]}` |
| `GET` | `/__admin/requests/{id}` | Full detail for one request | see below |

The body of `POST /__admin/requests/count` is a **request pattern** built from the same matchers as a
stub's `request` block — see [request matching](/request-matching/). An empty pattern matches
everything:

```bash
curl -X POST http://localhost:8080/__admin/requests/count -d '{}'
# → {"count":37}
```

`GET /__admin/requests` accepts `?unmatched=true` to return only requests that no stub matched. Each
list entry is a summary:

```json
{
  "requests": [
    {
      "id": "…",
      "method": "GET",
      "url": "/hello",
      "status": 200,
      "wasMatched": true,
      "stubId": "…",
      "loggedDate": "…"
    }
  ]
}
```

`GET /__admin/requests/{id}` returns the full exchange, including any webhooks the stub fired:

```json
{
  "id": "…",
  "loggedDate": "…",
  "wasMatched": true,
  "stubId": "…",
  "request":  { "method": "POST", "url": "/orders", "headers": [], "body": "…" },
  "response": { "status": 201, "statusMessage": "Created", "headers": [], "body": "…" },
  "webhooks": [
    {
      "method": "POST",
      "url": "https://callback.example.com/hook",
      "headers": [],
      "body": "…",
      "delivered": true,
      "response": { "status": 200, "headers": [], "body": "…" },
      "error": null
    }
  ]
}
```

The `webhooks[]` array is how you confirm a callback actually went out — see [webhooks](/webhooks/).

## Scenarios

| Method | Path | Purpose | Body |
|--------|------|---------|------|
| `GET` | `/__admin/scenarios` | List scenarios and their current state | — |
| `PUT` | `/__admin/scenarios/{name}/state` | Force a scenario into a state | `{"state":"…"}` |
| `POST` | `/__admin/scenarios/reset` | Reset every scenario | — |

The `state` body is optional; omitted, it defaults to `Started`. See [scenarios](/scenarios/).

## Environments

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/__admin/environments` | List keys, their values and the value in effect |
| `PUT` | `/__admin/environments/{key}` | Define a key and its named values |
| `PUT` | `/__admin/environments/{key}/active` | Switch which named value is active |
| `DELETE` | `/__admin/environments/{key}` | Remove a key |
| `POST` | `/__admin/environments/reset` | Clear the tenant's keys |

| Error code | HTTP |
|------------|------|
| `Environment.InvalidBody` | 400 |
| `Environment.ReservedKey` | 400 |
| `Environment.UnknownKey` | 404 |

See [environments](/environments/) for the request and response shapes.

## Recordings

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/__admin/recordings/start` | Begin recording against a target |
| `GET` | `/__admin/recordings/status` | Current recording state |
| `POST` | `/__admin/recordings/snapshot` | Turn traffic recorded so far into stubs |
| `POST` | `/__admin/recordings/stop` | Stop recording |

`start` requires a target:

```bash
curl -X POST http://localhost:8080/__admin/recordings/start \
  -d '{"targetBaseUrl":"https://api.example.com"}'
```

A missing `targetBaseUrl` is **422**. Recording is host-level, not per tenant — see
[record and playback](/record-and-playback/).

## Outbound trust

| Method | Path | Purpose | Response |
|--------|------|---------|----------|
| `GET` | `/__admin/outbound-trust` | Current outbound TLS trust | `{hosts:[], trustAll, pinned, persistent}` |
| `POST` | `/__admin/outbound-trust/hosts` | Trust a host — `{"host":"…"}` | |
| `DELETE` | `/__admin/outbound-trust/hosts/{host}` | Stop trusting a host | |

| Error code | HTTP |
|------------|------|
| `Trust.FlagPinned` | 409 |
| `Trust.UnknownHost` | 404 |
| `Trust.Unavailable` | 501 |
| anything else | 400 |

:::note
`Trust.FlagPinned` means the host was started with `--trust-proxy-target` or
`--trust-all-proxy-targets`. Flags win — see the [CLI reference](/cli/).
:::

## Git sync

| Method | Path | Purpose | Response |
|--------|------|---------|----------|
| `GET` | `/__admin/git/status` | Sync state | `{configured, remote, branch, dirty, ahead, behind, fetchError, configuredBy, workingCopy, credentialsSource}` |
| `POST` | `/__admin/git/configure` | Set the remote — `{remoteUrl, branch?}` | |
| `POST` | `/__admin/git/credentials` | Store HTTPS credentials — `{token, username?}` | |
| `POST` | `/__admin/git/push` | Commit and push — optional `{"message":"…"}` | `{pushed, commit, reason}` |
| `POST` | `/__admin/git/pull` | Fetch, merge and reload stubs | `{updated, commit, stubsLoaded, reason}` |

An empty body on `POST /__admin/git/credentials` **clears** the stored credentials. Credentials are
never echoed back by any endpoint, including `git/status` — that response reports only
`credentialsSource`.

### Error codes

The Git mapping is worth reading before you write a client against it:

| Error code | HTTP |
|------------|------|
| `Git.NotConfigured` | 404 |
| `Git.NotSupported` | 404 |
| `Git.RemoteBranchMissing` | 404 |
| `Git.InvalidMappings` | 422 |
| `Git.InvalidRemote` | 422 |
| `Git.InvalidBranch` | 422 |
| `Git.RemoteAhead` | 409 |
| `Git.Diverged` | 409 |
| `Git.DirtyWorkingTree` | 409 |
| `Git.LocalOverlap` | 409 |
| `Git.WrongBranch` | 409 |
| `Git.FlagPinned` | 409 |
| `Git.PersistenceConflict` | 409 |
| `Git.Auth` | 502 |

:::caution
`Git.Auth` is **502**, deliberately not 401. The failure is with the remote rejecting Mockifyr's stored
credentials — not with the caller's credentials to Mockifyr. A 401 here would tell a client to retry
its own admin auth, which would never help.
:::

## Extensions

| Method | Path | Purpose |
|--------|------|---------|
| `ANY` | `/__admin/ext/{**rest}` | Route to a registered extension |

The first path segment after `ext/` selects the extension whose `RoutePrefix` matches it. An unknown
prefix is **404**. See [extending Mockifyr](/extending/).

## WebSocket endpoints

`POST /__admin/message-mappings` and `POST /__admin/channels/send` belong to the WebSocket facade and
are documented with it — see [WebSocket](/websocket/).

## Related

- [Securing the admin API](/securing-the-admin-api/) — Basic auth over `/__admin/*`.
- [Multi-tenancy](/multi-tenancy/) — what `X-Mockifyr-Tenant` scopes.
- [CLI and configuration](/cli/) — the startup-time counterparts to these endpoints.
- [The dashboard](/the-dashboard/) — the UI over this API.
