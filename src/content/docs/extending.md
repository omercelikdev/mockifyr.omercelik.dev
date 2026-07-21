---
title: Extending Mockifyr
description: Custom matchers, template helpers, transformers, listeners and admin endpoints.
---

Mockifyr is a library as well as a server. When a stub cannot express what you need, you register your
own code against one of the extension seams.

## Registration

Everything is wired through `AddMockifyr(cfg => …)`, whose argument is a `MockifyrExtensions` builder.

```csharp
builder.Services.AddMockifyr(cfg => cfg
    .AddMatcher("tenant-quota", new TenantQuotaMatcher())
    .AddTemplateHelper("shout", args => args[0]?.ToString()?.ToUpperInvariant() ?? "")
    .AddServeEventListener(new AuditListener())
    .AddResponseTransformer(new SignatureTransformer())
    .AddAdminApiExtension(new QuotaAdminApi()));
```

| Builder method | Registers |
|----------------|-----------|
| `AddMatcher(name, matcher)` | A named custom request matcher |
| `AddServeEventListener(listener)` | A listener fired after a request is served |
| `AddTemplateHelper(name, render)` | A Handlebars helper usable as `{{name …}}` |
| `AddAdminApiExtension(extension)` | Custom endpoints under `/__admin/ext/…` |
| `AddResponseTransformer(transformer)` | A transformer applied to the rendered response |

## Why the seams look like this

The core engine has **zero external dependencies**, does no I/O, and never references a transport. Delay,
fault and proxy are not things the engine performs — they are *directives* the engine emits and the
facade carries out, and every outbound call leaves through `IServeEventListener`.

That is the reason the seams split the way they do: a matcher or a transformer is a pure function of its
input, while anything that talks to the network is a listener. If your extension needs to make an HTTP
call, it belongs on the listener seam, not inside a matcher.

## Custom matchers

A matcher registered with `AddMatcher` is reached from stub JSON by name:

```json
{
  "request": {
    "method": "GET",
    "urlPath": "/reports",
    "customMatcher": { "name": "tenant-quota", "parameters": { "max": 100 } }
  },
  "response": { "status": 429 }
}
```

The built-in [`graphql-body-matcher`](/graphql/) is registered the same way, and is a working example of
the shape.

:::caution
An **unknown `customMatcher` name contributes no matcher at all** — it is silently permissive rather
than an error. A typo in the name does not fail the stub; it *widens* it, because the request pattern
loses a constraint it appeared to have. A stub that suddenly matches far more traffic than expected is
the symptom to look for.
:::

## Admin API extensions

`IAdminApiExtension` exposes a `RoutePrefix`. Requests to `/__admin/ext/{prefix}/…` are routed to the
extension whose prefix equals the **first path segment** under `/__admin/ext/`. An unknown prefix is a
**404**.

```bash
curl http://localhost:8080/__admin/ext/quota/status
```

These routes are host-level, not tenant-scoped — see [multi-tenancy](/multi-tenancy/).

## The public seams

All declared in `Mockifyr.Core`.

| Interface | Purpose |
|-----------|---------|
| `IResponseTransformer` | Transform a rendered response |
| `IResponseDefinitionTransformer` | Transform a response *definition* before rendering |
| `ITemplateHelper` | A named template helper |
| `ITemplateHelperProvider` | Supplies a set of helpers |
| `ITemplateModelProvider` | Adds data to the template model |
| `IMatcherRegistry` | Register and resolve named matchers |
| `IAdminApiExtension` | Custom `/__admin/ext/…` endpoints |
| `IMappingsLoader` | Load stub mappings from a custom source |
| `IStubPersistence` | Persist stubs to a custom backing store |
| `IEnvironmentPersistence` | Persist [environment](/environments/) keys |

### Not wired yet

Present in the public surface but **not currently invoked**. Implementing them has no effect, so do not
build against them:

- `IResponseDefinitionTransformer`
- `ITemplateModelProvider`
- `IRequestFilter`
- Template-helper **hash arguments** (`{{helper key=value}}`) and helper **providers**
  (`ITemplateHelperProvider`) — a helper registered through `AddTemplateHelper` receives positional
  arguments only.

### Registered through DI, not the builder

There is no builder method for `IMappingsLoader` or `IStubPersistence`. Register those as ordinary
dependency-injection services; the host resolves them from the container.

## In the dashboard

The dashboard has an **Extensions** page. It is a static, searchable reference of the built-in
capabilities — matchers, helpers, transformers — not an editor. Extensions are registered in code at
startup; nothing on that page changes what the host has loaded.

## Related

- [Request matching](/request-matching/) — what `customMatcher` sits alongside.
- [Template helper reference](/template-helpers/) — the built-in helper set.
- [Webhooks](/webhooks/) — the shipped `IServeEventListener`.
- [Persistence](/persistence/) — the built-in stub persistence providers.
