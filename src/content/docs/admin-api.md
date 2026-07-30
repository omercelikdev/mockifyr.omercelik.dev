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
| `GET` | `/__admin/health` | Liveness and a snapshot of the instance | `{name, version, persistence, tenants, totalStubs, cryptography, audit}` |
| `GET` | `/__admin/live` | Is the process alive (never fails while running) | `{status:"alive"}` |
| `GET` | `/__admin/ready` | Should traffic be routed here | `{status}` — **503** while starting or draining |
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

`persistence` is the provider name of the configured store. `cryptography` reports which of the four
payload-crypto capabilities the host holds keys for, and `audit` whether it is recording an
[audit trail](#audit-trail).

All three endpoints stay **outside admin auth** — a Kubernetes probe or a Prometheus scraper cannot
carry credentials, and a 401 on liveness would send the pod into a restart loop. See
[deploying in production](/deploying-in-production/).

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
| `POST` | `/__admin/mappings/import` | Load a `{"mappings":[…]}` bundle; a sibling `environments` section is [restored too](/environments/#export-and-import) | 200 · 422 |
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

The journal is **bounded per tenant** (default 1000 entries, oldest evicted first — configure with
[`--journal-limit`](/cli/#request-journal), disable with `--journal-disabled`). Counts and
verification only see retained entries, matching the reference engine's journal-cap semantics.


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

## OpenAPI import

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/__admin/openapi/import?stateful=true` | OpenAPI 3.x (JSON or YAML) in the body → one stub per operation; with `stateful`, resource-shaped path pairs become live [state-directive](/responses/#stateful-responses-the-state-directive) CRUD stubs |

Examples serve as-is; example-less schemas synthesize samples (Faker-backed for `uuid`/`email`/`uri`
formats). External `$ref`s are refused with the offending pointer named — they are **never
fetched** — and oversized or absurdly recursive specs answer typed 413/422s. The import is
transactional: on any refusal, nothing is created. The dashboard offers the same import as the
**OpenAPI** channel in the Add-stub flow.

| Error code | HTTP |
|------------|------|
| `OpenApi.TooLarge` | 413 |
| `OpenApi.ExternalRef` · `OpenApi.Invalid` · `OpenApi.Empty` · `OpenApi.TooDeep` | 422 |

## Sandbox resources

Tenant- and collection-scoped JSON documents — the data plane of the [integration sandbox](/the-dashboard/)
verticals. Bodies are opaque JSON: validated well-formed and size-capped at the edge (default 1 MiB,
`--resource-max-body`), stored and re-served verbatim. Collections are bounded (default 1000
documents, `--resource-limit`; oldest evicted first).

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/__admin/resources` | List the tenant's collections with document counts |
| `GET` | `/__admin/resources/{collection}?limit=&offset=` | Page through a collection (`limit` 1..500, default 100) — returns `{documents, total}` |
| `GET` | `/__admin/resources/{collection}/{id}` | Read one document |
| `PUT` | `/__admin/resources/{collection}/{id}` | Create or replace a document (last-write-wins; the version advances) |
| `DELETE` | `/__admin/resources/{collection}/{id}` | Delete one document — **404** when it does not exist |
| `POST` | `/__admin/resources/{collection}/reset` | Clear one collection |
| `POST` | `/__admin/resources/reset` | Clear every collection of the tenant |
| `POST` | `/__admin/resources/{collection}/seed` | Seed from a JSON array — transactional; object elements may carry a string `id`, absent ids are generated |

| Error code | HTTP |
|------------|------|
| `Resource.NotFound` | 404 |
| `Resource.BodyTooLarge` | 413 |
| `Resource.InvalidCollection` · `Resource.InvalidId` · `Resource.InvalidBody` | 422 |

## Sandbox API keys

With [`--sandbox-auth`](/cli/#sandbox) enabled, tenants can hand out per-consumer credentials for
the **mock surface**: an issued `mfk_…` token presented as `X-Api-Key: mfk_…` or
`Authorization: Bearer mfk_…` selects the key's tenant ahead of the host/header chain. Requests
without credentials keep resolving exactly as before; an invalid or revoked key is refused with
**401** — never silently served from another tenant. A sandbox key is **not** admin
authentication: `/__admin/*` refuses it on both carriers.

The token is returned **once**, in the issuance response (`key`); afterwards only a 12-character
display prefix is stored and listed — Mockifyr keeps a salted hash, never the token.

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/__admin/apikeys` | List the tenant's keys — `id`, `name`, `prefix`, `createdAt`, `quotaPerHour`, `usedThisHour` |
| `POST` | `/__admin/apikeys` | Issue a key: `{"name": "ci", "quotaPerHour": 1000}` (`quotaPerHour` optional) → **201** with the one-time `key` |
| `DELETE` | `/__admin/apikeys/{id}` | Revoke — the key stops authenticating immediately |

A key with a `quotaPerHour` is rate limited over a fixed hourly window: counted responses carry
`X-RateLimit-Limit`, `X-RateLimit-Remaining`, and `X-RateLimit-Reset` (Unix seconds), and the
request past the budget gets **429 Too Many Requests** with `Retry-After`. Keys without a quota
are unlimited and carry no rate headers. Keys survive restarts on every
[persistence backend](/persistence/); the hourly usage counter is in-memory and resets on restart.

| Error code | HTTP |
|------------|------|
| `ApiKey.NotFound` | 404 |
| `ApiKey.InvalidName` · `ApiKey.InvalidQuota` | 422 |


## Audit trail

Available when the host runs with `--audit`. Read-only: entries are written by the host as a side
effect of the change they describe, so nothing on this API can rewrite history.

| Method | Path | Purpose | Response |
|--------|------|---------|----------|
| `GET` | `/__admin/audit` | The tenant's administrative changes, newest first | `{entries:[…]}` |

`?limit=<n>` caps the result (clamped to 1–1000, default 200). Entries are tenant-scoped like every
other route here.

```json
{
  "entries": [
    {
      "id": "62a8a64f-4f86-4d36-a30b-0f1e373a8753",
      "timestamp": "2026-07-30T13:25:14.32Z",
      "principal": "tenant:acme",
      "tenant": "acme",
      "action": "DELETE /__admin/mappings/5a5bb853-…",
      "target": "5a5bb853-…",
      "outcome": 200
    }
  ]
}
```

`principal` is a label — `system`, `tenant:<name>` or `anonymous` — never credential material.
`outcome` is the status the operation actually answered with, so a refused change is recorded as
refused. Reads and unauthenticated attempts are not recorded; see
[deploying in production](/deploying-in-production/#the-audit-trail) for the full rules.

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

## Messages

The tenant-scoped inbox of captured mail and SMS ([Email & SMS mocking](/messages/)). All routes
honour `X-Mockifyr-Tenant`.

| Route | Effect |
|-------|--------|
| `GET /__admin/messages` | List, newest first. Filters: `channel=email\|sms`, `recipient` (case-insensitive substring over any addressee), `contains` (subject + bodies), `matches` (regex, 250 ms budget — malformed patterns filter to nothing), `limit` (0 = unlimited). |
| `GET /__admin/messages/count` | Count under the same filters — always agrees with the list. |
| `GET /__admin/messages/{id}` | One message, including `raw` — the wire payload byte-for-byte (full MIME for mail, the provider form body for SMS). |
| `GET /__admin/messages/{id}/attachments/{index}` | Attachment bytes with the stored content type and file name. |
| `GET /__admin/messages/otp?recipient=…&channel=…&pattern=…` | Extracts a one-time code from the **newest** matching message. Default pattern `\b\d{4,8}\b`; a participating capture group wins over the full match. Errors are honest: `Message.NotFound`, `Otp.NoMatch`, or `422` for an invalid pattern. |
| `GET /__admin/messages/{id}/otp?pattern=…` | The same extraction against one specific message. |
| `DELETE /__admin/messages/{id}` | Delete one message (`404` when it is not in this tenant's inbox). |
| `POST /__admin/messages/reset` | Clear the tenant's inbox. |
| `GET/PUT/DELETE /__admin/messages/behaviors` | Per-tenant channel directives: `{"smtpFault":"none\|reject\|drop","smtpDelayMs":0,"smsErrorCode":21211,"webhookUrl":"…"}`. `PUT` validates (negative delay or a non-five-digit code → `422`); `DELETE` resets to defaults. |

### gRPC descriptors

| Route | Effect |
|-------|--------|
| `GET /__admin/grpc/descriptors` | The loaded `*.dsc` files and every indexed service/method. |
| `POST /__admin/grpc/descriptors?name=…` | Uploads a compiled descriptor set (raw bytes). Parse-validated before anything is written; serving hot-reloads — no restart. |
| `DELETE /__admin/grpc/descriptors/{name}` | Removes the file and rebuilds the index. |

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

`POST /__admin/message-mappings` (register), `GET /__admin/message-mappings` (list, each entry the
registration JSON with its id stamped in), `DELETE /__admin/message-mappings/{id}`, and
`POST /__admin/channels/send` belong to the WebSocket facade — see [WebSocket](/websocket/).

## Related

- [Securing the admin API](/securing-the-admin-api/) — Basic auth over `/__admin/*`.
- [Multi-tenancy](/multi-tenancy/) — what `X-Mockifyr-Tenant` scopes.
- [CLI and configuration](/cli/) — the startup-time counterparts to these endpoints.
- [The dashboard](/the-dashboard/) — the UI over this API.
