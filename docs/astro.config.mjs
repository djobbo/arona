// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  integrations: [
      starlight({
          title: 'Arona Documentation',
          social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/djobbo/reaccord' }],
          sidebar: [
              {
                  label: 'Guides',
                  items: [
                      { label: 'Getting Started', slug: 'guides/getting-started' },
                  ],
              },
              {
                  label: 'Reference',
                  autogenerate: { directory: 'reference' },
              },
          ],
          customCss: [
            './src/styles/global.css',
          ],
      }),
	],

  vite: {
    plugins: [tailwindcss()],
  },
});