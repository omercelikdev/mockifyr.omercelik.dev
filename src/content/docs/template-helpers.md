---
title: Template helpers
description: The complete list of registered Handlebars helpers, the request model they read from, and the helpers that do not exist.
---

This is the reference list. For the concept and a worked example, start with
[templating](/templating/).

## Activation

| Scope | How |
|-------|-----|
| One stub | `"transformers": ["response-template"]` on the response |
| Whole host | Start the server with `--global-response-templating` |
| Webhooks | Automatic — [webhook](/webhooks/) fields are templated with no transformer needed |

:::note
Helper arguments use **single quotes**: `{{jsonPath request.body '$.user.id'}}`. Double quotes inside
a JSON stub would terminate the surrounding string.
:::

## The request model

These are data paths, not helpers — read them directly.

| Path | Value |
|------|-------|
| `request.method` | HTTP method |
| `request.url` | Full URL including query string |
| `request.path` | Path; `request.path.[n]` for a segment; `request.path.<name>` when the stub used `urlPathTemplate` |
| `request.pathSegments.[n]` | Path segment by index |
| `request.query.<name>` | Query parameter |
| `request.headers.<Name>` | Request header |
| `request.cookies.<name>` | Cookie |
| `request.body` | Raw body |
| `request.bodyAsBase64` | Body, base64-encoded |
| `request.host` | |
| `request.port` | |
| `request.scheme` | |
| `request.baseUrl` | |
| `request.parts.<name>` | Multipart part; has `.body`, `.name`, `.headers.<H>` |

Named path variables such as `request.path.id` only resolve if the stub matched through
`urlPathTemplate`. See [request matching](/request-matching/).

The root object differs by context:

| Context | Root |
|---------|------|
| Response templating | `request` |
| [Webhook](/webhooks/) | `originalRequest` |
| [WebSocket](/websocket/) message mapping | `message.body` |

## Data helpers

| Helper | Purpose |
|--------|---------|
| `jsonPath` | Extract a value from JSON with a JSONPath expression |
| `xPath` | Extract a value from XML with an XPath expression |
| `regexExtract` | Extract a capture from a string with a regex |
| `formData` | Read a form-encoded body into named fields |
| `parseJson` | Parse a JSON string; available in inline and block form |
| `assign` | Bind a value to a name; block form |

## Date helpers

| Helper | Purpose |
|--------|---------|
| `parseDate` | Parse a string into an instant |
| `date` | Format an instant |
| `now` | Current time; accepts `offset=` and a format pattern |
| `truncateDate` | Truncate an instant to a unit |

:::note
On `date`, a `timezone=` argument is deliberately ignored when the input is an already-parsed instant.
This matches WireMock, so the two produce identical output; it is not an oversight.
:::

## Random helpers

| Helper | Purpose |
|--------|---------|
| `randomValue` | Random value of a given `type=`, e.g. `UUID` |
| `pickRandom` | Pick one element at random |
| `randomInt` | Random integer |
| `randomDecimal` | Random decimal |

## JSON helpers

| Helper | Purpose |
|--------|---------|
| `jsonArrayAdd` | Append to a JSON array |
| `jsonMerge` | Merge two JSON objects |
| `jsonRemove` | Remove a node from JSON |
| `toJson` | Serialize a value to JSON |

## Format, math, string and array helpers

| Helper | Purpose |
|--------|---------|
| `math` | Arithmetic; supports `+ - * /` only |
| `numberFormat` | Format a number |
| `size` | Length of a string or collection |
| `join` | Join a collection with a separator |
| `substring` | Substring by index |
| `replace` | Replace occurrences in a string |
| `upper` | Uppercase |
| `lower` | Lowercase |
| `capitalize` | Capitalize |
| `trim` | Strip surrounding whitespace |
| `base64` | Base64-encode |
| `urlEncode` | URL-encode |
| `formatJson` | Pretty-print JSON |
| `formatXml` | Pretty-print XML |
| `isOdd` | Odd-number test |
| `isEven` | Even-number test |
| `range` | Produce a numeric range |
| `array` | Build an array from arguments |
| `lookup` | Read a value out of a collection by key or index |
| `arrayAdd` | Append to an array |

## System helpers

| Helper | Purpose |
|--------|---------|
| `systemValue` | Read a system/environment value |
| `hostname` | Host name of the running server |

:::caution
`systemValue` is **deny-by-default**. Every key renders `[ERROR: Access to <key> is denied]`, and there
is no allowlist mechanism to open specific keys. Do not build stubs that depend on it. For values you
control, use [environments](/environments/) instead.
:::

## Fake data

One helper, `random`, taking a Datafaker-style expression string:

```handlebars
{{random 'Name.fullName'}}
```

| Class | Methods |
|-------|---------|
| `Name` | `firstName`, `lastName`, `fullName`, `name`, `username`, `prefix` |
| `Internet` | `emailAddress`, `url`, `uuid`, `domainName`, `ipV4Address`, `macAddress` |
| `Address` | `city`, `country`, `countryCode`, `zipCode`, `state`, `stateAbbr`, `streetAddress`, `streetName`, `buildingNumber`, `secondaryAddress`, `fullAddress`, `latitude`, `longitude` |
| `Number` | `digit` |
| `Company` | `name` |
| `Commerce` | `productName` |
| `Lorem` | `word`, `sentence` |
| `PhoneNumber` | `phoneNumber`, `cellPhone` |

An unrecognised expression renders the literal text `[ERROR: Unable to evaluate the expression <expr>]`
into the response rather than failing the request.

Argument-taking faker expressions such as `Number.numberBetween` are not supported. Locale selection
is not supported either.

:::note
`{{random 'Internet.url'}}` returns a scheme-less host such as `www.foo.co`, matching Datafaker. This
changed in v0.8.0 — stubs written against an earlier version that expected a leading `https://` need
updating.
:::

## JWT helpers

| Helper | Purpose |
|--------|---------|
| `jwt` | Produce a signed JWT |
| `jwks` | Produce a JWKS document |

:::caution
`jwt` supports HS256 and RS256. A configurable signing secret, the `nbf` claim, and array or object
claim values are not supported.
:::

## Handlebars built-ins

`{{#if}}`, `{{#each}}`, `{{#unless}}` and `{{#with}}` are available as normal.

## Helpers that do not exist

Several helper names appear in third-party references and even in the dashboard's helper popup, but
are not registered in the engine. The engine is the authority.

| Name | Use instead |
|------|-------------|
| `add` | `math` |
| `subtract` | `math` |
| `multiply` | `math` |
| `divide` | `math` |
| `round` | — |
| `abs` | — |
| `soapXPath` | `xPath` |

:::caution
All arithmetic goes through the single `math` helper, which supports `+ - * /` and nothing else. There
is no rounding or absolute-value helper.
:::

:::note
The in-app dashboard's helper popup currently lists some of these names in error. If the popup and this
page disagree, this page is correct.
:::
