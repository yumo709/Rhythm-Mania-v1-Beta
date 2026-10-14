/*
 * RhythmMania - High-Performance Rhythm Game Platform
 * Copyright (C) 2026 Yumo (yumo-ymspace). All rights reserved.
 *
 * This source code is licensed under the PolyForm Perimeter License 1.0.1.
 * You may modify and use this file for non-competing purposes, provided 
 * that open and explicit attribution is maintained.
 *
 * For the full license terms, see the LICENSE file in the root directory
 * from: https://github.com/yumo-ymspace/RhythmMania
 */

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), {
      name: 'offline-build-assets',
      apply: 'build',
      generateBundle(_options, bundle) {
        const assets = Object.keys(bundle).filter(name => /\.(js|css)$/.test(name)).sort();
        const revision = createHash('sha256').update(assets.join('\n')).digest('hex').slice(0, 12);
        const worker = readFileSync(new URL('./public/sw.js', import.meta.url), 'utf8')
          .replace('// BUILD_ASSETS', assets.map(name => `${JSON.stringify(`/${name}`)},`).join('\n  '))
          .replace('rhythm-mania-cache-v3', `rhythm-mania-cache-v3-${revision}`);
        this.emitFile({ type: 'asset', fileName: 'sw.js', source: worker });
      },
    }],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },
    server: {
      watch: {
        // Argon comparison stills are docs-only; watching them EBUSY-crashes Vite on Windows.
        ignored: ['**/visual-refs/**', '**/docs/audit/**'],
      },
    },
  };
});
