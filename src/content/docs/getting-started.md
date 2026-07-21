---
title: Getting started
description: Run Mockifyr in one line, open the dashboard, and create your first stub.
---

Mockifyr ships as a single image — the mock engine, the admin API, and the dashboard together.

## Run it

The same one line on **macOS, Linux, and Windows** — no volume, no flags:

```bash
docker run -p 8080:8080 ghcr.io/omercelikdev/mockifyr
```

That's it. Three surfaces are now live:

| Surface | URL |
|---------|-----|
| Mock serving | `http://localhost:8080` |
| Admin API | `http://localhost:8080/__admin` |
| Dashboard | `http://localhost:8080/__mockifyr` |

## Your first stub

Create one over the admin API:

```bash
curl -X POST http://localhost:8080/__admin/mappings \
  -d '{"request":{"method":"GET","url":"/hello"},"response":{"status":200,"body":"world"}}'
```

Then hit it on the mock surface:

```bash
curl http://localhost:8080/hello
# → world
```

…or open the **dashboard** at `http://localhost:8080/__mockifyr`, click **New stub**, and fill in the form.

## Keep your stubs

The zero-arg run is in-memory. To persist across restarts, use Compose or a **named volume** — both
identical on every OS:

```bash
docker compose up                                         # stubs live in ./mappings, next to you
docker run -p 8080:8080 -v mockifyr-data:/work/mappings ghcr.io/omercelikdev/mockifyr   # named volume
```

### Preload stub files from your host

To load a folder of WireMock `*.json` files, bind-mount it. Only the path syntax differs per shell:

```bash
docker run -p 8080:8080 -v "$PWD/mappings:/work/mappings" ghcr.io/omercelikdev/mockifyr   # macOS / Linux
#   PowerShell:  -v "${PWD}/mappings:/work/mappings"       CMD:  -v "%cd%/mappings:/work/mappings"
```

Files load into the **default tenant**. For a named tenant, use the dashboard's **Import** while that
tenant is selected, or `POST /__admin/mappings/import` with an `X-Mockifyr-Tenant` header.

## Durable datastores

```bash
docker compose -f docker-compose.postgres.yml up    # PostgreSQL
docker compose -f docker-compose.redis.yml up       # Redis
```

Both add a `--change-feed` so several instances stay coherent. See [persistence](/persistence/) for
every provider, and for Git sync.

## Run without Docker

Requires the .NET 10 SDK:

```bash
dotnet run --project src/Mockifyr.Server -- --port 8080 --root-dir .
```

## Configuring it

There is no configuration file — every setting is a command-line flag, and **every flag is also
readable as an environment variable of the same name**, which is why `-e admin-user=alice` works on
`docker run`. The full list is in the [CLI reference](/cli/).

## Next steps

- [Take the dashboard tour](/the-dashboard/) — what each page does.
- [Write stubs](/writing-stubs/) — [matching](/request-matching/) and [responses](/responses/).
- [Secure the admin API](/securing-the-admin-api/) with a username and password.
- [Migrate from WireMock](/migrating-from-wiremock/), then skim
  [known limitations](/limitations/) — it is the page most likely to save you an afternoon.
