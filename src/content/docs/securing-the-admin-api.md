---
title: Securing the admin API
description: Require a username and password on the admin API and the dashboard with HTTP Basic auth.
---

By default Mockifyr is **open** — anyone who can reach it can manage stubs. Set an admin username and
password to require **HTTP Basic auth** on the admin API (`/__admin/*`) and show a login screen on the
dashboard.

:::note
The **mock-serving surface stays open** — clients hit your stubs without credentials, as they should.
Only the admin API and dashboard are protected.
:::

:::note
`/__admin/health` is **exempt** from admin Basic auth: Kubernetes/OpenShift probes cannot carry
credentials, and a 401 health check would send the pod into a restart loop. The endpoint is
read-only and exposes only name, version, persistence, and tenant count; every other `/__admin`
route stays guarded.
:::

Three flags cover the hardening this page's guidance implies — see the
[CLI reference](/cli/#security-hardening) for the full table:

- **`--tenant-credential <tenant>:<user>:<pass>`** — per-tenant admin credentials. Without it the
  tenant header is a claim any admin caller can rewrite; with it, a principal scoped to one tenant
  gets **403** when it names another. `--admin-user` remains the system scope.
- **`--mask-headers` / `--mask-body-fields`** — keep credentials and sensitive fields out of the
  request journal entirely.
- **`--block-outbound-routes`** — on an unauthenticated host, refuse the routes that make outbound
  calls or change outbound trust.

An unauthenticated host also prints a startup line naming what is reachable.

## Enable it

Two settings, always given together — `admin-user` and `admin-pass`. If only one is set, auth stays
off.

Either form works, because **every Mockifyr flag is also readable as an environment variable of the
same name** — the host builds its configuration with the standard .NET builder, so `--admin-user` on
the command line and `admin-user` in the environment reach the same key. Command-line arguments win
when both are present. Prefer the environment for credentials; see the [CLI reference](/cli/).

### Docker — environment variables (recommended)

```bash
docker run -p 8080:8080 \
  -e admin-user=alice -e admin-pass='s3cret' \
  ghcr.io/qorpe/mockifyr
```

### Docker Compose

Keep the password out of the file with a git-ignored `.env`:

```yaml
# docker-compose.yml
services:
  mockifyr:
    image: ghcr.io/qorpe/mockifyr:latest
    ports: ['8080:8080']
    environment:
      admin-user: ${MOCKIFYR_USER}
      admin-pass: ${MOCKIFYR_PASS}
```

```ini
# .env  (add to .gitignore)
MOCKIFYR_USER=alice
MOCKIFYR_PASS=s3cret
```

### Command-line flags

```bash
docker run -p 8080:8080 ghcr.io/qorpe/mockifyr --admin-user alice --admin-pass 's3cret'
# local:
dotnet run --project src/Mockifyr.Server -- --admin-user alice --admin-pass 's3cret'
```

## Using it

**CLI clients** send Basic auth proactively:

```bash
curl -u alice:s3cret http://localhost:8080/__admin/mappings
```

Without credentials the admin API returns **401**; the mock surface is unaffected.

**The dashboard** shows a login screen — enter the same username and password. It stores the
credentials locally and attaches Basic auth to its admin calls. (Mockifyr deliberately omits the
`WWW-Authenticate` header so the browser's native Basic-auth popup never blocks the dashboard.)

## Best practices

- **Don't hard-code the password** in a committed Compose file or in shell history — use an
  environment variable from a git-ignored `.env`, or a Docker/host secret.
- A command-line password is visible in `ps`; prefer env vars in production.
- Put Mockifyr behind TLS (`--https-port`) or a TLS-terminating proxy so Basic credentials aren't sent
  in the clear.
