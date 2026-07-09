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

## Enable it

Two settings, always given together — `admin-user` and `admin-pass`. Provide them as environment
variables (recommended) or command-line flags. If only one is set, auth stays off.

### Docker — environment variables (recommended)

```bash
docker run -p 8080:8080 \
  -e admin-user=alice -e admin-pass='s3cret' \
  ghcr.io/omercelikdev/mockifyr
```

### Docker Compose

Keep the password out of the file with a git-ignored `.env`:

```yaml
# docker-compose.yml
services:
  mockifyr:
    image: ghcr.io/omercelikdev/mockifyr:latest
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
docker run -p 8080:8080 ghcr.io/omercelikdev/mockifyr --admin-user alice --admin-pass 's3cret'
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
