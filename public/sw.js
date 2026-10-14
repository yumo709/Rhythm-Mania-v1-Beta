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

// The production build adds its hashed JavaScript/CSS files and a cache suffix.
const CACHE_NAME = 'rhythm-mania-cache-v3';
const BEATMAP_CACHE_NAME = 'rhythm-mania-beatmaps-v2';
const MAX_BEATMAP_ENTRIES = 50;
const MAX_SHELL_ENTRIES = 200;
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/sounds/d1.mp3',
  '/sounds/d2.mp3',
  '/sounds/d3.mp3',
  '/sounds/click.mp3',
  '/sounds/fail.mp3',
  '/sounds/miss-sound.mp3',
  '/sounds/restart.mp3',
  '/sounds/soft-hitwhistle.mp3',
  '/sounds/triangles.mp3',
  '/fonts/Inter-Variable.ttf',
  '/fonts/Nunito-Variable.ttf',
  '/fonts/Orbitron-Variable.ttf',
  '/fonts/SpaceGrotesk-Variable.ttf',
  // BUILD_ASSETS
];
const pinnedAssets = new Set(STATIC_ASSETS.map(path => new URL(path, self.location.origin).href));

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(STATIC_ASSETS);
    await self.skipWaiting();
  })());
});

async function trimCache(name, limit) {
  const cache = await caches.open(name);
  const keys = await cache.keys();
  let excess = keys.length - limit;
  for (const key of keys) {
    if (excess <= 0) break;
    // The entry point and bundled assets must survive runtime-cache eviction.
    if (name === CACHE_NAME && pinnedAssets.has(key.url)) continue;
    if (await cache.delete(key)) excess--;
  }
}

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name =>
      (name.startsWith('rhythm-mania-cache-') || name.startsWith('rhythm-mania-beatmaps-'))
      && name !== CACHE_NAME && name !== BEATMAP_CACHE_NAME,
    ).map(name => caches.delete(name)));
    await Promise.all([
      trimCache(CACHE_NAME, MAX_SHELL_ENTRIES),
      trimCache(BEATMAP_CACHE_NAME, MAX_BEATMAP_ENTRIES),
    ]);
    await self.clients.claim();
  })());
});

async function cachedResponse(cacheName, request) {
  try { return await (await caches.open(cacheName)).match(request); }
  catch { return undefined; } // Cache denial must not prevent online use.
}

function storeResponse(event, cacheName, response) {
  if (response.status !== 200) return;
  const copy = response.clone();
  // Keep the worker alive until the write and eviction finish.
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    await cache.put(event.request, copy);
    await trimCache(cacheName, cacheName === CACHE_NAME ? MAX_SHELL_ENTRIES : MAX_BEATMAP_ENTRIES);
  })().catch(() => {})); // Quota failure does not invalidate a network response.
}

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin
    || url.pathname === '/api' || url.pathname.startsWith('/api/')
    || /^\/(?:@vite|@react-refresh|@id|@fs|src|node_modules)(?:\/|$)/.test(url.pathname)) return;

  const isBundled = pinnedAssets.has(url.href);
  const isBeatmap = !isBundled && (/\.(?:osz|zip|mp3|ogg|wav|txt)$/i.test(url.pathname)
    || url.pathname.startsWith('/beatmaps/'));
  const cacheName = isBeatmap ? BEATMAP_CACHE_NAME : CACHE_NAME;
  const cacheFirst = isBeatmap || (isBundled && event.request.mode !== 'navigate');

  event.respondWith((async () => {
    if (cacheFirst) {
      const cached = await cachedResponse(cacheName, event.request);
      if (cached) return cached;
    }
    try {
      const response = await fetch(event.request);
      storeResponse(event, cacheName, response);
      return response;
    } catch {
      const cached = await cachedResponse(cacheName, event.request);
      if (cached) return cached;
      if (event.request.mode === 'navigate') {
        const shell = await cachedResponse(CACHE_NAME, '/index.html')
          ?? await cachedResponse(CACHE_NAME, '/');
        if (shell) return shell;
      }
      return new Response('This resource is unavailable offline.', { status: 503, statusText: 'Offline' });
    }
  })());
});
