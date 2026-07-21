---
title: CLI and configuration
description: Every Mockifyr setting is a command-line flag — and the same name works as an environment variable.
---

Mockifyr has **no configuration file**. Every setting is a command-line flag on the host process.

The host builds its configuration with the standard .NET configuration builder, so **every flag is also
readable as an environment variable of the same name**. That is why this works:

```bash
docker run -p 8080:8080 -e admin-user=alice -e admin-pass='s3cret' ghcr.io/omercelikdev/mockifyr
```

Command-line arguments win over environment variables when both supply the same key.

:::tip
Use environment variables for anything secret. A password passed on the command line is visible in
`ps` to every user on the machine.
:::

## Flags

### Listeners

| Flag | Default | Effect |
|------|---------|--------|
| `--port <n>` | `8080` | Mock-serving HTTP port. `0` picks an ephemeral port. |
| `--https-port <n>` | unset (no HTTPS listener) | Enables the TLS listener. Both listeners then negotiate HTTP/1.1 and HTTP/2. |
| `--https-keystore <path>` | unset → ephemeral self-signed RSA-2048 certificate | PFX/PKCS#12 server certificate. |
| `--https-keystore-password <p>` | none | Password for the keystore. |
| `--https-require-client-auth` | `false` | Requires a client certificate (mTLS). Applies to the HTTPS listener only. |
| `--https-truststore <path>` | unset | CA anchor the client certificate must chain to. With none set, any well-formed client certificate is accepted. |
| `--https-truststore-password <p>` | none | Password for the truststore. If empty, the file is loaded as a plain certificate. |

See [HTTPS, HTTP/2 and mTLS](/https-and-mtls/).

### Files and the dashboard

| Flag | Default | Effect |
|------|---------|--------|
| `--root-dir <dir>` | unset | Loads `<dir>/mappings/*.json` at startup, persists stub mutations there, and provides `<dir>/__files`, `<dir>/grpc/*.dsc`, `<dir>/environments/` and `<dir>/outbound-trust.json`. |
| `--dashboard <dir>` | unset | Serves the built dashboard under `/__mockifyr`, only if the directory exists. |

### Admin authentication

| Flag | Default | Effect |
|------|---------|--------|
| `--admin-user <u>` | unset | Admin username. |
| `--admin-pass <p>` | unset | Admin password. |

Both must be given together. If only one is set, auth stays off — see
[securing the admin API](/securing-the-admin-api/).

### Persistence

| Flag | Default | Effect |
|------|---------|--------|
| `--litedb <path>` | unset | LiteDB persistence and loader. |
| `--postgres <connstr>` | unset | PostgreSQL persistence and loader. |
| `--redis <connstr>` | unset | Redis persistence and loader. |
| `--change-feed` | `false` | Multi-instance coherence. Only wired when `--postgres` or `--redis` is set. |

See [persistence](/persistence/).

### Serving behaviour

| Flag | Default | Effect |
|------|---------|--------|
| `--global-response-templating` | `false` | Every response renders through the templating engine regardless of the per-stub `transformers` list. See [templating](/templating/). |

### Outbound calls

| Flag | Default | Effect |
|------|---------|--------|
| `--outbound-host-fallback <true\|false>` | `true` | Container-localhost retry for callbacks and proxies. |
| `--trust-proxy-target <host>` | none | Trust that host's certificate on outbound calls. Repeatable, and also accepts a comma- or semicolon-separated list. Exact host match, no wildcards. |
| `--trust-all-proxy-targets` | `false` | Disables outbound certificate verification entirely. |

`--webhook-host-fallback` is a kept alias for `--outbound-host-fallback` from v0.8.1. If both are
present, the new key wins.

:::caution
`--trust-all-proxy-targets` is flag-only — it is not settable from the dashboard. A host that relaxes
outbound TLS prints a `mockifyr: outbound TLS: …` line at startup, so check the log if you are unsure
what a running instance trusts.
:::

Relevant to [proxying](/proxying/) and [webhooks](/webhooks/).

### Git sync

| Flag | Default | Effect |
|------|---------|--------|
| `--git-remote <url>` | unset | Pins Git sync to that remote. Requires `--root-dir` or startup fails. |
| `--git-branch <name>` | `main` | Branch for Git sync. |
| `--git-work-dir <dir>` | `<cwd>/mockifyr-data` | Overrides the default Git working copy. |

:::note
A host started with no flags that finds a `.git` in the default working copy adopts that directory as
its root dir.
:::

## Environment variables that are not flags

Two settings exist only as environment variables:

| Variable | Purpose |
|----------|---------|
| `MOCKIFYR_GIT_TOKEN` | HTTPS Git credential token. |
| `MOCKIFYR_GIT_USERNAME` | HTTPS Git username. |

They are supplied to Git through an inline credential helper: never passed in `argv`, never written to
disk.

## Reserved URL prefixes

| Prefix | Surface |
|--------|---------|
| `/__admin` | The [admin REST API](/admin-api/), and the scope of Basic auth. |
| `/__mockifyr` | The [dashboard](/the-dashboard/). |

Everything else is the mock-serving surface.

## Docker

The image is `ghcr.io/omercelikdev/mockifyr`, built for `linux/amd64` and `linux/arm64`. It exposes
`8080` and its baked entrypoint is:

```bash
dotnet Mockifyr.Server.dll --port 8080 --dashboard /app/dashboard --root-dir /work
```

Extra flags appended to `docker run` are passed through to that entrypoint:

```bash
docker run -p 8080:8080 ghcr.io/omercelikdev/mockifyr --global-response-templating
```

To run engine-only with no dashboard, override the entrypoint so that `--dashboard` is dropped.

## Without Docker

Requires the .NET 10 SDK:

```bash
dotnet run --project src/Mockifyr.Server -- --port 8080 --root-dir .
```

## Related

- [Getting started](/getting-started/) — the one-line run.
- [Securing the admin API](/securing-the-admin-api/) — `--admin-user` and `--admin-pass` in context.
- [Persistence](/persistence/) — choosing a store.
- [Admin API](/admin-api/) — the runtime equivalents of several of these flags.
