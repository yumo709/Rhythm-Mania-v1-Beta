import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const origin = 'https://rhythm-mania.com';
const source = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');

function harness() {
  const listeners = new Map<string, (event: any) => void>();
  const stores = new Map<string, Map<string, Response>>();
  const key = (request: Request | string) => new URL(typeof request === 'string' ? request : request.url, origin).href;
  function cache(name: string) {
    let data = stores.get(name);
    if (!data) { data = new Map(); stores.set(name, data); }
    return {
      match: async (request: Request | string) => data.get(key(request))?.clone(),
      put: async (request: Request | string, response: Response) => { data.set(key(request), response.clone()); },
      keys: async () => [...data.keys()].map(url => new Request(url)),
      delete: async (request: Request | string) => data.delete(key(request)),
      addAll: async (urls: string[]) => {
        for (const url of urls) {
          if (url !== '/' && !existsSync(new URL(`../public${url}`, import.meta.url)) && url !== '/index.html') {
            throw new Error(`Missing precache asset: ${url}`);
          }
          data.set(key(url), new Response(`precache:${url}`));
        }
      },
    };
  }
  const fetch = vi.fn(async (_request: Request | string) => new Response('network'));
  const context = vm.createContext({
    URL, Request, Response, fetch, console: { log() {}, warn() {}, error() {} },
    caches: {
      open: async (name: string) => cache(name),
      keys: async () => [...stores.keys()],
      delete: async (name: string) => stores.delete(name),
    },
    self: {
      location: { origin },
      skipWaiting: vi.fn(async () => {}),
      clients: { claim: vi.fn(async () => {}) },
      addEventListener: (type: string, listener: (event: any) => void) => listeners.set(type, listener),
    },
  });
  vm.runInContext(source, context);
  const shellName = vm.runInContext('CACHE_NAME', context) as string;
  const beatmapName = vm.runInContext('BEATMAP_CACHE_NAME', context) as string;
  async function dispatch(type: string, request?: Partial<Request>) {
    let response: Promise<Response> | undefined;
    const work: Promise<unknown>[] = [];
    listeners.get(type)?.({
      request,
      respondWith: (result: Promise<Response>) => { response = result; },
      waitUntil: (result: Promise<unknown>) => { work.push(result); },
    });
    const result = await response;
    await Promise.all(work);
    return result;
  }
  return { cache, stores, fetch, shellName, beatmapName, dispatch };
}

const request = (path: string, mode = 'cors') => ({
  url: new URL(path, origin).href, method: 'GET', mode: mode as RequestMode, headers: new Headers(),
});

describe('service worker offline behavior', () => {
  it('installs using only files that ship with the app', async () => {
    const worker = harness();
    await expect(worker.dispatch('install')).resolves.toBeUndefined();
    expect(worker.stores.get(worker.shellName)?.size).toBeGreaterThan(10);
  });

  it('serves a precached UI sound on the first offline visit', async () => {
    const worker = harness();
    await worker.cache(worker.shellName).put('/sounds/click.mp3', new Response('sound bytes'));
    worker.fetch.mockRejectedValue(new TypeError('offline'));
    const result = await worker.dispatch('fetch', request('/sounds/click.mp3'));
    expect(result?.status).toBe(200);
    expect(await result?.text()).toBe('sound bytes');
  });

  it('falls back to the cached root when index.html is missing offline', async () => {
    const worker = harness();
    await worker.cache(worker.shellName).put('/', new Response('root shell'));
    worker.fetch.mockRejectedValue(new TypeError('offline'));
    const result = await worker.dispatch('fetch', request('/history', 'navigate'));
    expect(await result?.text()).toBe('root shell');
  });

  it('preserves unrelated origin caches during activation', async () => {
    const worker = harness();
    await worker.cache('another-app-cache').put('/unrelated', new Response('keep'));
    await worker.cache('rhythm-mania-cache-v0').put('/old', new Response('drop'));
    await worker.dispatch('activate');
    expect(worker.stores.has('another-app-cache')).toBe(true);
    expect(worker.stores.has('rhythm-mania-cache-v0')).toBe(false);
  });

  it('does not intercept API, third-party, non-GET or Vite module requests', async () => {
    const worker = harness();
    for (const input of [
      request('/api/config'), request('https://catboy.best/d/1'),
      request('/src/main.tsx'), request('/node_modules/.vite/deps/react.js'),
      { ...request('/'), method: 'POST' },
    ]) {
      expect(await worker.dispatch('fetch', input)).toBeUndefined();
    }
    expect(worker.fetch).not.toHaveBeenCalled();
  });

  it('bounds the runtime shell cache while retaining the offline entry point', async () => {
    const worker = harness();
    const cache = worker.cache(worker.shellName);
    await cache.put('/index.html', new Response('entry point'));
    for (let i = 0; i < 205; i++) await cache.put(`/old-${i}.js`, new Response('old'));
    await worker.dispatch('fetch', request('/new.js'));
    expect(worker.stores.get(worker.shellName)!.size).toBeLessThanOrEqual(200);
    expect(await (await cache.match('/index.html'))?.text()).toBe('entry point');
  });
});
