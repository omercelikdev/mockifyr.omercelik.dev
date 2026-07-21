---
title: Templating
description: Map request values into responses with Handlebars helpers.
---

Add `"transformers": ["response-template"]` to a response and its body and headers become a Handlebars
template. Templates read the request and call helpers.

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

To template every response without touching each stub, start the host with
[`--global-response-templating`](/cli/).

:::note
[Webhook](/webhooks/) fields are templated **automatically** — no `transformers` entry is needed there,
and the request root is `originalRequest` rather than `request`.
:::

## The request model

`{{request.method}}`, `{{request.url}}`, `{{request.body}}`, `{{request.path.[0]}}` (or a named
`{{request.path.id}}` when the stub matched with `urlPathTemplate`), `{{request.query.page}}`,
`{{request.headers.[Content-Type]}}`, `{{request.cookies.session}}`.

The full model, including `request.parts` for multipart and `request.bodyAsBase64`, is in the
[template helper reference](/template-helpers/).

## Common helpers

| Task | Example |
|------|---------|
| Extract JSON | `{{jsonPath request.body '$.user.id'}}` |
| Extract XML | `{{xPath request.body '/order/id/text()'}}` |
| Parse into a variable | `{{#parseJson 'o' request.body}}{{o.total}}{{/parseJson}}` |
| Now, formatted or offset | `{{now format='yyyy-MM-dd'}}` · `{{now offset='3 days'}}` |
| Random and UUID | `{{randomValue type='UUID'}}` · `{{randomInt lower=1 upper=100}}` |
| Fake data | `{{random 'Name.fullName'}}` |
| String | `{{upper x}}` · `{{substring x 0 4}}` |
| Encoding and JWT | `{{base64 x}}` · `{{jwt alg='HS256' …}}` |
| Conditionals and loops | `{{#if x}}…{{/if}}` · `{{#each items}}{{this}}{{/each}}` |

Every registered helper is listed in the [template helper reference](/template-helpers/).

:::caution
Arithmetic is the single `math` helper, and it supports only `+ - * /`. There is **no** `add`,
`subtract`, `multiply`, `divide`, `round` or `abs` helper, and no `soapXPath`. The dashboard's in-app
helper popup currently lists a few of these in error — the engine is the authority, and the
[helper reference](/template-helpers/) tracks it.
:::

:::note
Helper arguments use **single quotes** — `'$.field'`. Mockifyr serialises a templated `jsonBody`
verbatim, the same way WireMock does, so single-quoted arguments resolve correctly.
:::

## Related

- [Template helper reference](/template-helpers/) — every helper, and the ones that do not exist
- [Responses](/responses/) — what else a response can carry
- [Environments](/environments/) — `{{key}}` values resolved before templating runs
