---
title: HTTPS and mTLS
description: Serve stubs over TLS, require a client certificate, and control which certificates Mockifyr trusts on outbound calls.
---

Mockifyr can serve on a TLS listener alongside the plaintext one, require a client certificate on it,
and — separately — decide which server certificates it accepts when it makes calls of its own.

## Enabling TLS

```bash
dotnet run --project src/Mockifyr.Server -- --port 8080 --https-port 8443
```

`--https-port <n>` adds the TLS listener. With it enabled, **both** listeners negotiate HTTP/1.1 and
HTTP/2.

## Server certificate

| Flag | Purpose |
|------|---------|
| `--https-keystore <path>` | PFX / PKCS#12 file holding the server certificate |
| `--https-keystore-password <p>` | Password for that file |

```bash
dotnet run --project src/Mockifyr.Server -- \
  --https-port 8443 --https-keystore ./server.pfx --https-keystore-password 'changeit'
```

With no keystore, Mockifyr generates an **ephemeral self-signed RSA-2048 certificate** at startup, for
`localhost` plus loopback SANs.

:::note
The generated certificate is regenerated on every start and is not trusted by anything. It is meant for
local development, where your client is already configured to skip verification. For anything a real
client validates, supply a keystore.
:::

## Requiring a client certificate (mTLS)

```bash
dotnet run --project src/Mockifyr.Server -- \
  --https-port 8443 --https-require-client-auth \
  --https-truststore ./ca.pfx --https-truststore-password 'changeit'
```

| Flag | Purpose |
|------|---------|
| `--https-require-client-auth` | Demand a client certificate |
| `--https-truststore <path>` | CA anchor the client certificate must chain to |
| `--https-truststore-password <p>` | Password for that file |

`--https-require-client-auth` applies to the **HTTPS listener only**. The plaintext listener on
`--port` is unaffected and stays open.

:::caution
With `--https-require-client-auth` set and **no truststore**, any well-formed client certificate is
accepted — there is no chain to verify against, so the check proves only that the client presented
something. If you are using mTLS as an authentication mechanism rather than a connection-shape test,
always pair it with `--https-truststore`.
:::

## HTTP/2

HTTP/2 over TLS via **ALPN** is the supported and verified path. Plaintext h2c is left capable but is
not asserted — treat it as untested rather than guaranteed.

## Outbound certificate trust

The flags above govern connections **into** Mockifyr. Outbound trust governs the certificates Mockifyr
accepts when **it** makes a call — [proxying](/proxying/) to an upstream and firing
[webhooks](/webhooks/).

This is what you reach for when a proxy target or webhook endpoint uses a self-signed or internal-CA
certificate and the call fails on the TLS handshake.

### Flags

| Flag | Effect |
|------|--------|
| `--trust-proxy-target <host>` | Trust this host's certificate. Repeatable, and also accepts a comma- or semicolon-separated list |
| `--trust-all-proxy-targets` | Disable outbound certificate verification entirely |

:::caution
`--trust-proxy-target` is an **exact host match**. There is no wildcard and no suffix matching —
`api.internal` does not cover `v2.api.internal`. List each host.
:::

`--trust-all-proxy-targets` is **flag-only** and can never be set from the dashboard, because turning
off outbound verification for everything is not something a web UI should be able to do.

A host that relaxes outbound TLS prints a line at startup beginning `mockifyr: outbound TLS:` — so a
relaxed configuration is visible in the logs rather than silent.

### At runtime

Hosts can be added and removed from the dashboard's **Settings → Outbound certificate trust**. Changes
take effect on the next handshake, with no restart.

| Method | Route | Body |
|--------|-------|------|
| `GET` | `/__admin/outbound-trust` | — |
| `POST` | `/__admin/outbound-trust/hosts` | `{"host":"…"}` |
| `DELETE` | `/__admin/outbound-trust/hosts/{host}` | — |

```json
{ "hosts": ["api.internal"], "trustAll": false, "pinned": false, "persistent": true }
```

### Pinning

If any `--trust-*` flag is set, the configuration is **pinned**:

- The dashboard panel goes read-only.
- The API returns `Trust.FlagPinned` with HTTP **409**.
- Any stored `outbound-trust.json` is ignored entirely.

The intent is that a deployment which declares its trust in flags cannot have it edited out from under
it at runtime.

### Persistence

The runtime configuration is written to `<root-dir>/outbound-trust.json`. With no
[root dir](/persistence/) set, changes are in-memory only and the `GET` response reports
`"persistent": false`.

### Two things to know

:::caution
**Removing trust applies only to new connections.** Pooled connections are not torn down, so an
existing connection to a host you just untrusted keeps working until it is recycled.
:::

:::caution
**Trust is keyed on the address requested, not on the certificate presented.** Trusting a host means
"do not verify the certificate for calls to this address" — it does not pin a particular certificate,
and it does not detect that a different certificate came back.
:::

## Related

- [Securing the admin API](/securing-the-admin-api/) — TLS plus Basic auth on the admin surface.
- [Proxying](/proxying/) and [webhooks](/webhooks/) — the outbound calls trust settings apply to.
- [CLI reference](/cli/) — every flag on one page.
