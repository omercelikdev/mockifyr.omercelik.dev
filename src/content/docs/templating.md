---
title: Templating
description: Map request values into responses with Handlebars helpers.
---

Add `"transformers": ["response-template"]` to a response and its body/headers become a Handlebars
template. Templates can read the request and call helpers.

```json
"response": {
  "status": 200,
  "transformers": ["response-template"],
  "jsonBody": {
    "echo": "{{jsonPath request.body '$.name'}}",
    "when": "{{now format='yyyy-MM-dd HH:mm:ss'}}",
    "id":   "{{randomValue type='UUID'}}"
  }
}
```

:::tip
The dashboard has a searchable **Templating helpers** popup — open it from the editor's Response section
or with `⌘K → Templating helpers`.
:::

## The request model

`{{request.method}}`, `{{request.url}}`, `{{request.body}}`, `{{request.path.[0]}}` (or a named
`{{request.path.id}}`), `{{request.query.page}}`, `{{request.headers.[Content-Type]}}`,
`{{request.cookies.session}}`.

## Common helpers

| Helper | Example |
|--------|---------|
| Extract JSON | `{{jsonPath request.body '$.user.id'}}` |
| Extract XML | `{{xPath request.body '/order/id/text()'}}` |
| Parse into a var | `{{#parseJson 'o' request.body}}{{o.total}}{{/parseJson}}` |
| Now / formatted / offset | `{{now format='yyyy-MM-dd'}}` · `{{now offset='3 days'}}` |
| Random / UUID / Faker | `{{randomValue type='UUID'}}` · `{{randomInt lower=1 upper=100}}` · `{{random 'Name.fullName'}}` |
| String / number | `{{upper x}}` · `{{substring x 0 4}}` · `{{add a b}}` |
| Encoding / JWT | `{{base64 x}}` · `{{jwt alg='HS256' …}}` |
| Conditionals / loops | `{{#if x}}…{{/if}}` · `{{#each items}}{{this}}{{/each}}` |

:::note
Helper arguments use **single quotes** — `'$.field'`. Mockifyr serializes a templated `jsonBody`
verbatim (like WireMock/Jackson), so single-quoted arguments resolve correctly.
:::
