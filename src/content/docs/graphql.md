---
title: GraphQL
description: Match GraphQL operations with the built-in graphql-body-matcher custom matcher.
---

GraphQL is **not a separate transport** in Mockifyr. A GraphQL stub is an ordinary `POST /graphql`
mapping whose request pattern uses the built-in `graphql-body-matcher` custom matcher. Everything else —
templating, scenarios, delays, tenants — is unchanged.

```json
{
  "request": {
    "method": "POST",
    "urlPath": "/graphql",
    "customMatcher": {
      "name": "graphql-body-matcher",
      "parameters": {
        "query": "query GetOrder($id: ID!) { order(id: $id) { id state } }",
        "variables": { "id": "A-1" },
        "operationName": "GetOrder"
      }
    }
  },
  "response": {
    "status": 200,
    "jsonBody": { "data": { "order": { "id": "A-1", "state": "SHIPPED" } } }
  }
}
```

## Parameters

| Parameter | Type | Required |
|-----------|------|----------|
| `query` | string — the GraphQL document | Yes |
| `variables` | JSON object | No |
| `operationName` | string | No |

## Query normalization

The `query` is not compared as text. Both the stub's query and the incoming request's query are parsed,
their selections, arguments and directives are **sorted**, and each is printed canonically before
comparison.

That means whitespace, indentation, and the **order** of fields, arguments and directives are all
irrelevant to matching. These two match each other:

```graphql
query { order(id: "A-1") { state id } }
```

```graphql
query {
  order(id: "A-1") {
    id
    state
  }
}
```

:::note
A **syntax error on either side** means no match. An unparseable stub query never matches anything, and
an unparseable request body never matches a GraphQL stub — there is no fallback to raw text comparison.
:::

## Omitted means absent, not "any"

This is the semantic that catches people out, so it is worth stating flatly:

:::caution
An **unspecified `variables` or `operationName` means the request must not carry one.** It does not mean
"match any value".

A stub that specifies only `query` will **not** match a request that sends `variables` or an
`operationName`. Since most GraphQL clients send `variables` (often `{}`) and a named operation, a
query-only stub frequently fails to match real client traffic.
:::

If your client sends variables, declare them in the stub:

```json
"parameters": {
  "query": "query GetOrder($id: ID!) { order(id: $id) { id state } }",
  "variables": { "id": "A-1" }
}
```

## Templating the response

Response templating uses the standard `response-template` transformer, with one thing to know:
`request.body` is the **original GraphQL POST body** — the full JSON envelope with `query`, `variables`
and `operationName` — not the parsed document.

```json
{
  "request": {
    "method": "POST",
    "urlPath": "/graphql",
    "customMatcher": {
      "name": "graphql-body-matcher",
      "parameters": {
        "query": "query GetOrder($id: ID!) { order(id: $id) { id state } }",
        "variables": { "id": "A-1" }
      }
    }
  },
  "response": {
    "status": 200,
    "transformers": ["response-template"],
    "jsonBody": {
      "data": {
        "order": {
          "id": "{{jsonPath request.body '$.variables.id'}}",
          "state": "SHIPPED"
        }
      }
    }
  }
}
```

Read variables with `$.variables.…`, the operation name with `$.operationName`, and the raw document
with `$.query`. See [templating](/templating/) and the
[template helper reference](/template-helpers/).

## Related

- [Request matching](/request-matching/) — the matchers `customMatcher` sits alongside.
- [Extending Mockifyr](/extending/) — registering your own custom matchers.
- [Templating](/templating/)
