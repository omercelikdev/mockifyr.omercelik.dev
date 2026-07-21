---
title: Request matching
description: Every request-level key and value matcher Mockifyr supports, and the cases where behaviour differs from expectation.
---

The `request` object of a stub describes which incoming requests it claims. All conditions in a
`request` object must hold — there is no implicit `or` between keys. See [writing stubs](/writing-stubs/)
for the overall stub shape.

```json
{
  "request": {
    "method": "POST",
    "urlPath": "/api/orders",
    "headers": { "X-Api-Key": { "equalTo": "abc" } },
    "queryParameters": { "region": { "matches": "eu-.*" } },
    "bodyPatterns": [ { "matchesJsonPath": "$.items[0].sku" } ]
  },
  "response": { "status": 201 }
}
```

## Request-level keys

| Key | Type | Notes |
|-----|------|-------|
| `url` | string | Exact match on path plus query string |
| `urlPattern` | regex | Path plus query string |
| `urlPath` | string | Exact match on path only |
| `urlPathPattern` | regex | Path only |
| `urlPathTemplate` | string | Named path variables, e.g. `/orders/{id}` |
| `method` | string | Defaults to `ANY` |
| `scheme` | string | `http` or `https` |
| `host` | value matcher | A full matcher object, not a bare string |
| `port` | integer | |
| `headers` | map of matchers | Key is the header name |
| `queryParameters` | map of matchers | |
| `formParameters` | map of matchers | Form-encoded bodies |
| `cookies` | map of matchers | |
| `bodyPatterns` | array of matchers | All entries must match |
| `multipartPatterns` | array | See below |
| `basicAuthCredentials` | `{username, password}` | |
| `customMatcher` | `{name, parameters}` | See below |

`basicAuthCredentials` is desugared internally into an `Authorization` header matcher, so it composes
with anything else you match on headers.

`urlPathTemplate` is what makes named path variables available to templates —
`{{request.path.id}}` only resolves when the stub matched via a template. See
[template helpers](/template-helpers/).

## Value matchers

These work on header, query parameter, cookie, form parameter and body targets unless noted.

| Matcher | Shape | Notes |
|---------|-------|-------|
| `equalTo` | string | Optional sibling `caseInsensitive: true` |
| `contains` | string | |
| `doesNotContain` | string | |
| `matches` | regex | Anchored: the pattern must match the whole value |
| `doesNotMatch` | regex | |
| `absent` | `true` | |
| `and` | array of matchers | |
| `or` | array of matchers | |
| `not` | single matcher object | |
| `hasExactly` | array of matchers | Multi-value fields |
| `includes` | array of matchers | Multi-value fields |
| `equalToJson` | JSON | Options `ignoreArrayOrder`, `ignoreExtraElements` |
| `matchesJsonPath` | string, or `{expression, <sub-matcher>}` | |
| `matchesJsonSchema` | schema | Option `schemaVersion` |
| `equalToXml` | XML string | Placeholder options below |
| `matchesXPath` | string, or `{expression, xPathNamespaces, <sub-matcher>}` | |
| `before` | date/time | |
| `after` | date/time | |
| `equalToDateTime` | date/time | Option `actualFormat` |
| `binaryEqualTo` | base64 | Body only; exact bytes |

`matchesJsonSchema` accepts `schemaVersion` of `V6`, `V7`, `V201909` or `V202012`.

`equalToXml` accepts `enablePlaceholders`, `placeholderOpeningDelimiterRegex`,
`placeholderClosingDelimiterRegex` and `exemptedComparisons`.

:::caution
`equalToIgnoreCase` is **not** a valid key. Case-insensitive equality is expressed as a flag on
`equalTo`:

```json
{ "equalTo": "application/json", "caseInsensitive": true }
```
:::

:::caution
An empty request body is treated as **absent** for body matching. `{"equalTo": ""}` in
`bodyPatterns` therefore does not match a request with an empty body. Match on the absence of the
body-carrying condition instead of trying to equal the empty string.
:::

:::note
Multi-value matching with `hasExactly` and `includes` is verified against query parameters only.
Repeated request headers are folded by the differential test harness, so header multi-value
behaviour is not claimed here.
:::

`matchesJsonSchema` does not support WireMock's `V4` (Draft 4) — the underlying schema library has no
Draft 4 implementation.

## Multipart bodies

`multipartPatterns` is an array of part patterns. Each entry carries its own `bodyPatterns`, and the
array as a whole is governed by `matchingType`, which is `ANY` or `ALL` and defaults to `ANY`.

```json
"multipartPatterns": [
  {
    "matchingType": "ALL",
    "bodyPatterns": [ { "contains": "invoice" } ]
  }
]
```

:::note
A `name` field on a multipart pattern is a documented no-op. WireMock ignores it too, so stubs
carrying one are accepted unchanged but the field has no effect on matching.
:::

## Stub-level keys

These sit next to `request` and `response`, not inside them.

| Key | Notes |
|-----|-------|
| `id` / `uuid` | Stub identifier |
| `metadata` | Arbitrary JSON, carried through untouched |
| `priority` | Defaults to 5; the **lowest** number wins |
| `scenarioName` | See [scenarios](/scenarios/) |
| `requiredScenarioState` | |
| `newScenarioState` | |

:::caution
Tie-breaking between stubs of **equal** priority is load-path dependent and not guaranteed. When a
mapping file is imported, the earlier element wins; when stubs are POSTed individually to the admin
API, the most recently added wins. If the outcome matters, give the competing stubs explicit,
distinct priorities rather than relying on insertion order.
:::

## Custom matchers

The one built-in custom matcher is the GraphQL body matcher:

```json
"customMatcher": {
  "name": "graphql-body-matcher",
  "parameters": {
    "query": "query GetUser($id: ID!) { user(id: $id) { name } }",
    "variables": { "id": "42" },
    "operationName": "GetUser"
  }
}
```

See [GraphQL](/graphql/) for the details of how the query, variables and operation name are compared.

Any other `name` resolves through the user matcher registry described in
[extending Mockifyr](/extending/).

:::caution
An unknown `customMatcher` name contributes **no** matcher at all — it is silently permissive rather
than a match failure. A typo in the name turns a deliberately narrow stub into a broad one without
any error surfacing. Verify that a custom matcher is registered before relying on it to exclude
traffic.
:::

## Matchers that are not supported

| Matcher | Why |
|---------|-----|
| `clientIp` | WireMock Cloud only; the open-source WireMock oracle rejects it with 422 |
| `equalToNumber`, `greaterThanNumber` and siblings | Standalone number matchers are WireMock Cloud only; the oracle rejects them with 422 |

Because the open-source oracle refuses these itself, there is no reference behaviour to differentially
test against. See [limitations](/limitations/) for the full list of deferred edges.
