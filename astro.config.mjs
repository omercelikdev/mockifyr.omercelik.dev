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
      logo: { src: './src/assets/logo.svg', replacesTitle: false },
      social: {
        github: 'https://github.com/omercelikdev/mockifyr',
      },
      customCss: ['./src/styles/mockifyr.css'],
      // Reproduce the dashboard's near-black accent for chrome; docs use --violet as the lively accent.
      sidebar: [
        {
          label: 'Start here',
          items: [
            { label: 'Getting started', slug: 'getting-started' },
            { label: 'Securing the admin API', slug: 'securing-the-admin-api' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'Writing stubs', slug: 'writing-stubs' },
            { label: 'Templating', slug: 'templating' },
            { label: 'Migrating from WireMock', slug: 'migrating-from-wiremock' },
          ],
        },
      ],
    }),
  ],
})
