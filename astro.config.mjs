import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'

// Landing (splash) + docs in one Starlight site, deployed to Cloudflare Pages.
// Set `site` to the final URL for correct canonical/OG links + sitemap.
export default defineConfig({
  site: 'https://mockifyr.omercelik.dev',
  integrations: [
    starlight({
      title: 'Mockifyr',
      description: 'An independent, .NET-based API mock engine + platform — a functional WireMock alternative.',
      // Two files rather than one using `currentColor`: Starlight renders the logo as an <img>, which
      // cannot inherit the page's colour, so the mark ships once per theme.
      logo: {
        light: './src/assets/logo-light.svg',
        dark: './src/assets/logo-dark.svg',
        replacesTitle: false,
      },
      social: {
        github: 'https://github.com/omercelikdev/mockifyr',
      },
      // Versioned so the mark replaces the old placeholder tile on the next visit. Browsers cache a
      // favicon far past a normal asset, and the file keeps its conventional path, so the query is
      // the only thing that tells them to refetch. Bump it if the icon changes again.
      favicon: '/favicon.svg?v=2',
      // Starlight emits og:title, og:description and twitter:card, but no image — which left every
      // shared link rendering as a card with an empty thumbnail, and `summary_large_image` promising
      // one that never arrived. Absolute URLs are required here: a scraper resolves these without a
      // document base.
      head: [
        { tag: 'meta', attrs: { property: 'og:image', content: 'https://mockifyr.omercelik.dev/og.png' } },
        { tag: 'meta', attrs: { property: 'og:image:width', content: '1200' } },
        { tag: 'meta', attrs: { property: 'og:image:height', content: '630' } },
        { tag: 'meta', attrs: { property: 'og:image:alt', content: 'Mockifyr — an independent .NET API mock engine and platform' } },
        { tag: 'meta', attrs: { name: 'twitter:image', content: 'https://mockifyr.omercelik.dev/og.png' } },
      ],
      customCss: ['./src/styles/mockifyr.css'],
      // Reproduce the dashboard's near-black accent for chrome; docs use --violet as the lively accent.
      sidebar: [
        {
          label: 'Start here',
          items: [
            { label: 'Getting started', slug: 'getting-started' },
            { label: 'The dashboard', slug: 'the-dashboard' },
            { label: 'Securing the admin API', slug: 'securing-the-admin-api' },
          ],
        },
        {
          label: 'Stubs',
          items: [
            { label: 'Writing stubs', slug: 'writing-stubs' },
            { label: 'Request matching', slug: 'request-matching' },
            { label: 'Responses', slug: 'responses' },
            { label: 'Templating', slug: 'templating' },
            { label: 'Template helper reference', slug: 'template-helpers' },
          ],
        },
        {
          label: 'Behaviour',
          items: [
            { label: 'Scenarios', slug: 'scenarios' },
            { label: 'Delays and faults', slug: 'delays-and-faults' },
            { label: 'Proxying', slug: 'proxying' },
            { label: 'Record and playback', slug: 'record-and-playback' },
            { label: 'Webhooks', slug: 'webhooks' },
          ],
        },
        {
          label: 'Platform',
          items: [
            { label: 'Multi-tenancy', slug: 'multi-tenancy' },
            { label: 'Environments', slug: 'environments' },
            { label: 'Persistence', slug: 'persistence' },
            { label: 'HTTPS, HTTP/2 and mTLS', slug: 'https-and-mtls' },
          ],
        },
        {
          label: 'Protocols',
          items: [
            { label: 'gRPC', slug: 'grpc' },
            { label: 'GraphQL', slug: 'graphql' },
            { label: 'WebSocket', slug: 'websocket' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'CLI and configuration', slug: 'cli' },
            { label: 'Admin API', slug: 'admin-api' },
            { label: 'Extending Mockifyr', slug: 'extending' },
            { label: 'Known limitations', slug: 'limitations' },
            { label: 'Migrating from WireMock', slug: 'migrating-from-wiremock' },
          ],
        },
      ],
    }),
  ],
})
