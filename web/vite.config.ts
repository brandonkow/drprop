import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import { pages, renderDocument } from './src/render/page.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const brandFile = (name: string) => fileURLToPath(new URL(`../brand/logo/${name}`, import.meta.url));

/** The inline header logo: sized by CSS, hidden from AT (the link carries the name). */
const inlineLogo = () =>
  readFileSync(brandFile('logo.svg'), 'utf8')
    .replace(/<title>.*?<\/title>\s*/s, '')
    .replace(/ width="[^"]*" height="[^"]*"/, '')
    .replace(/ role="img" aria-label="[^"]*"/, ' class="brand__logo" aria-hidden="true" focusable="false"')
    .trim();

/**
 * Each page is a near-empty HTML shell on disk (so Vite's dev server and build
 * both see it); this plugin replaces the shell with the rendered page for its
 * language. Dictionaries: src/i18n/*.json. No i18n framework.
 */
function drpropPages(): Plugin {
  const entryFor = (filename: string) => {
    const rel = relative(root, filename).split('\\').join('/');
    return pages.find((p) => p.file === rel);
  };
  return {
    name: 'drprop-pages',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const entry = entryFor(ctx.filename);
        return entry ? renderDocument(entry, inlineLogo()) : html;
      },
    },
    configureServer(server) {
      server.middlewares.use('/favicon.svg', (_req, res) => {
        res.setHeader('Content-Type', 'image/svg+xml');
        res.end(readFileSync(brandFile('favicon.svg')));
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'favicon.svg', source: readFileSync(brandFile('favicon.svg')) });
    },
  };
}

/** Preload the Latin display face: it draws the LCP headline on the English page. */
function preloadDisplayFont(): Plugin {
  return {
    name: 'drprop-preload-display-font',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        const file = Object.keys(ctx.bundle ?? {}).find((f) =>
          /instrument-serif-latin-400-normal-[\w-]+\.woff2$/.test(f),
        );
        if (!file) return [];
        return [
          {
            tag: 'link',
            attrs: { rel: 'preload', as: 'font', type: 'font/woff2', href: `/${file}`, crossorigin: '' },
            injectTo: 'head',
          },
        ];
      },
    },
  };
}

export default defineConfig({
  root,
  plugins: [drpropPages(), preloadDisplayFont()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Never inline fonts as base64: most Noto SC slices are never downloaded.
    assetsInlineLimit: 0,
    rollupOptions: {
      input: Object.fromEntries(pages.map((p) => [p.file.replace(/\/?index\.html$/, '') || 'index', `${root}${p.file}`])),
    },
  },
});
