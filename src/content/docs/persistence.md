---
title: Persistence
description: Keep stubs across restarts with a file, LiteDB, PostgreSQL or Redis backend, and sync them through git.
---

Mockifyr always serves from memory. A durable provider does not change the hot path — it is a
**write-through** on every mutation plus a **loader** at startup. Matching performance is the same
whether you run in-memory or against PostgreSQL.

## Choosing a provider

| Provider | Selected by | Storage shape |
|----------|-------------|---------------|
| None (in-memory) | default | Nothing survives a restart |
| File | `--root-dir <dir>` | One id-stamped `<id>.json` per stub under `<dir>/mappings`; environments under `<dir>/environments/<tenant>/`; sandbox resources under `<dir>/resources/<tenant>/<collection>/` |
| LiteDB | `--litedb <path>` | One document `{Id, Tenant, Json}` in an embedded single-file database |
| PostgreSQL | `--postgres <connstr>` | Row `(id uuid, tenant text, json text)`, upserted; the table is created if absent |
| Redis | `--redis <connstr>` | Hash `mockifyr:stubs:{tenant}` keyed by stub id |

```bash
docker run -p 8080:8080 -v mockifyr-data:/work ghcr.io/qorpe/mockifyr
docker compose -f docker-compose.postgres.yml up
docker compose -f docker-compose.redis.yml up
```

If a datastore flag is passed at run time it **takes precedence over the file store**.

Stub ids are stamped into the stored JSON, so a stub keeps the same id across a restart on every
backend. Anything holding a stub id — a test, a script, a dashboard bookmark — keeps working.

## What persists

Choosing a provider makes all of this durable, not just stubs:

| | Survives a restart |
|---|---|
| Stubs | yes |
| Environment keys | yes |
| [Sandbox resources](/admin-api/#sandbox-resources) | yes |
| [Sandbox API keys](/admin-api/#sandbox-api-keys) | yes |
| Scenario states | no — reset to `Started` |
| Request journal, message inbox | no — they record what happened, not what you configured |

Deletes and resets persist too: a document you delete stays deleted after a restart, and a collection
you reset stays empty. A partner's seeded fixtures are still there on the next deploy.

:::note
Without a provider nothing is written to disk — an in-memory host behaves exactly as it always has.
Durability follows the persistence choice; it is not a new default.
:::

## What `--root-dir` gives you beyond mappings

The root dir is more than a stub folder. It is where the host looks for and writes several other files:

| Path | Contents |
|------|----------|
| `<dir>/mappings` | Stub files |
| `<dir>/__files` | [WebSocket](/websocket/) message bodies |
| `<dir>/grpc/*.dsc` | [gRPC](/grpc/) descriptors |
| `<dir>/environments/` | [Environment](/environments/) values, per tenant |
| `<dir>/outbound-trust.json` | [Outbound certificate trust](/https-and-mtls/#outbound-certificate-trust) |

## Multi-instance coherence

`--change-feed` keeps several Mockifyr instances backed by the same datastore in agreement:

| Datastore | Mechanism |
|-----------|-----------|
| Redis | Pub/sub on channel `mockifyr:changes` |
| PostgreSQL | `LISTEN` / `NOTIFY` on `mockifyr_changes` |

On a notification the instance reconciles **every tenant** — upsert, then prune — so an instance that
missed a message still converges on the next one.

:::note
`--change-feed` is only wired when `--postgres` or `--redis` is set. With the file or LiteDB backend
the flag has nothing to listen on and no notifications are exchanged.
:::

## Limitations

:::caution
**Reload from a plain mappings directory covers only the default tenant at startup.** Non-default
tenants write to per-tenant subdirectories, and the startup loader reads the top-level directory into
the default tenant. If you rely on [named tenants](/multi-tenancy/), do not expect a bare
`<dir>/mappings` folder to restore them.
:::

The mapping format's per-stub `persistent: false` opt-out is **not supported**. When a root dir is set, every
admin mutation persists — there is no way to create a stub that is deliberately transient.

## Docker

The image bakes `--root-dir /work`, so everything in the table above lives under `/work` — stubs in
`/work/mappings`, environments in `/work/environments`, and so on. Mount a volume at **`/work`** and
all of it survives restarts *and* container recreation:

```bash
# named volume — stubs, environments, __files and grpc descriptors all survive
docker run -p 8080:8080 -v mockifyr-data:/work ghcr.io/qorpe/mockifyr

# plus a bind overlay for the stubs you edit by hand — they live in ./mappings on your host
docker run -p 8080:8080 -v mockifyr-data:/work -v "$PWD/mappings:/work/mappings" ghcr.io/qorpe/mockifyr
```

:::caution
Mounting **only** `/work/mappings` keeps your stubs but silently loses the environment
configuration — and `__files/`, `grpc/` — every time the container is recreated.
:::

The repository ships three Compose files:

| File | What it sets up |
|------|-----------------|
| `docker-compose.yml` | Named volume at `/work` + `./mappings` bind overlay |
| `docker-compose.postgres.yml` | PostgreSQL service, `--change-feed`, healthchecks, named volume |
| `docker-compose.redis.yml` | Redis service, `--change-feed`, healthchecks, named volume |

### .NET Aspire

Aspire **recreates containers on every app-host run**, so a file-backed Mockifyr without a volume
resets each run — imported stubs and environment configuration included. Mount a named volume at
`/work` (and optionally keep the container alive between runs):

```csharp
var mockifyr = builder.AddContainer("mockifyr", "ghcr.io/qorpe/mockifyr")
    .WithHttpEndpoint(port: 8080, targetPort: 8080)
    .WithVolume("mockifyr-data", "/work")            // survives restarts and recreation
    .WithLifetime(ContainerLifetime.Persistent);     // optional: reuse the container across runs
```

Or hand persistence to a durable datastore instead: `.WithArgs("--postgres", connectionString)`.

## Git sync

Git sync is layered on top of the **root-dir working copy** — it commits, pushes and pulls the same
files the file provider writes. It is host-level, not tenant-scoped.

### Pinning a remote at startup

```bash
dotnet run --project src/Mockifyr.Server -- \
  --root-dir . --git-remote https://github.com/acme/mock-stubs.git --git-branch main
```

`--git-branch` defaults to `main`.

:::caution
`--git-remote` **requires** `--root-dir`. Without one the host throws at startup rather than starting
with a remote it cannot back with a working copy.
:::

`--git-work-dir <dir>` overrides the default working copy, which is `<cwd>/mockifyr-data`. A host
started with no storage flags that finds a `.git` in that location **adopts it as the root dir**.

### Connecting at runtime

```bash
curl -X POST http://localhost:8080/__admin/git/configure \
  -d '{"remote":"https://github.com/acme/mock-stubs.git","branch":"main"}'
```

### Credentials

Supply them through the environment:

| Variable | Purpose |
|----------|---------|
| `MOCKIFYR_GIT_TOKEN` | Access token |
| `MOCKIFYR_GIT_USERNAME` | Username, where the remote needs one |

Or post them at runtime:

```bash
curl -X POST http://localhost:8080/__admin/git/credentials \
  -d '{"token":"…","username":"…"}'
```

Runtime credentials are held **in process memory only**. They are never echoed back by the API, never
passed in argv, and never written to disk — so they do not leak into `ps` output, a shell history, or
the working copy.

### Endpoints

| Method | Route | Body |
|--------|-------|------|
| `GET` | `/__admin/git/status` | — |
| `POST` | `/__admin/git/configure` | remote and branch |
| `POST` | `/__admin/git/credentials` | token and username |
| `POST` | `/__admin/git/push` | optional `{"message":"…"}` |
| `POST` | `/__admin/git/pull` | — |

### How a pull behaves

A pull validates **every** `mappings/**/*.json` before applying anything, so a malformed file in the
remote does not leave you with a half-applied working copy. It is **fast-forward only**: Mockifyr never
auto-merges and never force-pushes. Divergent history is reported, not resolved for you.

### In the dashboard

The **Settings** page has a Git sync panel — remote status, push and pull.

## Related

- [Getting started](/getting-started/) — the shortest path to a persisted host.
- [Environments](/environments/) — also stored under the root dir.
- [CLI reference](/cli/) — every flag on one page.
