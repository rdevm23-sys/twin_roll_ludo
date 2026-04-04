import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import checker from 'vite-plugin-checker';
import licenses from 'rollup-plugin-license';
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { VitePWA } from 'vite-plugin-pwa';
import { pwaOptions } from './pwa.config';
import { license } from './package.json';
import { normalizePath } from 'vite';
import path from 'node:path';
import fs from 'fs';

// Read version from pom.properties
const pomPath = path.resolve(__dirname, '..', 'pom.properties');
const pomContent = fs.readFileSync(pomPath, 'utf-8');
const versionLine = pomContent.split('\n').find(line => line.startsWith('version='));
const version = versionLine ? versionLine.split('=')[1] : 'unknown';

// https://vite.dev/config/
export default defineConfig({
  test: {
    environment: 'jsdom',
    coverage: {
      provider: 'istanbul',
      reporter: ['text', 'json', 'html'],
    },
  },
  css: {
    modules: {
      localsConvention: 'camelCaseOnly',
    },
  },
  define: {
    __APP_VERSION__: JSON.stringify(version),
    __APP_LICENSE__: JSON.stringify(license),
  },
  plugins: [
    react(),
    svgr({
      svgrOptions: {
        plugins: ['@svgr/plugin-svgo', '@svgr/plugin-jsx'],
        svgoConfig: {
          plugins: ['preset-default'],
        },
      },
    }),
    checker({ typescript: { tsconfigPath: './tsconfig.app.json' } }),
    ViteImageOptimizer(),
    licenses({
      thirdParty: {
        output: normalizePath(path.resolve(__dirname, 'dist', 'THIRD_PARTY_LICENSES.txt')),
      },
    }),
    viteStaticCopy({
      targets: [
        {
          src: normalizePath(path.resolve(__dirname, 'LICENSE')),
          dest: normalizePath(path.resolve(__dirname, 'dist')),
          rename: 'LICENSE.txt',
        },
      ],
    }),
    VitePWA(pwaOptions),
  ],
});
