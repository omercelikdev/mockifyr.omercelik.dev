---
title: Environments
description: Tenant-scoped configuration keys that stubs reference as {{key}} and Mockifyr resolves at serve time.
---

An environment key is a named value a stub can reference instead of hard-coding it. A tenant owns a set
of keys; each key holds several **named values**, one of which is **active**. Switching the active value
changes every stub that references the key, without editing a single stub.

```json
{
  "request": { "method": "GET", "url": "/config" },
  "response": {
    "status": 200,
    "body": "{\"api\":\"{{baseUrl}}\"}"
  }
}
```

The reference is stored **verbatim** — the stub on disk still says `{{baseUrl}}` — and is resolved when
the request is served.

## Where resolution applies

| Surface | Resolved |
|---------|----------|
| Response body | Yes |
| Response headers | Yes |
| [Proxy](/proxying/) target | Yes |
| [Webhook](/webhooks/) URL, body and headers | Yes |

Environments are **tenant-scoped**: each tenant has its own keys and its own active values. See
[multi-tenancy](/multi-tenancy/).

## When it runs

Resolution happens **before** Handlebars and **before** the transformer guard.

:::tip
That ordering is the point: `{{baseUrl}}` works on a stub that has **no** `response-template`
transformer. You do not have to opt a stub into [templating](/templating/) to use a configuration key.
:::

## Substitution semantics

These rules are narrow on purpose — the goal is that a stub which does not use environments comes
through untouched.

- **Only bare identifiers that resolve to a defined key are replaced.** Everything else passes through
  byte-identical, so Handlebars expressions such as `{{jsonPath request.body '$.id'}}` are left alone
  and evaluated later by the template engine as normal.
- **Substituted values are not rescanned.** There is no chaining and no recursion: if a key's value
  itself contains `{{other}}`, that text stays literal.
- **Lookup is case-sensitive.** `{{baseUrl}}` and `{{baseurl}}` are different references.
- **An undefined reference survives as literal text.** `{{typo}}` comes back in the response as the
  characters `{{typo}}`, not as an empty string.

:::note
Leaving an undefined reference visible is deliberate. An empty string would look like a legitimate
value and a misspelt key would fail silently in a downstream assertion; the literal `{{typo}}` in the
response body points straight at the mistake.
:::

## Reserved key names

A key named after a built-in template helper is refused:

```json
{ "error": "Environment.ReservedKey" }
```

…with HTTP **400**.

:::caution
The reserved list is a deliberate **superset** of the actual helper list, so a few names are refused
even though no helper by that name exists. If a key name is rejected and you cannot find a matching
helper in the [template helper reference](/template-helpers/), that is why — pick another name.
:::

## Admin endpoints

| Method | Route | Body |
|--------|-------|------|
| `GET` | `/__admin/environments` | — |
| `PUT` | `/__admin/environments/{key}` | `{activeValue, values:[{name,value}]}` |
| `PUT` | `/__admin/environments/{key}/active` | `{"activeValue":"…"}` |
| `DELETE` | `/__admin/environments/{key}` | — |
| `POST` | `/__admin/environments/reset` | — |

`GET` returns every key with its values and the value currently in effect:

```json
{
  "environments": [
    {
      "key": "baseUrl",
      "activeValue": "staging",
      "resolved": "https://staging.example.com",
      "values": [
        { "name": "staging", "value": "https://staging.example.com" },
        { "name": "prod", "value": "https://api.example.com" }
      ]
    }
  ]
}
```

Define a key and its values:

```bash
curl -X PUT http://localhost:8080/__admin/environments/baseUrl \
  -H 'X-Mockifyr-Tenant: team-payments' \
  -d '{"activeValue":"staging","values":[
        {"name":"staging","value":"https://staging.example.com"},
        {"name":"prod","value":"https://api.example.com"}]}'
```

Switch which one is live:

```bash
curl -X PUT http://localhost:8080/__admin/environments/baseUrl/active \
  -d '{"activeValue":"prod"}'
```

### Errors

| Code | HTTP |
|------|------|
| `Environment.InvalidBody` | 400 |
| `Environment.ReservedKey` | 400 |
| `Environment.UnknownKey` | 404 |

## In the dashboard

The **Environments** page lists the current tenant's keys, their named values, and which value is
active, and lets you switch the active value.

## Limitations

- **Values are plaintext.** There is no secret type — a value is readable through `GET
  /__admin/environments` and visible in the dashboard. Do not put credentials in a key and expect them
  to be hidden.
- **The change feed does not cover environments.** On a multi-instance host with
  [`--change-feed`](/persistence/), stub changes propagate but environment key changes do not; other
  instances pick them up only after a restart.
- **There is no import/export of environments alongside a mappings bundle.** Exporting stubs does not
  carry the keys they reference, so a target host needs its keys defined separately.

## Related

- [Multi-tenancy](/multi-tenancy/) — the scope environments live in.
- [Persistence](/persistence/) — where environment values are stored.
- [Templating](/templating/) — what runs after resolution.
