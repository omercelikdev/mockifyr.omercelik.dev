---
title: The dashboard
description: A browser UI for stubs, journal, scenarios, recordings, environments and settings, served at /__mockifyr.
---

Mockifyr ships a browser dashboard at `/__mockifyr`, on the **same port as the mock surface**. In the
Docker image it is on by default; a self-hosted run turns it on with `--dashboard <dir>`.

```bash
docker run -p 8080:8080 ghcr.io/omercelikdev/mockifyr
# → http://localhost:8080/__mockifyr
```

The dashboard talks only to the admin REST API. Everything it does can also be done with
[the admin API](/admin-api/) — there is no hidden capability behind the UI, and no server state that
only the browser can reach.

## Chrome

| Element | Behaviour |
|---------|-----------|
| Sidebar | Collapsible, with a tenant switcher — see [multi-tenancy](/multi-tenancy/) |
| Command palette | ⌘K |
| Theme | Light and dark |
| Language | English, Turkish, French, Arabic (RTL), Chinese, Japanese |

## Pages

### Dashboard (`/`)

KPI cards, recent journal entries, top unmatched paths, stub distribution by method, and
health/persistence.

:::note
When no host answers, the dashboard falls back to **sample data** and shows a "sample" badge. The UI is
explorable before anything is running — a badge means you are not looking at real traffic.
:::

### Stubs (`/stubs`)

A grouped stub tree alongside a tabbed editor. Tabs are persisted per tenant, and the tab context menu
offers pin, close others and close to the right. The editor has both a **form mode** and a **raw JSON
mode**, and supports create, edit, delete and import. See [writing stubs](/writing-stubs/).

### Journal (`/journal`)

Every served request with its method, URL, status and matched-versus-unmatched result. An
All/Unmatched toggle, a filter, pagination and a 5-second auto-refresh sit above the list; opening an
entry gives a detail view with **Request**, **Response** and **Callback** tabs. The Callback tab shows
[webhook](/webhooks/) deliveries.

### Scenarios (`/scenarios`)

A card grid of stateful stub groups. State chips are clickable — clicking one moves the scenario to
that state — and **Reset all** returns every scenario to its start state. See
[scenarios](/scenarios/).

### Recordings (`/recordings`)

A target base URL and **Start**, live session status, then **Snapshot** and **Stop**. Captured stubs are
listed with their raw JSON. See [record and playback](/record-and-playback/).

### Environments (`/environments`)

Tenant-scoped keys, each holding several named values, with a switch for which value is active. See
[environments](/environments/).

### Extensions (`/extensions`)

A static, searchable reference of the built-in capabilities: templating, matchers, protocols and
extension seams. It is a reference, not an editor — nothing here changes server state. See
[extending Mockifyr](/extending/).

### Settings (`/settings`)

| Section | Contents |
|---------|----------|
| Status | Read from the health endpoint |
| Persistence | The active provider is highlighted — see [persistence](/persistence/) |
| Git sync | Status, configure, credentials, push and pull |
| Outbound certificate trust | Add and remove hosts; read-only when pinned by a flag |
| Transport | Read-only capability list: HTTPS/TLS, HTTP/2 ALPN, mTLS, multi-domain, gRPC/GraphQL/WebSocket |
| Appearance | Theme and language |

## Authentication

There is no per-user identity in Mockifyr. When the host runs with `--admin-user` and `--admin-pass`,
the dashboard shows its own login screen and stores the credentials locally.

:::note
Mockifyr deliberately omits the `WWW-Authenticate` header, so the browser's native Basic-auth popup
never blocks the dashboard. See [securing the admin API](/securing-the-admin-api/).
:::

:::caution
The in-app templating-helper popup currently lists a few helpers the engine does **not** implement.
[The template helper reference](/template-helpers/) on this site is the authority — check there before
relying on a helper the popup suggests.
:::

## Related

- [Admin API](/admin-api/) — the surface the dashboard is built on.
- [Getting started](/getting-started/) — run it and create your first stub.
- [Known limitations](/limitations/) — what is deliberately not implemented.
